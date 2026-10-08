#!/usr/bin/env python3
"""Build the isolated desktop helper without changing utility sources."""
import argparse
import os
from pathlib import Path
import subprocess
import sys


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", type=Path, default=Path.cwd())
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()
    root = args.root.resolve()
    output = (args.output or root / "app" / "build" / "python").resolve()
    output.mkdir(parents=True, exist_ok=True)
    environment = os.environ.copy()
    environment["MPLBACKEND"] = "Agg"
    subprocess.run([
        sys.executable, "-m", "PyInstaller", "--noconfirm", "--clean",
        "--onefile", "--name", "pheno-ranker-helper",
        "--distpath", str(output), "--workpath", str(output / "work"),
        "--specpath", str(output / "spec"),
        "--paths", str(root / "utils" / "barcode"),
        "--paths", str(root / "utils" / "bff_pxf_plot"),
        "--hidden-import", "pyzbar.pyzbar",
        # HTML summaries save vector charts through a dynamically loaded backend.
        "--hidden-import", "matplotlib.backends.backend_svg",
        "--collect-all", "umap",
        "--collect-all", "pynndescent",
        # SciPy dynamically imports its vendored NumPy FFT/linalg wrappers.
        "--collect-submodules", "scipy._external.array_api_compat.numpy",
        "--copy-metadata", "umap-learn",
        "--copy-metadata", "numba",
        "--copy-metadata", "llvmlite",
        "--copy-metadata", "scikit-learn",
        "--copy-metadata", "scipy",
        "--exclude-module", "tkinter",
        "--exclude-module", "matplotlib.backends.backend_tkagg",
        str(root / "app" / "engine" / "python" / "worker.py"),
    ], check=True, env=environment)
    print(output / ("pheno-ranker-helper.exe" if sys.platform == "win32" else "pheno-ranker-helper"))


if __name__ == "__main__":
    main()
