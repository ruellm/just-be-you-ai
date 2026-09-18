"""Access to shared/interview-prompts.json: the interviewer's conversation
rules (both voice tiers) and the untrusted-data framing used wherever
candidate-derived content enters a prompt.

MIRROR: lib/ai/interview-prompts.ts (Next.js side) is the logical twin of this
module (same rendering, same wrapping, same name check). If you change one,
change the other. The prompt text itself lives ONLY in the shared JSON.

Deliberately stdlib-only, like rubric.py, so it can be exercised standalone.
"""

from __future__ import annotations

import json
import re
import unicodedata
from pathlib import Path
from typing import Any, Dict, List, Optional

# voice-agent/lib/prompts.py -> parents[2] = repo root.
_PROMPTS_PATH = (
    Path(__file__).resolve().parents[2] / "shared" / "interview-prompts.json"
)

with _PROMPTS_PATH.open("r", encoding="utf-8") as _f:
    PROMPTS: Dict[str, Any] = json.load(_f)

_UNTRUSTED = PROMPTS["untrustedData"]
_AGENT = PROMPTS["agent"]

# A first name is spoken aloud and sits outside the untrusted-data tags, so
# only something that looks like a name is accepted.
_FIRST_NAME_MAX_CHARS = 40
_FIRST_NAME_PUNCTUATION = "'’.-"


def is_plausible_first_name(name: str) -> bool:
    if not name or len(name) > _FIRST_NAME_MAX_CHARS:
        return False
    return all(
        ch in _FIRST_NAME_PUNCTUATION or unicodedata.category(ch)[0] in ("L", "M")
        for ch in name
    )


def _applies(tiers: Optional[List[str]], tier: str) -> bool:
    return not tiers or tier in tiers


def render_agent_rules(tier: str, company: str) -> str:
    """The interviewer's conversation rules for one tier, {company} filled in."""
    variables = dict(_AGENT["tierVars"][tier])
    variables["company"] = company
    blocks: List[str] = []
    for block in _AGENT["blocks"]:
        if not _applies(block.get("tiers"), tier):
            continue
        lines: List[str] = []
        for line in block["lines"]:
            if isinstance(line, str):
                lines.append(line)
            elif _applies(line.get("tiers"), tier):
                lines.append(line["text"])
        blocks.append("\n".join(lines))
    text = "\n\n".join(blocks)
    return re.sub(
        r"\{(\w+)\}", lambda m: variables.get(m.group(1), m.group(0)), text
    )


def untrusted_notice(role: str) -> str:
    """The untrusted-data paragraph for a prompt, with the role's handling rule."""
    return f"{_UNTRUSTED['notice']} {_UNTRUSTED['handling'][role]}"


_TAG_LOOKALIKE = re.compile(r"<\s*/?\s*untrusted_candidate_data\s*>", re.IGNORECASE)


def wrap_untrusted(content: str) -> str:
    """Wrap candidate-derived content in the untrusted-data tags. Any copy of
    the tags inside the content is neutralized so it cannot close the wrapper
    early."""
    safe = _TAG_LOOKALIKE.sub("[removed]", content)
    return f"{_UNTRUSTED['openTag']}\n{safe}\n{_UNTRUSTED['closeTag']}"


# ── evaluator: manipulation detection ────────────────────────────────────────

_EVALUATOR = PROMPTS["evaluator"]

MANIPULATION_CLASSIFICATIONS: List[str] = list(
    _EVALUATOR["manipulationClassifications"]
)
MANIPULATION_SOURCES: List[str] = list(_EVALUATOR["manipulationSources"])

# Caps on what one evaluation may store.
MANIPULATION_MAX_ATTEMPTS = 10
MANIPULATION_QUOTE_MAX_CHARS = 500
# A quote this short matches almost anything, so it proves nothing.
MANIPULATION_QUOTE_MIN_CHARS = 8


def manipulation_prompt_section() -> str:
    """The MANIPULATION ATTEMPTS block of the evaluator system prompt."""
    return "\n".join(_EVALUATOR["manipulationSection"])


def build_manipulation_tool_schema() -> Dict[str, Any]:
    """JSON schema of the `manipulation_attempts` tool field."""
    return {
        "type": "array",
        "description": "Manipulation attempts by the candidate, each with a "
        "VERBATIM quote. Empty list when there are none (the normal case).",
        "items": {
            "type": "object",
            "properties": {
                "quote": {
                    "type": "string",
                    "description": "The candidate's exact words, copied verbatim.",
                },
                "classification": {
                    "type": "string",
                    "enum": MANIPULATION_CLASSIFICATIONS,
                },
                "source": {"type": "string", "enum": MANIPULATION_SOURCES},
            },
            "required": ["quote", "classification", "source"],
        },
    }


def _normalize_for_quote_match(text: str) -> str:
    """Case, whitespace and quote-style insensitive, nothing looser: the quote
    still has to be the words that are actually there."""
    text = unicodedata.normalize("NFKC", text)
    text = re.sub("[‘’]", "'", text)
    text = re.sub("[“”]", '"', text)
    return re.sub(r"\s+", " ", text).strip().lower()


def keep_verbatim_attempts(
    attempts: List[Dict[str, str]], candidate_text: str
) -> List[Dict[str, str]]:
    """Anti-fabrication, enforced in code: keep only attempts whose quote really
    appears in the candidate-derived text the evaluator was shown. No evidence,
    no claim."""
    haystack = _normalize_for_quote_match(candidate_text)
    kept: List[Dict[str, str]] = []
    for attempt in attempts:
        quote = attempt["quote"].strip()[:MANIPULATION_QUOTE_MAX_CHARS]
        needle = _normalize_for_quote_match(quote)
        if len(needle) < MANIPULATION_QUOTE_MIN_CHARS:
            continue
        if needle not in haystack:
            continue
        kept.append({**attempt, "quote": quote})
        if len(kept) >= MANIPULATION_MAX_ATTEMPTS:
            break
    return kept
