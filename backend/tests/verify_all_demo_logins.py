import urllib.request
import urllib.error
import json

API_BASE = "http://127.0.0.1:8000/api"
FRONTEND_BASE = "http://localhost:5173"

def test_all_demo_logins():
    print("=" * 60)
    print("GREEN VAULT — LIVE AUTHENTICATION REGRESSION SUITE")
    print("=" * 60)

    # 1. Test frontend credentials json accessibility
    print("\n[CHECK 1] Testing Frontend static asset /demo/credentials/demo_credentials.json...")
    req = urllib.request.Request(f"{FRONTEND_BASE}/demo/credentials/demo_credentials.json")
    with urllib.request.urlopen(req) as resp:
        assert resp.status == 200
        fe_creds = json.loads(resp.read().decode("utf-8"))
        print(f"  [OK] Frontend served credentials JSON with {len(fe_creds)} demo accounts.")

    # 2. Test All 9 Demo Accounts
    demo_accounts = [
        ("Judge-001", "JUDGE", "Assigned Judge", ["CASE-2026-001", "CASE-2026-002"]),
        ("Judge-002", "JUDGE", "Reviewing Judge", ["CASE-2026-002"]),
        ("Admin-001", "COURT_ADMIN", "Court Administrator", ["CASE-2026-001", "CASE-2026-002", "CASE-2026-003", "CASE-2026-004", "CASE-2026-005"]),
        ("Lawyer-001", "LAWYER", "Lead Lawyer", ["CASE-2026-001"]),
        ("Lawyer-002", "LAWYER", "Associate Lawyer", ["CASE-2026-002"]),
        ("Assistant-001", "LAWYER", "Legal Assistant", ["CASE-2026-001"]),
        ("Client-001", "CLIENT", "Litigant Client", ["CASE-2026-001"]),
        ("Client-002", "CLIENT", "Litigant Client", ["CASE-2026-002"]),
        ("Security-Simulation", "SECURITY_SIMULATION", "Security Simulation (Demo Only)", []),
    ]

    print("\n[CHECK 2] Authenticating all 9 canonical demo accounts via POST /auth/login...")
    for uname, expected_role, expected_sub_role, expected_cases in demo_accounts:
        assert uname in fe_creds, f"Account {uname} missing in frontend credentials JSON!"
        password = fe_creds[uname]

        # Login Request
        login_url = f"{API_BASE}/auth/login"
        payload = json.dumps({"username": uname, "password": password}).encode("utf-8")
        login_req = urllib.request.Request(login_url, data=payload, headers={"Content-Type": "application/json"})
        
        with urllib.request.urlopen(login_req) as resp:
            assert resp.status == 200, f"Login failed for {uname} with status {resp.status}"
            data = json.loads(resp.read().decode("utf-8"))
            
            # Check JWT token returned
            token = data.get("access_token")
            assert token, f"No access token returned for {uname}"
            token_type = data.get("token_type")
            assert token_type == "bearer"

            # Check User profile
            user = data.get("user")
            assert user["username"] == uname
            assert user["role"] == expected_role
            assert user["sub_role"] == expected_sub_role
            for cid in expected_cases:
                assert cid in user["assigned_cases"], f"Case {cid} missing in assigned cases for {uname}"

            # Check GET /auth/me with JWT
            me_req = urllib.request.Request(f"{API_BASE}/auth/me", headers={"Authorization": f"Bearer {token}"})
            with urllib.request.urlopen(me_req) as me_resp:
                assert me_resp.status == 200
                me_user = json.loads(me_resp.read().decode("utf-8"))
                assert me_user["username"] == uname
                assert me_user["role"] == expected_role

            print(f"  [OK] {uname:19} | Role: {expected_role:12} | Sub-Role: {expected_sub_role:28} | Auth: SUCCESS (JWT Validated)")

    # 3. Test Invalid Credentials Rejected
    print("\n[CHECK 3] Testing that invalid passwords are properly rejected (401 Unauthorized)...")
    bad_payload = json.dumps({"username": "Judge-001", "password": "WrongPassword123!"}).encode("utf-8")
    bad_req = urllib.request.Request(f"{API_BASE}/auth/login", data=bad_payload, headers={"Content-Type": "application/json"})
    try:
        urllib.request.urlopen(bad_req)
        assert False, "Invalid password was unexpectedly accepted!"
    except urllib.error.HTTPError as e:
        assert e.code == 401
        err = json.loads(e.read().decode("utf-8"))
        assert err.get("detail") == "Incorrect username or password"
        print("  [OK] Invalid password correctly returned 401 'Incorrect username or password'.")

    print("\n" + "=" * 60)
    print("ALL 9 DEMO ACCOUNTS & SECURITY TESTS PASSED 100%!")
    print("=" * 60)

if __name__ == "__main__":
    test_all_demo_logins()
