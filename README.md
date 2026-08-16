# GREEN VAULT — A Trusted Digital Vault for Legal Records

> **"Existing legal systems contain different parts of a case. Green Vault provides one unified interface for authorized stakeholders and creates a trusted, traceable lifecycle for important legal records."**

---

## 1. Project Overview
**GREEN VAULT** is a full-stack, blockchain-based Legal eVault built to securely manage, verify, and track legal records across judicial stakeholders:
- **Judges** (Assigned Judges, Reviewing Judges)
- **Court Administrators** (System oversight, access approval, recovery operations)
- **Lawyers** (Lead Lawyers, Associate Lawyers, Legal Assistants)
- **Clients & Litigants** (Authorized viewing & certified downloads)

Conceptually inspired by the historical Green Vault collection in Dresden (a protected vault of valuable records), this modern legal technology platform establishes a single unified source of truth for case documents, evidence, court orders, and access permissions while bridging information from national legal tech systems (**eCourts, e-Filing, DigiLocker, ICJS, and eSakshya**).

---

## 2. Core Architecture & Security Model

```
                  +-------------------------------------------------------------+
                  |                 GREEN VAULT REACT FRONTEND                  |
                  |  - 4.5s Opening Brand Animation (Framer Motion + SVG)       |
                  |  - Unified Case View & Document Inspector                   |
                  |  - Plain-Language Dashboard & Live Security Monitoring      |
                  |  - Blockchain Ledger Explorer & Chain Verification Tool     |
                  |  - Access Request Workflow & Isolated Recovery Vault UI     |
                  |  - Demo-Only Security Simulation Route                      |
                  +------------------------------+------------------------------+
                                                 | REST API (JWT Authenticated)
                                                 v
+---------------------------------------------------------------------------------------------------+
|                                   FASTAPI BACKEND ARCHITECTURE                                    |
+---------------------+---------------------+---------------------+---------------------------------+
|     AuthService     |   DocumentService   |  BlockchainService  |        PermissionService        |
| - Argon2id Hashing  | - AES-256-GCM Enc   | - Hash-Chained Log  | - Role + Sub-Role + Case RBAC   |
| - JWT Tokens        | - Versioning (v1-4) | - Prev-Hash Linking | - Access Requests Workflow      |
| - Secret Seed Gen   | - Vault Storage     | - Chain Verify      | - Emergency Access Logging      |
+---------------------+---------------------+---------------------+---------------------------------+
|   IntegrityService  |   SecurityService   |   RecoveryService   | Integration & Audit Services    |
| - SHA-256 Fingerp.  | - Rule Risk Engine  | - Isolated Vault    | - Mock eCourts/DigiLocker/ICJS  |
| - Live Re-check     | - Plain Lang Alerts | - Tamper Restrict   | - System-wide Audit Trails      |
| - Mismatch Detection| - Status: G/Y/R     | - One-Click Restore |                                 |
+---------------------+---------------------+---------------------+---------------------------------+
                                                 |
                                                 v
+---------------------------------------------------------------------------------------------------+
|                                      PERSISTENCE & STORAGE                                        |
|  - SQLite Database: Users, Cases, Documents, Permissions, Requests, BlockchainTx, Security, Audit  |
|  - Storage Vaults: Primary Encrypted Vault (AES-GCM) & Isolated Immutable Recovery Vault         |
+---------------------------------------------------------------------------------------------------+
```

### Security & Cryptographic Standards
1. **Password Storage**: Passwords are never stored as plaintext or plain SHA-256. They are hashed using **Argon2id** (`argon2-cffi`).
2. **Document Encryption**: Stored file payloads are encrypted on disk using **AES-256-GCM** (AEAD) with 96-bit unique nonces.
3. **Integrity Fingerprints**: Plaintext files are fingerprinted using **SHA-256** and anchored to the blockchain.
4. **Append-Only Blockchain Ledger**: `BlockchainService` implements a permissioned, hash-chained ledger in SQLite where each transaction hash = `SHA-256(previous_hash + block contents)`.
5. **Chain Verification**: Includes a cryptographic traversal tool that recalculates every block hash from Genesis to Tip to detect tampering.
6. **Isolated Recovery Vault**: Maintains air-gapped backup copies of original files and trusted hashes, supporting 1-click restoration if unexpected primary vault modifications occur.

---

## 3. Technology Stack

- **Backend**: Python 3.12, FastAPI, Pydantic, SQLAlchemy 2.0, SQLite, PyJWT, Argon2id (`argon2-cffi`), `cryptography` (AES-256-GCM), `reportlab` (legal PDF generator), `python-multipart`, `pytest`, `httpx`.
- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, React Router DOM, Framer Motion (intro animation & light transitions), Lucide React.
- **Blockchain**: Standalone SQLite permissioned hash-chained ledger (`BlockchainTransaction`) architected for future Hyperledger Fabric migration.

---

## 4. Free Local Setup (No Paid Services / No Docker)

### Prerequisites
- Python 3.11+
- Node.js 18+ and npm

### Backend Setup
```bash
# 1. Navigate to backend
cd backend

# 2. Install Python dependencies
pip install fastapi "uvicorn[standard]" pydantic pydantic-settings sqlalchemy pyjwt argon2-cffi cryptography python-multipart pytest httpx reportlab

# 3. Run unit & integration tests
pytest tests/test_backend.py -v

# 4. Start FastAPI server (seeds DB automatically on first launch)
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```
Backend API will be running at `http://127.0.0.1:8000` (API Docs at `http://127.0.0.1:8000/docs`).

