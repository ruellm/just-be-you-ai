"""Phase 2.3 — the conversational fit-assessment interview.

This REPLACES the Phase 2.2c scripted question-by-question loop. The voice LLM
(gpt-4o) now drives the interview itself: it gets the whole job + candidate
context and a fallback pool of pre-generated questions up front, and conducts a
warm, adaptive conversation whose goal is to gather evidence about whether the
candidate is a FIT for this specific role — not to march through a checklist.

How it works (and why it's simpler than 2.2c):
  * There is NO orchestrator deciding each utterance and NO separate follow-up
    LLM. We use a plain ``AgentSession`` with a normal :class:`InterviewAgent`,
    so the session's own STT → LLM → TTS turn loop runs the whole conversation.
    The system prompt (see :func:`build_system_prompt`) carries all the
    conversational rules.
  * The LLM invokes two **function tools** during the conversation:
      - ``note_fit_signal(dimension, evidence, strength)`` — records a piece of
        fit evidence into an in-memory list.
      - ``end_interview(reason)`` — signals the interview is complete.
    LiveKit Agents 1.6 supports this tool-call loop cleanly: tools declared as
    methods on the Agent are auto-registered and the LLM calls them mid-turn.
  * Transcript capture rides ``conversation_item_added`` for BOTH roles (unlike
    2.2c, we no longer suppress the auto-reply, so user turns are committed and
    emit the event).
  * End conditions: (a) the AI calls ``end_interview``; (b) the candidate
    disconnects; (c) a per-job time cap (default 30 min) forces a graceful close;
    (d) prolonged candidate silence — a watcher nudges once ("Are you still
    there?") then thanks them and ends via the same "completed" path as (a).
    In every case we build the transcript + fit-signals and hand them to
    ``save_result`` for real grading.
"""

from __future__ import annotations

import asyncio
import contextlib
import logging
import time
from datetime import datetime, timezone
from typing import Any, Callable, Dict, List, Literal, Optional

from livekit.agents import Agent, AgentSession, function_tool
from livekit import rtc

from .context import InterviewContext
from .prompts import (
    is_plausible_first_name,
    render_agent_rules,
    untrusted_notice,
    wrap_untrusted,
)

logger = logging.getLogger("jbu-voice-agent.flow")

# Interview duration cap (requirement A.4). Job.interview_max_minutes overrides.
DEFAULT_MAX_MINUTES = 30
# How long before the cap we silently remind the LLM to start wrapping up.
WRAP_UP_LEAD_SECONDS = 5 * 60
# Bound on how long we wait for the AI's closing speech to drain on a normal end.
_IDLE_DRAIN_TIMEOUT = 10.0
# Silence handling (requirement A1) — mirrors the advanced tier's turn-timeout
# behavior. After the agent finishes a turn, if the candidate stays silent for
# SILENCE_NUDGE_SECONDS we check in ONCE ("Are you still there?"); if the
# silence continues for SILENCE_END_SECONDS more AFTER the nudge, we thank them
# and end via the normal completion path (~15-18s of total silence). These are
# deliberately patient so short natural pauses never trigger — tune here.
SILENCE_NUDGE_SECONDS = 8.0
SILENCE_END_SECONDS = 9.0
_SILENCE_POLL_SECONDS = 1.0
# Agent states during which the silence clock must NOT run (the agent itself is
# busy — the candidate isn't expected to be talking).
_AGENT_BUSY_STATES = ("initializing", "thinking", "speaking")
# Cap on parsed-resume text injected into the system prompt.
_MAX_RESUME_CHARS = 8000


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
    # Typed by the candidate and used outside the untrusted-data tags, so
    # anything that doesn't look like a name counts as "no name" too.
    first = full.split()[0]
    return first if is_plausible_first_name(first) else None


# ── system prompt ────────────────────────────────────────────────────────────

# The conversation rules (persona, flow, scope control) live in
# shared/interview-prompts.json and are rendered by prompts.py, so the basic and
# advanced tiers cannot drift. Everything the candidate supplied is wrapped in
# untrusted-data tags: it is data for the interviewer, never instructions.


def _section(title: str, value: Optional[str], *, limit: int = 2000) -> str:
    value = (value or "").strip()
    if not value:
        return ""
    if len(value) > limit:
        value = value[:limit] + "…[truncated]"
    return f"{title}: {value}\n"


