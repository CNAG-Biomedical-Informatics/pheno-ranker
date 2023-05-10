import pyperler
import pathlib

__author__ = "Manuel Rueda"
__copyright__ = "Copyright 2023, Manuel Rueda - CNAG"
__credits__ = ["None"]
__license__ = "GNU GENERAL PUBLIC LICENSE v3"
__version__ = "0.0.0_beta"
__maintainer__ = "Manuel Rueda"
__email__ = "manuel.rueda@cnag.crg.eu"
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
        # We have to provide the path to <convert-pheno/lib>
        bindir = pathlib.Path(__file__).resolve().parent
        lib_str = "lib '" + str(bindir) + "'"
        i.use(lib_str)

        # Load the module
        PR = i.use('Pheno::Ranker')

        # Create object
        ranker = PR.new(self.json)

        # Run method
        ranker.run()
