import os
import argparse
import json
import datetime
import glob
from xml.sax.saxutils import escape
import pandas as pd
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Image, Spacer, Paragraph
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet

PAGE_BG = colors.HexColor("#f6f8fb")
INK = colors.HexColor("#102a43")
MUTED = colors.HexColor("#52616f")
BRAND = colors.HexColor("#174a7c")
BRAND_SOFT = colors.HexColor("#e7f0f8")
ROW_ALT = colors.HexColor("#f3f6f9")
BORDER = colors.HexColor("#d7dee8")

def readable_file(path):
    if not os.path.isfile(path):
        raise argparse.ArgumentTypeError(f"File not found: {path}")
    if not os.access(path, os.R_OK):
        raise argparse.ArgumentTypeError(f"File is not readable: {path}")
    return path

def expand_files(paths, extension, label):
    expanded = []
    for path in paths:
        matches = sorted(glob.glob(path))
        expanded.extend(matches if matches else [path])

    missing = [path for path in expanded if not os.path.isfile(path)]
    if missing:
        raise FileNotFoundError(f"{label} file not found: {missing[0]}")

    wrong_ext = [path for path in expanded if not path.lower().endswith(extension)]
    if wrong_ext:
        raise ValueError(f"{label} file must end with {extension}: {wrong_ext[0]}")

    return expanded

def flatten_json(y):
    out = {}

    def flatten(x, name=''):
        if isinstance(x, dict):
            for a in x:
                if a in ['id', 'id_from_qr'] and name == '':  # Special handling for 'id' and 'id_from_qr'
                    out[a] = x[a]
                else:
                    flatten(x[a], name + a + '_')
        elif isinstance(x, list):
            for i, a in enumerate(x):
                flatten(a, f"[Item:{i}]  {name}")  # Updated line
        else:
            out[name[:-1]] = x

    flatten(y)
    return out

def display_label(value):
    return str(value).strip()

def paragraph(text, style):
    return Paragraph(escape(str(text)), style)

def get_report_styles():
    base = getSampleStyleSheet()
    base.add(ParagraphStyle(
        name="ReportTitle",
        parent=base["Title"],
        fontName="Helvetica-Bold",
        fontSize=18,
        leading=22,
        textColor=INK,
        spaceAfter=4,
    ))
    base.add(ParagraphStyle(
        name="ReportSubtitle",
        parent=base["Normal"],
        fontSize=9,
        leading=12,
        textColor=MUTED,
    ))
    base.add(ParagraphStyle(
        name="SectionTitle",
        parent=base["Heading2"],
        fontName="Helvetica-Bold",
        fontSize=12,
        leading=15,
        textColor=BRAND,
        spaceBefore=8,
        spaceAfter=6,
    ))
    base.add(ParagraphStyle(
        name="TableKey",
        parent=base["Normal"],
        fontName="Helvetica-Bold",
        fontSize=8,
        leading=10,
        textColor=INK,
    ))
    base.add(ParagraphStyle(
        name="TableValue",
        parent=base["Normal"],
        fontSize=8,
        leading=10,
        textColor=INK,
    ))
    base.add(ParagraphStyle(
        name="Badge",
        parent=base["Normal"],
        fontName="Helvetica-Bold",
        fontSize=8,
        leading=10,
        textColor=BRAND,
    ))
    return base

def create_tables_for_term(data, term):
    term_data = [flatten_json(data.get(term, {}))]
    df = pd.DataFrame(term_data)

    if df.empty:
        return []

    styles = get_report_styles()
    rows = [[paragraph("Field", styles["TableKey"]), paragraph("Value", styles["TableKey"])]]
    for col in sorted(df.columns):
        rows.append([
            paragraph(display_label(col), styles["TableKey"]),
            paragraph(df[col].iloc[0], styles["TableValue"]),
        ])

    table = Table(rows, colWidths=[2.35 * inch, 4.75 * inch], hAlign="LEFT", repeatRows=1)
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), BRAND_SOFT),
        ("LINEBELOW", (0, 0), (-1, 0), 0.8, BRAND),
        ("BOX", (0, 0), (-1, -1), 0.6, BORDER),
        ("INNERGRID", (0, 1), (-1, -1), 0.35, BORDER),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 7),
        ("RIGHTPADDING", (0, 0), (-1, -1), 7),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, ROW_ALT]),
    ]))
    return [table]

