"""
One PDF - Test Suite for Global 5-Minute File Lifecycle Manager
"""

import os
import sys
import time
import tempfile
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi.testclient import TestClient
from backend.app import app
from backend.services.lifecycle_service import LifecycleService

client = TestClient(app)

def test_lifecycle_manager():
    print("Testing Lifecycle Service...")

    # 1. Create temp dir inside lifecycle directory
    temp_dir = LifecycleService.create_temp_dir(prefix="test_job_")
    assert os.path.exists(temp_dir), "Temporary job directory must be created"
    
    test_file = os.path.join(temp_dir, "document.pdf")
    with open(test_file, "wb") as f:
        f.write(b"%PDF-1.4 test document content")
    assert os.path.exists(test_file)

    # 2. Check status endpoint
    res = client.get("/api/lifecycle/status")
    assert res.status_code == 200
    data = res.json()
    assert data["lifecycle_ttl_seconds"] == 300
    assert data["active_tracked_items"] >= 1
    print("  -> Status endpoint OK")

    # 3. Test that active files are NOT cleaned before expiration
    removed = LifecycleService.cleanup_expired()
    assert os.path.exists(test_file), "File must not be deleted before expiration"
    print("  -> Active file preservation OK")

    # 4. Test simulated expiration (simulate file older than 5 min)
    # Register with 0 second TTL for instant expiration simulation
    expired_dir = LifecycleService.create_temp_dir(prefix="expired_job_")
    expired_file = os.path.join(expired_dir, "temp_data.txt")
    with open(expired_file, "w") as f:
        f.write("temporary data")
    LifecycleService.register_temp_path(expired_dir, ttl_seconds=-1)

    # Trigger cleanup
    res_clean = client.post("/api/lifecycle/cleanup")
    assert res_clean.status_code == 200
    assert not os.path.exists(expired_dir), "Expired directory must be deleted after expiration"
    print("  -> Expiration cleanup OK")

    # 5. Safety guarantee: verify paths outside system temp are NEVER touched
    user_dummy_path = os.path.abspath("test_user_file.tmp")
    with open(user_dummy_path, "w") as f:
        f.write("important user file")
    try:
        # Attempt to remove via safe_remove
        safe_result = LifecycleService._safe_remove(user_dummy_path)
        assert safe_result is False, "Must refuse to delete file outside system temp"
        assert os.path.exists(user_dummy_path), "User file must never be touched"
        print("  -> User file safety guarantee OK")
    finally:
        if os.path.exists(user_dummy_path):
            os.remove(user_dummy_path)

    # Cleanup the active test_dir
    LifecycleService.register_temp_path(temp_dir, ttl_seconds=-1)
    LifecycleService.cleanup_expired()

    print("✓ All 5-minute lifecycle manager tests passed 100%!")

if __name__ == "__main__":
    test_lifecycle_manager()

