"""Phase 2.2c — the question-by-question interview orchestration.

This module owns the *conversation flow* of a real interview: greet, work
through the generated questions one at a time, decide whether each answer
warrants a single follow-up, and capture every spoken turn into a transcript.

It deliberately does NOT touch persistence or the LiveKit entrypoint wiring —
``agent.py`` builds the session + system prompt and hands a started session +
the loaded ``InterviewContext`` to :class:`InterviewFlow`; ``save_result.py``
persists the transcript + (mocked) score afterwards.

Design notes:
  * The orchestrator drives turns explicitly. Questions are read by the voice
    LLM (``session.generate_reply``) so they sound natural; the fixed greeting,
    closing, acknowledgements and the nudge are spoken verbatim via
    ``session.say`` (cheaper + exact wording, no extra gpt-4o call).
  * The *follow-up decision* is a SEPARATE, fast LLM call (gpt-4o-mini, JSON
    mode) — never the voice LLM. Latency matters; the candidate is waiting.
  * Transcript capture rides LiveKit's ``conversation_item_added`` event, which
    fires once per committed turn for BOTH the agent (say + generate_reply) and
    the candidate (after end-of-turn detection). We map roles to "ai"/"candidate".
  * Waiting for the candidate's turn uses a per-question Future resolved by that
    same event. A 30s + 30s two-stage timeout implements the "are you still
    there?" nudge; a participant disconnect resolves the Future with None.
"""

from __future__ import annotations

import asyncio
import json
import logging
from datetime import datetime, timezone
from typing import Dict, List, Optional

from livekit.agents import AgentSession

from .context import InterviewContext

logger = logging.getLogger("jbu-voice-agent.flow")

# Hard cap on the whole interview. Past this we wrap up early (requirement 5c).
MAX_INTERVIEW_SECONDS = 20 * 60
# Per-turn silence handling (requirement 8): nudge after 30s, give up after 30s more.
SILENCE_TIMEOUT_SECONDS = 30.0

# Fast, cheap model for the follow-up decision only (NOT the voice LLM).
FOLLOWUP_MODEL = "gpt-4o-mini"

_FOLLOWUP_SYSTEM_PROMPT = (
    "You are the silent orchestrator behind a voice job interview. You are NOT "
    "speaking to the candidate. Given the question that was asked and the "
    "candidate's spoken answer, decide whether ONE short follow-up is warranted.\n\n"
    "Reply with a single JSON object, nothing else:\n"
    '  {"action": "move_on", "ack": "<2-4 word acknowledgement>"}\n'
    '  {"action": "follow_up", "question": "<one short follow-up question>"}\n\n'
    "Choose move_on when the answer is substantive and on-topic. Choose "
    "follow_up when the answer is very short (under ~15 words), vague, "
    "off-topic, or explicitly invites more (\"I can explain more if you want\"). "
    "Keep ack varied and brief ('Got it, thanks', 'Noted', 'Makes sense'). "
    "Keep any follow-up to a single sentence."
)


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


