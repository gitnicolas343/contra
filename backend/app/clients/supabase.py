from supabase import Client, create_client

from app.core.config import SUPABASE_KEY, SUPABASE_URL

if not SUPABASE_URL or not SUPABASE_KEY:
    raise RuntimeError(
        "Missing SUPABASE_URL or SUPABASE_KEY in backend/.env. "
        "Ensure the file exists and contains these variables."
    )

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
