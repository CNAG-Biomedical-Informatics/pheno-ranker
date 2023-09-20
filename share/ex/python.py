#!/usr/bin/env python3
#
#   Example script on how to use Pheno::Ranker in Python
#
#   This file is part of Pheno::Ranker
#
#   Last Modified: May/11/2023
#
#   $VERSION taken from Pheno::Ranker
#
#   Copyright (C) 2023 Manuel Rueda - CNAG (manuel.rueda@cnag.crg.eu)
#
#   License: Artistic License 2.0
#
#   If this program helps you in your research, please cite.
import sys
sys.path.append('../lib/')
from phenoranker import PythonBinding


def main():

    # Create dictionary for input data
    data = {
      "age": 0,
#     "align": null,
#      "align_file": "alignment.txt",
      "excluded_terms": [],
#      "export": null,
#      "hpo": null,
#      "hpo_file": null,
      "included_terms": [],
      "log": "",
#      "max_out" : null,
      "out_file": "matrix.txt",
      "reference_file": "individuals.json",
#      "sort_by" : null,
#      "target_file" : null,
#      "weights_file" : null
    }

    # Creating object for class PythonBinding
    ranker = PythonBinding(data)

    # Run method
    ranker.pheno_ranker()


if __name__ == "__main__":
    main()
