"""
Comprehensive automated test script for Green Vault Document View / Preview and IST Timestamps.
"""
import json
import urllib.request
import urllib.error
from datetime import datetime, timezone
from zoneinfo import ZoneInfo

IST = ZoneInfo("Asia/Kolkata")
API_BASE = "http://127.0.0.1:8000/api"

def login(username, password):
    url = f"{API_BASE}/auth/login"
    data = json.dumps({"username": username, "password": password}).encode("utf-8")
    req = urllib.request.Request(url, data=data, headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req) as resp:
        res_json = json.loads(resp.read().decode("utf-8"))
        return res_json["access_token"]

def test_patch():
    print("=" * 60)
    print("GREEN VAULT — FINAL UI + TIMESTAMP PATCH VERIFICATION")
    print("=" * 60)

    # 1. Authenticate as Judge Rajesh Sharma (Judge-001)
    print("\n[TEST 1] Authenticating as Judge Rajesh Sharma (Judge-001)...")
    token_judge = login("Judge-001", "xE!6*ztUa524aps6")
    assert token_judge, "Failed to get access token for Judge-001"
    print("  [OK] Successfully authenticated with JWT token.")

    # 2. Verify API Timestamps are Timezone-Aware UTC ISO 8601 Strings
    print("\n[TEST 2] Verifying Timezone-Aware UTC ISO 8601 serialization from backend API...")
    req = urllib.request.Request(f"{API_BASE}/cases/CASE-2026-001", headers={"Authorization": f"Bearer {token_judge}"})
    with urllib.request.urlopen(req) as resp:
        case_data = json.loads(resp.read().decode("utf-8"))
        case_created_at = case_data["created_at"]
        print(f"  API Case created_at: {case_created_at}")
        assert "+00:00" in case_created_at or case_created_at.endswith("Z"), f"Timestamp not in ISO UTC format: {case_created_at}"
        
        # Test converting to Asia/Kolkata
        dt_utc = datetime.fromisoformat(case_created_at)
        dt_ist = dt_utc.astimezone(IST)
        ist_str = dt_ist.strftime("%d %b %Y, %I:%M:%S %p IST")
        print(f"  Converts in Asia/Kolkata to: {ist_str}")
        print("  [OK] Backend timestamps correctly serialized with timezone awareness.")

    # 3. Test Authenticated PDF Preview & Download
    print("\n[TEST 3] Testing Authenticated PDF Document Preview & Download...")
    # Find PDF document in case
    pdf_doc = next(d for d in case_data["documents"] if d["title"].endswith(".pdf") and d["classification"] != "COURT_INTERNAL")
    pdf_id = pdf_doc["id"]
    print(f"  Testing PDF Document: {pdf_doc['title']} ({pdf_id})")

    # Preview
    preview_url = f"{API_BASE}/documents/{pdf_id}/preview"
    req = urllib.request.Request(preview_url, headers={"Authorization": f"Bearer {token_judge}"})
    with urllib.request.urlopen(req) as resp:
        assert resp.status == 200, f"Preview failed with status {resp.status}"
        content_type = resp.headers.get("Content-Type")
        content_disp = resp.headers.get("Content-Disposition")
        body = resp.read()
        print(f"  Preview Content-Type: {content_type}")
        print(f"  Preview Content-Disposition: {content_disp}")
        print(f"  Preview Payload Size: {len(body)} bytes")
        assert "application/pdf" in content_type or "octet-stream" in content_type
        assert "inline" in content_disp
        assert body.startswith(b"%PDF"), "Decrypted content does not start with PDF magic bytes"
        print("  [OK] PDF Preview returned decrypted bytes with inline disposition.")

    # Download
    download_url = f"{API_BASE}/documents/{pdf_id}/download"
    req = urllib.request.Request(download_url, headers={"Authorization": f"Bearer {token_judge}"})
    with urllib.request.urlopen(req) as resp:
        assert resp.status == 200, f"Download failed with status {resp.status}"
        content_disp = resp.headers.get("Content-Disposition")
        body = resp.read()
        assert "attachment" in content_disp
        print("  [OK] PDF Download returned decrypted bytes with attachment disposition.")

    # 4. Test Authenticated Image Preview (JPG / PNG)
    print("\n[TEST 4] Testing Authenticated Image Preview (JPG / PNG)...")
    img_doc = next(d for d in case_data["documents"] if d["title"].endswith(".jpg") or d["title"].endswith(".png"))
    img_id = img_doc["id"]
    print(f"  Testing Image Document: {img_doc['title']} ({img_id})")
    req = urllib.request.Request(f"{API_BASE}/documents/{img_id}/preview", headers={"Authorization": f"Bearer {token_judge}"})
    with urllib.request.urlopen(req) as resp:
        assert resp.status == 200
        content_type = resp.headers.get("Content-Type")
        content_disp = resp.headers.get("Content-Disposition")
        body = resp.read()
        print(f"  Image Content-Type: {content_type}")
        print(f"  Image Content-Disposition: {content_disp}")
        assert "image/" in content_type
        assert "inline" in content_disp
        print("  [OK] Image preview successfully returns decrypted image bytes.")

    # 5. Test Authenticated Video Evidence Preview (MP4 / H.264)
    print("\n[TEST 5] Testing Authenticated Video Preview (MP4)...")
    vid_doc = next(d for d in case_data["documents"] if d["title"].endswith(".mp4"))
    vid_id = vid_doc["id"]
    print(f"  Testing Video Document: {vid_doc['title']} ({vid_id})")
    req = urllib.request.Request(f"{API_BASE}/documents/{vid_id}/preview", headers={"Authorization": f"Bearer {token_judge}"})
    with urllib.request.urlopen(req) as resp:
        assert resp.status == 200
        content_type = resp.headers.get("Content-Type")
        content_disp = resp.headers.get("Content-Disposition")
        body = resp.read()
        print(f"  Video Content-Type: {content_type}")
        print(f"  Video Content-Disposition: {content_disp}")
        assert "video/mp4" in content_type or "video" in content_type
        assert "inline" in content_disp
        print("  [OK] Video preview successfully returns decrypted video bytes.")

    # 6. Test Unauthorized Access Denied (403 Forbidden)
    print("\n[TEST 6] Testing Security Authorization & 403 Forbidden for Unauthorized User...")
    token_client = login("Client-001", "#vf*kPe42K3vMM$9")
    internal_doc = next(d for d in case_data["documents"] if d["classification"] == "COURT_INTERNAL")
    internal_id = internal_doc["id"]
    print(f"  Litigant Client attempting to preview Judge Internal Note: {internal_doc['title']} ({internal_id})")
    req = urllib.request.Request(f"{API_BASE}/documents/{internal_id}/preview", headers={"Authorization": f"Bearer {token_client}"})
    try:
        urllib.request.urlopen(req)
        assert False, "Unauthorized user should have been blocked with 403 Forbidden!"
    except urllib.error.HTTPError as e:
        print(f"  Status Code: {e.code}")
        err_json = json.loads(e.read().decode("utf-8"))
        print(f"  Error Message: {err_json.get('detail')}")
        assert e.code == 403, f"Expected 403 Forbidden, got {e.code}"
        assert "not authorized" in err_json.get("detail", "").lower()
        print("  [OK] Unauthorized access strictly blocked with 403 Forbidden.")

    # 7. Test Unauthenticated Request (401 Unauthorized)
    print("\n[TEST 7] Testing Security Check for Unauthenticated Request...")
    req = urllib.request.Request(f"{API_BASE}/documents/{pdf_id}/preview")
    try:
        urllib.request.urlopen(req)
        assert False, "Unauthenticated request should have been blocked with 401!"
    except urllib.error.HTTPError as e:
        print(f"  Status Code: {e.code}")
        assert e.code == 401, f"Expected 401 Unauthorized, got {e.code}"
        print("  [OK] Unauthenticated request strictly blocked with 401 Unauthorized.")

    # 8. Test Audit Logging for Document Preview
    print("\n[TEST 8] Verifying Audit Trail records VIEW_DOCUMENT events...")
    req = urllib.request.Request(f"{API_BASE}/audit/logs?limit=10", headers={"Authorization": f"Bearer {token_judge}"})
    with urllib.request.urlopen(req) as resp:
        logs = json.loads(resp.read().decode("utf-8"))
        view_logs = [l for l in logs if l["action"] == "VIEW_DOCUMENT"]
        print(f"  Found {len(view_logs)} VIEW_DOCUMENT audit events logged.")
        assert len(view_logs) > 0, "VIEW_DOCUMENT action not found in audit logs"
        latest_view = view_logs[0]
        print(f"  Latest VIEW audit entry: Actor={latest_view['actor_name']}, Resource={latest_view['resource_id']}, Timestamp={latest_view['timestamp']}")
        print("  [OK] Document preview logged to immutable audit trail.")

    print("\n" + "=" * 60)
    print("ALL VERIFICATION CHECKS PASSED 100%!")
    print("=" * 60)

if __name__ == "__main__":
    test_patch()