def build_header(qr_code_file, logo_path, obj, data_type, styles):
    qr_code_img = Image(qr_code_file, width=1.15 * inch, height=1.15 * inch)
    qr_code_img.hAlign = "LEFT"

    id_value = obj.get("id_from_qr", obj.get("id", "Unknown"))
    generated_on = "omitted in test mode"
    title_block = [
        paragraph("Pheno-Ranker QR Report", styles["ReportTitle"]),
        paragraph(f"Sample: {id_value}", styles["ReportSubtitle"]),
        paragraph(f"Data type: {data_type.upper()} | Generated: {generated_on}", styles["ReportSubtitle"]),
    ]

    if logo_path:
        logo_img = Image(logo_path)
        logo_aspect_ratio = logo_img.imageWidth / logo_img.imageHeight
        logo_img.drawHeight = 0.7 * inch
        logo_img.drawWidth = logo_img.drawHeight * logo_aspect_ratio
        logo_img.hAlign = "RIGHT"
    else:
        logo_img = Spacer(1.4 * inch, 0.7 * inch)

    header = Table(
        [[qr_code_img, title_block, logo_img]],
        colWidths=[1.35 * inch, 4.2 * inch, 1.55 * inch],
        hAlign="LEFT",
    )
    header.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.white),
        ("BOX", (0, 0), (-1, -1), 0.8, BORDER),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), 12),
        ("RIGHTPADDING", (0, 0), (-1, -1), 12),
        ("TOPPADDING", (0, 0), (-1, -1), 12),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 12),
    ]))
    return header

def build_metadata_table(obj, data_type, styles, test=False):
    generated_on = "not shown" if test else datetime.datetime.now().strftime("%Y-%m-%d")
    rows = [[
        paragraph("Data type", styles["Badge"]),
        paragraph(data_type.upper(), styles["TableValue"]),
        paragraph("Identifier", styles["Badge"]),
        paragraph(obj.get("id_from_qr", obj.get("id", "Unknown")), styles["TableValue"]),
        paragraph("Date", styles["Badge"]),
        paragraph(generated_on, styles["TableValue"]),
    ]]
    table = Table(rows, colWidths=[0.85 * inch, 1.0 * inch, 0.85 * inch, 2.25 * inch, 0.55 * inch, 1.05 * inch])
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), BRAND_SOFT),
        ("BOX", (0, 0), (-1, -1), 0.5, BORDER),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ]))
    return table

def json_to_pdf(json_data, qr_code_files, output_dir, data_type, logo_path=None, test=False):
    if len(json_data) != len(qr_code_files):
        raise ValueError("The number of JSON objects does not match the number of PNG files.")

    styles = get_report_styles()

    for obj, qr_code_file in zip(json_data, qr_code_files):
        id_value = obj.get('id_from_qr', 'default').replace(':', '_')
        pdf_file_name = f'{id_value}.pdf'
        pdf_path = os.path.join(output_dir, pdf_file_name)

        pdf = SimpleDocTemplate(
            pdf_path,
            pagesize=letter,
            leftMargin=0.7 * inch,
            rightMargin=0.7 * inch,
            topMargin=0.55 * inch,
            bottomMargin=0.6 * inch,
        )

        elements = []

        elements.append(build_header(qr_code_file, logo_path, obj, data_type, styles))
        elements.append(Spacer(1, 10))
        elements.append(build_metadata_table(obj, data_type, styles, test))
        elements.append(Spacer(1, 12))
        elements.append(paragraph("Auto-generated report by Pheno-Ranker.", styles["ReportSubtitle"]))
        elements.append(Spacer(1, 10))

        for term in obj.keys():
            if term in {"id", "id_from_qr"}:
                continue

            elements.append(paragraph(display_label(term), styles["SectionTitle"]))
            tables = create_tables_for_term(obj, term)
            if tables:
                for table in tables:
                    table.hAlign = 'LEFT'
                    elements.append(table)
                    elements.append(Spacer(1, 12))

        pdf.build(elements)

def main_generate():
    parser = argparse.ArgumentParser(description='Convert JSON data to a formatted PDF file.')
    parser.add_argument('-j', '--json', required=True, type=readable_file, help='Path to the JSON file.')
    parser.add_argument('-q', '--qr', required=True, nargs='+', help='Path to the QR code images, use space to separate multiple files.')
    parser.add_argument('-o', '--output', default='pdf', help='Output directory for PDF files. Default: pdf')
    parser.add_argument('-t', '--type', required=True, choices=['bff', 'pxf'], help='Type of data processing required.')
    parser.add_argument('-l', '--logo', type=readable_file, help='Path to the logo image.')
    parser.add_argument('--test', action='store_true', help='Enable test mode (does not print date to PDF).')

    args = parser.parse_args()

    with open(args.json, 'r', encoding='utf-8') as file:
        json_data = json.load(file)
    qr_files = expand_files(args.qr, '.png', 'QR')

    if not os.path.exists(args.output):
        os.makedirs(args.output)

    json_to_pdf(json_data, qr_files, args.output, args.type, args.logo, args.test)
