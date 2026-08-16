import os
import json
import shutil
from datetime import datetime, timedelta
from pathlib import Path
from sqlalchemy.orm import Session

from app.config import settings
from app.models.models import (
    User, Case, CaseAssignment, Document, DocumentVersion,
    Permission, AccessRequest, BlockchainTransaction, SecurityEvent,
    RecoveryRecord, AuditEvent, ConnectedSystem
)
from app.utils.crypto import hash_password, generate_strong_password
from app.utils.pdf_generator import generate_legal_pdf
from app.services.document_service import DocumentService
from app.services.blockchain_service import BlockchainService
from app.services.audit_service import AuditService

def seed_database(db: Session, force: bool = False):
    """
    Seed initial data:
    1. Create demo users with strong random passwords generated via secrets.
    2. Write demo/credentials/GREEN_VAULT_DEMO_CREDENTIALS.md.
    3. Create 3 demo cases.
    4. Generate and encrypt 10+ fictional legal documents with multi-version histories.
    5. Register all events onto the Hash-Chained Blockchain Ledger.
    6. Seed connected legal systems (eCourts, DigiLocker, etc.).
    7. Seed access requests, audit events, and initial baseline security status.
    """
    # Check if already seeded
    if not force and db.query(User).first() is not None:
        print("[SEED] Database already populated. Skipping seed.")
        return

    print("[SEED] Starting Green Vault Database Seeding...")

    # Clear existing data if force
    if force:
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
            for item in folder.glob("*"):
                if item.is_file():
                    item.unlink()

    # --- 1. USER ACCOUNTS ---
    user_definitions = [
        {
            "username": "Judge-001",
            "full_name": "Hon. Justice Rajesh Sharma",
            "email": "judge.sharma@delhicourts.gov.demo",
            "role": "JUDGE",
            "sub_role": "Assigned Judge",
            "assigned_cases": ["CASE-2026-001", "CASE-2026-002"]
        },
        {
            "username": "Judge-002",
            "full_name": "Hon. Justice Priya Malhotra",
            "email": "judge.malhotra@delhicourts.gov.demo",
            "role": "JUDGE",
            "sub_role": "Reviewing Judge",
            "assigned_cases": ["CASE-2026-002"]
        },
        {
            "username": "Admin-001",
            "full_name": "Registrar General S. Sundaram",
            "email": "admin.sundaram@delhicourts.gov.demo",
            "role": "COURT_ADMIN",
            "sub_role": "Court Administrator",
            "assigned_cases": ["CASE-2026-001", "CASE-2026-002", "CASE-2026-003"]
        },
        {
            "username": "Lawyer-001",
            "full_name": "Adv. Vikram Sethi",
            "email": "vikram.sethi@legalchambers.demo",
            "role": "LAWYER",
            "sub_role": "Lead Lawyer",
            "assigned_cases": ["CASE-2026-001"]
        },
        {
            "username": "Lawyer-002",
            "full_name": "Adv. Ananya Roy",
            "email": "ananya.roy@corporatelaw.demo",
            "role": "LAWYER",
            "sub_role": "Associate Lawyer",
            "assigned_cases": ["CASE-2026-002"]
        },
        {
            "username": "Assistant-001",
            "full_name": "Kavita Rao",
            "email": "kavita.rao@paralegal.demo",
            "role": "LAWYER",
            "sub_role": "Legal Assistant",
            "assigned_cases": ["CASE-2026-001"]
        },
        {
            "username": "Client-001",
            "full_name": "Rohan Verma (Petitioner)",
            "email": "rohan.verma@apexcloud.demo",
            "role": "CLIENT",
            "sub_role": "Litigant Client",
            "assigned_cases": ["CASE-2026-001"]
        },
        {
            "username": "Client-002",
            "full_name": "Meera Deshmukh (Respondent)",
            "email": "meera.deshmukh@horizonlogistics.demo",
            "role": "CLIENT",
            "sub_role": "Litigant Client",
            "assigned_cases": ["CASE-2026-002"]
        },
        {
            "username": "Security-Simulation",
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
        "> Passwords are cryptographically generated using Python `secrets` and stored in the database exclusively as Argon2id hashes.",
        "",
        "| Username | Generated Strong Password | Role | Sub-Role | Assigned Demo Cases |",
        "| :--- | :--- | :--- | :--- | :--- |"
    ]

    users_by_uname = {}
    demo_passwords_json = {}

    for udef in user_definitions:
        pwd = generate_strong_password(16)
        pwd_hash = hash_password(pwd)

        user_obj = User(
            username=udef["username"],
            password_hash=pwd_hash,
            full_name=udef["full_name"],
            email=udef["email"],
            role=udef["role"],
            sub_role=udef["sub_role"],
            is_active=True,
            created_at=datetime.utcnow()
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
    with open(settings.DEMO_CREDENTIALS_FILE, "w", encoding="utf-8") as f:
        f.write("\n".join(credentials_md_lines) + "\n")

    # Also save helper json for easy programmatic reference in tests or quick switcher
    creds_json_path = settings.DEMO_CREDENTIALS_DIR / "demo_credentials.json"
    with open(creds_json_path, "w", encoding="utf-8") as f:
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
            "description": "Ancestral land title registration challenge and boundary demarcation dispute.",
            "connected_systems": json.dumps(["eCourts", "DigiLocker"])
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
            created_at=datetime.utcnow() - timedelta(days=60)
        )
        db.add(case_obj)
    db.commit()

    # --- 3. CASE ASSIGNMENTS & INITIAL PERMISSIONS ---
    assignments_data = [
        # CASE-001
        ("CASE-2026-001", "Judge-001", "Assigned Judge"),
        ("CASE-2026-001", "Admin-001", "Court Administrator"),
        ("CASE-2026-001", "Lawyer-001", "Lead Lawyer (Petitioner)"),
        ("CASE-2026-001", "Assistant-001", "Legal Assistant"),
        ("CASE-2026-001", "Client-001", "Litigant Client (Petitioner)"),
        # CASE-002
        ("CASE-2026-002", "Judge-001", "Assigned Judge"),
        ("CASE-2026-002", "Judge-002", "Reviewing Judge"),
        ("CASE-2026-002", "Admin-001", "Court Administrator"),
        ("CASE-2026-002", "Lawyer-002", "Associate Lawyer (Respondent)"),
        ("CASE-2026-002", "Client-002", "Litigant Client (Respondent)"),
        # CASE-003 (Assigned ONLY to Admin-001 to demonstrate unauthorized access flow for Judge-001 in demo step 8)
        ("CASE-2026-003", "Admin-001", "Court Administrator")
    ]

    for case_id, uname, arole in assignments_data:
        u = users_by_uname[uname]
        assign = CaseAssignment(
            case_id=case_id,
            user_id=u.id,
            assignment_role=arole,
            assigned_at=datetime.utcnow() - timedelta(days=45)
        )
        db.add(assign)

        # Add initial permissions
        for perm in ["VIEW", "DOWNLOAD", "UPLOAD", "CREATE_VERSION", "SHARE"]:
            p = Permission(
                user_id=u.id,
                case_id=case_id,
                permission_type=perm,
                granted_by=users_by_uname["Admin-001"].id,
                granted_at=datetime.utcnow() - timedelta(days=45)
            )
            db.add(p)

    db.commit()

    # --- 4. CONNECTED SYSTEMS (MOCK) ---
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
            last_sync=datetime.utcnow() - timedelta(minutes=15),
            badge=s["badge"]
        )
        db.add(cs)
    db.commit()

    # --- 5. GENERATE 10+ FICTIONAL LEGAL DOCUMENTS ---
    admin_user = users_by_uname["Admin-001"]
    judge1 = users_by_uname["Judge-001"]
    lawyer1 = users_by_uname["Lawyer-001"]

    docs_specs = [
        {
            "id": "DOC-001-REG",
            "case_id": "CASE-2026-001",
            "title": "Case_Registration.pdf",
            "category": "Registration",
            "court": "High Court of Delhi — Commercial Division",
            "paragraphs": [
                "1. The present Commercial Civil Dispute is formally registered under Commercial Court Suit No. DL-HC-COMM-2026-001.",
                "2. The Petitioner, Rohan Verma, has instituted this proceeding claiming specific performance of the Master Engineering & Procurement Agreement dated 14th November 2024.",
                "3. Summons and electronic process issued to Respondent Apex Infrastructure Ltd. in accordance with High Court Rules."
            ],
            "uploader": admin_user,
            "versions_count": 1
        },
        {
            "id": "DOC-001-PET",
            "case_id": "CASE-2026-001",
            "title": "Petition.pdf",
            "category": "Petition",
            "court": "High Court of Delhi — Commercial Division",
            "paragraphs": [
                "TO THE HON'BLE CHIEF JUSTICE AND PUISNE JUDGES OF THE HIGH COURT OF DELHI",
                "1. That the Petitioner is a reputable commercial developer engaged in green infrastructure.",
                "2. That the Respondent failed to deliver Phase 2 structural certifications despite receiving an advance disbursement of INR 4.8 Crores.",
                "3. PRAYER: The Petitioner respectfully prays that this Hon'ble Court issue a decree of specific performance and injunction against unauthorized asset transfer."
            ],
            "uploader": lawyer1,
            "versions_count": 1
        },
        {
            "id": "DOC-001-EVI-A",
            "case_id": "CASE-2026-001",
            "title": "Evidence_A.pdf",
            "category": "Evidence",
            "court": "High Court of Delhi — Commercial Division",
            "paragraphs": [
                "ANNEXURE P-1: MASTER EPC AGREEMENT & AMENDMENT MILESTONES",
                "Clause 14.2 (Dispute Resolution): In the event of material default, all electronic notices and certified vault records shall be admissible as prima facie proof.",
                "Clause 18.1 (Escrow): Security milestone guarantees were executed under joint escrow verification."
            ],
            "uploader": lawyer1,
            "versions_count": 3  # Will generate v1, v2, v3
        },
        {
            "id": "DOC-001-EVI-B",
            "case_id": "CASE-2026-001",
            "title": "Evidence_B.pdf",
            "category": "Evidence",
            "court": "High Court of Delhi — Commercial Division",
            "paragraphs": [
                "ANNEXURE P-2: CERTIFIED BANK STATEMENTS & RTGS AUDIT TRAIL",
                "Transaction Reference: RTGS-UTR-20241114-8849102",
                "Amount: INR 48,000,000.00 transferred to Escrow Account 9182300184.",
                "DigiLocker Banking Certificate Timestamp: 2024-11-14T11:42:00Z."
            ],
            "uploader": lawyer1,
            "versions_count": 1
        },
        {
            "id": "DOC-001-WIT",
            "case_id": "CASE-2026-001",
            "title": "Witness_Statement.pdf",
            "category": "Witness Statement",
            "court": "High Court of Delhi — Commercial Division",
            "paragraphs": [
                "AFFIDAVIT OF MR. ALOK NATH (CHIEF STRUCTURAL ENGINEER)",
                "1. I solemnly affirm that Phase 1 site inspection was completed on 10th January 2025.",
                "2. Concrete quality tests passed all IS-456 compliance parameters as per certified lab testing sheets attached."
            ],
            "uploader": lawyer1,
            "versions_count": 1
        },
        {
            "id": "DOC-001-FOR",
            "case_id": "CASE-2026-001",
            "title": "Forensic_Report.pdf",
            "category": "Forensic Report",
            "court": "High Court of Delhi — Commercial Division",
            "paragraphs": [
                "DIGITAL FORENSIC AUDIT REPORT — ICJS INTEGRATED LABORATORY",
                "1. Cryptographic SHA-256 verification of server log communications between Petitioner and Respondent.",
                "2. All digital signatures on communication threads verified without evidence of retroactive manipulation."
            ],
            "uploader": admin_user,
            "versions_count": 1
        },
        {
            "id": "DOC-001-NOT",
            "case_id": "CASE-2026-001",
            "title": "Legal_Notice.pdf",
            "category": "Legal Notice",
            "court": "High Court of Delhi — Commercial Division",
            "paragraphs": [
                "STATUTORY PRE-LITIGATION LEGAL NOTICE UNDER SECTION 12A OF COMMERCIAL COURTS ACT",
                "Respondent was given 15 statutory days to remediate milestone default prior to the institution of this formal suit."
            ],
            "uploader": lawyer1,
            "versions_count": 1
        },
        {
            "id": "DOC-001-ORD",
            "case_id": "CASE-2026-001",
            "title": "Court_Order.pdf",
            "category": "Court Order",
            "court": "High Court of Delhi — Commercial Division",
            "paragraphs": [
                "ORDER DATED 15TH FEBRUARY 2026 — BEFORE HON. JUSTICE RAJESH SHARMA",
                "1. Counsel for both parties present.",
                "2. Respondent is directed to maintain status quo regarding project bank guarantees until next hearing.",
                "3. Re-list on 25th August 2026 for final evidence framing."
            ],
            "uploader": judge1,
            "versions_count": 1
        },
        {
            "id": "DOC-001-HRG",
            "case_id": "CASE-2026-001",
            "title": "Hearing_Record.pdf",
            "category": "Hearing Record",
            "court": "High Court of Delhi — Commercial Division",
            "paragraphs": [
                "PROCEEDINGS OF THE COMMERCIAL DIVISION BENCH II",
                "Arguments heard on preliminary injunction applications IA-1029/2026. Document repository access confirmed for all parties."
            ],
            "uploader": admin_user,
            "versions_count": 1
        },
        {
            "id": "DOC-001-JDG",
            "case_id": "CASE-2026-001",
            "title": "Judgment.pdf",
            "category": "Judgment",
            "court": "High Court of Delhi — Commercial Division",
            "paragraphs": [
                "INTERIM JUDGMENT ON INJUNCTION APPLICATION",
                "The Court finds a strong prima facie case in favor of the Petitioner. Respondent restrained from alienating project assets."
            ],
            "uploader": judge1,
            "versions_count": 1
        }
    ]

    for dspec in docs_specs:
        pdf_bytes = generate_legal_pdf(
            title=dspec["title"].replace(".pdf", "").replace("_", " "),
            case_id=dspec["case_id"],
            case_title="Sharma vs. Apex Infrastructure Ltd.",
            doc_category=dspec["category"],
            version=1,
            court_name=dspec["court"],
            body_paragraphs=dspec["paragraphs"],
            signatory=dspec["uploader"].full_name,
            date_str="2026-02-15"
        )

        doc, doc_v = DocumentService.save_and_encrypt_document(
            db=db,
            case_id=dspec["case_id"],
            title=dspec["title"],
            category=dspec["category"],
            file_bytes=pdf_bytes,
            file_name=dspec["title"],
            mime_type="application/pdf",
            user=dspec["uploader"],
            doc_id=dspec["id"]
        )

        # If versions_count > 1, create subsequent versions (e.g. for Evidence_A)
        if dspec["versions_count"] > 1:
            for v_num in range(2, dspec["versions_count"] + 1):
                v_paragraphs = dspec["paragraphs"] + [
                    f"ADDENDUM {v_num - 1}: Clarification clause and signed amendment executed on {2026 - (3-v_num)}-03-01."
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

    # --- 6. SEED INITIAL ACCESS REQUESTS ---
    req1 = AccessRequest(
        id="REQ-2026-001",
        user_id=users_by_uname["Lawyer-002"].id,
        case_id="CASE-2026-001",
        requested_permissions=json.dumps(["VIEW", "DOWNLOAD"]),
        reason="Intervener application review on behalf of second-tier subcontractors.",
        status="PENDING",
        created_at=datetime.utcnow() - timedelta(hours=3)
    )
    db.add(req1)

    req2 = AccessRequest(
        id="REQ-2026-002",
        user_id=users_by_uname["Assistant-001"].id,
        case_id="CASE-2026-002",
        requested_permissions=json.dumps(["VIEW"]),
        reason="Assisting lead counsel with NCLT precedent research.",
        status="APPROVED",
        reviewed_by=admin_user.id,
        reviewed_at=datetime.utcnow() - timedelta(days=2),
        review_note="Granted temporary view permissions per chamber request.",
        created_at=datetime.utcnow() - timedelta(days=3)
    )
    db.add(req2)
    db.commit()

    # --- 7. INITIAL AUDIT EVENTS & SYSTEM STATUS ---
    AuditService.log_event(
        db=db,
        actor=admin_user,
        action="SYSTEM_INIT",
        resource_type="VAULT",
        resource_id="GREEN_VAULT_GENESIS",
        outcome="SUCCESS",
        details={"message": "Green Vault Legal Repository initialized with AES-256-GCM encryption & Hash-Chained Blockchain Ledger."}
    )

    print("[SEED] Green Vault database seeding successfully completed!")
