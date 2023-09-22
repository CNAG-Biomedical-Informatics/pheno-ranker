import pprint
import json
import pyperler
import pathlib

__author__ = "Manuel Rueda"
__copyright__ = "Copyright 2022-2023, Manuel Rueda - CNAG"
__credits__ = ["None"]
__license__ = "Artistic License 2.0"
__version__ = "0.00_beta"
__maintainer__ = "Manuel Rueda"
__email__ = "manuel.rueda@cnag.eu"
__status__ = "Production"


class PythonBinding:

    def __init__(self, json):
        self.json = json

    def pheno_ranker(self):

        # Create interpreter
        i = pyperler.Interpreter()

        ##############################
        # Only if the module WAS NOT #
        # installed from PRAN        #
        ##############################
        # We have to provide the path to <ranker-pheno/lib>
        bindir = pathlib.Path(__file__).resolve().parent
        lib_str = "lib '" + str(bindir) + "'"
        lib_str_conda = "lib '" + str(bindir) + '/lib/perl5/site_perl/' + "'" # conda
        i.use(lib_str)
        i.use(lib_str_conda)

        # Load the module
        PR = i.use('Pheno::Ranker')

        # Create object
        ranker = PR.new(self.json)

        # The result are files
        ranker.run

        # Return dict
        return 1
