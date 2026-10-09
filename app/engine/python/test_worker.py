import csv
import json
import tempfile
import unittest
import subprocess
import sys
from pathlib import Path
import numpy as np
from unittest.mock import patch
from worker import mds, projection, report_images, selected_report_records, unique_qr_inputs, validate_qr_records, qr_report_records

ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(ROOT / 'utils' / 'barcode'))


class MdsTests(unittest.TestCase):
    def calculate(self, metric, matrix, labels=("C1_patient:visit", "other")):
        with tempfile.TemporaryDirectory() as temp:
            source = Path(temp) / "matrix.tsv"
            with source.open("w", newline="") as handle:
                writer = csv.writer(handle, delimiter="\t")
                writer.writerow(["ID", *labels])
                for label, row in zip(labels, matrix):
                    writer.writerow([label, *row])
            return mds(source, metric, Path(temp) / "mds.json")

    def test_distance_and_identifiers(self):
        result = self.calculate("hamming", [[0, 3], [3, 0]])
        self.assertEqual(result["points"][0]["id"], "C1_patient:visit")
        points = np.asarray([[v["x"], v["y"]] for v in result["points"]])
        self.assertAlmostEqual(np.linalg.norm(points[0] - points[1]), 3)

    def test_jaccard_is_converted_to_distance(self):
        result = self.calculate("jaccard", [[1, .25], [.25, 1]])
        self.assertAlmostEqual(abs(result["points"][0]["x"] - result["points"][1]["x"]), .75)

    def test_invalid_matrix(self):
        for matrix in ([[0, 1], [2, 0]], [[0, float("nan")], [float("nan"), 0]]):
            with self.assertRaises(ValueError):
                self.calculate("hamming", matrix)

    def test_single_record(self):
        self.assertEqual(self.calculate("hamming", [[0]], ("one",))["points"], [{"id": "one", "x": 0., "y": 0.}])

    def test_mds_limit(self):
        with tempfile.TemporaryDirectory() as temp:
            source = Path(temp) / 'matrix.tsv'
            output = Path(temp) / 'mds.json'
            source.write_text('ID\t' + '\t'.join(f'r{i}' for i in range(10501)) + '\n')
            result = mds(source, 'hamming', output)
            self.assertTrue(result['skipped'])
            self.assertIn('10500', result['message'])
            # Below the limit, parsing is attempted rather than silently skipped.
            source.write_text('ID\t' + '\t'.join(f'r{i}' for i in range(10500)) + '\n')
            with self.assertRaisesRegex(ValueError, 'identifiers'):
                mds(source, 'hamming', output)

    def test_projection_uses_configured_limit(self):
        with tempfile.TemporaryDirectory() as temp:
            source = Path(temp) / 'matrix.tsv'
            output = Path(temp) / 'projection.json'
            source.write_text('ID\t' + '\t'.join(f'r{i}' for i in range(11)) + '\n')
            result = projection(source, 'hamming', 'umap', output, limit=10)
            self.assertTrue(result['skipped'])
            self.assertIn('10', result['message'])
            with self.assertRaisesRegex(ValueError, 'identifiers'):
                projection(source, 'hamming', 'mds', output)

    def test_centering_matches_classical_formula(self):
        distances = np.array([[0., 2., 3.], [2., 0., 4.], [3., 4., 0.]])
        squared = distances ** 2
        expected = -.5 * (squared - squared.mean(axis=0) - squared.mean(axis=1)[:, None] + squared.mean())
        eigh = np.linalg.eigh
        with patch('numpy.linalg.eigh', wraps=eigh) as solve:
            self.calculate('hamming', distances.tolist(), ('a', 'b', 'c'))
            np.testing.assert_allclose(solve.call_args.args[0], expected)


class UmapTests(unittest.TestCase):
    def test_repeatable_projection_keeps_source_and_identifiers(self):
        with tempfile.TemporaryDirectory() as temp:
            source = Path(temp) / 'matrix.txt'
            original = 'ID\ta\tb\tc\td\na\t1\t.8\t.2\t.1\nb\t.8\t1\t.3\t.2\nc\t.2\t.3\t1\t.9\nd\t.1\t.2\t.9\t1\n'
            source.write_text(original)
            output = Path(temp) / 'umap.json'
            first = projection(source, 'jaccard', 'umap', output)
            second = projection(source, 'jaccard', 'umap', output)
            self.assertEqual(first, second)
            self.assertEqual(source.read_text(), original)
            self.assertEqual([p['id'] for p in first['points']], ['a', 'b', 'c', 'd'])
            self.assertEqual(first['parameters']['effective_n_neighbors'], 3)
            self.assertEqual(first['metric'], 'jaccard')
            self.assertIn('umap-learn', first['versions'])
            self.assertEqual(json.loads(output.read_text()), first)

    def test_small_cohort_and_invalid_parameters(self):
        with tempfile.TemporaryDirectory() as temp:
            source = Path(temp) / 'matrix.txt'
            source.write_text('ID\ta\tb\na\t0\t1\nb\t1\t0\n')
            with self.assertRaisesRegex(ValueError, 'at least three'):
                projection(source, 'hamming', 'umap', Path(temp) / 'umap.json')
            with self.assertRaisesRegex(ValueError, 'Invalid UMAP'):
                projection(source, 'hamming', 'umap', min_dist=2)


