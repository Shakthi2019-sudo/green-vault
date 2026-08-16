import io
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT, TA_JUSTIFY

def generate_legal_pdf(
    title: str,
    case_id: str,
    case_title: str,
    doc_category: str,
    version: int,
    court_name: str,
    body_paragraphs: list[str],
    signatory: str = "Authorized Registrar / Legal Counsel",
    date_str: str = "2026-03-15"
) -> bytes:
    """Generate a clean, professional legal document PDF in memory."""
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=54,
        leftMargin=54,
        topMargin=54,
        bottomMargin=54
    )

    styles = getSampleStyleSheet()

    header_style = ParagraphStyle(
        'LegalHeader',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=13,
        leading=16,
        alignment=TA_CENTER,
        textColor=colors.HexColor('#0D5C3A')
    )

    sub_header_style = ParagraphStyle(
        'LegalSubHeader',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=12,
        alignment=TA_CENTER,
        textColor=colors.HexColor('#475569')
    )

    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=15,
        leading=18,
        alignment=TA_CENTER,
        textColor=colors.HexColor('#1E293B'),
        spaceAfter=12
    )

    meta_label_style = ParagraphStyle(
        'MetaLabel',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=9,
        leading=11,
        textColor=colors.HexColor('#0F172A')
    )

    meta_val_style = ParagraphStyle(
        'MetaVal',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=11,
        textColor=colors.HexColor('#334155')
    )

    body_style = ParagraphStyle(
        'LegalBody',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=10,
        leading=15,
        alignment=TA_JUSTIFY,
        textColor=colors.HexColor('#1E293B'),
        spaceAfter=10
    )

    sign_style = ParagraphStyle(
        'SignStyle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=10,
        leading=14,
        alignment=TA_RIGHT,
        textColor=colors.HexColor('#0D5C3A')
    )

    story = []

    # Court & Vault Header
    story.append(Paragraph(court_name.upper(), header_style))
    story.append(Paragraph("DIGITAL LEGAL RECORDS REGISTRY &bull; GREEN VAULT PROTECTED REPOSITORY", sub_header_style))
    story.append(Spacer(1, 10))
    story.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor('#0D5C3A'), spaceBefore=2, spaceAfter=12))

    # Document Title
    story.append(Paragraph(title.upper(), title_style))

    # Metadata Table Box
    meta_data = [
        [Paragraph("Case Identifier:", meta_label_style), Paragraph(case_id, meta_val_style),
         Paragraph("Date of Record:", meta_label_style), Paragraph(date_str, meta_val_style)],
        [Paragraph("Case Title:", meta_label_style), Paragraph(case_title, meta_val_style),
         Paragraph("Vault Version:", meta_label_style), Paragraph(f"Version {version}.0 (AES-256 Protected)", meta_val_style)],
        [Paragraph("Category:", meta_label_style), Paragraph(doc_category, meta_val_style),
         Paragraph("Integrity Protocol:", meta_label_style), Paragraph("SHA-256 Ledger Verified", meta_val_style)]
    ]

    meta_table = Table(meta_data, colWidths=[90, 160, 90, 160])
    meta_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#F8FAFC')),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#CBD5E1')),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor('#E2E8F0')),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ('LEFTPADDING', (0,0), (-1,-1), 6),
        ('RIGHTPADDING', (0,0), (-1,-1), 6),
    ]))
    story.append(meta_table)
    story.append(Spacer(1, 16))

    # Body Content
    for p in body_paragraphs:
        story.append(Paragraph(p, body_style))

    story.append(Spacer(1, 20))
    story.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor('#E2E8F0'), spaceBefore=4, spaceAfter=12))

    # Signatory Block
    story.append(Paragraph(f"Digitally Certified & Vault-Recorded by:<br/><b>{signatory}</b><br/>Registry Stamp: GREEN-VAULT-AUTHENTICATED", sign_style))

    # Footer note
    disclaimer_style = ParagraphStyle(
        'Disclaimer',
        parent=styles['Normal'],
        fontName='Helvetica-Oblique',
        fontSize=8,
        leading=10,
        alignment=TA_CENTER,
        textColor=colors.HexColor('#94A3B8')
    )
    story.append(Spacer(1, 25))
    story.append(Paragraph("CONFIDENTIAL & PROPRIETARY LEGAL RECORD &bull; Fictional Demo Document for Green Vault Prototype", disclaimer_style))

    doc.build(story)
    buffer.seek(0)
    return buffer.getvalue()
