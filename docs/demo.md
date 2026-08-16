# GREEN VAULT — Hackathon Live Demo Script (13 Steps)

This document provides a turnkey script for presenting the **GREEN VAULT** hackathon prototype in 3 to 5 minutes.

---

### Step 1: Opening Brand Experience (0:00 - 0:15)
- Open `http://127.0.0.1:5173`.
- **Observe**: The 4.5-second brand animation featuring the precision SVG Green Vault crest, gold seal, and tagline: *"A Trusted Digital Vault for Legal Records"*.
- Click **"ENTER THE VAULT"** (or "Skip Intro").

---

### Step 2 & 3: Role Selection & Authentication (0:15 - 0:40)
- On the Login screen, click the **"Judge"** tab.
- Observe that `Judge-001` (Hon. Justice Rajesh Sharma) is selected with its Argon2id password prefilled for evaluation.
- Click **"Sign In to Green Vault"**.

---

### Step 4: Plain-Language Dashboard (0:40 - 1:00)
- **Showcase**:
  - Greeting: *"Welcome back, Hon. Justice Rajesh Sharma"*
  - Security Health: *"Everything looks normal ✓"*
  - KPI Cards: My Cases (2/3 authorized), Trusted Docs (10 Verified), Requests (1 Waiting), Ledger Blocks, Recovery Status.
  - Recent plain-language blockchain event feed on the right.

---

### Step 5: Unified Case View (1:00 - 1:30)
- Click **"Cases"** in the sidebar and open **`CASE-2026-001` ("Sharma vs. Apex Infrastructure Ltd.")**.
- **Showcase**: The Unified Case View bringing together People, Documents, Evidence, Multi-Version History, Blockchain History, and Connected Legal Systems (eCourts, DigiLocker, ICJS).

---

### Step 6: Live Document Integrity Verification (1:30 - 1:55)
- Click on **`Evidence_A.pdf`**.
- Click the **"Verify Document Integrity"** button.
- **Showcase**: Real-time SHA-256 fingerprint recomputation & comparison against the blockchain ledger: *"Document verified. No unexpected changes detected. ✓"*.

---

### Step 7: Document Multi-Version Lifecycle (1:55 - 2:15)
- In the Document Inspector, scroll to the **Version History** section.
- **Showcase**: Versions 1, 2, and 3 timeline with distinct timestamps, diff change summaries, and independent SHA-256 fingerprints.

---

### Step 8: Access Control & Request Access Workflow (2:15 - 2:40)
- Return to **"Cases"** and click on the unauthorized case **`CASE-2026-003` ("Heritage Estate Title Adjudication")**.
- **Showcase**: The Access Authorization Required modal: *"You are not currently authorized to view this case."*.
- Click **"Submit Access Request"** with judicial justification.

---

### Step 9: Administrative Review & Blockchain Permission Grant (2:40 - 3:05)
- Click the **"Switch Persona"** button in the top navbar and switch to **`Admin-001` (Registrar General S. Sundaram)**.
- Navigate to **"Access Requests"**.
- Locate the pending request from `Judge-001` for `CASE-2026-003`.
- Click **"Approve Access"**.
- **Showcase**: Instant permission grant recorded as a `PERMISSION_GRANTED` block on the blockchain ledger!

---

### Step 10: Verified Authorized Case Access (3:05 - 3:20)
- Switch persona back to **`Judge-001`**.
- Navigate to **"Cases"** and open **`CASE-2026-003`**.
- **Showcase**: The case is now fully authorized and unlocked!

---

### Step 11: Create Legitimate New Version (3:20 - 3:45)
- Open `Evidence_A.pdf` and click **"New Version"**.
- Enter change summary *"Schedule 5 Additional Covenant Sealed"* and upload a file.
- **Showcase**: Version 4 is created, previous versions 1–3 remain preserved, and a new blockchain block is minted.

---

### Step 12: Safe Security Simulation — Document Tampering (3:45 - 4:15)
- Click **"Security Simulation"** (marked DEMO ONLY) in the sidebar.
- Click **"Trigger Document Tampering Simulation"**.
- **Showcase**: The real-time 6-step defense lifecycle:
  `DETECT` &rarr; `BLOCK` &rarr; `VERIFY` &rarr; `PRESERVE` &rarr; `RECOVER` &rarr; `RECORD`.
- The document is restricted and flagged with a SHA-256 mismatch alert.

---

### Step 13: Isolated Recovery Vault Restoration (4:15 - 4:45)
- Click **"Open Isolated Recovery Vault"** in the sidebar.
- Locate the quarantined document and compare the detected tampered hash against the trusted isolated master hash.
- Click **"Restore Trusted Version"**.
- **Showcase**: *"Document restored successfully. Integrity verified ✓. Recovery event recorded."*.

---

### Step 14: Final Cryptographic Blockchain Chain Verification (4:45 - 5:00)
- Navigate to **"Blockchain Ledger"** and click **"Verify Entire Blockchain"**.
- **Showcase**: *"Chain Verified ✓ 0 Tampering Detected"* across all transactions from Genesis to Tip!
