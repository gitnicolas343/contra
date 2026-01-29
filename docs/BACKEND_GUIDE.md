# Backend Guide

## Structure
- `app/api/routes/` defines FastAPI routers.
- `app/services/` contains business logic.
- `app/clients/` contains integrations (Supabase).
- `app/models/` contains Pydantic schemas.
- `app/utils/` helpers for normalization/utility.

## Add a new endpoint
1) Create a router file in `backend/app/api/routes/`.
2) Define `router = APIRouter()` and your handlers.
3) Import and include the router in `backend/app/main.py`.

## Conventions
- Keep DB calls in `clients/` or `services/`.
- Keep request/response models in `models/schemas.py`.
- Keep functions pure where possible (services should be testable).

## Example
```py
from fastapi import APIRouter
from app.models.schemas import MyRequest, MyResponse
from app.services.my_service import do_work

router = APIRouter()

@router.post("/my-endpoint", response_model=MyResponse)
def my_endpoint(payload: MyRequest):
    return do_work(payload)
```
