#!/usr/bin/env python3

import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

UTILS_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(UTILS_DIR))

import qr_code_utils  # noqa: E402


class QRCodeUtilsTest(unittest.TestCase):
    def test_only_pdf_cli_exposes_label_enrichment(self):
        for executable in ('barcode2pheno-ranker', 'pheno-ranker2barcode', 'pheno-ranker2pdf'):
            help_text = subprocess.check_output([sys.executable, str(UTILS_DIR / executable), '--help'], text=True)
            if executable == 'pheno-ranker2pdf':
                self.assertIn('--labels', help_text)
                self.assertIn('--template', help_text)
            else:
                self.assertNotIn('--labels', help_text)

    def test_sparse_labels_never_shift_vector_positions(self):
        keys = [f'phenotypicFeatures.HP:{i}.type.id.HP:{i}' for i in range(1, 4)]
        template = dict.fromkeys(reversed(keys), 1)
        labels = {keys[2]: 'Third label'}
        flat = qr_code_utils.decode_binary_string('111', template, labels)
        self.assertNotIn('phenotypicFeatures.HP:1.type.label', flat)
        self.assertNotIn('phenotypicFeatures.HP:2.type.label', flat)
        self.assertEqual(flat['phenotypicFeatures.HP:3.type.label'], 'Third label')
        self.assertFalse(any(key.endswith('.label') for key in qr_code_utils.decode_binary_string('110', template, labels)))
        for bits in ('11', '1111', '1x1'):
            with self.assertRaisesRegex(ValueError, 'one bit'):
                qr_code_utils.decode_binary_string(bits, template, labels)
        with self.assertRaisesRegex(ValueError, 'absent'):
            qr_code_utils.decode_binary_string('111', template, {'wrong.path.id.HP:3': 'Wrong context'})

    def test_same_curie_in_different_contexts_keeps_its_own_label(self):
        keys = ['a.HP:1.type.id.HP:1', 'b.HP:1.type.id.HP:1']
        flat = qr_code_utils.decode_binary_string('11', dict.fromkeys(keys, 1),
                                                 {keys[1]: 'Second context', keys[0]: 'First context'})
        self.assertEqual(flat['a.HP:1.type.label'], 'First context')
        self.assertEqual(flat['b.HP:1.type.label'], 'Second context')

    def test_binary_compression_round_trip(self):
        binary_string = "101101101000111"

        compressed = qr_code_utils.compress_binary_string(binary_string)
        self.assertEqual(
            qr_code_utils.decompress_binary_string(compressed),
            binary_string,
        )

        plain = qr_code_utils.compress_binary_string(binary_string, compress=False)
        self.assertEqual(plain, binary_string.encode())

    def test_qr_payload_round_trip(self):
        binary_string = "101101101000111"

        compressed_payload = qr_code_utils.encode_qr_payload(binary_string)
        self.assertEqual(
            qr_code_utils.decode_qr_payload(compressed_payload),
            (binary_string, True),
        )

        plain_payload = qr_code_utils.encode_qr_payload(binary_string, compress=False)
        self.assertEqual(
            qr_code_utils.decode_qr_payload(plain_payload),
            (binary_string, False),
        )

    def test_decode_binary_string_reconstructs_curie_arrays(self):
        template = {
            "id.sample-1": 1,
            "diseases.NCIT:C3138.diseaseCode.id.NCIT:C3138": 1,
            "ethnicity.id.NCIT:C41261": 1,
        }

        converted = qr_code_utils.reconstruct_json_from_binary("101", template)

        self.assertEqual(converted["id"], "sample-1")
        self.assertEqual(
            converted["diseases"],
            [{"diseaseCode": {"id": "NCIT:C3138"}}],
        )
        self.assertNotIn("ethnicity", converted)

    def test_expand_png_inputs_expands_and_sorts_globs(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            tmp = Path(tmpdir)
            (tmp / "b.png").write_bytes(b"not really a png")
            (tmp / "a.png").write_bytes(b"not really a png")

            expanded = qr_code_utils.expand_png_inputs([str(tmp / "*.png")])

        self.assertEqual([Path(path).name for path in expanded], ["a.png", "b.png"])

    def test_expand_png_inputs_rejects_non_png_files(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            path = Path(tmpdir) / "qr.txt"
            path.write_text("not a png", encoding="utf-8")

            with self.assertRaises(ValueError):
                qr_code_utils.expand_png_inputs([str(path)])

    def test_qr_version_validation(self):
        self.assertEqual(qr_code_utils.qr_version("1"), 1)
        self.assertEqual(qr_code_utils.qr_version("40"), 40)

        with self.assertRaises(Exception):
            qr_code_utils.qr_version("0")
        with self.assertRaises(Exception):
            qr_code_utils.qr_version("41")
        with self.assertRaises(Exception):
            qr_code_utils.qr_version("not-an-int")

    def test_save_json_file_creates_parent_directory(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            output = Path(tmpdir) / "nested" / "decoded.json"
            qr_code_utils.save_json_file({"ok": True}, str(output))

            with output.open(encoding="utf-8") as handle:
                self.assertEqual(json.load(handle), {"ok": True})


if __name__ == "__main__":
    unittest.main()
