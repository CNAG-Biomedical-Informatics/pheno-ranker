"""Desktop dispatcher; utility implementations remain in utils/."""
import argparse
import csv
import json
import multiprocessing
import os
from pathlib import Path
import re
import sys


MDS_LIMIT = 10500
UMAP_LIMIT = 10500


def load_distances(matrix_path, metric, limit=MDS_LIMIT):
    """Read dense distances once, preserving record order and bounding allocation."""
    import numpy as np
    if metric not in ("hamming", "jaccard"):
        raise ValueError("Unsupported matrix metric")
    with open(matrix_path, encoding="utf-8", newline="") as handle:
        reader = csv.reader(handle, delimiter="\t")
        header = next(reader, [])
        count = len(header) - 1
        if count > limit:
            return None, None
        else:
            labels = header[1:]
            if count < 1 or len(set(labels)) != count:
                raise ValueError("Matrix row and column identifiers must match uniquely")
            distances = np.empty((count, count), dtype=float)
            rows_read = 0
            for index, row in enumerate(reader):
                if index >= count or len(row) != count + 1 or row[0] != labels[index]:
                    raise ValueError("Matrix row and column identifiers must match uniquely")
                distances[index] = [float(v) for v in row[1:]]
                rows_read += 1
            if rows_read != count:
                raise ValueError("Matrix row and column identifiers must match uniquely")
            if distances.shape != (count, count) or not np.isfinite(distances).all():
                raise ValueError("Projection requires a finite square matrix")
            if not np.allclose(distances, distances.T) or (distances < 0).any():
                raise ValueError("Projection requires nonnegative symmetric values")
            if metric == "jaccard":
                if (distances > 1).any():
                    raise ValueError("Jaccard similarities must lie between zero and one")
                distances = 1 - distances
            if not np.allclose(np.diag(distances), 0):
                raise ValueError("Distance diagonal must be zero")
            return labels, distances


def projection(matrix_path, metric, method="mds", output=None, limit=None,
               n_neighbors=30, min_dist=.3, seed=42):
    import numpy as np
    from importlib.metadata import version
    if method not in ("mds", "umap"):
        raise ValueError("Unsupported projection method")
    if limit is None:
        limit = MDS_LIMIT if method == 'mds' else UMAP_LIMIT
    if not isinstance(limit, int) or isinstance(limit, bool) or not 1 <= limit <= 2147483647:
        raise ValueError('Projection limit must be a positive integer')
    if not 2 <= n_neighbors <= 200 or not 0 <= min_dist <= 1 or not 0 <= seed <= 2147483647:
        raise ValueError("Invalid UMAP parameters")
    output = output or f"{method}.json"
    labels, distances = load_distances(matrix_path, metric, limit)
    parameters = {"dimensions": 2}
    if method == 'umap':
        parameters.update(n_neighbors=n_neighbors, min_dist=min_dist, seed=seed, metric='precomputed', n_jobs=1, init='random')
    result = {"method": method, "metric": metric, "parameters": parameters,
              "versions": {"numpy": np.__version__}}
    if labels is None:
        result.update(skipped=True, message=f"{method.upper()} is limited to {limit} records; matrix export is complete.")
    else:
        count = len(labels)
        if method == 'mds':
            # Reuse the numeric matrix instead of retaining several dense copies.
            np.square(distances, out=distances)
            column_mean = distances.mean(axis=0)
            row_mean = distances.mean(axis=1)
            grand_mean = distances.mean()
            distances -= column_mean
            distances -= row_mean[:, None]
            distances += grand_mean
            distances *= -.5
            eigenvalues, eigenvectors = np.linalg.eigh(distances)
            coordinates = np.zeros((count, 2))
            positive = [i for i in np.argsort(eigenvalues)[::-1] if eigenvalues[i] > 1e-10]
            for axis, index in enumerate(positive[:2]):
                vector = eigenvectors[:, index]
                if vector[np.argmax(np.abs(vector))] < 0:
                    vector = -vector
                coordinates[:, axis] = vector * np.sqrt(eigenvalues[index])
            result['note'] = 'Two-dimensional classical MDS is a projection, not a ranking.'
        else:
            if count < 3:
                raise ValueError('UMAP needs at least three records; use MDS for smaller inputs')
            from umap import UMAP
            neighbours = min(n_neighbors, count - 1)
            parameters['effective_n_neighbors'] = neighbours
            coordinates = UMAP(n_components=2, metric='precomputed', n_neighbors=neighbours,
                               min_dist=min_dist, random_state=seed, n_jobs=1, init='random').fit_transform(distances)
            result['versions']['umap-learn'] = version('umap-learn')
            result['note'] = 'UMAP emphasizes local neighbourhoods; separation between clusters is not a direct measure of original distance.'
        if not np.isfinite(coordinates).all():
            raise ValueError('Projection produced non-finite coordinates')
        result['points'] = [{"id": label, "x": float(x), "y": float(y)} for label, (x, y) in zip(labels, coordinates)]
    Path(output).write_text(json.dumps(result, allow_nan=False), encoding="utf-8")
    return result


