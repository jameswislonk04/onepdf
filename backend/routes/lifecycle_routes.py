"""
One PDF - Lifecycle API Routes
Endpoints to monitor file lifecycle status and trigger opportunistic cleanup.
"""

from fastapi import APIRouter
from backend.services.lifecycle_service import LifecycleService

router = APIRouter(prefix="/api/lifecycle", tags=["lifecycle"])

@router.get("/status")
async def get_lifecycle_status():
    """Returns the current status of the global 5-minute file lifecycle manager."""
    return LifecycleService.get_status()

@router.post("/cleanup")
async def trigger_cleanup():
    """Triggers an immediate cleanup run for any files older than 5 minutes."""
    removed = LifecycleService.cleanup_expired()
    return {
        "status": "success",
        "items_removed": removed,
        "message": f"Cleaned up {removed} expired server temporary items."
    }