class BarcodeHandoffTests(unittest.TestCase):
    def test_binary_positions_survive_qr_decoding_and_pdf_label_lookup(self):
        from qr_code_utils import generate_qr_from_data, decode_qr_code, reconstruct_json_from_binary
        from pdf_generator import pdf_display_record, phenotype_overview, get_report_styles
        from qr_code_utils import load_vector_labels
        # Spot-checked against the local HPO: three distinct, ordered vector positions.
        terms = [('HP:0001250', 'Seizure'), ('HP:0001263', 'Global developmental delay'),
                 ('HP:0004322', 'Short stature')]
        with tempfile.TemporaryDirectory() as tmp:
            for format_, field in [('bff', 'featureType'), ('pxf', 'type')]:
                keys = [f'phenotypicFeatures.{identifier}.{field}.id.{identifier}' for identifier, _ in terms]
                # Deliberately reverse the input dictionaries: vector order is sorted keys.
                template = {key: 1 for key in reversed(keys)}
                sidecar = dict(reversed(list(zip(keys, [label for _, label in terms]))))
                labels_path = Path(tmp) / 'labels.json'
                labels_path.write_text(json.dumps(sidecar))
                labels = load_vector_labels(labels_path, template)
                for bits in ['100', '010', '001', '101']:
                    for compressed in (False, True):
                        with self.subTest(format=format_, bits=bits, compressed=compressed):
                            prepared, ordered_template = qr_report_records({'sample': {'binary_digit_string': bits}}, template)
                            image = Path(tmp) / 'sample.png'
                            generate_qr_from_data(bits, str(image), 1, compressed)
                            _, decoded_bits, is_compressed = decode_qr_code(str(image))
                            self.assertEqual(decoded_bits, bits)
                            self.assertEqual(is_compressed, compressed)
                            scanned = reconstruct_json_from_binary(decoded_bits, ordered_template)
                            self.assertEqual(scanned, {key: value for key, value in prepared[0].items() if key != 'id_from_qr'})
                            expected = [term for bit, term in zip(bits, terms) if bit == '1']
                            self.assertEqual([feature[field]['id'] for feature in scanned['phenotypicFeatures']],
                                             [identifier for identifier, _ in expected])
                            scanned['id_from_qr'] = 'sample'
                            display = pdf_display_record(scanned, str(image), template, labels)
                            rows = phenotype_overview(display, format_, get_report_styles())[0]._cellvalues[2:]
                            self.assertEqual([(row[1].getPlainText(), row[0].getPlainText()) for row in rows],
                                             expected)

    def test_qr_inputs_deduplicate_paths_but_reject_colliding_names(self):
        with tempfile.TemporaryDirectory() as temp:
            image = str(Path(temp) / 'one.png')
            self.assertEqual(unique_qr_inputs([image, image]), [str(Path(image).resolve())])
            with self.assertRaisesRegex(ValueError, 'share the record identifier'):
                unique_qr_inputs([image, str(Path(temp) / 'other' / 'one.png')])

    def test_reports_sort_template_and_reject_wrong_length(self):
        records = {'sample:1': {'binary_digit_string': '10'}}
        decoded, template = qr_report_records(records, {'sex.label.Female': 1, 'diseases.MONDO:1.label.Example': 1})
        self.assertEqual(list(template), sorted(template))
        self.assertEqual(decoded[0]['id_from_qr'], 'sample_1')
        self.assertIn('diseases', decoded[0])
        self.assertNotIn('sex', decoded[0])
        with self.assertRaisesRegex(ValueError, 'different numbers'):
            qr_report_records(records, {'sex.label.Female': 1})

    def test_analysis_qr_pdf_roundtrip(self):
        from qr_code_utils import decode_qr_codes_to_json
        with tempfile.TemporaryDirectory() as tmp:
            temp = Path(tmp)
            # Small real analysis; fixtures are only read and every output stays temporary.
            analysis = subprocess.run(['perl', str(ROOT / 'bin' / 'pheno-ranker'), '--reference',
                            str(ROOT / 't/data/individuals.json'), '--no-color', '--export',
                            str(temp / 'export'), '--out-file', str(temp / 'matrix.txt')], capture_output=True, text=True)
            self.assertEqual(analysis.returncode, 0, analysis.stderr + analysis.stdout)
            worker = str(Path(__file__).with_name('worker.py'))
            subprocess.run([sys.executable, worker, 'qr-encode', '--input', str(temp / 'export.ref_binary_hash.json'),
                            '--template', str(temp / 'export.glob_hash.json'), '--labels', str(temp / 'export.labels.json'), '--output', str(temp / 'qr')], check=True, capture_output=True)
            images = sorted(str(p) for p in (temp / 'qr').glob('*.png'))
            from qr_code_utils import decode_qr_code
            for image in images:
                self.assertEqual(Path(image).with_suffix('.payload.txt').read_bytes(), decode_qr_code(image)[0])
                from PIL import Image
                info = json.loads(Path(image).with_suffix('.qr.json').read_text())
                with Image.open(image) as png:
                    self.assertEqual(png.width, (17 + 4 * info['version'] + 8) * 10)
            records = json.loads((temp / 'qr/decoded.json').read_text())
            template = json.loads((temp / 'qr/glob_hash.json').read_text())
            self.assertEqual(json.loads((temp / 'qr/labels.json').read_text()), json.loads((temp / 'export.labels.json').read_text()))
            scanned = decode_qr_codes_to_json(images, template)
            subprocess.run([sys.executable, worker, 'qr-decode', '--input', images[0], images[0],
                            '--template', str(temp / 'qr/glob_hash.json'), '--output', str(temp / 'deduplicated.json')], check=True, capture_output=True)
            self.assertEqual(len(json.loads((temp / 'deduplicated.json').read_text())), 1)
            self.assertEqual(sorted(records, key=lambda r: r['id_from_qr']), sorted(scanned, key=lambda r: r['id_from_qr']))
            subprocess.run([sys.executable, worker, 'pdf', '--json', str(temp / 'qr/decoded.json'),
                            '--qr', *images, '--output', str(temp / 'reports'), '--type', 'bff'], check=True, capture_output=True)
            reports = list((temp / 'reports').glob('*.pdf'))
            self.assertEqual(len(reports), len(records))
            self.assertTrue(all(p.read_bytes().startswith(b'%PDF-') for p in reports))
            subprocess.run([sys.executable, worker, 'pdf', '--json', str(temp / 'qr/decoded.json'),
                            '--qr', images[-1], '--output', str(temp / 'selected-reports'), '--type', 'bff',
                            '--labels', str(temp / 'qr/labels.json'), '--template', str(temp / 'qr/glob_hash.json')], check=True, capture_output=True)
            selected = list((temp / 'selected-reports').glob('*.pdf'))
            self.assertEqual(len(selected), 1)
            self.assertEqual(selected[0].stem, Path(images[-1]).stem)

    def test_selected_reports_match_images_and_reject_ambiguity(self):
        records = [{'id_from_qr': 'one'}, {'id_from_qr': 'two'}]
        self.assertEqual(selected_report_records(records, ['/tmp/two.png']), [records[1]])
        with self.assertRaisesRegex(ValueError, 'absent'):
            selected_report_records(records, ['missing.png'])
        with self.assertRaisesRegex(ValueError, 'Duplicate decoded'):
            selected_report_records(records + [{'id_from_qr': 'TWO'}], ['two.png'])

    def test_reports_match_by_id_not_selection_order(self):
        self.assertEqual(report_images([{"id_from_qr": "one"}, {"id_from_qr": "two"}], ["/tmp/two.png", "/tmp/one.png"]),
                         ["/tmp/one.png", "/tmp/two.png"])

    def test_rejects_missing_extra_and_duplicate_images(self):
        for images in ([], ["wrong.png"], ["one.png", "extra.png"], ["one.png", "/other/one.png"]):
            with self.assertRaises(ValueError):
                report_images([{"id_from_qr": "one"}], images)

    def test_rejects_unsafe_identifiers_before_writing(self):
        for identifier in ("../escape", "..\\escape", "CON", "name.", ""):
            with self.assertRaises(ValueError):
                report_images([{"id_from_qr": identifier}], [identifier + ".png"])
        with self.assertRaises(ValueError):
            validate_qr_records({"..\\escape": {"binary_digit_string": "01"}})

    def test_rejects_filename_collisions(self):
        with self.assertRaises(ValueError):
            validate_qr_records({"a:b": {"binary_digit_string": "01"}, "a_b": {"binary_digit_string": "10"}})
        validate_qr_records({"patient:visit": {"binary_digit_string": "01"}})


if __name__ == "__main__":
    unittest.main()