def mds(matrix_path, metric, output="mds.json", limit=MDS_LIMIT):
    return projection(matrix_path, metric, output=output, limit=limit)


def output_stem(identifier):
    """Mirror the existing utility naming, rejecting unsafe or ambiguous names."""
    if not isinstance(identifier, str) or not identifier:
        raise ValueError("Each output needs a nonempty record identifier")
    stem = identifier.replace(":", "_").replace("/", "_")
    if re.search(r'[\\\x00-\x1f<>"|?*]', stem) or stem.endswith((".", " ")):
        raise ValueError("Record identifier cannot safely be used as an output filename")
    if stem.split(".")[0].upper() in {"CON", "PRN", "AUX", "NUL", *(f"COM{i}" for i in range(1, 10)), *(f"LPT{i}" for i in range(1, 10))}:
        raise ValueError("Record identifier is a reserved Windows filename")
    return stem


def validate_qr_records(records):
    if not isinstance(records, dict) or not records:
        raise ValueError("QR encoding requires a nonempty exported reference binary hash")
    names = set()
    for identifier, record in records.items():
        name = output_stem(identifier).casefold()
        if name in names:
            raise ValueError("Record identifiers would produce duplicate QR filenames")
        names.add(name)
        if not isinstance(record, dict) or not re.fullmatch("[01]+", record.get("binary_digit_string", "")):
            raise ValueError("Every QR record must contain a binary_digit_string")


def unique_qr_inputs(images):
    unique = []
    paths = set()
    names = set()
    for image in images:
        path = Path(image).resolve()
        if path in paths:
            continue
        key = path.stem.casefold()
        if key in names:
            raise ValueError(f"QR images share the record identifier {path.stem!r}; select one matching image per record")
        paths.add(path)
        names.add(key)
        unique.append(str(path))
    return unique


def selected_report_records(records, images):
    """Select decoded profiles by QR filename, never by their array position."""
    if not isinstance(records, list) or not records:
        raise ValueError("PDF input must be the nonempty JSON array from QR decoding")
    wanted = {Path(image).stem.casefold() for image in images}
    selected = []
    seen = set()
    for record in records:
        identifier = record.get("id_from_qr") if isinstance(record, dict) else None
        key = output_stem(identifier).casefold()
        if key in wanted:
            if key in seen:
                raise ValueError(f"Duplicate decoded record identifiers: {identifier!r}. Decode each QR image once, then use the new decoded JSON")
            seen.add(key)
            selected.append(record)
    if wanted != seen:
        missing = ', '.join(sorted(wanted - seen)[:5])
        raise ValueError(f"Selected QR images include records absent from the decoded JSON: {missing}. Decode these images with their matching template first")
    return selected


def report_images(records, images):
    if not isinstance(records, list) or not records:
        raise ValueError("PDF input must be the nonempty JSON array from QR decoding")
    selected = {}
    for image in images:
        key = Path(image).stem.casefold()
        if key in selected:
            raise ValueError("Duplicate QR image filenames")
        selected[key] = image
    ordered = []
    for record in records:
        identifier = record.get("id_from_qr") if isinstance(record, dict) else None
        stem = output_stem(identifier)
        # The PDF utility replaces colons but not slashes.
        if "/" in identifier:
            raise ValueError("Decoded record ID must not contain path separators")
        key = stem.casefold()
        if key not in selected:
            raise ValueError("Each decoded record needs one matching QR image filename")
        ordered.append(selected.pop(key))
    if selected:
        raise ValueError("Selected QR images include records absent from the decoded JSON")
    return ordered


def qr_report_records(records, template):
    """Reconstruct reports from the same unweighted vectors encoded in the QRs."""
    from qr_code_utils import reconstruct_json_from_binary
    validate_qr_records(records)
    if not isinstance(template, dict) or not template:
        raise ValueError("The matching global hash must be a nonempty JSON object")
    if any(len(record["binary_digit_string"]) != len(template) for record in records.values()):
        raise ValueError("Binary profiles and global hash have different numbers of terms")
    # CLI vectors follow sorted global-hash keys, regardless of JSON key order.
    template = dict(sorted(template.items()))
    decoded = []
    for identifier, record in records.items():
        result = reconstruct_json_from_binary(record["binary_digit_string"], template)
        result["id_from_qr"] = output_stem(identifier)
        decoded.append(result)
    return decoded, template


