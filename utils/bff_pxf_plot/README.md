# HOW TO RUN

```bash
usage: bff-pxf-plot [-h] -i INPUT [-o OUTPUT] [-v]

Process BFF/PXF (JSON or YAML) data and generate plots in a PNG file.

options:
  -h, --help            show this help message and exit
  -i INPUT, --input INPUT
                        Input JSON or YAML file path (e.g., "data.json" or "data.yaml").
  -o OUTPUT, --output OUTPUT
                        Optional: Output PNG file path (default: "output_plots.png")
  -v, --verbose         Increase output verbosity

```

Example:

```bash
./bff-pxf-plot -i individuals.json
```

# INSTALLATION

It should work out of the box with the containerized version. Otherwise:

```
pip install pandas matplotlib PyYAML
```

# AUTHOR 

Written by Manuel Rueda, PhD. Info about CNAG can be found at [https://www.cnag.eu](https://www.cnag.eu).

# COPYRIGHT AND LICENSE

This Python file is copyrighted. See the LICENSE file included in this distribution.
