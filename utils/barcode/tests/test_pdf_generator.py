#!/usr/bin/env python3

import sys
import tempfile
import unittest
from pathlib import Path

UTILS_DIR = Path(__file__).resolve().parents[1]
REPO_ROOT = UTILS_DIR.parents[1]
sys.path.insert(0, str(UTILS_DIR))

import pdf_generator  # noqa: E402


class PDFGeneratorTest(unittest.TestCase):
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