def main():
    operation = sys.argv.pop(1) if len(sys.argv) > 1 else ""
    source_root = (Path(sys.executable).resolve().parent.parent
                   if getattr(sys, "frozen", False)
                   else Path(__file__).resolve().parents[3])
    root = Path(os.environ.get("PHENO_RANKER_ROOT", source_root))
    sys.path[:0] = [str(root / "utils" / "barcode"), str(root / "utils" / "bff_pxf_plot")]
    os.environ.setdefault("MPLBACKEND", "Agg")
    if operation in ("mds", "umap"):
        parser = argparse.ArgumentParser()
        parser.add_argument("--input", required=True)
        parser.add_argument("--metric", choices=["hamming", "jaccard"], required=True)
        parser.add_argument("--n-neighbors", type=int, default=30)
        parser.add_argument("--min-dist", type=float, default=.3)
        parser.add_argument("--seed", type=int, default=42)
        parser.add_argument("--max-records", type=int)
        args = parser.parse_args()
        projection(args.input, args.metric, method=operation, limit=args.max_records, n_neighbors=args.n_neighbors, min_dist=args.min_dist, seed=args.seed)
    elif operation == "summary":
        import bff_pxf_plot_utils
        bff_pxf_plot_utils.main_generate()
    elif operation in ("qr-encode", "qr-decode"):
        import qr_code_utils
        if operation == "qr-encode":
            extra = argparse.ArgumentParser(add_help=False)
            extra.add_argument("--template")
            extra.add_argument("--labels")
            handoff, remaining = extra.parse_known_args()
            sys.argv[1:] = remaining
            args = qr_code_utils.setup_qr_generation_cli()
            records = qr_code_utils.load_json_file(args.input)
            validate_qr_records(records)
            reports = qr_report_records(records, qr_code_utils.load_json_file(handoff.template)) if handoff.template else None
            if handoff.labels and not reports:
                raise ValueError('A label sidecar requires the matching global template')
            labels = qr_code_utils.load_vector_labels(handoff.labels, reports[1]) if handoff.labels else None
            Path(args.output).mkdir(parents=True, exist_ok=True)
            for identifier, record in records.items():
                stem = output_stem(identifier)
                payload, version = qr_code_utils.generate_qr_from_data(record['binary_digit_string'],
                    str(Path(args.output, stem + '.png')), args.qr_version, not args.no_compress)
                Path(args.output, stem + '.payload.txt').write_bytes(payload)
                Path(args.output, stem + '.qr.json').write_text(json.dumps({
                    'version': version, 'modules': 17 + 4 * version,
                    'errorCorrection': 'L', 'compressed': not args.no_compress,
                }), encoding='utf-8')
            if reports:
                decoded, template = reports
                Path(args.output, "decoded.json").write_text(json.dumps(decoded), encoding="utf-8")
                Path(args.output, "glob_hash.json").write_text(json.dumps(template), encoding="utf-8")
                if labels is not None:
                    Path(args.output, 'labels.json').write_text(json.dumps(labels), encoding='utf-8')
        else:
            args = qr_code_utils.setup_qr_decoding_cli()
            images = unique_qr_inputs(qr_code_utils.expand_png_inputs(args.input))
            template = qr_code_utils.load_json_file(args.template)
            decoded = qr_code_utils.decode_qr_codes_to_json(images, template)
            qr_code_utils.save_json_file(decoded, args.output)
            if args.generate_csv:
                qr_code_utils.generate_csv_from_pngs(images, args.csv_file)
            print(f"Decoded {len(decoded)} records to {args.output}")
    elif operation == "pdf":
        import pdf_generator
        parser = argparse.ArgumentParser()
        parser.add_argument("--json", required=True, type=pdf_generator.readable_file)
        parser.add_argument("--qr", required=True, nargs="+")
        parser.add_argument("--output", required=True)
        parser.add_argument("--type", required=True, choices=["bff", "pxf"])
        parser.add_argument("--logo", type=pdf_generator.readable_file)
        parser.add_argument("--template", type=pdf_generator.readable_file)
        parser.add_argument("--labels", type=pdf_generator.readable_file)
        args = parser.parse_args()
        if bool(args.labels) != bool(args.template):
            parser.error('--labels and --template must be supplied together')
        from qr_code_utils import load_json_file, load_vector_labels
        template = load_json_file(args.template) if args.template else None
        labels = load_vector_labels(args.labels, template) if args.labels else None
        records = json.loads(Path(args.json).read_text(encoding="utf-8"))
        selected_images = pdf_generator.expand_files(args.qr, ".png", "QR")
        records = selected_report_records(records, selected_images)
        images = report_images(records, selected_images)
        Path(args.output).mkdir(parents=True, exist_ok=True)
        pdf_generator.json_to_pdf(records, images, args.output, args.type, args.logo, labels=labels, template=template)
    else:
        raise SystemExit("Unknown desktop helper operation")


if __name__ == "__main__":
    multiprocessing.freeze_support()
    main()
