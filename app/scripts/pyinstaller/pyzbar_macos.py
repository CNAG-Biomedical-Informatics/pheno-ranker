"""Let pyzbar find the zbar dylib bundled in the macOS one-file helper."""
import ctypes.util
from pathlib import Path
import sys


if sys.platform == "darwin" and getattr(sys, "frozen", False):
    bundled_zbar = Path(sys._MEIPASS) / "libzbar.dylib"
    original_find_library = ctypes.util.find_library

    def find_bundled_library(name):
        if name == "zbar" and bundled_zbar.is_file():
            return str(bundled_zbar)
        return original_find_library(name)

    ctypes.util.find_library = find_bundled_library
