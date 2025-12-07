from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import (
    routes_activity,
    routes_ai,
    routes_contacts,
    routes_emails,
    routes_health,
    routes_me,
    routes_sequences,
    routes_workspaces,
)

app = FastAPI(
    title="InboxPilot API",
    description="Lightweight outbound email CRM with AI-assisted copy",
    version="0.1.0",
)

# CORS middleware - configure for production
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(routes_health.router, prefix="/health", tags=["health"])
app.include_router(routes_me.router, prefix="/me", tags=["me"])
app.include_router(routes_workspaces.router, prefix="/workspaces", tags=["workspaces"])
app.include_router(routes_contacts.router, prefix="/contacts", tags=["contacts"])
app.include_router(routes_sequences.router, prefix="/sequences", tags=["sequences"])
app.include_router(routes_emails.router, prefix="/emails", tags=["emails"])
app.include_router(routes_ai.router, prefix="/ai", tags=["ai"])
app.include_router(routes_activity.router, prefix="/activity", tags=["activity"])
