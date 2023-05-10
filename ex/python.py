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
#   This program is free software; you can redistribute it and/or modify
#   it under the terms of the GNU General Public License as published by
#   the Free Software Foundation; either version 3 of the License, or
#   (at your option) any later version.
#
#   This program is distributed in the hope that it will be useful,
#   but WITHOUT ANY WARRANTY; without even the implied warranty of
#   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
#   GNU General Public License for more details.
#
#   You should have received a copy of the GNU General Public License
#   along with this program; if not, see <https://www.gnu.org/licenses/>.
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
