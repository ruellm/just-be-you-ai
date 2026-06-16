"""Phase 2.2c — the question-by-question interview orchestration.

This module owns the *conversation flow* of a real interview: greet, work
through the generated questions one at a time, decide whether each answer
warrants a single follow-up, and capture every spoken turn into a transcript.

It deliberately does NOT touch persistence or the LiveKit entrypoint wiring —
``agent.py`` builds the session + system prompt and hands a started session +
the loaded ``InterviewContext`` to :class:`InterviewFlow`; ``save_result.py``
persists the transcript + (mocked) score afterwards.

Design notes:
  * The orchestrator drives EVERY agent utterance. A plain ``AgentSession``
    auto-generates an LLM reply whenever the user's turn ends (see
    agent_activity.py ``_user_turn_completed_task``). That fights manual
    orchestration and causes the agent to ask the next question without waiting
    (the 2.2c back-to-back bug). We suppress it with :class:`InterviewAgent`,
    which raises ``StopResponse`` in ``on_user_turn_completed`` — so the only
    speech is what this orchestrator explicitly says.
  * Questions are read by the voice LLM (``session.generate_reply``) so they
    sound natural; the fixed greeting, closing, acks and the nudge are spoken
    verbatim via ``session.say`` (cheaper + exact, no extra gpt-4o call).
  * The *follow-up decision* is a SEPARATE fast LLM call (gpt-4o-mini, JSON
    mode) — never the voice LLM. Latency matters; the candidate is waiting.
  * Candidate turns arrive via ``InterviewAgent.on_user_turn_completed`` and are
    pushed onto a queue, so a turn that lands while the agent is still speaking
    (an interruption) is buffered, not lost. Agent turns are captured from the
    ``conversation_item_added`` event (assistant role only).
"""

from __future__ import annotations

import asyncio
import json
import logging
from datetime import datetime, timezone
from typing import Dict, List, Optional

from livekit.agents import Agent, AgentSession, StopResponse, llm

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


def _resolve_first_name(full_name: Optional[str]) -> Optional[str]:
    """Return a usable first name, or None.

    ``load_context`` falls back to the user's email when no real name exists;
    using an email address in spoken conversation is jarring, so we treat any
    email-like value (or empty) as "no name" and greet without one.
    """
    full = (full_name or "").strip()
    if not full or "@" in full:
        return None
    return full.split()[0]