def build_system_prompt(ctx: InterviewContext) -> str:
    """Assemble the full voice-LLM system prompt (requirement A.1 + A.2).

    Everything the AI needs is provided up front: job details, candidate
    details, the fallback question pool, and the conversational rules.
    """
    job = ctx.job
    cand = ctx.candidate
    first_name = _resolve_first_name(cand.full_name)

    name_line = (
        f"The candidate's first name is {first_name}. Use it naturally."
        if first_name
        else "You do not know the candidate's name; do not invent one."
    )

    skills = ", ".join(
        s.name + (f" ({s.years_of_experience}y)" if s.years_of_experience else "")
        for s in cand.skills
    ) or "None listed"

    if cand.work_experiences:
        work_lines = []
        for w in cand.work_experiences:
            span = "current" if w.currently_working else (w.end_date or "")
            line = f"- {w.position} at {w.company_name}"
            if span:
                line += f" ({span})"
            work_lines.append(line)
        work = "\n".join(work_lines)
    else:
        work = "None listed"

    if ctx.questions:
        pool = "\n".join(
            f"{i}. [{q.category}] {q.text}" for i, q in enumerate(ctx.questions, 1)
        )
    else:
        pool = "(No pre-generated questions — rely on the job and your judgment.)"

    # Everything the candidate typed or uploaded, kept together so it can be
    # wrapped as untrusted data.
    candidate_data = "".join(
        [
            f"Name: {cand.full_name}\n",
            _section("Preferred role", cand.preferred_role, limit=200),
            _section("Summary", cand.summary),
            f"Skills: {skills}\n",
            f"Work experience:\n{work}\n",
            # Cleaned (PII-stripped) text when cleanup produced it; raw text
            # otherwise. Both are the apply-time snapshot (see load_context).
            _section(
                "Parsed resume",
                cand.cleaned_resume_text or cand.parsed_resume_text,
                limit=_MAX_RESUME_CHARS,
            ),
        ]
    )

    parts = [
        render_agent_rules("basic", job.company_name),
        f"\n\n{untrusted_notice('agent')}",
        "\n\n=== THE ROLE ===\n",
        f"Job title: {job.title}\n",
        f"Company: {job.company_name}\n",
        _section("Level", job.level, limit=50),
        _section("Description", job.description),
        _section("Role overview", job.role_overview),
        _section("Requirements", job.requirements),
        _section("Day-to-day", job.day_to_day),
        _section("Ideal candidate profile", job.ideal_candidate_profile),
        _section("Passing criteria", job.passing_criteria),
        _section("Interviewer hints", job.interview_hints),
        "\n=== THE CANDIDATE ===\n",
        f"{wrap_untrusted(candidate_data.rstrip())}\n",
        "\n=== FALLBACK QUESTION POOL (use only if you're unsure what to ask next) ===\n",
        f"{pool}\n",
        f"\n{name_line}\n",
    ]
    return "".join(parts)


# ── the agent (owns the tools + collected fit signals) ───────────────────────


class InterviewAgent(Agent):
    """The conversational interviewer. Exposes two tools to the voice LLM."""

    def __init__(self, *, instructions: str, on_end: Callable[[str], None]) -> None:
        super().__init__(instructions=instructions)
        self.fit_signals: List[Dict[str, Any]] = []
        self._on_end = on_end

    @function_tool
    async def note_fit_signal(
        self,
        dimension: str,
        evidence: str,
        strength: Literal["strong", "moderate", "weak", "negative"],
    ) -> str:
        """Record a piece of evidence about the candidate's fit for this role.

        Call this whenever you observe something worth noting — strong or weak.

        Args:
            dimension: Short fit dimension, e.g. "technical_depth",
                "communication", "motivation", "problem_solving",
                "domain_experience".
            evidence: One sentence quoting or summarizing what the candidate said.
            strength: How positive or negative the signal is.
        """
        self.fit_signals.append(
            {
                "dimension": dimension,
                "evidence": evidence,
                "strength": strength,
                "timestamp": _now_iso(),
            }
        )
        logger.info("fit_signal [%s] %s — %s", strength, dimension, evidence)
        # Return nothing meaningful — this is a silent note, keep the AI talking
        # to the candidate, not narrating the tool call.
        return "ok"

    @function_tool
    async def end_interview(self, reason: str) -> str:
        """Signal that the interview is complete and the closing should begin.

        Call this once you've gathered enough fit evidence (or the candidate
        asks to stop). Signal closing to the candidate FIRST, then call this.

        Args:
            reason: A short internal note, e.g. "gathered sufficient signal",
                "candidate requested to stop".
        """
        logger.info("end_interview requested: %s", reason)
        self._on_end("completed")
        return "ok"


# ── the flow (session lifecycle, transcript, time cap, close) ────────────────


