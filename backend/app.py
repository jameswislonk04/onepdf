import os
import sys
from contextlib import asynccontextmanager

# Ensure project root is on PYTHONPATH
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from backend.routes.ipynb_routes import router as ipynb_router
from backend.routes.pdf_routes import router as pdf_router
from backend.routes.ai_routes import router as ai_router
from backend.routes.lifecycle_routes import router as lifecycle_router
from backend.services.lifecycle_service import LifecycleService

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Start global 5-minute file lifecycle manager
    LifecycleService.start_lifecycle_worker(check_interval_seconds=30)
    yield
    # Shutdown: Stop worker cleanly
    LifecycleService.stop_lifecycle_worker()

app = FastAPI(
    title="One PDF API",
    description="Backend engine for One PDF - Everything You Need for PDFs, in One Place.",
    version="1.0.0",
    lifespan=lifespan
)

# CORS setup for local and web development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Opportunistic cleanup middleware: cleanly cleans expired files on requests
@app.middleware("http")
async def opportunistic_lifecycle_middleware(request: Request, call_next):
    # Perform lightweight cleanup check
    try:
        LifecycleService.cleanup_expired()
    except Exception:
        pass
    return await call_next(request)

# Register API routers
app.include_router(ipynb_router)
app.include_router(pdf_router)
app.include_router(ai_router)
app.include_router(lifecycle_router)

@app.get("/api/health")
async def health_check():
    return {
        "status": "healthy",
        "app": "One PDF",
        "version": "1.0.0",
        "features": [
            "ipynb_to_pdf",
            "pdf_security",
            "pdf_optimizer",
            "pdf_intelligence",
            "lifecycle_manager_5min"
        ]
    }

# Mount frontend directory for easy full-stack serving
frontend_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "frontend")

@app.get("/ipynb-to-pdf")
async def ipynb_to_pdf_page():
    index_file = os.path.join(frontend_dir, "index.html")
    if os.path.exists(index_file):
        from fastapi.responses import FileResponse
        return FileResponse(index_file)
    return {"status": "One PDF IPYNB tool"}

if os.path.exists(frontend_dir):
    app.mount("/", StaticFiles(directory=frontend_dir, html=True), name="frontend")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.app:app", host="0.0.0.0", port=8000, reload=True)
