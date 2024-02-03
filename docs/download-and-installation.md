!!! Info "Where should I install it?"
    `Pheno-Ranker` is software designed for local installation on Linux or MacOS server/workstations.

     It is intended to work as a [command-line-interface](usage.md).

We provide several alternatives (containerized and non-containerized) for download and installation.

???+ Question "Which download method should I use?"
    It depends in which components you want to use and your fluency in performing installations on Linux environments.

    The [CPAN](usage.md#from-cpan) based installation **(Method 3) is the easier** one.

    | Use case | Method  |
    | --  | -- |
    | CLI |  3 (CPAN) |
    | CLI (conda) | 4 (CPAN in Conda env) |
    | CLI | 1 or 2 (Docker; no dependencies) |
    | Web App UI | [Here](https://cnag-biomedical-informatics.github.io/pheno-ranker-ui) |

## Containerized

With the containerized version you get:

* Module
* CLI (`pheno-ranker`)
* Utilities:
    * `bff-pxf-simulator`
    * `bff-pxf-plot`
    * `csv2pheno-ranker`
    * QR code utilities

=== "Method 1: From Docker Hub"

    Please follow the instructions provided in this [README](usage.md#method-1-from-docker-hub).

=== "Method 2: With Dockerfile"

    Please follow the instructions provided in this [README](usage.md#method-2-with-dockerfile).

## Non-Containerized

=== "Method 3: From CPAN"

    The core of software is a module implemented in `Perl` and it is available in the Comprehensive Perl Archive Network (CPAN). See the description [here](https://metacpan.org/pod/Pheno::Ranker).

    With the CPAN version you get:

    * Module
    * CLI (`pheno-ranker`)
    * Utilities:
        * `bff-pxf-simulator`
        * `csv2pheno-ranker`

    !!! Warning "Linux: Required system-level libraries"

        Before procesing with installation, we will need to install system level dependencies:

        * `libperl-dev:` This package contains the headers and libraries necessary to compile C or C++ programs to link against the Perl library, enabling you to write Perl modules in C or C++.

    To install it, plese see this [README](usage.md#from-cpan).

=== "Method 4: From CPAN in a **Conda** environment"

     With the CPAN version you get:

    * Module
    * CLI (`pheno-ranker`)
    * Utilities:
        * `bff-pxf-simulator`
        * `csv2pheno-ranker`

    ### Step 1: Install Miniconda

    !!! Warning "Instructions for x86_64"

        The following instructions work for `amd64|x86_64` architectures. If you have a new Mac please use `amd64`.
    
    1. Download the Miniconda installer for Linux with the following command:
    
        ```bash
        wget https://repo.anaconda.com/miniconda/Miniconda3-latest-Linux-x86_64.sh
        ```
    
    2. Run the installer:
    
        ```bash
        bash Miniconda3-latest-Linux-x86_64.sh
        ```
    
        Follow the prompts on the installer screens.
    
    3. Close and re-open your terminal window for the installation to take effect.
    
    ### Step 2: Set Up Channels
    
    Once you have Conda installed, set up the channels. Bioconda depends on the `conda-forge` and `defaults` channel.
    
    Add bioconda channels with the following command:
    
    ```bash
    conda config --add channels bioconda
    ```

    Note: It's recommended to use a new Conda environment when installing new packages to avoid dependency conflicts. You can create and activate a new environment with the following commands:


    ### Step 3: Installation

    ```bash
    conda create -n myenv
    conda activate myenv
    ```

    (Replace myenv with the name you want to give to your environment)

    Then you can to run the following commands:

    ```bash
    conda install -c conda-forge gcc_linux-64 perl perl-app-cpanminus
    #conda install -c bioconda perl-mac-systemdirectory # (MacOS only)
    cpanm --notest Pheno::Ranker
    ```

    You can execute `Pheno::Ranker` *CLI*  by typing:

    ```bash
    pheno-ranker --help
    ```

    To deactivate:
   
    ```bash
    conda deactivate -n myenv
    ```

=== "Method 5: From Github"

    With the non-containerized version from Github you get:

    * Module
    * CLI (`pheno-ranker`)
    * Utilities:
        * `bff-pxf-simulator`
        * `bff-pxf-plot`
        * `csv2pheno-ranker`
        * QR code utilities

    Please follow the instructions provided in this [README](usage.md#non-containerized).
