import os
import argparse
import json
import datetime
import pandas as pd
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Image, Spacer, Paragraph
from reportlab.lib.styles import getSampleStyleSheet

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

def create_tables_for_term(data, term):
    term_data = [flatten_json(data.get(term, {}))]
    df = pd.DataFrame(term_data)

    if df.empty:
        return []

    tables = []
    for col in df.columns:
        table_data = [[col], [df[col].iloc[0]]]
        table = Table(table_data, colWidths=[4.5*inch, 5*inch])
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.lightblue),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.black),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
            ('GRID', (0, 0), (-1, -1), 1, colors.black),
            ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('WORDWRAP', (0, 0), (-1, -1), 'LTR')
        ]))
        tables.append(table)
    return tables

def json_to_pdf(json_data, qr_code_files, output_dir, data_type, logo_path=None, test=False):
    if len(json_data) != len(qr_code_files):
        raise ValueError("The number of JSON objects does not match the number of PNG files.")

    styles = getSampleStyleSheet()

    for obj, qr_code_file in zip(json_data, qr_code_files):
        id_value = obj.get('id_from_qr', 'default').replace(':', '_')
        pdf_file_name = f'{id_value}.pdf'
        pdf_path = os.path.join(output_dir, pdf_file_name)

        pdf = SimpleDocTemplate(
            pdf_path,
            pagesize=letter,
            leftMargin=1.5 * inch,
            rightMargin=0.5 * inch
        )

        elements = []

        qr_code_img = Image(qr_code_file, width=1*inch, height=1*inch)
        qr_code_img.hAlign = 'LEFT'

        id_value = obj.get('id_from_qr', 'default')
        id_paragraph = Paragraph(f'ID: {id_value}', styles['Heading2'])

        if logo_path:
            logo_img = Image(logo_path)
            logo_aspect_ratio = logo_img.imageWidth / logo_img.imageHeight
            logo_img.drawHeight = 1 * inch
            logo_img.drawWidth = logo_img.drawHeight * logo_aspect_ratio
            logo_img.hAlign = 'RIGHT'
        else:
            logo_img = Spacer(1*inch, 1*inch)

        header_table = Table([
            [qr_code_img, logo_img]
        ], colWidths=[4*inch, 4*inch])

        header_table.setStyle(TableStyle([
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('TOPPADDING', (0, 0), (-1, -1), 12),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 12),
        ]))

        elements.append(header_table)
        elements.append(id_paragraph)

        if not test:
            current_date = datetime.datetime.now().strftime("%Y-%m-%d")
            date_paragraph = Paragraph(f'Date: {current_date}', styles['Normal'])
            elements.append(date_paragraph)

        data_type_paragraph = Paragraph(f'Data type: {data_type.upper()}', styles['Normal'])
        auto_generated_text = "This is an auto-generated report by Pheno-Ranker"
        auto_generated_paragraph = Paragraph(auto_generated_text, styles['Normal'])

        elements.extend([data_type_paragraph, auto_generated_paragraph])

        for term in obj.keys():
            elements.append(Paragraph(term, styles['Heading2']))
            tables = create_tables_for_term(obj, term)
            if tables:
                for table in tables:
                    table.setStyle(TableStyle([
                        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                        ('WORDWRAP', (0, 0), (-1, -1), 'LTR'),
                    ]))
                    table.hAlign = 'LEFT'
                    elements.append(table)
                    elements.append(Spacer(1, 12))

        pdf.build(elements)

def main_generate():
    parser = argparse.ArgumentParser(description='Convert JSON data to a formatted PDF file.')
    parser.add_argument('-j', '--json', required=True, help='Path to the JSON file.')
    parser.add_argument('-q', '--qr', required=True, nargs='+', help='Path to the QR code images, use space to separate multiple files.')
    parser.add_argument('-o', '--output', default='pdf', help='Output directory for PDF files. Default: pdf')
    parser.add_argument('-t', '--type', required=True, choices=['bff', 'pxf'], help='Type of data processing required.')
    parser.add_argument('-l', '--logo', help='Path to the logo image.')
    parser.add_argument('--test', action='store_true', help='Enable test mode (does not print date to PDF).')

    args = parser.parse_args()

    with open(args.json, 'r') as file:
        json_data = json.load(file)

    if not os.path.exists(args.output):
        os.makedirs(args.output)

    json_to_pdf(json_data, args.qr, args.output, args.type, args.logo, args.test)
