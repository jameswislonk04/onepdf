"""
One PDF - Global 5-Minute File Lifecycle Service
Ensures all server-side uploaded and temporary documents across all tools
automatically expire and are permanently deleted after 5 minutes (300 seconds).

SAFETY GUARANTEE:
Only files inside the dedicated One PDF temp directory or explicitly registered
server temporary files are deleted. User files on client machines are never touched.
"""

import os
import time
import shutil
import logging
import tempfile
import threading
from typing import Dict, Any, Optional

logger = logging.getLogger("onepdf.lifecycle")

LIFECYCLE_TTL_SECONDS = 300  # 5 minutes

class LifecycleService:
    _lock = threading.Lock()
    _registry: Dict[str, float] = {}  # path -> expiration_timestamp
    _worker_thread: Optional[threading.Thread] = None
    _stop_event = threading.Event()

    @classmethod
    def get_lifecycle_dir(cls) -> str:
        """Returns the isolated One PDF temporary directory inside the system temp folder."""
        base_dir = os.path.join(tempfile.gettempdir(), "onepdf_lifecycle")
        os.makedirs(base_dir, exist_ok=True)
        return base_dir

    @classmethod
    def register_temp_path(cls, path: str, ttl_seconds: int = LIFECYCLE_TTL_SECONDS) -> str:
        """
        Registers a server-side temporary file or directory for automatic deletion.
        """
        if not path:
            return path
        abs_path = os.path.abspath(path)
        expire_at = time.time() + ttl_seconds
        with cls._lock:
            cls._registry[abs_path] = expire_at
        return abs_path

    @classmethod
    def create_temp_dir(cls, prefix: str = "onepdf_job_") -> str:
        """
        Creates a temporary directory inside the isolated lifecycle folder
        and automatically registers it for 5-minute auto-deletion.
        """
        parent_dir = cls.get_lifecycle_dir()
        temp_path = tempfile.mkdtemp(prefix=prefix, dir=parent_dir)
        cls.register_temp_path(temp_path, ttl_seconds=LIFECYCLE_TTL_SECONDS)
        return temp_path

    @classmethod
    def cleanup_expired(cls) -> int:
        """
        Deletes all registered files/directories and scanned lifecycle files older than 5 minutes.
        Returns the count of removed items.
        """
        now = time.time()
        removed_count = 0
        to_delete = []

        with cls._lock:
            for path, expire_at in list(cls._registry.items()):
                if now >= expire_at:
                    to_delete.append(path)
                    del cls._registry[path]

        # Process registered items
        for path in to_delete:
            if cls._safe_remove(path):
                removed_count += 1

        # Also opportunistically scan the dedicated lifecycle directory for any files older than 5 min
        lifecycle_dir = cls.get_lifecycle_dir()
        try:
            if os.path.exists(lifecycle_dir):
                for entry in os.listdir(lifecycle_dir):
                    entry_path = os.path.join(lifecycle_dir, entry)
                    try:
                        mtime = os.path.getmtime(entry_path)
                        if now - mtime >= LIFECYCLE_TTL_SECONDS:
                            if cls._safe_remove(entry_path):
                                removed_count += 1
                    except Exception as e:
                        logger.warning(f"Error checking mtime on {entry_path}: {e}")
        except Exception as e:
            logger.warning(f"Error scanning lifecycle dir: {e}")

        return removed_count

    @classmethod
    def _safe_remove(cls, path: str) -> bool:
        """Safely removes a temporary file or directory."""
        if not os.path.exists(path):
            return False

        # Safety sanity check: never delete root, system, or user directory
        norm = os.path.abspath(path).lower()
        system_temp = os.path.abspath(tempfile.gettempdir()).lower()
        if not norm.startswith(system_temp):
            logger.error(f"Refusing to delete path outside system temp: {path}")
            return False

        try:
            if os.path.isdir(path):
                shutil.rmtree(path, ignore_errors=True)
            else:
                os.remove(path)
            logger.info(f"Lifecycle: Cleaned expired temporary path: {path}")
            return True
        except Exception as e:
            logger.error(f"Failed to delete {path}: {e}")
            return False

    @classmethod
    def start_lifecycle_worker(cls, check_interval_seconds: int = 30):
        """Starts the background worker thread if not already running."""
        with cls._lock:
            if cls._worker_thread is not None and cls._worker_thread.is_alive():
                return
            cls._stop_event.clear()

            def _worker():
                while not cls._stop_event.is_set():
                    try:
                        cls.cleanup_expired()
                    except Exception as e:
                        logger.error(f"Lifecycle worker error: {e}")
                    cls._stop_event.wait(check_interval_seconds)

            cls._worker_thread = threading.Thread(target=_worker, name="OnePDF-LifecycleWorker", daemon=True)
            cls._worker_thread.start()
            logger.info("One PDF 5-Minute File Lifecycle Worker started.")

    @classmethod
    def stop_lifecycle_worker(cls):
        """Stops the background worker thread."""
        cls._stop_event.set()
        if cls._worker_thread:
            cls._worker_thread.join(timeout=2)
            cls._worker_thread = None

    @classmethod
    def get_status(cls) -> Dict[str, Any]:
        """Returns statistics about tracked temporary files."""
        now = time.time()
        with cls._lock:
            active_count = len(cls._registry)
            items = []
            for path, expire_at in list(cls._registry.items()):
                remaining = max(0, expire_at - now)
                items.append({
                    "path": os.path.basename(path),
                    "seconds_remaining": round(remaining, 1),
                    "expired": remaining <= 0
                })

        return {
            "lifecycle_ttl_seconds": LIFECYCLE_TTL_SECONDS,
            "active_tracked_items": active_count,
            "items": items[:20],
            "worker_running": cls._worker_thread is not None and cls._worker_thread.is_alive(),
            "lifecycle_dir": cls.get_lifecycle_dir()
        }

