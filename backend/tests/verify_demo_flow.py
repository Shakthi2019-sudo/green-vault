import sys
sys.stdout.reconfigure(encoding='utf-8')
import json
import httpx
from pathlib import Path

BASE_URL = "http://127.0.0.1:8000/api"
CREDS_FILE = Path(r"D:\Green Vault\demo\credentials\demo_credentials.json")

def run_verification():
    print("============================================================")
    print("GREEN VAULT — END-TO-END HACKATHON DEMO FLOW VERIFICATION")
    print("============================================================")

    with open(CREDS_FILE, "r") as f:
        credentials = json.load(f)

    with httpx.Client(base_url=BASE_URL, timeout=10.0) as client:
        # STEP 1 & 2 & 3: Login as Judge-001
        print("\n[STEP 1-3] Authenticating as Judge-001...")
        judge_pwd = credentials["Judge-001"]
        login_res = client.post("/auth/login", json={"username": "Judge-001", "password": judge_pwd})
        assert login_res.status_code == 200, f"Login failed: {login_res.text}"
        judge_token = login_res.json()["access_token"]
        judge_headers = {"Authorization": f"Bearer {judge_token}"}
        print("  [OK] Login successful. JWT issued. Role: Judge-001 (Assigned Judge)")

        # STEP 4: Dashboard data verification
        print("\n[STEP 4] Fetching Judge Dashboard...")
        cases_res = client.get("/cases", headers=judge_headers)
        assert cases_res.status_code == 200
        cases = cases_res.json()
        print(f"  [OK] Fetched {len(cases)} cases. Authorized cases: {[c['id'] for c in cases if c['is_authorized']]}")

        # STEP 5: Open CASE-2026-001
        print("\n[STEP 5] Opening CASE-2026-001 (Unified Case View)...")
        c1_res = client.get("/cases/CASE-2026-001", headers=judge_headers)
        assert c1_res.status_code == 200
        c1_data = c1_res.json()
        print(f"  [OK] Case Loaded: '{c1_data['title']}'")
        print(f"  [OK] Verified Documents Count: {len(c1_data['documents'])}")
        print(f"  [OK] Assigned People: {[p['full_name'] for p in c1_data['people']]}")

        # STEP 6: Open Evidence_A.pdf & Verify Integrity
        print("\n[STEP 6] Verifying Document Integrity on Evidence_A.pdf...")
        evi_a = next(d for d in c1_data['documents'] if 'Evidence_A' in d['title'])
        verify_res = client.post(f"/documents/{evi_a['id']}/verify", headers=judge_headers)
        assert verify_res.status_code == 200
        v_data = verify_res.json()
        assert v_data["is_valid"] is True
        print(f"  [OK] Live SHA-256 Fingerprint Check: {v_data['status']}")
        print(f"  [OK] Status: '{v_data['message']}'")
        print(f"  [OK] Stored Ledger Fingerprint: {v_data['trusted_blockchain_hash']}")

        # STEP 7: Check Document History (v1, v2, v3)
        print("\n[STEP 7] Inspecting Multi-Version History on Evidence_A.pdf...")
        doc_res = client.get(f"/documents/{evi_a['id']}", headers=judge_headers)
        assert doc_res.status_code == 200
        doc_data = doc_res.json()
        print(f"  [OK] Current Version: {doc_data['current_version']}")
        print(f"  [OK] Recorded Versions Timeline:")
        for v in doc_data['versions']:
            print(f"    - Version {v['version_number']}.0: {v['change_summary']} (SHA: {v['sha256_hash'][:16]}...)")

        # STEP 8: Try opening unauthorized CASE-2026-003 & submit access request
        print("\n[STEP 8] Attempting access to unauthorized CASE-2026-003...")
        c3_res = client.get("/cases/CASE-2026-003", headers=judge_headers)
        assert c3_res.status_code == 403, "Expected 403 Forbidden"
        print(f"  [OK] Access control blocked unauthorized view: {c3_res.json()['detail']}")

        print("  Submitting Access Request to Court Administration...")
        req_res = client.post(
            "/access-requests",
            headers=judge_headers,
            json={
                "case_id": "CASE-2026-003",
                "requested_permissions": ["VIEW", "DOWNLOAD"],
                "reason": "Bench assignment review & adjudication requirement."
            }
        )
        assert req_res.status_code == 200
        req_data = req_res.json()
        req_id = req_data["id"]
        print(f"  [OK] Access Request Created: {req_id} (Status: {req_data['status']})")

        # STEP 9: Login as Court Administrator (Admin-001) & Approve Request
        print("\n[STEP 9] Switching Persona to Court Administrator (Admin-001)...")
        admin_pwd = credentials["Admin-001"]
        admin_login = client.post("/auth/login", json={"username": "Admin-001", "password": admin_pwd})
        assert admin_login.status_code == 200
        admin_token = admin_login.json()["access_token"]
        admin_headers = {"Authorization": f"Bearer {admin_token}"}

        print("  Approving pending access request...")
        approve_res = client.post(
            f"/access-requests/{req_id}/approve",
            headers=admin_headers,
            json={"status": "APPROVED", "review_note": "Granted by Court Administrator for judicial bench review."}
        )
        assert approve_res.status_code == 200
        print(f"  [OK] Request {req_id} Approved. Permission recorded on Blockchain!")

        # STEP 10: Return to Judge-001 & Open CASE-2026-003
        print("\n[STEP 10] Returning to Judge-001 context...")
        c3_auth_res = client.get("/cases/CASE-2026-003", headers=judge_headers)
        assert c3_auth_res.status_code == 200
        c3_auth_data = c3_auth_res.json()
        print(f"  [OK] Successfully opened newly authorized case: '{c3_auth_data['title']}'")

        # STEP 11: Create a new legitimate document version
        print("\n[STEP 11] Creating Version 4 on Evidence_A.pdf...")
        dummy_v4_content = b"%PDF-1.4 Mock Legal PDF Content Version 4 Addendum Certified"
        v4_res = client.post(
            f"/documents/{evi_a['id']}/versions",
            headers=judge_headers,
            data={"change_summary": "Schedule 5 Additional Covenant Sealed"},
            files={"file": ("Evidence_A_v4.pdf", dummy_v4_content, "application/pdf")}
        )
        assert v4_res.status_code == 200
        v4_data = v4_res.json()
        print(f"  [OK] Version {v4_data['version_number']} created!")
        print(f"  [OK] New SHA-256 Fingerprint: {v4_data['sha256_hash']}")

        # STEP 12: Trigger Security Simulation Document Tampering
        print("\n[STEP 12] Triggering DEMO ONLY Simulated Document Tampering...")
        tamper_res = client.post(f"/simulation/tamper-document?document_id={evi_a['id']}")
        assert tamper_res.status_code == 200
        t_data = tamper_res.json()
        print(f"  [OK] Simulation Triggered: {t_data['simulation_type']}")
        print(f"  [OK] Pipeline Response: {t_data['message']}")

        # Verify integrity check now catches tampering
        sec_verify_res = client.post(f"/documents/{evi_a['id']}/verify", headers=judge_headers)
        assert sec_verify_res.status_code == 200
        sec_v_data = sec_verify_res.json()
        assert sec_v_data["is_valid"] is False
        print(f"  [OK] Alert verified: '{sec_v_data['message']}' (Status: {sec_v_data['status']})")

        # STEP 13: Open Isolated Recovery Vault & Restore Trusted Copy
        print("\n[STEP 13] Executing Recovery from Isolated Recovery Vault...")
        restore_res = client.post(
            f"/recovery/{evi_a['id']}/restore",
            headers=judge_headers,
            json={"reason": "Authorized judicial recovery from isolated recovery vault"}
        )
        assert restore_res.status_code == 200
        r_data = restore_res.json()
        print(f"  [OK] {r_data['message']}")

        # Re-verify clean status
        clean_verify = client.post(f"/documents/{evi_a['id']}/verify", headers=judge_headers)
        assert clean_verify.status_code == 200
        assert clean_verify.json()["is_valid"] is True
        print(f"  [OK] Document re-verified: {clean_verify.json()['message']}")

        # STEP 14: Cryptographic Chain Verification
        print("\n[STEP 14] Validating Entire Hash-Chained Blockchain Ledger...")
        chain_res = client.get("/blockchain/verify-chain")
        assert chain_res.status_code == 200
        chain_report = chain_res.json()
        assert chain_report["is_valid"] is True
        print(f"  [OK] Result: '{chain_report['message']}'")
        print(f"  [OK] Total Blocks in Chain: {chain_report['total_blocks']}")
        print(f"  [OK] Tampered Blocks Detected: {len(chain_report['tampered_blocks'])}")
        print(f"  [OK] Genesis Hash: {chain_report['genesis_hash'][:24]}...")
        print(f"  [OK] Tip Hash:     {chain_report['tip_hash'][:24]}...")

    print("\n============================================================")
    print("ALL 13 DEMO STEPS VERIFIED & 100% OPERATIONAL!")
    print("============================================================")

if __name__ == "__main__":
    run_verification()
