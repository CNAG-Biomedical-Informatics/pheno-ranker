# HOW TO RUN

When you run `pheno-ranker` use the flag `--e`. This will export the following files:

- export.glob_hash.json
- export.ref_binary_hash.json
- ...

## pheno-ranker2barcode

```
./pheno-ranker2barcode -i export.ref_binary_hash.json -o my_out_dir
```

## barcode2-phenoranker

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
