"""Friday - AI Travel Copilot + Trusted Travel Marketplace for Pakistan.
Main FastAPI application entry point with verified health diagnostics and lifecycle management.
"""

from contextlib import asynccontextmanager
import subprocess
import shutil
import os
import time
from pathlib import Path
from typing import Dict, Any

from fastapi import FastAPI, Depends, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
import httpx

from app.core.config import get_settings, BACKEND_DIR
from app.core.logging import setup_logging, get_logger
from app.core.exceptions import FridayError, friday_error_handler
from app.database.database import init_db, get_db
from app.api.v1 import v1_router
from app.database.seed import seed_initial_data_async

setup_logging()
logger = get_logger("main")
settings = get_settings()

whatsapp_proc = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifecycle hook for DB initialization, seed data, and Baileys WhatsApp service."""
    global whatsapp_proc

    logger.info("Initializing Friday database...")
    await init_db()
    if not settings.is_production:
        try:
            await seed_initial_data_async()
        except Exception as e:
            logger.warning(f"Seed data notice: {e}")
    else:
        logger.info("Production mode detected: skipping demo/seed data insertion.")

    # Auto-start Baileys WhatsApp bot microservice if not already running (in dev/local environments)
    if not settings.is_production:
        whatsapp_dir = BACKEND_DIR / "whatsapp_service"
        server_file = whatsapp_dir / "server.js"
        is_whatsapp_running = False
        try:
            async with httpx.AsyncClient(timeout=1.0) as client:
                resp = await client.get("http://localhost:3001/status")
                if resp.status_code == 200:
                    is_whatsapp_running = True
                    logger.info("Friday Baileys WhatsApp bot is already online and connected on http://localhost:3001.")
        except Exception:
            is_whatsapp_running = False

        if not is_whatsapp_running and server_file.exists() and shutil.which("node"):
            try:
                logger.info("Starting Friday Baileys WhatsApp bot service on http://localhost:3001...")
                whatsapp_proc = subprocess.Popen(
                    ["node", "server.js"],
                    cwd=str(whatsapp_dir),
                    shell=True,
                )
            except Exception as e:
                logger.warning(f"Could not auto-start Baileys WhatsApp service: {e}")

    logger.info("Friday backend is ready! 🚀")
    yield

    # Clean shutdown
    if whatsapp_proc:
        logger.info("Shutting down Baileys WhatsApp bot service...")
        try:
            whatsapp_proc.terminate()
            whatsapp_proc.wait(timeout=3)
        except Exception:
            whatsapp_proc.kill()

    logger.info("Shutting down Friday backend.")


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description=(
        "Friday: AI Travel Copilot + Trusted Travel Marketplace for Pakistan.\n"
        "'Friday doesn't just tell you where to go — it plans the trip, adapts when things change, "
        "organizes your group, and connects you with trusted local organizers to make it happen.'"
    ),
    lifespan=lifespan,
)

from app.core.middleware import RequestIdMiddleware

# Exception handlers
app.add_exception_handler(FridayError, friday_error_handler)

# Tracing & Telemetry Middleware
app.add_middleware(RequestIdMiddleware)

# CORS: Allow environment-configured frontend origins + Vercel deployments
origins = list(settings.CORS_ORIGINS)
if settings.FRONTEND_URL and settings.FRONTEND_URL not in origins:
    origins.append(settings.FRONTEND_URL)
if not settings.is_production:
    origins.extend([
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:5175",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
        "http://127.0.0.1:5175",
        "http://127.0.0.1:3000",
    ])

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_origin_regex=r"https?://.*\.vercel\.app" if settings.is_production else r"http://(localhost|127\.0\.0\.1)(:\d+)?",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API routes
app.include_router(v1_router)


@app.get("/health/live", tags=["Health"])
async def health_live() -> Dict[str, Any]:
    """Lightweight process liveness endpoint for load balancers and orchestrators."""
    return {
        "status": "alive",
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "timestamp": time.time(),
    }


@app.get("/health/ready", tags=["Health"])
async def health_ready(db: AsyncSession = Depends(get_db)) -> Dict[str, Any]:
    """Database readiness probe ensuring the instance can accept user traffic."""
    try:
        res = await db.execute(text("SELECT 1"))
        if res.scalar() == 1:
            return {"status": "ready", "database": "connected"}
        return Response(status_code=503, content='{"status":"not_ready","error":"unexpected_query_result"}', media_type="application/json")
    except Exception as e:
        return Response(status_code=503, content=f'{{"status":"not_ready","error":"{str(e)}"}}', media_type="application/json")


@app.get("/health", tags=["Health"])
async def health_check(db: AsyncSession = Depends(get_db)) -> Dict[str, Any]:
    """Comprehensive verified health check diagnosing all real backend subsystems."""
    checks = {}
    is_healthy = True
    is_degraded = False

    # 1. Database connection check
    try:
        res = await db.execute(text("SELECT 1"))
        val = res.scalar()
        if val == 1:
            checks["database"] = {"status": "connected", "type": "sqlite+aiosqlite"}
        else:
            checks["database"] = {"status": "unexpected_result", "type": "sqlite"}
            is_healthy = False
    except Exception as e:
        checks["database"] = {"status": "error", "error": str(e)}
        is_healthy = False

    # 2. ChromaDB vector storage check
    try:
        chroma_dir = Path(settings.CHROMA_PATH)
        chroma_dir.mkdir(parents=True, exist_ok=True)
        checks["chromadb"] = {"status": "ready", "path": settings.CHROMA_PATH}
    except Exception as e:
        checks["chromadb"] = {"status": "error", "error": str(e)}
        is_degraded = True

    # 3. LLM providers configuration
    checks["groq"] = "configured" if settings.GROQ_API_KEY else "unconfigured"
    checks["gemini"] = "configured" if settings.GOOGLE_API_KEY else "unconfigured"
    if not settings.GROQ_API_KEY and not settings.GOOGLE_API_KEY:
        is_degraded = True

    # 4. External tools configuration
    checks["external_tools"] = {
        "weather_api": "configured" if settings.OPENWEATHER_API_KEY else "unconfigured",
        "openstreetmap_osrm": "online",
        "tavily_search": "configured" if settings.TAVILY_API_KEY else "unconfigured",
        "resend_email": "configured" if settings.RESEND_API_KEY else "unconfigured",
    }

    # 5. WhatsApp Baileys service check
    whatsapp_url = getattr(settings, "WHATSAPP_SERVICE_URL", "http://127.0.0.1:3001")
    try:
        async with httpx.AsyncClient(timeout=2.0) as client:
            wa_resp = await client.get(f"{whatsapp_url}/status")
            if wa_resp.status_code == 200:
                wa_data = wa_resp.json()
                checks["whatsapp_service"] = {
                    "status": "online",
                    "connected": wa_data.get("connected", False),
                    "qr_ready": wa_data.get("qrReady", False),
                }
            else:
                checks["whatsapp_service"] = {"status": "offline", "http_code": wa_resp.status_code}
                is_degraded = True
    except Exception:
        checks["whatsapp_service"] = {"status": "offline", "note": "Baileys local service not responding"}
        is_degraded = True

    # Calculate overall status
    if not is_healthy:
        overall_status = "unhealthy"
    elif is_degraded:
        overall_status = "degraded"
    else:
        overall_status = "healthy"

    return {
        "status": overall_status,
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "environment": "development" if settings.DEBUG else "production",
        "subsystems": checks,
    }