class InterviewFlow:
    """Runs one conversational interview over an :class:`AgentSession`."""

    def __init__(
        self, session: AgentSession, ctx: InterviewContext, room: rtc.Room
    ) -> None:
        self.session = session
        self.ctx = ctx
        self.room = room

        self.transcript: List[Dict[str, str]] = []
        self.ended_reason = "completed"  # completed | disconnect | time_cap
        self._ended = asyncio.Event()

        max_minutes = ctx.job.interview_max_minutes or DEFAULT_MAX_MINUTES
        self.max_seconds = max(60, max_minutes * 60)

        self.first_name = _resolve_first_name(ctx.candidate.full_name)
        self.agent = InterviewAgent(
            instructions=build_system_prompt(ctx), on_end=self._request_end
        )

        # Silence tracking (req A1) — see _silence_watch.
        self._agent_state: str = "initializing"
        self._user_speaking = False
        self._silence_nudged = False
        self._last_activity = time.monotonic()
        # Session length (U4): same monotonic clock the silence/time-cap
        # tracking already uses. The flow is constructed immediately before
        # run(), so this is the session start.
        self._started_at = time.monotonic()

        session.on("conversation_item_added", self._on_conversation_item)
        session.on("agent_state_changed", self._on_agent_state)
        session.on("user_state_changed", self._on_user_state)

    @property
    def fit_signals(self) -> List[Dict[str, Any]]:
        return self.agent.fit_signals

    @property
    def duration_seconds(self) -> int:
        """Whole seconds elapsed since the flow started (U4).

        Read after run() returns, i.e. including the graceful close. Monotonic,
        so a system clock change can't produce a negative or absurd value.
        """
        return max(0, int(round(time.monotonic() - self._started_at)))

    # ── lifecycle control ────────────────────────────────────────────────────

    def _request_end(self, reason: str) -> None:
        if self._ended.is_set():
            return
        self.ended_reason = reason
        self._ended.set()

    def mark_disconnected(self) -> None:
        """Called when the candidate's participant leaves the room."""
        if self._ended.is_set():
            return
        logger.info("Candidate disconnected; ending interview.")
        self._request_end("disconnect")

    def detach(self) -> None:
        self.session.off("conversation_item_added", self._on_conversation_item)
        self.session.off("agent_state_changed", self._on_agent_state)
        self.session.off("user_state_changed", self._on_user_state)

    # ── transcript capture ───────────────────────────────────────────────────

    def _on_conversation_item(self, ev) -> None:
        """Capture every committed AI + candidate turn.

        Tool-call / tool-result items carry no ``text_content`` (or a non-
        assistant/user role) and are skipped, so only real spoken turns land in
        the transcript.
        """
        item = getattr(ev, "item", None)
        role = getattr(item, "role", None)
        text = getattr(item, "text_content", None)
        if not text:
            return
        if role == "assistant":
            self.transcript.append(
                {"role": "ai", "text": text.strip(), "timestamp": _now_iso()}
            )
        elif role == "user":
            self.transcript.append(
                {"role": "candidate", "text": text.strip(), "timestamp": _now_iso()}
            )

    def build_transcript_text(self) -> str:
        """Serialize the captured turns to the stored ``AI:/Candidate:`` format."""
        lines: List[str] = []
        for turn in self.transcript:
            speaker = "AI" if turn["role"] == "ai" else "Candidate"
            lines.append(f"{speaker}: {turn['text']}")
        return "\n".join(lines)

    # ── silence handling (requirement A1) ────────────────────────────────────

    def _on_agent_state(self, ev) -> None:
        self._agent_state = str(getattr(ev, "new_state", "") or self._agent_state)
        # Any agent state change means the conversation just moved (it started
        # or finished a turn) — restart the silence clock from here.
        self._last_activity = time.monotonic()

    def _on_user_state(self, ev) -> None:
        state = getattr(ev, "new_state", None)
        if state == "speaking":
            self._user_speaking = True
            self._silence_nudged = False  # candidate is back — a later silence may nudge again
            self._last_activity = time.monotonic()
        elif state == "listening":
            # Only a transition OUT of speaking counts as activity. The "away"
            # state is exactly the silence we're measuring — never reset on it.
            if self._user_speaking:
                self._last_activity = time.monotonic()
            self._user_speaking = False

    async def _silence_watch(self) -> None:
        """Nudge once on prolonged candidate silence, then end gracefully.

        The clock only runs while the agent is quietly waiting (not thinking or
        speaking) and the candidate is not speaking, so the agent's own turns
        and short natural pauses never trigger it. ONE nudge per silence
        episode; if the candidate speaks again the episode resets and a later
        silence can nudge again.
        """
        while not self._ended.is_set():
            await asyncio.sleep(_SILENCE_POLL_SECONDS)
            if self._ended.is_set():
                return
            if self._agent_state in _AGENT_BUSY_STATES or self._user_speaking:
                self._last_activity = time.monotonic()
                continue
            silent_for = time.monotonic() - self._last_activity
            if not self._silence_nudged:
                if silent_for >= SILENCE_NUDGE_SECONDS:
                    self._silence_nudged = True
                    logger.info(
                        "Candidate silent for %.0fs; nudging once.", silent_for
                    )
                    try:
                        await self.session.generate_reply(
                            instructions=(
                                "The candidate has not responded for a while. "
                                "Gently check in with exactly one short line, "
                                "like 'Are you still there?' Nothing else."
                            )
                        )
                    except Exception:  # noqa: BLE001 — a failed nudge must not crash.
                        logger.exception("Failed to speak the silence nudge.")
                    self._last_activity = time.monotonic()
            elif silent_for >= SILENCE_END_SECONDS:
                logger.info(
                    "Candidate still silent %.0fs after the nudge; ending.",
                    silent_for,
                )
                await self._end_due_to_silence()
                return

    async def _end_due_to_silence(self) -> None:
        """Thank the unresponsive candidate briefly, then end normally.

        Routes through ``_request_end("completed")`` — the exact call the LLM's
        ``end_interview`` tool makes — so the interview_completed status,
        grading, and save all run exactly like a normal completion.
        """
        try:
            handle = self.session.say(
                "It seems we may have lost you, so I'll wrap things up here. "
                "Thank you for your time today — the team will review our "
                "conversation and be in touch. Take care!"
            )
            await handle.wait_for_playout()
        except Exception:  # noqa: BLE001
            logger.exception("Failed to speak the silence closing.")
        self._request_end("completed")

    # ── the interview ────────────────────────────────────────────────────────

    async def run(self) -> None:
        """Start the session, greet, then run until an end condition fires."""
        job = self.ctx.job
        await self.session.start(agent=self.agent, room=self.room)

        # Kick off the conversation with a warm greeting. The session's own turn
        # loop takes over from here — the LLM drives the rest via the rules in
        # the system prompt and its two tools.
        greet_name = f" {self.first_name}" if self.first_name else ""
        await self.session.generate_reply(
            instructions=(
                f"Greet the candidate warmly{greet_name}. In one or two sentences, "
                f"introduce yourself as the AI interviewer for the {job.title} role "
                f"at {job.company_name}, and ask if they're ready to begin."
            )
        )

        watchers = [
            asyncio.create_task(self._time_cap_watch()),
            asyncio.create_task(self._silence_watch()),
        ]
        try:
            await self._ended.wait()
        finally:
            for watcher in watchers:
                watcher.cancel()
                with contextlib.suppress(asyncio.CancelledError):
                    await watcher

        await self._graceful_close()
        logger.info(
            "Interview ended (%s) with %d turns, %d fit signals.",
            self.ended_reason,
            len(self.transcript),
            len(self.fit_signals),
        )

    async def _time_cap_watch(self) -> None:
        """Warn 5 min before the cap, then force a graceful close at the cap."""
        lead = self.max_seconds - WRAP_UP_LEAD_SECONDS
        if lead > 0:
            await asyncio.sleep(lead)
            if self._ended.is_set():
                return
            await self._inject_reminder(
                "You have about 5 minutes left. Start wrapping up soon."
            )
            await asyncio.sleep(WRAP_UP_LEAD_SECONDS)
        else:
            await asyncio.sleep(self.max_seconds)

        if self._ended.is_set():
            return
        logger.info("Time cap (%ds) reached; forcing graceful close.", self.max_seconds)
        self._request_end("time_cap")

    async def _inject_reminder(self, text: str) -> None:
        """Silently add a system note so the LLM's next turn sees it (req A.4)."""
        try:
            chat_ctx = self.agent.chat_ctx.copy()
            chat_ctx.add_message(role="system", content=text)
            await self.agent.update_chat_ctx(chat_ctx)
            logger.info("Injected wrap-up reminder to the LLM.")
        except Exception:  # noqa: BLE001 — a failed nudge must not crash the interview.
            logger.exception("Failed to inject wrap-up reminder.")

    async def _graceful_close(self) -> None:
        """Never end abruptly. Behavior depends on why we ended."""
        if self.ended_reason == "disconnect":
            return  # candidate already left; nothing to say.

        if self.ended_reason == "time_cap":
            try:
                handle = self.session.say(
                    "We're coming up on time, so I'll wrap things up here. Thank you "
                    "so much for your time today — the team will review our "
                    "conversation and be in touch. Take care!"
                )
                await handle.wait_for_playout()
            except Exception:  # noqa: BLE001
                logger.exception("Failed to speak the time-cap closing.")
            return

        # Normal completion: the AI already spoke its own closing before calling
        # end_interview. Just let any in-flight speech drain so we don't cut it off.
        try:
            await asyncio.wait_for(
                self.session.wait_for_idle(), timeout=_IDLE_DRAIN_TIMEOUT
            )
        except Exception:  # noqa: BLE001 — timeout or shutdown race; fine to proceed.
            pass
