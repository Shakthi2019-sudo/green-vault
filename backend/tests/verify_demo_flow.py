import sys
import json
from pathlib import Path

# Set utf-8 encoding for terminal output
sys.stdout.reconfigure(encoding='utf-8')
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from fastapi.testclient import TestClient
from app.main import app
from app.config import settings
from app.database.database import SessionLocal, Base, engine
from app.database.seed_data import seed_database

def run_verification():
    print("============================================================")
    print("GREEN VAULT — MULTI-USER AUTHENTICATION & RBAC DEMO VERIFICATION")
    print("============================================================")

    # Initialize fresh database state for repeatable verification
    db = SessionLocal()
    try:
        Base.metadata.create_all(bind=engine)
        seed_database(db, force=True)
    finally:
        db.close()

    creds_file = settings.DEMO_CREDENTIALS_DIR / "demo_credentials.json"
    with open(creds_file, "r") as f:
        credentials = json.load(f)

    with TestClient(app, base_url="http://testserver/api") as client:
        # TEST ALL 9 CANONICAL DEMO ACCOUNTS AUTHENTICATION
        demo_accounts = [
            ("Judge-001", "JUDGE", "Hon. Justice Rajesh Sharma"),
            ("Judge-002", "JUDGE", "Hon. Justice Priya Malhotra"),
            ("Admin-001", "COURT_ADMIN", "Registrar General S. Sundaram"),
            ("Lawyer-001", "LAWYER", "Adv. Vikram Sethi"),
            ("Lawyer-002", "LAWYER", "Adv. Ananya Roy"),
            ("Assistant-001", "LAWYER", "Kavita Rao"),
            ("Client-001", "CLIENT", "Rohan Verma (Petitioner)"),
            ("Client-002", "CLIENT", "Meera Deshmukh (Respondent)"),
            ("Security-Simulation", "SECURITY_SIMULATION", "Automated Security Testbed"),
        ]

        print("\n--- AUTHENTICATING ALL 9 CANONICAL DEMO ACCOUNTS WITH ARGON2ID ---")
        user_tokens = {}
        for uname, expected_role, expected_name in demo_accounts:
            pwd = credentials[uname]
            res = client.post("/auth/login", json={"username": uname, "password": pwd})
            assert res.status_code == 200, f"Login failed for {uname}: {res.text}"
            res_data = res.json()
            assert res_data["token_type"] == "bearer"
            assert res_data["user"]["username"] == uname
            assert res_data["user"]["role"] == expected_role
            assert res_data["user"]["full_name"] == expected_name
            user_tokens[uname] = res_data["access_token"]
            print(f"  [OK] {uname} ({expected_role} - {expected_name}) authenticated successfully via Argon2id.")

        # STEP 1: Test Login for Judge Rajesh Sharma (Judge-001)
        print("\n[STEP 1] Verifying Judge-001 session & token...")
        judge_token = user_tokens["Judge-001"]
        judge_headers = {"Authorization": f"Bearer {judge_token}"}
        me_res = client.get("/auth/me", headers=judge_headers)
        assert me_res.status_code == 200
        assert me_res.json()["username"] == "Judge-001"
        print("  [OK] /auth/me successfully returned Judge-001 details.")

        # STEP 2: Verify RBAC Case Scoping for Judge-001
        print("\n[STEP 2] Verifying Case Access Permissions for Judge-001...")
        cases_res = client.get("/cases", headers=judge_headers)
        assert cases_res.status_code == 200
        cases = cases_res.json()
        auth_cases = [c['id'] for c in cases if c['is_authorized']]
        print(f"  [OK] Total cases listed: {len(cases)}. Authorized: {auth_cases}")
        assert "CASE-2026-001" in auth_cases
        assert "CASE-2026-002" in auth_cases
        assert "CASE-2026-003" not in auth_cases, "Judge-001 should not have initial access to CASE-003"

        # STEP 3: Load CASE-2026-001 and Check Documents & Video Evidence
        print("\n[STEP 3] Opening CASE-2026-001 Documents and Evidence...")
        c1_res = client.get("/cases/CASE-2026-001", headers=judge_headers)
        assert c1_res.status_code == 200
        c1_data = c1_res.json()
        doc_titles = [d['title'] for d in c1_data['documents']]
        print(f"  [OK] Case Loaded: '{c1_data['title']}'")
        print(f"  [OK] Documents present: {doc_titles}")

        # Check that judge sees COURT_INTERNAL note but not LAWYER_CONFIDENTIAL
        assert any("Judge_Internal_Note" in t for t in doc_titles), "Judge should see COURT_INTERNAL note"
        assert not any("Lawyer_Internal_Note" in t for t in doc_titles), "Judge should NOT see LAWYER_CONFIDENTIAL note"
        print("  [OK] Strict Document RBAC: Judge internal notes visible, Lawyer confidential notes masked.")

        # STEP 4: Authenticated Video Evidence Streaming & Preview
        print("\n[STEP 4] Testing Digital Video Evidence Preview & Streaming...")
        video_doc = next(d for d in c1_data['documents'] if 'Video' in d['title'] or d['title'].endswith('.mp4'))
        
        # Test 1: Header Auth Preview
        v_prev = client.get(f"/documents/{video_doc['id']}/preview", headers=judge_headers)
        assert v_prev.status_code == 200, f"Preview failed: {v_prev.status_code}"
        assert v_prev.headers["content-type"].startswith("video/mp4")
        assert "Accept-Ranges" in v_prev.headers
        print("  [OK] Authenticated video preview via Authorization Bearer header: 200 OK")

        # Test 2: Query Param Auth Preview (Native HTML5 <video> / <audio> streaming)
        v_stream = client.get(f"/documents/{video_doc['id']}/preview?token={judge_token}")
        assert v_stream.status_code == 200, f"Streaming token failed: {v_stream.status_code}"
        assert len(v_stream.content) > 0
        print("  [OK] Native HTML5 video player token URL (?token=JWT) streaming: 200 OK")

        # STEP 5: Document Integrity Verification
        print("\n[STEP 5] Verifying Document Integrity on Evidence_A.pdf...")
        evi_a = next(d for d in c1_data['documents'] if 'Evidence_A' in d['title'])
        verify_res = client.post(f"/documents/{evi_a['id']}/verify", headers=judge_headers)
        assert verify_res.status_code == 200
        v_data = verify_res.json()
        assert v_data["is_valid"] is True
        print(f"  [OK] Live SHA-256 Fingerprint Check: {v_data['status']}")
        print(f"  [OK] Message: '{v_data['message']}'")
        print(f"  [OK] Ledger Hash: {v_data['trusted_blockchain_hash']}")

        # STEP 6: Multi-Version Inspection
        print("\n[STEP 6] Inspecting Multi-Version History on Evidence_A.pdf...")
        doc_res = client.get(f"/documents/{evi_a['id']}", headers=judge_headers)
        assert doc_res.status_code == 200
        doc_data = doc_res.json()
        print(f"  [OK] Current Version: {doc_data['current_version']}")
        for v in doc_data['versions']:
            print(f"    - Version {v['version_number']}.0: {v['change_summary']} (SHA: {v['sha256_hash'][:16]}...)")

        # STEP 7: Lawyer Role Verification (Adv. Vikram Sethi / Lawyer-001)
        print("\n[STEP 7] Authenticating as Lawyer (Lawyer-001)...")
        lawyer_token = user_tokens["Lawyer-001"]
        lawyer_headers = {"Authorization": f"Bearer {lawyer_token}"}
        
        # Lawyer opens CASE-2026-001
        l_case_res = client.get("/cases/CASE-2026-001", headers=lawyer_headers)
        assert l_case_res.status_code == 200
        l_docs = [d['title'] for d in l_case_res.json()['documents']]
        assert any("Lawyer_Internal_Note" in t for t in l_docs), "Lawyer should see LAWYER_CONFIDENTIAL note"
        assert not any("Judge_Internal_Note" in t for t in l_docs), "Lawyer should NOT see COURT_INTERNAL note"
        print("  [OK] Lawyer RBAC verified: Lawyer sees client-lawyer notes, denied judge internal drafts.")

        # STEP 8: Client Role Verification (Rohan Verma / Client-001)
        print("\n[STEP 8] Authenticating as Litigant Client (Client-001)...")
        client_token = user_tokens["Client-001"]
        client_headers = {"Authorization": f"Bearer {client_token}"}
        
        # Client views CASE-2026-001
        c_case_res = client.get("/cases/CASE-2026-001", headers=client_headers)
        assert c_case_res.status_code == 200
        c_docs = [d['title'] for d in c_case_res.json()['documents']]
        assert not any("Judge_Internal_Note" in t for t in c_docs), "Client should NOT see judge notes"
        assert not any("Lawyer_Internal_Note" in t for t in c_docs), "Client should NOT see internal lawyer drafts"
        assert any("Petition" in t for t in c_docs), "Client can see public case petitions and orders"
        print("  [OK] Client RBAC verified: Restricted to public records, evidence, and court orders.")

        # STEP 9: Cross-Case Authorization Request & Court Admin Approval
        print("\n[STEP 9] Testing Access Request Flow: Judge-001 requesting CASE-2026-003...")
        c3_denied = client.get("/cases/CASE-2026-003", headers=judge_headers)
        assert c3_denied.status_code == 403
        print(f"  [OK] Unauthorized case blocked with 403 Forbidden: {c3_denied.json()['detail']}")

        # Submit request
        req_res = client.post(
            "/access-requests",
            headers=judge_headers,
            json={
                "case_id": "CASE-2026-003",
                "requested_permissions": ["VIEW", "DOWNLOAD"],
                "reason": "Special bench review assignment."
            }
        )
        assert req_res.status_code == 200
        req_id = req_res.json()["id"]

        # Admin approves
        admin_token = user_tokens["Admin-001"]
        admin_headers = {"Authorization": f"Bearer {admin_token}"}

        approve_res = client.post(
            f"/access-requests/{req_id}/approve",
            headers=admin_headers,
            json={"status": "APPROVED", "review_note": "Approved by Court Administrator"}
        )
        assert approve_res.status_code == 200
        print("  [OK] Court Administrator approved access request on blockchain.")

        # Judge can now open CASE-2026-003
        c3_granted = client.get("/cases/CASE-2026-003", headers=judge_headers)
        assert c3_granted.status_code == 200
        print(f"  [OK] Judge-001 now authorized for CASE-2026-003: '{c3_granted.json()['title']}'")

        # STEP 10: Simulated Tamper & Isolated Vault Recovery
        print("\n[STEP 10] Testing Tamper Detection & Isolated Vault Recovery...")
        tamper_res = client.post(f"/simulation/tamper-document?document_id={evi_a['id']}")
        assert tamper_res.status_code == 200
        
        # Verify integrity mismatch
        tamper_verify = client.post(f"/documents/{evi_a['id']}/verify", headers=judge_headers)
        assert tamper_verify.status_code == 200
        assert tamper_verify.json()["is_valid"] is False
        print("  [OK] Tamper detected immediately via SHA-256 recomputation!")

        # Restore from recovery vault
        restore_res = client.post(
            f"/recovery/{evi_a['id']}/restore",
            headers=judge_headers,
            json={"reason": "Restoration from certified isolated vault"}
        )
        assert restore_res.status_code == 200
        print(f"  [OK] {restore_res.json()['message']}")

        # Re-verify clean
        clean_res = client.post(f"/documents/{evi_a['id']}/verify", headers=judge_headers)
        assert clean_res.status_code == 200
        assert clean_res.json()["is_valid"] is True
        print("  [OK] Document pristine state restored and verified ✓")

        # STEP 11: Blockchain Ledger Integrity
        print("\n[STEP 11] Validating Entire Blockchain Ledger...")
        chain_res = client.get("/blockchain/verify-chain")
        assert chain_res.status_code == 200
        report = chain_res.json()
        assert report["is_valid"] is True
        print(f"  [OK] Blockchain Valid: {report['verified_blocks']} / {report['total_blocks']} blocks verified from Genesis to Tip.")

    print("\n============================================================")
    print("ALL MULTI-USER AUTH & RBAC DEMO TESTS 100% PASSED!")
    print("============================================================")

if __name__ == "__main__":
    run_verification()
