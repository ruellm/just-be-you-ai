"""Configured Supabase client (service role) for the voice agent.

Loads SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY from the environment and exposes
a single shared `supabase` client. The service role key bypasses RLS, which is
correct here: this is a trusted server-side process, never a browser.

Importing this module fails loudly if either env var is missing — better to
crash at startup than to hit a confusing auth error mid-interview.
"""

import os

from dotenv import load_dotenv
from supabase import Client, create_client

# agent.py also calls load_dotenv(), but call it here too so this module works
# when imported standalone (e.g. a quick `python -c` smoke test).
load_dotenv()

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
    missing = [
        name
        for name, value in (
            ("SUPABASE_URL", SUPABASE_URL),
            ("SUPABASE_SERVICE_ROLE_KEY", SUPABASE_SERVICE_ROLE_KEY),
        )
        if not value
    ]
    raise RuntimeError(
        "Missing required Supabase env var(s): "
        + ", ".join(missing)
        + ". Copy them from .env.example into .env "
        "(supabase.com/dashboard/project/<id>/settings/api)."
    )

supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
