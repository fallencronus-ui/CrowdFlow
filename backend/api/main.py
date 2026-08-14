"""FastAPI app exposing the existing CrowdFlow pipeline outputs.

Run from the project root:

    uvicorn backend.api.main:app --host 0.0.0.0 --port 8000 --reload
"""

from __future__ import annotations

import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .routes import router

app = FastAPI(title="CrowdFlow Intelligence API", version="1.0.0")

DEFAULT_ORIGINS = [
    "http://localhost:8080",
    "http://127.0.0.1:8080",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
]

extra = os.environ.get("FRONTEND_ORIGINS", "")
origins = DEFAULT_ORIGINS + [o.strip() for o in extra.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_origin_regex=r"https?://.*\.lovable\.app",
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)


@app.get("/")
def root():
    return {"service": "CrowdFlow Intelligence API", "docs": "/docs", "health": "/api/health"}
