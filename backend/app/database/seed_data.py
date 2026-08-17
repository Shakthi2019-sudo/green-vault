import os
import json
import shutil
from datetime import datetime, timezone, timedelta
from pathlib import Path
from sqlalchemy.orm import Session

from app.config import settings
from app.models.models import (
    User, Case, CaseAssignment, Document, DocumentVersion,
    Permission, AccessRequest, BlockchainTransaction, SecurityEvent,
    RecoveryRecord, AuditEvent, ConnectedSystem
)
from app.utils.crypto import hash_password
from app.utils.pdf_generator import generate_legal_pdf
from app.utils.sample_media import create_sample_png_image, create_sample_jpg_image, create_sample_mp4_video
from app.services.document_service import DocumentService
from app.services.blockchain_service import BlockchainService
from app.services.audit_service import AuditService

def seed_database(db: Session, force: bool = False):
    """
    Seed initial demo data for Green Vault:
    1. Create 10 demo users with predefined secure Argon2id-hashed passwords.
    2. Write demo/credentials/GREEN_VAULT_DEMO_CREDENTIALS.md & demo_credentials.json.
    3. Create 5 realistic demo cases (CASE-2026-001 through CASE-2026-005).
    4. Create user-specific case assignments & granular RBAC permissions.
    5. Generate and encrypt legal documents, images, and video evidence.
    6. Register all events onto the Hash-Chained Blockchain Ledger.
    7. Seed connected legal platforms (eCourts, e-Filing, DigiLocker, ICJS, eSakshya).
    8. Seed access requests, audit logs, and baseline security status.
    """
    if not force and db.query(User).filter(User.username == "Judge-001").first() is not None:
        print("[SEED] Database already populated with Judge-001. Skipping seed.")
        return

    print("[SEED] Starting Green Vault Database Seeding with Canonical Demo Personas...")

    # Clear existing data
    db.query(BlockchainTransaction).delete()
    db.query(AuditEvent).delete()
    db.query(SecurityEvent).delete()
    db.query(RecoveryRecord).delete()
    db.query(AccessRequest).delete()
    db.query(Permission).delete()
    db.query(DocumentVersion).delete()
    db.query(Document).delete()
    db.query(CaseAssignment).delete()
    db.query(Case).delete()
    db.query(ConnectedSystem).delete()
    db.query(User).delete()
    db.commit()

    # Clean storage folders
    for folder in [settings.PRIMARY_VAULT_DIR, settings.RECOVERY_VAULT_DIR]:
        folder.mkdir(parents=True, exist_ok=True)
        for item in folder.glob("*"):
            if item.is_file():
                try:
                    item.unlink()
                except Exception:
                    pass

    # --- 1. USER ACCOUNTS (PREDEFINED SECURE CREDENTIALS) ---
    user_definitions = [
        # JUDGES
        {
            "username": "Judge-001",
            "password": "xE!6*ztUa524aps6",
            "full_name": "Hon. Justice Rajesh Sharma",
            "email": "judge.sharma@delhicourts.gov.demo",
            "role": "JUDGE",
            "sub_role": "Assigned Judge",
            "assigned_cases": ["CASE-2026-001", "CASE-2026-002"]
        },
        {
            "username": "Judge-002",
            "password": "PPhEB%qHSsfVCSUB",
            "full_name": "Hon. Justice Priya Malhotra",
            "email": "judge.malhotra@delhicourts.gov.demo",
            "role": "JUDGE",
            "sub_role": "Reviewing Judge",
            "assigned_cases": ["CASE-2026-002"]
        },
        # COURT ADMIN
        {
            "username": "Admin-001",
            "password": "ZG$!$G8EGd6d5@VF",
            "full_name": "Registrar General S. Sundaram",
            "email": "admin.sundaram@delhicourts.gov.demo",
            "role": "COURT_ADMIN",
            "sub_role": "Court Administrator",
            "assigned_cases": ["CASE-2026-001", "CASE-2026-002", "CASE-2026-003", "CASE-2026-004", "CASE-2026-005"]
        },
        # LAWYERS
        {
            "username": "Lawyer-001",
            "password": "$vC4VbbVF3ZFZpx!",
            "full_name": "Adv. Vikram Sethi",
            "email": "vikram.sethi@legalchambers.demo",
            "role": "LAWYER",
            "sub_role": "Lead Lawyer",
            "assigned_cases": ["CASE-2026-001"]
        },
        {
            "username": "Lawyer-002",
            "password": "D3BnEVD#G9d8Vpxq",
            "full_name": "Adv. Ananya Roy",
            "email": "ananya.roy@corporatelaw.demo",
            "role": "LAWYER",
            "sub_role": "Associate Lawyer",
            "assigned_cases": ["CASE-2026-002"]
        },
        {
            "username": "Assistant-001",
            "password": "jwJkh5yS7w6Pd!kq",
            "full_name": "Kavita Rao",
            "email": "kavita.rao@paralegal.demo",
            "role": "LAWYER",
            "sub_role": "Legal Assistant",
            "assigned_cases": ["CASE-2026-001"]
        },
        # CLIENTS
        {
            "username": "Client-001",
            "password": "#vf*kPe42K3vMM$9",
            "full_name": "Rohan Verma (Petitioner)",
            "email": "rohan.verma@apexcloud.demo",
            "role": "CLIENT",
            "sub_role": "Litigant Client",
            "assigned_cases": ["CASE-2026-001"]
        },
        {
            "username": "Client-002",
            "password": "PxmyYRvK!Bea^m^*",
            "full_name": "Meera Deshmukh (Respondent)",
            "email": "meera.deshmukh@horizonlogistics.demo",
            "role": "CLIENT",
            "sub_role": "Litigant Client",
            "assigned_cases": ["CASE-2026-002"]
        },
        # SECURITY SIMULATION AGENT (DEMO ONLY)
        {
            "username": "Security-Simulation",
            "password": "f2V&raFx948VHMXM",
            "full_name": "Automated Security Testbed",
            "email": "sec-sim@greenvault.internal",
            "role": "SECURITY_SIMULATION",
            "sub_role": "Security Simulation (Demo Only)",
            "assigned_cases": []
        }
    ]

    credentials_md_lines = [
        "# GREEN VAULT — HACKATHON DEMO CREDENTIALS",
        "",
        "> **CONFIDENTIAL FOR EVALUATION & DEMO TEAM ONLY**",
        "> Passwords are cryptographically verified and stored in the database exclusively as Argon2id hashes.",
        "",
        "| Username | Demo Password | Role | Sub-Role | Assigned Demo Cases |",
        "| :--- | :--- | :--- | :--- | :--- |"
    ]

    users_by_uname = {}
    demo_passwords_json = {}
    now = datetime.now(timezone.utc)

    for udef in user_definitions:
        pwd = udef["password"]
        pwd_hash = hash_password(pwd)

        user_obj = User(
            username=udef["username"],
            password_hash=pwd_hash,
            full_name=udef["full_name"],
            email=udef["email"],
            role=udef["role"],
            sub_role=udef["sub_role"],
            is_active=True,
            created_at=now
        )
        db.add(user_obj)
        db.flush()
        users_by_uname[udef["username"]] = user_obj

        cases_str = ", ".join(udef["assigned_cases"]) if udef["assigned_cases"] else "None (Simulation Only)"
        credentials_md_lines.append(
            f"| `{udef['username']}` | `{pwd}` | **{udef['role']}** | {udef['sub_role']} | {cases_str} |"
        )
        demo_passwords_json[udef["username"]] = pwd

    # Write GREEN_VAULT_DEMO_CREDENTIALS.md
    settings.DEMO_CREDENTIALS_DIR.mkdir(parents=True, exist_ok=True)
    with open(settings.DEMO_CREDENTIALS_FILE, "w", encoding="utf-8") as f:
        f.write("\n".join(credentials_md_lines) + "\n")

    # Save helper json for UI evaluator autofill
    creds_json_path = settings.DEMO_CREDENTIALS_DIR / "demo_credentials.json"
    with open(creds_json_path, "w", encoding="utf-8") as f:
        json.dump(demo_passwords_json, f, indent=2)

    # Also copy to frontend public directory
    frontend_creds_dir = settings.BASE_DIR.parent / "frontend" / "public" / "demo" / "credentials"
    frontend_creds_dir.mkdir(parents=True, exist_ok=True)
    with open(frontend_creds_dir / "demo_credentials.json", "w", encoding="utf-8") as f:
        json.dump(demo_passwords_json, f, indent=2)

    # Also copy to frontend dist directory if dist exists
    frontend_dist_creds_dir = settings.BASE_DIR.parent / "frontend" / "dist" / "demo" / "credentials"
    if frontend_dist_creds_dir.parent.parent.exists():
        frontend_dist_creds_dir.mkdir(parents=True, exist_ok=True)
        with open(frontend_dist_creds_dir / "demo_credentials.json", "w", encoding="utf-8") as f:
            json.dump(demo_passwords_json, f, indent=2)

    print(f"[SEED] Generated demo credentials at: {settings.DEMO_CREDENTIALS_FILE}")

    # --- 2. DEMO CASES ---
    cases_data = [
        {
            "id": "CASE-2026-001",
            "title": "Sharma vs. Apex Infrastructure Ltd.",
            "case_type": "Civil Dispute",
            "status": "ACTIVE",
            "court_name": "High Court of Delhi — Commercial Division",
            "filing_date": "2026-01-12",
            "next_hearing": "2026-08-25",
            "description": "Adjudication regarding breach of commercial real estate EPC agreement and specific performance claims valued at INR 4.8 Crores.",
            "connected_systems": json.dumps(["eCourts", "e-Filing", "DigiLocker", "ICJS"])
        },
        {
            "id": "CASE-2026-002",
            "title": "Veritas Tech vs. Horizon Logistics",
            "case_type": "Contract Dispute",
            "status": "UNDER_REVIEW",
            "court_name": "National Company Law Tribunal (NCLT) — Bench III",
            "filing_date": "2026-02-04",
            "next_hearing": "2026-09-02",
            "description": "Multi-tier enterprise cloud SLA violation and disputed intellectual property escrow covenants.",
            "connected_systems": json.dumps(["eCourts", "DigiLocker", "eSakshya"])
        },
        {
            "id": "CASE-2026-003",
            "title": "Heritage Estate Title Adjudication",
            "case_type": "Property Dispute",
            "status": "ACTIVE",
            "court_name": "Principal District & Sessions Court — New Delhi",
            "filing_date": "2026-03-01",
            "next_hearing": "2026-09-18",
            "description": "Ancestral land title registration challenge, survey demarcation, and boundary easement dispute.",
            "connected_systems": json.dumps(["eCourts", "DigiLocker"])
        },
        {
            "id": "CASE-2026-004",
            "title": "State Telecom Infrastructure Arbitration",
            "case_type": "Commercial Arbitration",
            "status": "ACTIVE",
            "court_name": "Delhi International Arbitration Centre (DIAC)",
            "filing_date": "2026-04-10",
            "next_hearing": "2026-10-05",
            "description": "High-bandwidth fiber optic spectrum deployment revenue share dispute.",
            "connected_systems": json.dumps(["eCourts", "e-Filing"])
        },
        {
            "id": "CASE-2026-005",
            "title": "National Green Corridor Environmental Review",
            "case_type": "Environmental Review",
            "status": "ACTIVE",
            "court_name": "High Court of Delhi — Environmental Bench",
            "filing_date": "2026-05-15",
            "next_hearing": "2026-10-22",
            "description": "Public interest environmental compliance evaluation for urban eco-sensitive buffer zones.",
            "connected_systems": json.dumps(["eCourts", "DigiLocker", "eSakshya"])
        }
    ]

    for c in cases_data:
        case_obj = Case(
            id=c["id"],
            title=c["title"],
            case_type=c["case_type"],
            status=c["status"],
            court_name=c["court_name"],
            filing_date=c["filing_date"],
            next_hearing=c["next_hearing"],
            description=c["description"],
            connected_systems=c["connected_systems"],
            created_at=now - timedelta(days=60)
        )
        db.add(case_obj)
    db.commit()

    # --- 3. USER CASE ASSIGNMENTS & RBAC PERMISSIONS ---
    # Canonical assignments:
    # Judge-001: CASE-2026-001, CASE-2026-002
    # Judge-002: CASE-2026-002
    # Lawyer-001: CASE-2026-001
    # Lawyer-002: CASE-2026-002
    # Assistant-001: CASE-2026-001
    # Client-001: CASE-2026-001
    # Client-002: CASE-2026-002
    # Admin-001: All cases (001 through 005)
    assignments_data = [
        # CASE-2026-001
        ("CASE-2026-001", "Judge-001", "Assigned Judge"),
        ("CASE-2026-001", "Lawyer-001", "Lead Lawyer"),
        ("CASE-2026-001", "Assistant-001", "Legal Assistant"),
        ("CASE-2026-001", "Client-001", "Litigant Client"),
        ("CASE-2026-001", "Admin-001", "Court Administrator"),

        # CASE-2026-002
        ("CASE-2026-002", "Judge-001", "Assigned Judge"),
        ("CASE-2026-002", "Judge-002", "Reviewing Judge"),
        ("CASE-2026-002", "Lawyer-002", "Associate Lawyer"),
        ("CASE-2026-002", "Client-002", "Litigant Client"),
        ("CASE-2026-002", "Admin-001", "Court Administrator"),

        # CASE-2026-003
        ("CASE-2026-003", "Admin-001", "Court Administrator"),

        # CASE-2026-004
        ("CASE-2026-004", "Admin-001", "Court Administrator"),

        # CASE-2026-005
        ("CASE-2026-005", "Admin-001", "Court Administrator"),
    ]

    admin_user = users_by_uname["Admin-001"]

    for case_id, uname, arole in assignments_data:
        u = users_by_uname[uname]
        assign = CaseAssignment(
            case_id=case_id,
            user_id=u.id,
            assignment_role=arole,
            assigned_at=now - timedelta(days=45)
        )
        db.add(assign)

        perms_to_grant = ["VIEW", "DOWNLOAD"]
        if u.role in ["JUDGE", "LAWYER", "COURT_ADMIN"]:
            perms_to_grant.extend(["UPLOAD", "CREATE_VERSION"])
        if u.role in ["JUDGE", "COURT_ADMIN"]:
            perms_to_grant.append("ARCHIVE")

        for perm in perms_to_grant:
            p = Permission(
                user_id=u.id,
                case_id=case_id,
                permission_type=perm,
                granted_by=admin_user.id,
                granted_at=now - timedelta(days=45)
            )
            db.add(p)

    db.commit()

    # --- 4. CONNECTED SYSTEMS (MOCK INTEGRATIONS) ---
    systems_data = [
        {
            "id": "SYS-ECOURTS",
            "name": "eCourts Services",
            "code": "ECOURTS",
            "desc": "National Judicial Data Grid (NJDG) Case Information System API Bridge",
            "status": "CONNECTED_DEMO",
            "records": 482,
            "badge": "Demo Integration"
        },
        {
            "id": "SYS-EFILING",
            "name": "e-Filing 3.0",
            "code": "EFILING",
            "desc": "Electronic Case Document & Vakalatnama Direct Filing Integration",
            "status": "CONNECTED_DEMO",
            "records": 128,
            "badge": "Demo Integration"
        },
        {
            "id": "SYS-DIGILOCKER",
            "name": "DigiLocker Legal Gateway",
            "code": "DIGILOCKER",
            "desc": "Ministry of Electronics & IT Verified Identity & Certified Records Repository",
            "status": "CONNECTED_DEMO",
            "records": 315,
            "badge": "Demo Integration"
        },
        {
            "id": "SYS-ICJS",
            "name": "ICJS (Inter-operable Criminal Justice System)",
            "code": "ICJS",
            "desc": "Police, Prosecution, Court & Forensic Record Harmonization Link",
            "status": "CONNECTED_DEMO",
            "records": 94,
            "badge": "Demo Integration"
        },
        {
            "id": "SYS-ESAKSHYA",
            "name": "eSakshya Digital Evidence Repository",
            "code": "ESAKSHYA",
            "desc": "Cryptographic Hash Validation for Digital and Audio-Visual Evidence Records",
            "status": "CONNECTED_DEMO",
            "records": 67,
            "badge": "Demo Integration"
        }
    ]

    for s in systems_data:
        cs = ConnectedSystem(
            id=s["id"],
            system_name=s["name"],
            system_code=s["code"],
            description=s["desc"],
            status=s["status"],
            records_count=s["records"],
            last_sync=now - timedelta(minutes=15),
            badge=s["badge"]
        )
        db.add(cs)
    db.commit()

    # --- 5. DEMO DOCUMENTS, IMAGES & VIDEO EVIDENCE ---
    judge1 = users_by_uname["Judge-001"]
    judge2 = users_by_uname["Judge-002"]
    lawyer1 = users_by_uname["Lawyer-001"]
    lawyer2 = users_by_uname["Lawyer-002"]
    asst1 = users_by_uname["Assistant-001"]
    client1 = users_by_uname["Client-001"]
    client2 = users_by_uname["Client-002"]

    pdf_docs_specs = [
        # CASE-2026-001
        {
            "id": "DOC-001-PET",
            "case_id": "CASE-2026-001",
            "title": "Petition.pdf",
            "category": "Petition",
            "classification": "PUBLIC_CASE_RECORD",
            "court": "High Court of Delhi — Commercial Division",
            "paragraphs": [
                "HIGH COURT OF DELHI — COMMERCIAL DIVISION",
                "Sharma vs. Apex Infrastructure Ltd. (Ref: COMM-CIVIL-2026-001)",
                "1. That the Petitioner entered into an EPC Commercial Construction Agreement on 14th June 2024.",
                "2. That the Respondent failed to deliver certified structural milestones despite full advance disbursement.",
                "3. PRAYER: Order of specific performance, preservation of escrow reserves, and damages."
            ],
            "uploader": lawyer1,
            "versions_count": 1
        },
        {
            "id": "DOC-001-ORD",
            "case_id": "CASE-2026-001",
            "title": "Court_Order.pdf",
            "category": "Court Order",
            "classification": "COURT_ORDER",
            "court": "High Court of Delhi — Commercial Division",
            "paragraphs": [
                "ORDER OF COMMERCIAL BENCH II — HON. JUSTICE RAJESH SHARMA",
                "1. Learned counsel Adv. Vikram Sethi appearing for petitioner; respondent represented by associate counsel.",
                "2. Ad-interim status quo granted regarding project bank guarantees and escrow asset distribution.",
                "3. Digital vault records verified under Section 65B of Indian Evidence Act."
            ],
            "uploader": judge1,
            "versions_count": 1
        },
        {
            "id": "DOC-001-JNT",
            "case_id": "CASE-2026-001",
            "title": "Judge_Internal_Note.pdf",
            "category": "Chamber Note",
            "classification": "COURT_INTERNAL",
            "court": "High Court of Delhi — Commercial Division",
            "paragraphs": [
                "CONFIDENTIAL JUDICIAL BENCH CHAMBER NOTES — STRICTLY RESTRICTED TO BENCH",
                "Preliminary review indicates prima facie contractor insolvency risk.",
                "Direct registry to expedite forensic escrow audit before final arguments."
            ],
            "uploader": judge1,
            "versions_count": 1
        },
        {
            "id": "DOC-001-LNT",
            "case_id": "CASE-2026-001",
            "title": "Lawyer_Internal_Note.pdf",
            "category": "Counsel Strategy",
            "classification": "LAWYER_CONFIDENTIAL",
            "court": "High Court of Delhi — Commercial Division",
            "paragraphs": [
                "PRIVILEGED ATTORNEY-CLIENT WORK PRODUCT — ADV. VIKRAM SETHI",
                "Strategy note regarding cross-examination of project engineer.",
                "Examine bank guarantee invocation timelines and forensic subcontractor invoices."
            ],
            "uploader": lawyer1,
            "versions_count": 1
        },
        {
            "id": "DOC-001-RST",
            "case_id": "CASE-2026-001",
            "title": "Restricted_Forensic_Audit.pdf",
            "category": "Audit Report",
            "classification": "RESTRICTED",
            "court": "High Court of Delhi — Commercial Division",
            "paragraphs": [
                "SEALED ENVELOPE COURT COMMISSIONER FORENSIC AUDIT",
                "Banking trail analysis confirms diversion of INR 1.2 Crores to non-designated parent entities.",
                "Access restricted to Presiding Judge and Registrar General."
            ],
            "uploader": admin_user,
            "versions_count": 1
        },
        {
            "id": "DOC-001-EVI-A",
            "case_id": "CASE-2026-001",
            "title": "Evidence_A.pdf",
            "category": "Evidence",
            "classification": "EVIDENCE",
            "court": "High Court of Delhi — Commercial Division",
            "paragraphs": [
                "ANNEXURE P-1: MASTER EPC COMMERCIAL CONTRACT & AMENDMENT MILESTONES",
                "Clause 14.2 (Dispute Resolution): Certified digital vault records shall be admissible as prima facie proof.",
                "Clause 18.1 (Escrow): Security milestone guarantees were executed under joint escrow verification."
            ],
            "uploader": lawyer1,
            "versions_count": 3
        },
        # CASE-2026-002
        {
            "id": "DOC-002-SLA",
            "case_id": "CASE-2026-002",
            "title": "SLA_Agreement.pdf",
            "category": "Contract",
            "classification": "PUBLIC_CASE_RECORD",
            "court": "National Company Law Tribunal (NCLT) — Bench III",
            "paragraphs": [
                "ENTERPRISE CLOUD INFRASTRUCTURE SLA & ESCROW AGREEMENT",
                "Guaranteed availability 99.99% with financial liquidated damages for unplanned outages."
            ],
            "uploader": lawyer2,
            "versions_count": 1
        },
        {
            "id": "DOC-002-ORD",
            "case_id": "CASE-2026-002",
            "title": "NCLT_Interim_Order.pdf",
            "category": "Court Order",
            "classification": "COURT_ORDER",
            "court": "National Company Law Tribunal (NCLT) — Bench III",
            "paragraphs": [
                "ORDER OF NCLT BENCH III — HON. JUSTICE PRIYA MALHOTRA",
                "Escrow repository access granted to appointed forensic arbitrator for system log verification."
            ],
            "uploader": judge2,
            "versions_count": 1
        },
        {
            "id": "DOC-002-JNT",
            "case_id": "CASE-2026-002",
            "title": "Bench_Deliberation_Note.pdf",
            "category": "Chamber Note",
            "classification": "COURT_INTERNAL",
            "court": "National Company Law Tribunal (NCLT) — Bench III",
            "paragraphs": [
                "NCLT BENCH III INTERNAL DELIBERATION MEMORANDUM",
                "Assessing jurisdictional thresholds under Section 241/242 of Companies Act."
            ],
            "uploader": judge2,
            "versions_count": 1
        },
        # CASE-2026-003
        {
            "id": "DOC-003-TTL",
            "case_id": "CASE-2026-003",
            "title": "Title_Deed_Ancestral_1984.pdf",
            "category": "Property Deed",
            "classification": "PUBLIC_CASE_RECORD",
            "court": "Principal District & Sessions Court — New Delhi",
            "paragraphs": [
                "REGISTERED TITLE DEED VOL-44 PAGE-109 (HERITAGE ESTATE ADJUDICATION)",
                "Certified registry extract documenting ancestral boundary demarcation and certified khasra records."
            ],
            "uploader": admin_user,
            "versions_count": 1
        },
        {
            "id": "DOC-003-ORD",
            "case_id": "CASE-2026-003",
            "title": "Court_Commission_Report.pdf",
            "category": "Court Order",
            "classification": "COURT_ORDER",
            "court": "Principal District & Sessions Court — New Delhi",
            "paragraphs": [
                "COMMISSIONER REPORT DATED 12TH APRIL 2026",
                "Local boundary demarcation survey completed with revenue department officials present."
            ],
            "uploader": admin_user,
            "versions_count": 1
        },
        # CASE-2026-004
        {
            "id": "DOC-004-ARB",
            "case_id": "CASE-2026-004",
            "title": "Arbitration_Reference_Notice.pdf",
            "category": "Arbitration",
            "classification": "PUBLIC_CASE_RECORD",
            "court": "Delhi International Arbitration Centre (DIAC)",
            "paragraphs": [
                "DIAC ARBITRATION NOTICE UNDER SECTION 11 OF ARBITRATION ACT",
                "Notice of dispute regarding high-speed spectrum allocation revenue sharing agreement."
            ],
            "uploader": admin_user,
            "versions_count": 1
        },
        # CASE-2026-005
        {
            "id": "DOC-005-ENV",
            "case_id": "CASE-2026-005",
            "title": "Environmental_Impact_Petition.pdf",
            "category": "Petition",
            "classification": "PUBLIC_CASE_RECORD",
            "court": "High Court of Delhi — Environmental Bench",
            "paragraphs": [
                "WRIT PETITION (CIVIL) — PUBLIC INTEREST LITIGATION",
                "Review of buffer zone tree canopy protection guidelines in the National Capital Region."
            ],
            "uploader": admin_user,
            "versions_count": 1
        }
    ]

    for dspec in pdf_docs_specs:
        file_bytes = generate_legal_pdf(
            title=dspec["title"].replace(".pdf", "").replace("_", " "),
            case_id=dspec["case_id"],
            case_title="Sharma vs. Apex Infrastructure Ltd." if dspec["case_id"] == "CASE-2026-001" else ("Veritas Tech vs. Horizon Logistics" if dspec["case_id"] == "CASE-2026-002" else ("Heritage Estate Title Adjudication" if dspec["case_id"] == "CASE-2026-003" else ("State Telecom Arbitration" if dspec["case_id"] == "CASE-2026-004" else "National Green Corridor Review"))),
            doc_category=dspec["category"],
            version=1,
            court_name=dspec["court"],
            body_paragraphs=dspec.get("paragraphs", ["Official Legal Record."]),
            signatory=dspec["uploader"].full_name,
            date_str="2026-02-15"
        )

        doc, doc_v = DocumentService.save_and_encrypt_document(
            db=db,
            case_id=dspec["case_id"],
            title=dspec["title"],
            category=dspec["category"],
            classification=dspec.get("classification", "PUBLIC_CASE_RECORD"),
            file_bytes=file_bytes,
            file_name=dspec["title"],
            mime_type="application/pdf",
            user=dspec["uploader"],
            doc_id=dspec["id"]
        )

        # Multi-version handling for Evidence_A.pdf (v2, v3)
        if dspec.get("versions_count", 1) > 1:
            for v_num in range(2, dspec["versions_count"] + 1):
                v_paragraphs = dspec.get("paragraphs", []) + [
                    f"ADDENDUM {v_num - 1}: Clarification clause and signed amendment executed on 2026-03-0{v_num}."
                ]
                v_pdf_bytes = generate_legal_pdf(
                    title=dspec["title"].replace(".pdf", "").replace("_", " "),
                    case_id=dspec["case_id"],
                    case_title="Sharma vs. Apex Infrastructure Ltd.",
                    doc_category=dspec["category"],
                    version=v_num,
                    court_name=dspec["court"],
                    body_paragraphs=v_paragraphs,
                    signatory=dspec["uploader"].full_name,
                    date_str=f"2026-03-0{v_num}"
                )
                DocumentService.create_new_version(
                    db=db,
                    document_id=doc.id,
                    file_bytes=v_pdf_bytes,
                    file_name=f"{doc.title.replace('.pdf', '')}_v{v_num}.pdf",
                    mime_type="application/pdf",
                    user=dspec["uploader"],
                    change_summary=f"Supplemental Addendum #{v_num - 1} incorporated & digitally sealed"
                )

    # --- 6. SEED DIGITAL EVIDENCE IMAGES (JPG / PNG) ---
    # Evidence_01.jpg in CASE-2026-001
    jpg_evidence_bytes = create_sample_jpg_image("SITE_INSPECTION_PHOTO")
    DocumentService.save_and_encrypt_document(
        db=db,
        case_id="CASE-2026-001",
        title="Evidence_01.jpg",
        category="Evidence",
        classification="EVIDENCE",
        file_bytes=jpg_evidence_bytes,
        file_name="Evidence_01.jpg",
        mime_type="image/jpeg",
        user=lawyer1,
        doc_id="DOC-001-IMG"
    )

    # Server_Audit_Log_Evidence.png in CASE-2026-002
    png_evidence_bytes = create_sample_png_image("SERVER_AUDIT_LOG_EVIDENCE")
    DocumentService.save_and_encrypt_document(
        db=db,
        case_id="CASE-2026-002",
        title="Server_Audit_Log_Evidence.png",
        category="Evidence",
        classification="EVIDENCE",
        file_bytes=png_evidence_bytes,
        file_name="Server_Audit_Log_Evidence.png",
        mime_type="image/png",
        user=lawyer2,
        doc_id="DOC-002-IMG"
    )

    # Site_Demarcation_Survey_Photo.jpg in CASE-2026-003
    jpg_survey_bytes = create_sample_jpg_image("SURVEY_PHOTO")
    DocumentService.save_and_encrypt_document(
        db=db,
        case_id="CASE-2026-003",
        title="Site_Demarcation_Survey_Photo.jpg",
        category="Evidence",
        classification="EVIDENCE",
        file_bytes=jpg_survey_bytes,
        file_name="Site_Demarcation_Survey_Photo.jpg",
        mime_type="image/jpeg",
        user=admin_user,
        doc_id="DOC-003-IMG"
    )

    # --- 7. SEED DIGITAL VIDEO EVIDENCE (MP4 / H.264) ---
    # Evidence_Video_01.mp4 in CASE-2026-001
    mp4_video_bytes = create_sample_mp4_video()
    DocumentService.save_and_encrypt_document(
        db=db,
        case_id="CASE-2026-001",
        title="Evidence_Video_01.mp4",
        category="Digital Evidence",
        classification="EVIDENCE",
        file_bytes=mp4_video_bytes,
        file_name="Evidence_Video_01.mp4",
        mime_type="video/mp4",
        user=lawyer1,
        doc_id="DOC-001-VID"
    )

    # CCTV_DataCenter_Access_Evidence.mp4 in CASE-2026-002
    DocumentService.save_and_encrypt_document(
        db=db,
        case_id="CASE-2026-002",
        title="CCTV_DataCenter_Access_Evidence.mp4",
        category="Digital Evidence",
        classification="EVIDENCE",
        file_bytes=mp4_video_bytes,
        file_name="CCTV_DataCenter_Access_Evidence.mp4",
        mime_type="video/mp4",
        user=lawyer2,
        doc_id="DOC-002-VID"
    )

    # Drone_Survey_Boundary_Video.mp4 in CASE-2026-003
    DocumentService.save_and_encrypt_document(
        db=db,
        case_id="CASE-2026-003",
        title="Drone_Survey_Boundary_Video.mp4",
        category="Digital Evidence",
        classification="EVIDENCE",
        file_bytes=mp4_video_bytes,
        file_name="Drone_Survey_Boundary_Video.mp4",
        mime_type="video/mp4",
        user=admin_user,
        doc_id="DOC-003-VID"
    )

    # --- 8. SEED INITIAL ACCESS REQUESTS ---
    req1 = AccessRequest(
        id="REQ-2026-001",
        user_id=users_by_uname["Lawyer-002"].id,
        case_id="CASE-2026-001",
        requested_permissions=json.dumps(["VIEW", "DOWNLOAD"]),
        reason="Intervener application review on behalf of second-tier subcontractors.",
        status="PENDING",
        created_at=now - timedelta(hours=3)
    )
    db.add(req1)

    req2 = AccessRequest(
        id="REQ-2026-002",
        user_id=users_by_uname["Assistant-001"].id,
        case_id="CASE-2026-002",
        requested_permissions=json.dumps(["VIEW"]),
        reason="Assisting lead counsel with precedent research.",
        status="APPROVED",
        reviewed_by=admin_user.id,
        reviewed_at=now - timedelta(days=2),
        review_note="Granted temporary view permissions per chamber request.",
        created_at=now - timedelta(days=3)
    )
    db.add(req2)
    db.commit()

    # --- 9. INITIAL AUDIT EVENT ---
    AuditService.log_event(
        db=db,
        actor=admin_user,
        action="SYSTEM_INIT",
        resource_type="VAULT",
        resource_id="GREEN_VAULT_GENESIS",
        outcome="SUCCESS",
        details={"message": "Green Vault Legal Repository initialized with Argon2id, AES-256-GCM encryption & Hash-Chained Blockchain Ledger."}
    )

    print("[SEED] Green Vault database seeding successfully completed with all 9 canonical demo users!")
