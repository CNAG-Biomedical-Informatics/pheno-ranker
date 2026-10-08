# HOW TO RUN

When you run `pheno-ranker` use the flag `--e`. This will export the following files:

- `export.glob_hash.json`
- `export.ref_binary_hash.json`
- ...

See also this [link](https://cnag-biomedical-informatics.github.io/pheno-ranker/qr-code-generator/).

## pheno-ranker2barcode

```
usage: pheno-ranker2barcode [-h] -i INPUT [-o OUTPUT] [--no-compress]

Generate QR codes from JSON data.

options:
  -h, --help            show this help message and exit
  -i INPUT, --input INPUT
                        Input JSON file path
  -o OUTPUT, --output OUTPUT
                        Output directory for QR codes
  --no-compress         Disable compression of the binary digit string
```

Example:

```bash
./pheno-ranker2barcode -i export.ref_binary_hash.json -o my_out_dir
```

## barcode2pheno-ranker

```bash
usage: barcode2pheno-ranker [-h] -i INPUT [INPUT ...] -t TEMPLATE [-o OUTPUT]

Decode QR codes to JSON format.

options:
  -h, --help            show this help message and exit
  -i INPUT [INPUT ...], --input INPUT [INPUT ...]
                        Input PNG files (e.g., "image1.png image2.png")
  -t TEMPLATE, --template TEMPLATE
                        JSON template file
  -o OUTPUT, --output OUTPUT
                        Output JSON file
```

Example:

```bash
./barcode2pheno-ranker -i my_out_dir/*png -t export.glob_hash.json -o output.json
```


## pheno-ranker2pdf

```bash
usage: pheno-ranker2pdf [-h] -j JSON -q QR [QR ...] [-o OUTPUT] -t {bff,pxf} [-l LOGO] [--labels LABELS --template TEMPLATE] [--test]

Convert JSON data to a formatted PDF file.

options:
  -h, --help            show this help message and exit
  -j JSON, --json JSON  Path to the JSON file.
  -q QR [QR ...], --qr QR [QR ...]
                        Path to the QR code images, use space to separate multiple files.
  -o OUTPUT, --output OUTPUT
                        Output directory for PDF files. Default: pdf
  -t {bff,pxf}, --type {bff,pxf}
                        Type of data processing required.
  -l LOGO, --logo LOGO  Custom logo image (default: Pheno-Ranker logo).
  --test                Enable test mode (does not print date to PDF).
  --labels LABELS       Optional export.labels.json[.gz] for missing ontology labels.
  --template TEMPLATE   Matching global-vector JSON; required with --labels.
```

Example:

```bash
./pheno-ranker2pdf -j output.json -q qr_codes/*png -t bff -o my_pdf_dir
```

To display missing ontology names from the same analysis's label sidecar:

```bash
./pheno-ranker2pdf -j decoded.json -q qr_codes/*.png -t pxf \
  --labels export.labels.json.gz --template export.glob_hash.json -o reports
```

This is optional, PDF-only enrichment. The PNG is decoded using the sorted keys
of its matching global-vector template, and the result must match the supplied
decoded record. Each active bit uses the label attached to its **exact feature
key**, before reconstructing the display record. Labels are never paired by file
order or by a later CURIE-only lookup. Missing labels do not shift positions;
unknown feature keys and vector-length mismatches are rejected.

Existing labels are preserved. Supplemented names appear within their original
sections and array items, in a third **Label hint** column beside the corresponding
ID fields, rather than as extra label rows; phenotype names
also appear in the phenotype overview. A single report note explains the source
of these display hints. Decoded JSON and QR payloads remain unchanged.
No enriched JSON file is written. These checks enforce alignment; they
do not independently validate the ontology names in a user-supplied labels file.

Reports group fields by their original schema section and array item, preserving
camelCase keys and ontology identifiers. Longer sections continue across numbered
pages with repeated table headings. The Pheno-Ranker logo is included by default;
use `--logo` to replace it with your own image. Logos keep their aspect ratio;
the QR code remains separate from the report text.

# INSTALLATION

It should work out of the box with the containerized version. Otherwise:

```
sudo apt-get install libzbar0
pip install qrcode[pil] Pillow pyzbar pandas reportlab
```

# TESTING

Core Python helpers can be tested without generating or decoding QR images:

```bash
python3 -m unittest discover -s utils/barcode/tests -v
```

End-to-end barcode CLI tests are kept as local tests because they require Python
packages and the system `zbar` library:

```bash
prove -lv xt/barcode.t
```

# AUTHOR 

Written by Manuel Rueda, PhD. Info about CNAG can be found at [https://www.cnag.eu](https://www.cnag.eu).

# COPYRIGHT AND LICENSE

This Python file is copyrighted. See the LICENSE file included in this distribution.
