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
    pyinstaller_args = [
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
    ]
    if sys.platform == "darwin":
        zbar_prefix = os.environ.get("ZBAR_PREFIX")
        if not zbar_prefix:
            zbar_prefix = subprocess.check_output(
                ["brew", "--prefix", "zbar"], text=True
            ).strip()
        zbar_library = Path(zbar_prefix) / "lib" / "libzbar.dylib"
        if not zbar_library.is_file():
            raise FileNotFoundError(f"Cannot find zbar library at {zbar_library}")
        pyinstaller_args.extend([
            "--add-binary", f"{zbar_library}:.",
            "--runtime-hook", str(root / "app" / "scripts" / "pyinstaller" / "pyzbar_macos.py"),
        ])
    pyinstaller_args.append(str(root / "app" / "engine" / "python" / "worker.py"))
    subprocess.run(pyinstaller_args, check=True, env=environment)
    print(output / ("pheno-ranker-helper.exe" if sys.platform == "win32" else "pheno-ranker-helper"))


if __name__ == "__main__":
    main()
