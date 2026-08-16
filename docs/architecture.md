# GREEN VAULT — System Architecture Specification

## 1. System Philosophy & Objectives
**GREEN VAULT** is a trusted digital vault and lifecycle management platform for legal records. Inspired conceptually by the historic Green Vault in Dresden (a protected repository for high-value assets), the platform addresses the acute problem of legal records fragmentation across disparate systems (such as eCourts, e-Filing, DigiLocker, ICJS, and eSakshya) by establishing a unified, tamper-evident, and auditable legal repository.

```
                      +------------------------------------------+
                      |         GREEN VAULT LEGAL EVAULT         |
                      +--------------------+---------------------+
                                           |
    +------------------+-------------------+-------------------+------------------+
    |                  |                   |                   |                  |
+---v----+        +----v----+         +----v----+         +----v----+        +----v----+
| Judges |        | Lawyers |         | Clients |         | Admins  |        | Security|
+--------+        +---------+         +---------+         +---------+        +---------+
```

---

## 2. Core Service Boundaries

### 2.1 AuthService
- **Password Security**: Argon2id password hashing via `argon2-cffi` (`PasswordHasher` with 64MB memory cost, 2 iterations, 32-byte hash length, 16-byte salt).
- **Session Tokens**: Stateless JSON Web Tokens (PyJWT) containing standard claims (`sub`, `exp`).
- **Demo Accounts**: Passwords generated at database seeding using Python's cryptographically secure `secrets` module and output to `GREEN_VAULT_DEMO_CREDENTIALS.md`.

### 2.2 DocumentService & Encryption Pipeline
- **Confidentiality**: Real symmetric encryption using **AES-256-GCM** (via Python `cryptography` library).
  - 256-bit AES master key.
  - Unique 96-bit (12-byte) initialization vector (IV / Nonce) per document version.
  - 128-bit (16-byte) authentication tag appended for authenticated decryption (AEAD).
- **Storage Strategy**: Actual file payloads are stored in the filesystem (`storage/primary_vault/`) encrypted. The blockchain does not store raw binaries.

### 2.3 BlockchainService (Permissioned Hash-Chained Ledger)
- **Primary Blockchain Engine**: Append-only hash-chained event ledger stored in SQLite (`BlockchainTransaction` table).
- **Block Structure**:
  - `sequence_number`: Monotonically increasing sequence integer.
  - `timestamp`: ISO-8601 UTC timestamp.
  - `previous_hash`: SHA-256 hash of previous block (`0` * 64 for genesis).
  - `transaction_hash`: SHA-256(`sequence_number` + `timestamp` + `previous_hash` + `event_type` + `case_id` + `document_id` + `user_id` + `status` + `details_json`).
- **Cryptographic Audit Function**: `verify_chain_integrity()` traverses from genesis block to current tip, recalculating each block's cryptographic hash and verifying previous hash pointers.

### 2.4 IntegrityService
- **Fingerprinting**: SHA-256 document integrity hashing calculated on plaintext at upload.
- **Real-Time Verification**: Live recomputation on decrypt and comparison against the blockchain transaction record.
- **Language**: Distinguishes between "Document verified ✓" and "Warning: Unexpected change detected."

### 2.5 SecurityService & Risk Engine
- **Rule-Based Evaluation**:
  - Multiple failed logins &rarr; Medium Risk
  - Unauthorized case access attempt &rarr; High Risk
  - Document integrity mismatch &rarr; High Risk
  - Rapid mass alterations &rarr; Critical Risk
- **Plain-Language Triage**: Every alert details **WHAT HAPPENED**, **WHY IT MATTERS**, and **WHAT TO DO**.

### 2.6 RecoveryService (Isolated Recovery Vault)
- **Air-Gapped Mirror**: Mirrors pristine original encrypted files and master fingerprints in `storage/recovery_vault/`.
- **Quarantine Protocol**: If unexpected modifications occur in the primary vault, access is restricted immediately.
- **Restoration**: 1-click authorized rollback copying the pristine master copy back to primary storage, re-verifying SHA-256, and recording a `DOCUMENT_RESTORED` event on the blockchain ledger.

---

## 3. Future Hyperledger Fabric Migration Roadmap
While this hackathon prototype uses the standalone SQLite hash-chained ledger, the `BlockchainService` interface is designed with identical signatures (`registerDocument`, `createDocumentVersion`, `grantPermission`, `revokePermission`, `recordAccess`, `archiveDocument`, `recordIntegrityCheck`, `recordSecurityIncident`, `recordRecovery`) to facilitate seamless swapping for a real Hyperledger Fabric chaincode implementation in production.