class InterviewFlow:
    """Drives one interview over an already-started :class:`AgentSession`."""

    def __init__(
        self,
        session: AgentSession,
        ctx: InterviewContext,
        *,
        followup_client,
    ) -> None:
        self.session = session
        self.ctx = ctx
        self._followup_client = followup_client

        self.transcript: List[Dict[str, str]] = []
        self.first_name = (
            ctx.candidate.full_name.split()[0]
            if ctx.candidate.full_name
            else "there"
        )

        self._loop = asyncio.get_event_loop()
        self._pending_user_turn: Optional[asyncio.Future] = None
        self._closed = asyncio.Event()
        self.ended_reason = "completed"  # completed | silence | disconnect | time_cap

        session.on("conversation_item_added", self._on_conversation_item)

    # ── event hooks ──────────────────────────────────────────────────────────

    def _on_conversation_item(self, ev) -> None:
        """Capture every committed turn; resolve the pending candidate turn."""
        item = getattr(ev, "item", None)
        role = getattr(item, "role", None)
        text = getattr(item, "text_content", None)
        if not text or role not in ("assistant", "user"):
            return

        mapped = "ai" if role == "assistant" else "candidate"
        self.transcript.append(
            {"role": mapped, "text": text.strip(), "timestamp": _now_iso()}
        )

        if role == "user":
            fut = self._pending_user_turn
            if fut is not None and not fut.done():
                fut.set_result(text.strip())

    def mark_disconnected(self) -> None:
        """Called when the candidate's participant leaves the room."""
        if self._closed.is_set():
            return
        logger.info("Candidate disconnected; ending interview.")
        self._closed.set()
        fut = self._pending_user_turn
        if fut is not None and not fut.done():
            fut.set_result(None)

    def detach(self) -> None:
        self.session.off("conversation_item_added", self._on_conversation_item)

    # ── speaking + listening primitives ──────────────────────────────────────

    async def _listen(self) -> Optional[str]:
        """Wait for the candidate's next full turn.

        Returns the transcript text, or None if they went silent (after one
        nudge) or disconnected.
        """
        if self._closed.is_set():
            return None

        fut: asyncio.Future = self._loop.create_future()
        self._pending_user_turn = fut
        try:
            for attempt in range(2):
                try:
                    # shield so the timeout doesn't cancel our own Future (the
                    # event callback still needs to resolve it).
                    return await asyncio.wait_for(
                        asyncio.shield(fut), SILENCE_TIMEOUT_SECONDS
                    )
                except asyncio.TimeoutError:
                    if self._closed.is_set():
                        return None
                    if attempt == 0:
                        await self._say("Sorry, are you still there?")
                    else:
                        logger.info("No response after nudge; ending interview.")
                        return None
            return None
        finally:
            self._pending_user_turn = None

    async def _say(self, text: str) -> None:
        """Speak an exact line (greeting/ack/closing). Captured via the event."""
        handle = self.session.say(text)
        await handle.wait_for_playout()

    async def _ask_question(self, question_text: str) -> None:
        """Have the voice LLM read a specific question naturally."""
        handle = self.session.generate_reply(
            instructions=(
                "Read the following interview question to the candidate, "
                "naturally and conversationally, in one breath. Do NOT add any "
                "other questions or commentary:\n\n" + question_text
            )
        )
        await handle.wait_for_playout()

    # ── follow-up decision (separate fast LLM call) ──────────────────────────

    async def _decide_followup(self, question: str, answer: str) -> Dict[str, str]:
        """Ask gpt-4o-mini whether to follow up. Defaults to move_on on error."""
        try:
            resp = await self._followup_client.chat.completions.create(
                model=FOLLOWUP_MODEL,
                response_format={"type": "json_object"},
                temperature=0.3,
                max_tokens=80,
                messages=[
                    {"role": "system", "content": _FOLLOWUP_SYSTEM_PROMPT},
                    {
                        "role": "user",
                        "content": (
                            f"Question asked:\n{question}\n\n"
                            f"Candidate's answer:\n{answer}"
                        ),
                    },
                ],
            )
            data = json.loads(resp.choices[0].message.content or "{}")
        except Exception:  # noqa: BLE001 — never let a decision error stall the flow.
            logger.exception("Follow-up decision failed; moving on.")
            return {"action": "move_on", "ack": "Thanks."}

        action = data.get("action")
        if action == "follow_up" and (data.get("question") or "").strip():
            return {"action": "follow_up", "question": data["question"].strip()}
        ack = (data.get("ack") or "").strip() or "Got it, thanks."
        return {"action": "move_on", "ack": ack}

    # ── the interview ────────────────────────────────────────────────────────

    async def run(self) -> None:
        """Run the full interview. Returns when it ends for any reason."""
        job = self.ctx.job
        questions = self.ctx.questions
        n = len(questions)
        start = self._loop.time()

        # (b) Greeting + format explainer.
        await self._say(
            f"Hi {self.first_name}, welcome. I'm an AI interviewer for the "
            f"{job.title} role at {job.company_name}. I'll ask you a few "
            f"questions — take your time. There are {n} "
            f"question{'s' if n != 1 else ''} total. Ready when you are."
        )

        # (c) Wait for any acknowledgement before starting.
        if await self._listen() is None:
            return self._finish(reason="disconnect" if self._closed.is_set() else "silence")

        # (d) Work through each question in order.
        for idx, q in enumerate(questions, start=1):
            if self._closed.is_set():
                return self._finish(reason="disconnect")
            if self._loop.time() - start > MAX_INTERVIEW_SECONDS:
                logger.info("Time cap reached at question %d/%d.", idx, n)
                await self._wrap_up_early()
                return self._finish(reason="time_cap")

            logger.info("Asking question %d/%d (%s)", idx, n, q.category)
            await self._ask_question(q.text)

            answer = await self._listen()
            if answer is None:
                return self._finish(
                    reason="disconnect" if self._closed.is_set() else "silence"
                )

            # Decide on at most ONE follow-up. Never follow up on a follow-up.
            decision = await self._decide_followup(q.text, answer)
            if decision["action"] == "follow_up":
                logger.info("Following up on question %d.", idx)
                await self._say(decision["question"])
                follow_answer = await self._listen()
                if follow_answer is None:
                    return self._finish(
                        reason="disconnect" if self._closed.is_set() else "silence"
                    )
            else:
                await self._say(decision["ack"])

        # (e) Normal completion closing.
        await self._say(
            f"Thanks {self.first_name}, that's all the questions. We'll review "
            "your responses and the company will be in touch. Have a great day."
        )
        return self._finish(reason="completed")

    async def _wrap_up_early(self) -> None:
        await self._say(
            f"Thanks {self.first_name} — we're at time, so I'll wrap up here. "
            "We'll review what we covered and the company will be in touch. "
            "Have a great day."
        )

    def _finish(self, *, reason: str) -> None:
        self.ended_reason = reason
        logger.info("Interview ended (%s) with %d turns.", reason, len(self.transcript))

    # ── transcript serialization ─────────────────────────────────────────────

    def build_transcript_text(self) -> str:
        """Serialize the captured turns to the stored ``AI:/Candidate:`` format."""
        lines: List[str] = []
        for turn in self.transcript:
            speaker = "AI" if turn["role"] == "ai" else "Candidate"
            lines.append(f"{speaker}: {turn['text']}")
        return "\n".join(lines)
