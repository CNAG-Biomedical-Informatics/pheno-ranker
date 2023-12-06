# HOW TO RUN

When you run `pheno-ranker` use the flag `--e`. This will export the following files:

- `export.glob_hash.json`
- `export.ref_binary_hash.json`
- ...

## pheno-ranker2barcode

```
usage: pheno-ranker2barcode [-h] -i INPUT [-o OUTPUT]

Generate QR codes from JSON data.

options:
  -h, --help            show this help message and exit
  -i INPUT, --input INPUT
                        Input JSON file path
  -o OUTPUT, --output OUTPUT
                        Output directory for QR codes
```

Example:

```
./pheno-ranker2barcode -i export.ref_binary_hash.json -o my_out_dir
```

## barcode2-phenoranker

```
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

```
./barcode2pheno-ranker -i my_out_dir/*png -t export.glob_hash.json -o output.json
```

# INSTALLATION

It should work out of the box withe containerized version. Otherwise:

```
sudo apt-get install libzbar0
pip install qrcode[pil] Pillow pyzbar
```

# AUTHOR 

Written by Manuel Rueda, PhD. Info about CNAG can be found at [https://www.cnag.eu](https://www.cnag.eu).

# COPYRIGHT AND LICENSE

This Python file is copyrighted. See the LICENSE file included in this distribution.
