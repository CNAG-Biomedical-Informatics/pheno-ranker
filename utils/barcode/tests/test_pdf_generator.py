#!/usr/bin/env python3

import sys
import datetime
import base64
import copy
import gzip
import json
import shutil
import subprocess
import tempfile
import unittest
from pathlib import Path

UTILS_DIR = Path(__file__).resolve().parents[1]
REPO_ROOT = UTILS_DIR.parents[1]
sys.path.insert(0, str(UTILS_DIR))

import pdf_generator  # noqa: E402
import qr_code_utils


class PDFGeneratorTest(unittest.TestCase):
    def test_pdf_rejects_mismatched_source_and_png_before_supplementing(self):
        vector = {'phenotypicFeatures.HP:0001250.type.id.HP:0001250': 1}
        with tempfile.TemporaryDirectory() as tmp:
            image = Path(tmp) / 'sample.png'
            qr_code_utils.generate_qr_from_data('1', str(image), 1)
            wrong = {'id_from_qr': 'sample', 'phenotypicFeatures': [{'type': {'id': 'HP:0001263'}}]}
            with self.assertRaisesRegex(ValueError, 'does not match'):
                pdf_generator.pdf_display_record(wrong, str(image), vector, {next(iter(vector)): 'Seizure'})

    def test_sidecar_uses_exact_ids_not_order_prefix_or_namespace(self):
        sidecar = {'phenotypicFeatures.HP:00012500.type.id.HP:00012500': 'Prefix trap',
                   'diseases.OTHER:0001250.term.id.OTHER:0001250': 'Namespace trap',
                   'phenotypicFeatures.HP:0001263.type.id.HP:0001263': 'Global developmental delay',
                   'phenotypicFeatures.HP:0001250.type.id.HP:0001250': 'Seizure'}
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / 'labels.json'
            path.write_text(json.dumps(sidecar))
            template = dict.fromkeys(sidecar, 1)
            index = qr_code_utils.load_vector_labels(path, template)
            path.write_text(json.dumps(dict(reversed(list(sidecar.items())))))
            self.assertEqual(index, qr_code_utils.load_vector_labels(path, template))
            bits = ''.join('1' if key.endswith('.id.HP:0001250') else '0' for key in sorted(template))
            flat = qr_code_utils.decode_binary_string(bits, template, index)
            self.assertEqual(flat, {'phenotypicFeatures.HP:0001250.type.id': 'HP:0001250',
                                    'phenotypicFeatures.HP:0001250.type.label': 'Seizure'})
            path.write_text('{"term.id.HP:1":"one","term.id.HP:1":"two"}')
            with self.assertRaisesRegex(ValueError, 'Duplicate key'):
                qr_code_utils.load_vector_labels(path, template)

    def test_label_sidecar_plain_gzip_and_validation(self):
        labels = {'phenotypicFeatures.HP:1.type.id.HP:1': 'Term one',
                  'phenotypicFeatures.HP:2.type.id.HP:2': 'HP:2'}
        with tempfile.TemporaryDirectory() as tmp:
            for suffix, opener in [('.json', open), ('.json.gz', gzip.open)]:
                path = Path(tmp) / ('labels' + suffix)
                with opener(path, 'wt', encoding='utf-8') as handle:
                    json.dump(labels, handle)
                self.assertEqual(qr_code_utils.load_vector_labels(path, dict.fromkeys(labels, 1)), labels)
            for invalid in ([], {'key': []}, {**labels, 'other.id.HP:1': 'Conflicting term'}):
                path = Path(tmp) / 'invalid.json'
                path.write_text(json.dumps(invalid))
                with self.assertRaises(ValueError):
                    qr_code_utils.load_vector_labels(path, dict.fromkeys(labels, 1))

    def test_sidecar_supplements_only_missing_labels_without_changing_source(self):
        for format_, key in [('bff', 'featureType'), ('pxf', 'type')]:
            template = {f'phenotypicFeatures.HP:1.{key}.id.HP:1': 1,
                        f'phenotypicFeatures.HP:2.{key}.id.HP:2': 1,
                        f'phenotypicFeatures.HP:2.{key}.label.Original label': 1}
            labels = {list(template)[0]: 'Supplied <term>', list(template)[1]: 'Replacement'}
            obj = qr_code_utils.reconstruct_json_from_binary('111', template)
            obj['id_from_qr'] = 'sample'
            original = copy.deepcopy(obj)
            with tempfile.TemporaryDirectory() as tmp:
                image = Path(tmp) / 'sample.png'
                qr_code_utils.generate_qr_from_data('111', str(image), 1)
                display = pdf_generator.pdf_display_record(obj, str(image), template, labels)
            overview = pdf_generator.phenotype_overview(display, format_, pdf_generator.get_report_styles())
            rows = overview[0]._cellvalues
            self.assertEqual(rows[2][0].getPlainText(), 'Supplied <term>')
            self.assertEqual(rows[3][0].getPlainText(), 'Original label')
            self.assertEqual(obj, original)

    @unittest.skipUnless(shutil.which('pdftotext'), 'pdftotext needed to inspect CLI report')
    def test_cli_labels_argument_restores_a_missing_pxf_name(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            source = root / 'decoded.json'
            vector = {'phenotypicFeatures.HP:0001250.type.id.HP:0001250': 1}
            record = qr_code_utils.reconstruct_json_from_binary('1', vector)
            record['id_from_qr'] = 'sample'
            source.write_text(json.dumps([record]))
            original = source.read_bytes()
            template = root / 'template.json'
            template.write_text(json.dumps(vector))
            image = root / 'sample.png'
            qr_code_utils.generate_qr_from_data('1', str(image), 1)
            labels = root / 'export.labels.json'
            labels.write_text(json.dumps({'phenotypicFeatures.HP:0001250.type.id.HP:0001250': 'Seizure'}))
            subprocess.run([sys.executable, str(UTILS_DIR / 'pheno-ranker2pdf'), '-j', str(source),
                            '-q', str(image), '--template', str(template),
                            '-t', 'pxf', '--labels', str(labels), '-o', str(root / 'reports'), '--test'],
                           check=True, capture_output=True)
            text = subprocess.check_output(['pdftotext', str(root / 'reports/sample.pdf'), '-'], text=True)
            self.assertIn('Seizure', text)
            self.assertNotIn('[label sidecar]', text)
            self.assertIn('HP:0001250', text)
            self.assertEqual(source.read_bytes(), original)

    def test_pdf_recognizes_pxf_even_with_default_bff_setting(self):
        self.assertEqual(pdf_generator.record_format({'subject': {}}, 'bff'), 'pxf')
        self.assertEqual(pdf_generator.record_format({'phenotypicFeatures': [{'type': {'id': 'HP:0001250'}}]}, 'bff'), 'pxf')
        self.assertEqual(pdf_generator.record_format({'phenotypicFeatures': [{'featureType': {'id': 'HP:0001250'}}]}, 'pxf'), 'bff')
        self.assertEqual(pdf_generator.record_format({}, 'pxf'), 'pxf')
        with self.assertRaisesRegex(ValueError, 'mixes'):
            pdf_generator.record_format({'subject': {}, 'phenotypicFeatures': [{'featureType': {}}]}, 'bff')

    @unittest.skipUnless(shutil.which('pdftotext'), 'pdftotext needed to inspect report')
    def test_non_phenotype_hints_stay_in_their_pdf_sections(self):
        labels = {'diseases.NCIT:C3138.diseaseCode.id.NCIT:C3138': 'Inflammatory Bowel Disease',
                  'measures.NCIT:C1.assayCode.id.NCIT:C1': 'Assay hint',
                  'treatments.NCIT:C2.treatmentCode.id.NCIT:C2': 'Inactive treatment'}
        template = dict.fromkeys(labels, 1)
        record = qr_code_utils.reconstruct_json_from_binary('110', template)
        record['id_from_qr'] = 'sample'
        original = copy.deepcopy(record)
        with tempfile.TemporaryDirectory() as tmp:
            image = Path(tmp) / 'sample.png'
            qr_code_utils.generate_qr_from_data('110', str(image), 1)
            display = pdf_generator.pdf_display_record(record, str(image), template, labels)
            table = pdf_generator.create_tables_for_term(record, 'measures', display)[0]
            self.assertEqual([cell.getPlainText() for cell in table._cellvalues[1]],
                             ['Field', 'Value', 'Label hint'])
            self.assertEqual([cell.getPlainText() for cell in table._cellvalues[3]],
                             ['assayCode_id', 'NCIT:C1', 'Assay hint'])
            pdf_generator.json_to_pdf([record], [str(image)], tmp, 'bff', labels=labels, template=template)
            text = subprocess.check_output(['pdftotext', '-layout', str(Path(tmp) / 'sample.pdf'), '-'], text=True)
            self.assertNotIn('Additional label hints', text)
            self.assertNotIn('[label sidecar]', text)
            self.assertIn('Inflammatory Bowel Disease', text)
            self.assertIn('Assay hint', text)
            self.assertNotIn('Inactive treatment', text)
            details = text.split('Record details', 1)[1]
            diseases, measures = details.split('measures', 1)
            self.assertIn('diseases', diseases)
            self.assertIn('Item 1', measures)
            self.assertIn('Label hint', measures)
            self.assertIn('assayCode_id', measures)
            self.assertNotIn('assayCode_label', measures)
            self.assertIn('Assay hint', measures)
            self.assertNotIn('Inflammatory Bowel Disease', measures)
            self.assertIn('diseaseCode_id', diseases)
            self.assertNotIn('diseaseCode_label', diseases)
            self.assertIn('Inflammatory Bowel Disease', diseases)
        self.assertEqual(record, original)

    def test_phenotype_overview_preserves_exclusion_and_missingness(self):
        styles = pdf_generator.get_report_styles()
        for data_type, key in [('bff', 'featureType'), ('pxf', 'type')]:
            features = [{key: {'id': 'HP:0001250', 'label': 'Seizure'}, 'excluded': True},
                        {key: {'id': 'HP:0001263', 'label': 'Developmental delay'}, 'excluded': False},
                        {key: {'id': 'HP:0004322'}},
                        {key: {'label': '<Unverified & supplied>'}, 'excluded': 'true'}]
            table = pdf_generator.phenotype_overview({'phenotypicFeatures': features}, data_type, styles)[0]
            rows = [[cell.getPlainText() for cell in row] for row in table._cellvalues[2:]]
            self.assertEqual(rows[0], ['Seizure', 'HP:0001250', 'Excluded'])
            self.assertEqual(rows[1][-1], 'Not excluded')
            self.assertEqual(rows[2], ['Label not supplied', 'HP:0004322', 'Not specified'])
            self.assertEqual(rows[3], ['<Unverified & supplied>', 'ID not supplied', 'Excluded'])

    def test_default_logo_matches_repository_asset_and_custom_logo_overrides(self):
        self.assertEqual(base64.b64decode(pdf_generator.DEFAULT_LOGO_PNG),
                         (REPO_ROOT / 'docs-site/static/img/PR-logo.png').read_bytes())
        qr = str(REPO_ROOT / 't/data/qr_codes/107_week_0_arm_1.png')
        styles = pdf_generator.get_report_styles()
        default = pdf_generator.build_header(qr, None, {}, 'bff', styles)._cellvalues[0][0][0]
        custom = pdf_generator.build_header(qr, qr, {}, 'bff', styles)._cellvalues[0][0][0]
        self.assertEqual(custom.filename, qr)
        self.assertNotEqual(default.imageWidth / default.imageHeight, custom.imageWidth / custom.imageHeight)
        for logo in (default, custom):
            self.assertAlmostEqual(logo.drawWidth / logo.drawHeight, logo.imageWidth / logo.imageHeight)

    def test_tables_preserve_schema_names_and_escape_text(self):
        table = pdf_generator.create_tables_for_term({"diseases": [
            {"diseaseCode": {"id": "NCIT:C3138", "label": "A < B & C"}}
        ]}, "diseases")[0]
        text = [cell.getPlainText() for row in table._cellvalues
                for cell in row if hasattr(cell, "getPlainText")]
        self.assertEqual(table.repeatRows, 2)
        self.assertIn("Item 1", text)
        self.assertIn("diseaseCode_id", text)
        self.assertIn("NCIT:C3138", text)
        self.assertIn("A < B & C", text)

    def test_date_only_suppressed_in_test_mode(self):
        styles = pdf_generator.get_report_styles()
        for test in (False, True):
            table = pdf_generator.build_metadata_table({"id": "original-ID"}, "bff", styles, test)
            text = [cell.getPlainText() for cell in table._cellvalues[0]]
            self.assertIn("original-ID", text)
            self.assertIn("not shown" if test else datetime.date.today().isoformat(), text)

    @unittest.skipUnless(shutil.which("pdftotext"), "pdftotext needed to check rendered pages")
    def test_multipage_report_keeps_every_item_without_blank_pages(self):
        qr = REPO_ROOT / "t/data/qr_codes/107_week_0_arm_1.png"
        data = {"id": "original-ID", "id_from_qr": "safe-ID", "diseases": [
            {"diseaseCode": {"id": f"NCIT:C{index}", "label": f"Marker-{index:03d}"}}
            for index in range(100)
        ]}
        with tempfile.TemporaryDirectory() as tmp:
            pdf_generator.json_to_pdf([data], [str(qr)], tmp, "bff", test=True)
            text = subprocess.check_output(["pdftotext", str(Path(tmp) / "safe-ID.pdf"), "-"], text=True)
        pages = text.rstrip("\f\n").split("\f")
        self.assertGreater(len(pages), 1)
        for index, page in enumerate(pages, 1):
            self.assertIn(f"Page {index}", page)
            self.assertIn('Record: original-ID', page)
            self.assertIn("diseaseCode", page)
        for index in range(100):
            self.assertIn(f"Marker-{index:03d}", text)
        self.assertIn("original-ID", text)
        self.assertIn("safe-ID", text)

    def test_flatten_json_keeps_top_level_ids(self):
        data = {
            "id": "sample-1",
            "id_from_qr": "sample_1",
            "diseases": [
                {
                    "diseaseCode": {
                        "id": "NCIT:C3138",
                        "label": "Cancer",
                    }
                }
            ],
        }

        flattened = pdf_generator.flatten_json(data)

        self.assertEqual(flattened["id"], "sample-1")
        self.assertEqual(flattened["id_from_qr"], "sample_1")
        self.assertEqual(
            flattened["[Item:0]  diseases_diseaseCode_id"],
            "NCIT:C3138",
        )
        self.assertEqual(
            flattened["[Item:0]  diseases_diseaseCode_label"],
            "Cancer",
        )

    def test_expand_files_expands_and_sorts_globs(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            tmp = Path(tmpdir)
            (tmp / "b.png").write_bytes(b"fake png")
            (tmp / "a.png").write_bytes(b"fake png")

            expanded = pdf_generator.expand_files([str(tmp / "*.png")], ".png", "QR")

        self.assertEqual([Path(path).name for path in expanded], ["a.png", "b.png"])

    def test_expand_files_rejects_wrong_extension(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            path = Path(tmpdir) / "qr.jpg"
            path.write_bytes(b"fake jpg")

            with self.assertRaises(ValueError):
                pdf_generator.expand_files([str(path)], ".png", "QR")

    def test_json_to_pdf_smoke(self):
        qr_path = REPO_ROOT / "t" / "data" / "qr_codes" / "107_week_0_arm_1.png"
        self.assertTrue(qr_path.is_file(), "QR fixture is required for PDF smoke test")

        with tempfile.TemporaryDirectory() as tmpdir:
            pdf_generator.json_to_pdf(
                [
                    {
                        "id_from_qr": "sample_1",
                        "id": "sample-1",
                        "diseases": [
                            {
                                "diseaseCode": {
                                    "id": "NCIT:C3138",
                                    "label": "Cancer",
                                }
                            }
                        ],
                    }
                ],
                [str(qr_path)],
                tmpdir,
                "bff",
                test=True,
            )

            pdf_path = Path(tmpdir) / "sample_1.pdf"
            self.assertTrue(pdf_path.is_file())
            self.assertEqual(pdf_path.read_bytes()[:5], b"%PDF-")

    def test_json_to_pdf_rejects_mismatched_inputs(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            with self.assertRaises(ValueError):
                pdf_generator.json_to_pdf([{"id_from_qr": "sample_1"}], [], tmpdir, "bff")


if __name__ == "__main__":
    unittest.main()