class InterviewAgent(Agent):
    """Agent that suppresses the session's automatic reply.

    The high-level ``AgentSession`` normally replies to every user turn on its
    own. For a scripted interview that's wrong — the orchestrator decides what
    to say and when. We capture the candidate's turn here and raise
    ``StopResponse`` so the session does NOT generate its own reply.
    """

    def __init__(self, *, instructions: str, flow: "InterviewFlow") -> None:
        super().__init__(instructions=instructions)
        self._flow = flow

    async def on_user_turn_completed(
        self, turn_ctx: llm.ChatContext, new_message: llm.ChatMessage
    ) -> None:
        text = (new_message.text_content or "").strip()
        if text:
            self._flow.submit_user_turn(text)
        # Hand control back to the orchestrator: no automatic reply.
        raise StopResponse()


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
        self.first_name = _resolve_first_name(ctx.candidate.full_name)
        self._name_suffix = f" {self.first_name}" if self.first_name else ""

        self._loop = asyncio.get_event_loop()
        # Buffers candidate turns so one arriving mid-speech isn't lost. A None
        # sentinel unblocks a waiting _listen() on disconnect.
        self._user_turns: asyncio.Queue[Optional[str]] = asyncio.Queue()
        self._closed = asyncio.Event()
        self.ended_reason = "completed"  # completed | silence | disconnect | time_cap

        session.on("conversation_item_added", self._on_conversation_item)

    # ── event hooks ──────────────────────────────────────────────────────────

    def _on_conversation_item(self, ev) -> None:
        """Capture the agent's spoken turns (say + generate_reply).

        Candidate turns are captured in InterviewAgent.on_user_turn_completed,
        which fires BEFORE StopResponse short-circuits the auto-reply — the user
        message is never committed here once we stop the reply, so we must not
        rely on this event for it.
        """
        item = getattr(ev, "item", None)
        role = getattr(item, "role", None)
        text = getattr(item, "text_content", None)
        if not text or role != "assistant":
            return
        self.transcript.append(
            {"role": "ai", "text": text.strip(), "timestamp": _now_iso()}
        )

    def submit_user_turn(self, text: str) -> None:
        """Record a completed candidate turn and make it available to _listen()."""
        self.transcript.append(
            {"role": "candidate", "text": text, "timestamp": _now_iso()}
        )
        self._user_turns.put_nowait(text)

    def mark_disconnected(self) -> None:
        """Called when the candidate's participant leaves the room."""
        if self._closed.is_set():
            return
        logger.info("Candidate disconnected; ending interview.")
        self._closed.set()
        self._user_turns.put_nowait(None)  # unblock a pending _listen()

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

        for attempt in range(2):
            try:
                text = await asyncio.wait_for(
                    self._user_turns.get(), SILENCE_TIMEOUT_SECONDS
                )
            except asyncio.TimeoutError:
                if self._closed.is_set():
                    return None
                if attempt == 0:
                    await self._say("Sorry, are you still there?")
                    continue
                logger.info("No response after nudge; ending interview.")
                return None
            if text is None:  # disconnect sentinel
                return None
            return text
        return None

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
            f"Hi{self._name_suffix}, welcome. I'm an AI interviewer for the "
            f"{job.title} role at {job.company_name}. I'll ask you a few "
            f"questions — take your time. There "
            f"{'is' if n == 1 else 'are'} {n} "
            f"question{'' if n == 1 else 's'} total. Ready when you are."
        )

        # (c) Wait for any acknowledgement before starting.
        logger.info("Greeting delivered; waiting for candidate to acknowledge.")
        if await self._listen() is None:
            return self._finish(
                reason="disconnect" if self._closed.is_set() else "silence"
            )

        # (d) Work through each question in order.
        for idx, q in enumerate(questions, start=1):
            tag = f"[Q{idx}/{n}]"
            if self._closed.is_set():
                return self._finish(reason="disconnect")
            if self._loop.time() - start > MAX_INTERVIEW_SECONDS:
                logger.info("%s Time cap reached; wrapping up early.", tag)
                await self._wrap_up_early()
                return self._finish(reason="time_cap")

            logger.info("%s Asking question (%s)...", tag, q.category)
            await self._ask_question(q.text)

            logger.info("%s Waiting for candidate response...", tag)
            answer = await self._listen()
            if answer is None:
                return self._finish(
                    reason="disconnect" if self._closed.is_set() else "silence"
                )
            logger.info("%s Got response: %s", tag, answer[:60])

            # Decide on at most ONE follow-up. Never follow up on a follow-up.
            decision = await self._decide_followup(q.text, answer)
            logger.info("%s Follow-up decision: %s", tag, decision["action"])
            if decision["action"] == "follow_up":
                await self._say(decision["question"])
                logger.info("%s Waiting for follow-up response...", tag)
                follow_answer = await self._listen()
                if follow_answer is None:
                    return self._finish(
                        reason="disconnect" if self._closed.is_set() else "silence"
                    )
                logger.info("%s Got follow-up response: %s", tag, follow_answer[:60])
            else:
                await self._say(decision["ack"])

            logger.info("%s Done with question.", tag)

        # (e) Normal completion closing.
        await self._say(
            f"Thanks{self._name_suffix}, that's all the questions. We'll review "
            "your responses and the company will be in touch. Have a great day."
        )
        return self._finish(reason="completed")

    async def _wrap_up_early(self) -> None:
        await self._say(
            f"Thanks{self._name_suffix} — we're at time, so I'll wrap up here. "
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
