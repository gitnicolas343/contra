# Project Map

This repository is a FastAPI backend + static frontend.

## Backend
```
backend/
  app/
    api/routes/           # REST endpoints (routers)
    clients/              # External clients (Supabase)
    core/                 # Configuration/env
    models/               # Pydantic schemas
    services/             # Business logic
    utils/                # Helpers (normalization, etc.)
    main.py               # FastAPI app wiring
  main.py                 # Wrapper for uvicorn main:app
  requirements.txt
```

## Frontend (static)
```
static/
  css/                    # Stylesheets
  js/                     # Page scripts
  assets/img/             # Images
  index.html              # Home
  login.html
  inscripcion.html
  verificacion.html
  verificacion_email.html
  verificacion_oauth.html
  reset_password.html
```

## Docker
- `Dockerfile` builds backend + serves static.

## Where to add things
- New API endpoint: `backend/app/api/routes/` + include router in `backend/app/main.py`
- New service: `backend/app/services/`
- New page: `static/<page>.html` + `static/css/<page>.css` + `static/js/<page>.js`
