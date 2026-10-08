#!/usr/bin/env python3
"""Rebuild and verify the offline Desktop disease-reference bundles."""
import argparse
import gzip
import hashlib
import json
import os
from pathlib import Path
import subprocess
import tempfile
import time

KINDS = ('glob_hash', 'ref_hash', 'ref_binary_hash', 'coverage_stats', 'labels')


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def build(root, destination, perl, dataset):
    source = root / f'share/diseases/hpo/{dataset}.pxf.json.gz'
    patient = root / 'app/engine/examples/patient.json'
    environment = {**os.environ, 'PERL_HASH_SEED': '0', 'PERL_PERTURB_KEYS': '0'}
    with tempfile.TemporaryDirectory(prefix=f'pheno-{dataset}-') as temporary:
        work = Path(temporary)
        prefix = work / dataset
        common = [perl, str(root / 'bin/pheno-ranker'), '--target', str(patient),
                  '--include-terms', 'phenotypicFeatures', '--sort-by', 'jaccard',
                  '--max-out', '5', '--no-color']

        def run(name, args):
            start = time.perf_counter()
            subprocess.run(common + args + ['--align', str(work / name),
                           '--out-file', str(work / f'{name}.rank.txt')],
                           cwd=work, env=environment, check=True, capture_output=True)
            print(f'{dataset} {name}: {time.perf_counter() - start:.2f}s', flush=True)

        run('fresh', ['--reference', str(source), '--export', str(prefix)])
        global_keys = set(json.loads(Path(f'{prefix}.glob_hash.json').read_text()))
        labels = json.loads(Path(f'{prefix}.labels.json').read_text())
        if set(labels) != global_keys:
            raise ValueError('Label keys differ from the global dictionary')
        metadata = {
            'formatVersion': 1, 'dataset': dataset,
            'engineVersion': (root / 'VERSION').read_text().strip(),
            'source': str(source.relative_to(root)), 'sourceSha256': digest(source),
            'configSha256': digest(root / 'share/conf/config.yaml'),
            'validationTarget': str(patient.relative_to(root)), 'validationTargetSha256': digest(patient),
            'settings': {'include-terms': ['phenotypicFeatures']},
            'coverage': json.loads(Path(f'{prefix}.coverage_stats.json').read_text()),
            'globalFeatureCount': len(global_keys), 'files': {},
        }
        compressed = {}
        for kind in KINDS:
            plain = Path(f'{prefix}.{kind}.json')
            payload = gzip.compress(plain.read_bytes(), compresslevel=9, mtime=0)
            name = f'{dataset}.{kind}.json.gz'
            compressed[name] = payload
            metadata['files'][name] = {'sha256': hashlib.sha256(payload).hexdigest(),
                                       'bytes': len(payload), 'uncompressedSha256': digest(plain)}
            Path(f'{plain}.gz').write_bytes(payload)
            plain.unlink()

        # Only gzip files remain: exercise the exact bundle shipped to Desktop.
        run('cached', ['--precomputed-ref-prefix', str(prefix)])
        for suffix in ('rank.txt', 'txt', 'csv', 'target.csv'):
            if (work / f'fresh.{suffix}').read_bytes() != (work / f'cached.{suffix}').read_bytes():
                raise ValueError(f'{dataset}: fresh/cached {suffix} differs')
        output = destination / dataset
        output.mkdir(parents=True, exist_ok=True)
        for name, payload in compressed.items():
            (output / name).write_bytes(payload)
        (output / 'manifest.json').write_text(json.dumps(metadata, indent=2, sort_keys=True) + '\n')
        print(f'{dataset}: verified ranking and all alignment formats; {sum(map(len, compressed.values())) / 1024**2:.2f} MiB', flush=True)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root', type=Path, default=Path(__file__).resolve().parents[2])
    parser.add_argument('--output', type=Path)
    parser.add_argument('--perl', default='perl')
    args = parser.parse_args()
    root = args.root.resolve()
    destination = args.output.resolve() if args.output else root / 'app/data/precomputed'
    for dataset in ('omim', 'orpha'):
        build(root, destination, args.perl, dataset)
