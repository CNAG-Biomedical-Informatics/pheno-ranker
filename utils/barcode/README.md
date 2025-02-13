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
usage: pheno-ranker2pdf [-h] -j JSON -q QR [QR ...] [-o OUTPUT] -t {bff,pxf} [-l LOGO] [--test]

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
  -l LOGO, --logo LOGO  Path to the logo image.
  --test                Enable test mode (does not print date to PDF).
```

Example:

```bash
./pheno-ranker2pdf -j output.json -q qr_codes/*png -t bff -o my_pdf_dir
```

# INSTALLATION

It should work out of the box with the containerized version. Otherwise:

```
sudo apt-get install libzbar0
pip install qrcode[pil] Pillow pyzbar pandas reportlab
```

# AUTHOR 

Written by Manuel Rueda, PhD. Info about CNAG can be found at [https://www.cnag.eu](https://www.cnag.eu).

# COPYRIGHT AND LICENSE

This Python file is copyrighted. See the LICENSE file included in this distribution.
