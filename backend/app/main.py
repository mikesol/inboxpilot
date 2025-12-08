import os

from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.sdk.resources import SERVICE_NAME, Resource
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
from opentelemetry.instrumentation.httpx import HTTPXClientInstrumentor
from opentelemetry.instrumentation.sqlalchemy import SQLAlchemyInstrumentor

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.db import engine


def setup_telemetry() -> None:
    """Configure OpenTelemetry if OTEL_EXPORTER_OTLP_ENDPOINT is set."""
    if not os.getenv("OTEL_EXPORTER_OTLP_ENDPOINT"):
        return

    resource = Resource.create(attributes={
        SERVICE_NAME: os.getenv("OTEL_SERVICE_NAME", "inboxpilot-api")
    })

    provider = TracerProvider(resource=resource)
    processor = BatchSpanProcessor(OTLPSpanExporter())
    provider.add_span_processor(processor)
    trace.set_tracer_provider(provider)

    HTTPXClientInstrumentor().instrument()
    SQLAlchemyInstrumentor().instrument(engine=engine)


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

# CORS middleware - configure via CORS_ORIGINS env var
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
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

# Setup OpenTelemetry (only if OTEL_EXPORTER_OTLP_ENDPOINT is set)
setup_telemetry()
FastAPIInstrumentor.instrument_app(app)