### Frontend Setup
```bash
# 1. In a separate terminal, navigate to frontend
cd frontend

# 2. Install npm dependencies
npm install

# 3. Start Vite dev server
npm run dev -- --host 127.0.0.1 --port 5173
```
Frontend will be running at `http://127.0.0.1:5173`.

---

## 5. Demo Accounts & Credentials

Demo accounts are seeded with cryptographically random strong passwords generated by Python's `secrets` module.
Credentials for hackathon evaluation are documented in:
- **[`demo/credentials/GREEN_VAULT_DEMO_CREDENTIALS.md`](file:///d:/Green%20Vault/demo/credentials/GREEN_VAULT_DEMO_CREDENTIALS.md)**

For quick evaluator convenience during live demonstrations, the application includes a **Quick Persona Switcher** in the top navbar and one-click role tabs on the login screen.

| Username | Role | Sub-Role | Assigned Demo Cases |
| :--- | :--- | :--- | :--- |
| `Judge-001` | **JUDGE** | Assigned Judge | CASE-2026-001, CASE-2026-002 |
| `Judge-002` | **JUDGE** | Reviewing Judge | CASE-2026-002 |
| `Admin-001` | **COURT_ADMIN** | Court Administrator | All Cases (System Administration) |
| `Lawyer-001` | **LAWYER** | Lead Lawyer | CASE-2026-001 |
| `Lawyer-002` | **LAWYER** | Associate Lawyer | CASE-2026-002 |
| `Assistant-001`| **LAWYER** | Legal Assistant | CASE-2026-001 |
| `Client-001` | **CLIENT** | Litigant Client | CASE-2026-001 |
| `Client-002` | **CLIENT** | Litigant Client | CASE-2026-002 |
| `Security-Simulation` | **SECURITY_SIMULATION** | Security Testbed | Demo Only Testbed |

---

## 6. Turnkey 13-Step Hackathon Demo Flow

The complete end-to-end hackathon demonstration script is detailed in **[`docs/demo.md`](file:///d:/Green%20Vault/docs/demo.md)**.

1. **Step 1**: Open `http://127.0.0.1:5173` &rarr; 4.5s Opening Brand Animation &rarr; Click "ENTER THE VAULT".
2. **Step 2 & 3**: Select Judge tab &rarr; Log in as `Judge-001`.
3. **Step 4**: View Plain-Language Dashboard with verified metrics and active security status ("Everything looks normal ✓").
4. **Step 5**: Open `CASE-2026-001` &rarr; Inspect Unified Case View (People, Documents, Evidence, Multi-Version History, Blockchain History, Connected Systems).
5. **Step 6**: Open `Evidence_A.pdf` &rarr; Click "Verify Document Integrity" &rarr; Confirm *"Document verified. No unexpected changes detected. ✓"*.
6. **Step 7**: Inspect Version History timeline (Versions 1, 2, 3).
7. **Step 8**: Attempt opening unauthorized case `CASE-2026-003` &rarr; View Authorization Required modal &rarr; Submit Access Request.
8. **Step 9**: Switch persona to Court Administrator (`Admin-001`) &rarr; Open Access Requests &rarr; Click "Approve Access".
9. **Step 10**: Switch back to `Judge-001` &rarr; Open `CASE-2026-003` &rarr; Access is granted!
10. **Step 11**: Create Version 4 on `Evidence_A.pdf` &rarr; Previous versions preserved, new blockchain transaction minted.
11. **Step 12**: Enter DEMO ONLY Security Simulation (`/simulation`) &rarr; Trigger "Simulated Document Tampering" &rarr; View real-time alert and 6-step lifecycle: `DETECT` &rarr; `BLOCK` &rarr; `VERIFY` &rarr; `PRESERVE` &rarr; `RECOVER` &rarr; `RECORD`.
12. **Step 13**: Open Isolated Recovery Vault (`/recovery`) &rarr; Click "Restore Trusted Version" &rarr; Confirm *"Document restored successfully. Integrity verified ✓. Recovery event recorded."*.
13. **Step 14**: Open Blockchain Ledger (`/blockchain`) &rarr; Click "Verify Entire Blockchain" &rarr; Confirm *"Chain Verified ✓ 0 Tampering Detected"*.

---

## 7. Important Project Disclosures (Section 52)

- **Hackathon Prototype**: This application is a hackathon prototype designed for demonstration and architectural validation.
- **Mock Integrations**: Legal-system integrations (**eCourts, e-Filing, DigiLocker, ICJS, eSakshya**) are mock/demo connectors and do not connect to live government databases.
- **Blockchain Layer**: The blockchain layer is implemented as a permissioned, hash-chained event ledger in SQLite for free local execution, architected with standard interfaces for future migration to Hyperledger Fabric.
- **Cryptographic Protections**: Passwords are exclusively hashed with **Argon2id**; documents are encrypted with **AES-256-GCM** and fingerprinted with **SHA-256**.
- **Security Triage**: Security monitoring and risk detection engines are rule-based, prioritizing explainability over black-box heuristics.
# green-vault
a26ee71df3a9117c8462fdc54a5bfe74225be9bc
