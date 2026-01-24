# backend/supabase_client.py

import os
from dotenv import load_dotenv
from supabase import create_client, Client

# Ruta absoluta al directorio donde está este archivo (backend/)
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Cargar el .env que está en backend/.env
env_path = os.path.join(BASE_DIR, ".env")
load_dotenv(dotenv_path=env_path)

# Leer variables
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")  # SERVICE_ROLE (la que ya pusiste en .env)

print("DEBUG_URL:", repr(SUPABASE_URL))
print("DEBUG_KEY comienza con:", repr(SUPABASE_KEY[:8] if SUPABASE_KEY else None))

if not SUPABASE_URL or not SUPABASE_KEY:
    raise RuntimeError(
        "Faltan SUPABASE_URL o SUPABASE_KEY en el .env de backend/. "
        "Revisa que el archivo .env esté en la carpeta backend/ y tenga esos campos."
    )

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
