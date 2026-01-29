import os
from pathlib import Path

from dotenv import load_dotenv

BACKEND_DIR = Path(__file__).resolve().parents[2]
ENV_PATH = BACKEND_DIR / ".env"
load_dotenv(ENV_PATH)

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

SOCRATA_APP_TOKEN = os.getenv("SOCRATA_APP_TOKEN") or "W79Vfw5oR17nZVyO8Pdyhvc5g"
