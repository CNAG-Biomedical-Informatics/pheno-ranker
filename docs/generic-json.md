??? Tip "Google Colab notebook"
    Try out `Pheno-Ranker` using our [Google Colab](https://colab.research.google.com/drive/1n3Etu4fnwuDWNveSMb1SzuN50O2a05Rg#scrollTo=8tbJ0f5-hJAB) notebook. You can view it without signing in, but running the code requires a Google account.

    We also have a local copy of the notebook that can be downloaded from the [repo](https://github.com/CNAG-Biomedical-Informatics/pheno-ranker/blob/main/nb/convert_pheno_cli_tutorial.ipynb). 

???+ Warning "About this tutorial"
    This tutorial deliberately uses generic JSON data (i.e., movies) to illustrate the capabilities of `Pheno-Ranker`, as starting with familiar examples can help you better grasp its usage.

    Once you are comfortable with the concepts using movie data, you will find it easier to apply `Pheno-Ranker` to real GA4GH standards. For specific examples, please refer to the [cohort](cohort.md) and [patient](patient.md) pages in this documentation.

### Moviepackets:

For the tutorial we will use the format **Moviepackets** to demonstrate the power of `Pheno-Ranker` with any `JSON` file.

<figure markdown>
 MoviePackets logo
 ![MoviePackets](img/moviepackets-logo.png){ width="300" }
 <figcaption>Image created by DALL.E-3</figcaption>
</figure>

??? Question "What is a Moviepacket (MXF) file?"
    A Moviepacket is an invented format :smile: designed to describe movies, analogous to Phenopackets v2 used for pheno-clinical data.


Imagine you have a catalog of 25 movies described in `JSON` format. Each movie has several `properties` (a.k.a. `terms`).

```json
[
  {
    "title": "TheShawshankRedemption",
    "genre": [
      "Drama"
    ],
    "year": 1994,
    "country": "USA",
    "rating": 9.3
  },
  {
    "title": "TheGodfather",
    "genre": [
      "Crime",
      "Drama"
    ],
    "year": 1972,
    "country": "USA",
    "rating": 9.2
  },...
]
```

You are interested in checking the variety of your catalog and plan to use `Pheno-Ranker`. The first thing that we are going to create is a **configuration file**.

??? Question "What is a `Pheno-Ranker` configuration file?"
    A configuration file is a text file in [YAML](https://en.wikipedia.org/wiki/YAML) format ([JSON](https://en.wikipedia.org/wiki/JSON) is also accepted) that serves to initialize some variables. It is particularly important when you are not using the two supported formats _out-of-the-box_ that are [BFF](bff.md) and [PXF](pxf.md).

??? Tip "Do I need to create a configuration file?"
    This file only has to be created if you are working with **your own JSON format**.

    If your file format resembles Moviepackets, you can use that file directly. Just ensure you **modify the terms** to align with your data.

    ### Creating a configuration file
    
    To create a configuration file, start by reviewing the [example file](https://github.com/cnag-biomedical-informatics/pheno-ranker/blob/main/t/movies_config.yaml) provided with the installation. The goal is to replace the contents of such file with those from your project. If your movies did not have array-based properties the configuration file will look like this:
    
    ```yaml
    # Set the format
    format: MXF # Optional unless you have array-based properties
    
    # Set the primary key for the objects
    primary_key: title
    
    # Set the allowed terms or properties for use with include|exclude-terms
    allowed_terms: [country,genre,year]
    ```
    
    But because your data has the term `genre`, which is an `array` the file will look like this:
    
    ```yaml
    # Set the format
    format: MXF
    
    # Set the primary key for the objects
    primary_key: title
    
    # Set the allowed terms or properties for use with include|exclude-terms
    allowed_terms: [country,genre,year]
    
    # Set the terms which are arrays
    array_terms: [genre]
    
    # Set the regex to identify array indexes, guiding their substitution within array elements
    array_regex: '^([^:]+):(\d+)'
    
    # Set the path to select values for substituting array indexes
    id_correspondence:
      MXF:
        genre: genre
    ```
    
    In the table below we show which parameters are needed depending on the format:
    
    | Format      | Required properties | Optional properties | Pre-configured |
    | ----------- | ------------------- | ------------------- |  -----  | 
    | BFF / PXF   | `primary_key, allowed_terms, array_terms, array_regex, id_correspondence` | `format` | ✓ |
    | Others (`array`) | `format, primary_key, allowed_terms, array_terms, id_correspondence` | `array_regex` |   |
    | Others (`non-array`) |  `primary_key, allowed_terms` | `format` |   |
    
    
     * Where:
        - **format**, is a `string` that defines your particular format. In this case `MXF`. Note that it has to match that of `id_correspondence`.
        - **primary_key**, the key that will be used as an item identifier.
        - **allowed_terms**, defined as an array, delineates the terms permitted for use with the `--include-terms` and `--exclude-terms` options. This mechanism is in place to ensure data validation and to mitigate user errors, such as typos, in specifying terms. If `--include-terms` or `--exclude-terms` options are not specified, all terms present in the JSON file will be considered valid, irrespective of their inclusion in this list.
        - **array_terms**, is an `array` to enumerate which properties are arrays.
        - **array_regex**, it's an `string` to parse flattened keys. It's used in conjunction with `id_correspondence`.
        - **id_correspondence**, is an `object` that (in combination with `array_regex`) serves to rename array elements and not rely on numeric indexes.
    
### Running `Pheno-Ranker`

Once you have created the mapping file you can proceed to run `pheno-ranker` with the **command-line interface**.

=== "Intra-catalog comparison"

    ## Example 1: Let's start by using all terms

    ```bash
    pheno-ranker -r t/movies.json --config t/movies_config.yaml
    ```

    The result is a file named `matrix.txt`. Find below the result of the clustering with `R`.

    ??? Example "Included R scripts"

        You can find in the link below a few examples to perform clustering and multimensional scaling with your data:

        [R scripts at GitHub](https://github.com/CNAG-Biomedical-Informatics/pheno-ranker/tree/main/share/r).

    <figure markdown>
      ![Beacon v2](img/movies1.png){ width="600" }
      <figcaption>Intra-cohort pairwise comparison</figcaption>
    </figure>

    ## Example 2: Let's cluster by year

    ```bash
    pheno-ranker -r t/movies.json --include-terms year --config t/movies_config.yaml
    ```

    <figure markdown>
      ![Beacon v2](img/movies2.png){ width="600" }
      <figcaption>Intra-cohort pairwise comparison</figcaption>
    </figure>

    ## Example 3: Let's cluster by `genre`

    ```bash
    pheno-ranker -r t/movies.json --include-terms genre --config t/movies_config.yaml
    ```

    <figure markdown>
       ![Beacon v2](img/movies3.png){ width="600" }
       <figcaption>Intra-cohort pairwise comparison</figcaption>
    </figure>

    ## Example 4: Let's apply weights to `genre`

    We will use the file `t/movies_weigths.yaml` that has the following content:

    ```yaml
    ---
    genre.Biography: 25
    ```

    ```bash
    pheno-ranker -r t/movies.json --include-terms genre --w t/movies_weigths.yaml --config t/movies_config.yaml
    ```

    <figure markdown>
      ![Beacon v2](img/movies4.png){ width="600" }
      <figcaption>Intra-cohort pairwise comparison</figcaption>
    </figure>

    ## Example 5: Let's create a graph to be used in Cytoscape

    `Pheno-ranker` can export `matrix.txt` in a `JSON` format that is compatible with [Cytoscape](https://cytoscape.org) ecosystem:

    ```bash
    pheno-ranker -r t/movies.json --cytoscape-json cytoscape.json --config t/movies_config.yaml
    ```
     
    ??? Example "See `cytoscape.json`"

        ```json
         {
            "elements" : {
               "edges" : [
                  {
                     "data" : {
                        "source" : "Casablanca",
                        "target" : "CityofGod",
                        "weight" : "11"
                     }
                  },
                  {
                     "data" : {
                        "source" : "Casablanca",
                        "target" : "FightClub",
                        "weight" : "8"
                     }
                  },
                  {
                     "data" : {
                        "source" : "Casablanca",
                        "target" : "ForrestGump",
                        "weight" : "7"
                     }
                  },
                  {
                     "data" : {
                        "source" : "Casablanca",
                        "target" : "Gladiator",
                        "weight" : "8"
                     }
                  },
                  {
                     "data" : {
                        "source" : "Casablanca",
                        "target" : "Goodfellas",
                        "weight" : "10"
                     }
                  },
                  {
                     "data" : {
                        "source" : "Casablanca",
                        "target" : "Inception",
                        "weight" : "12"
                     }
                  },
                  {
                     "data" : {
                        "source" : "Casablanca",
                        "target" : "Interstellar",
                        "weight" : "10"
                     }
                  },
                  {
                     "data" : {
                        "source" : "Casablanca",
                        "target" : "LifeisBeautiful",
                        "weight" : "10"
                     }
                  },
                  {
                     "data" : {
                        "source" : "Casablanca",
                        "target" : "PulpFiction",
                        "weight" : "9"
                     }
                  },
                  {
                     "data" : {
                        "source" : "Casablanca",
                        "target" : "SavingPrivateRyan",
                        "weight" : "7"
                     }
                  },
                  {
                     "data" : {
                        "source" : "Casablanca",
                        "target" : "Schindler'sList",
                        "weight" : "10"
                     }
                  },
                  {
                     "data" : {
                        "source" : "Casablanca",
                        "target" : "Se7en",
                        "weight" : "10"
                     }
                  },
                  {
                     "data" : {
                        "source" : "Casablanca",
                        "target" : "SpiritedAway",
                        "weight" : "14"
                     }
                  },
                  {
                     "data" : {
                        "source" : "Casablanca",
                        "target" : "StarWars:EpisodeV-TheEmpireStrikesBack",
                        "weight" : "12"
                     }
                  },
                  {
                     "data" : {
                        "source" : "Casablanca",
                        "target" : "TheDarkKnight",
                        "weight" : "10"
                     }
                  },
                  {
                     "data" : {
                        "source" : "Casablanca",
                        "target" : "TheGodfather",
                        "weight" : "9"
                     }
                  },
                  {
                     "data" : {
                        "source" : "Casablanca",
                        "target" : "TheGreenMile",
                        "weight" : "10"
                     }
                  },
                  {
                     "data" : {
                        "source" : "Casablanca",
                        "target" : "TheLordoftheRings:TheFellowshipoftheRing",
                        "weight" : "12"
                     }
                  },
                  {
                     "data" : {
                        "source" : "Casablanca",
                        "target" : "TheLordoftheRings:TheReturnoftheKing",
                        "weight" : "12"
                     }
                  },
                  {
                     "data" : {
                        "source" : "Casablanca",
                        "target" : "TheMatrix",
                        "weight" : "11"
                     }
                  },
                  {
                     "data" : {
                        "source" : "Casablanca",
                        "target" : "ThePianist",
                        "weight" : "10"
                     }
                  },
                  {
                     "data" : {
                        "source" : "Casablanca",
                        "target" : "TheShawshankRedemption",
                        "weight" : "8"
                     }
                  },
                  {
                     "data" : {
                        "source" : "Casablanca",
                        "target" : "TheSilenceoftheLambs",
                        "weight" : "10"
                     }
                  },
                  {
                     "data" : {
                        "source" : "Casablanca",
                        "target" : "TheUsualSuspects",
                        "weight" : "10"
                     }
                  },
                  {
                     "data" : {
                        "source" : "CityofGod",
                        "target" : "Casablanca",
                        "weight" : "11"
                     }
                  },
                  {
                     "data" : {
                        "source" : "CityofGod",
                        "target" : "FightClub",
                        "weight" : "9"
                     }
                  },
                  {
                     "data" : {
                        "source" : "CityofGod",
                        "target" : "ForrestGump",
                        "weight" : "10"
                     }
                  },
                  {
                     "data" : {
                        "source" : "CityofGod",
                        "target" : "Gladiator",
                        "weight" : "11"
                     }
                  },
                  {
                     "data" : {
                        "source" : "CityofGod",
                        "target" : "Goodfellas",
                        "weight" : "9"
                     }
                  },
                  {
                     "data" : {
                        "source" : "CityofGod",
                        "target" : "Inception",
                        "weight" : "13"
                     }
                  },
                  {
                     "data" : {
                        "source" : "CityofGod",
                        "target" : "Interstellar",
                        "weight" : "9"
                     }
                  },
                  {
                     "data" : {
                        "source" : "CityofGod",
                        "target" : "LifeisBeautiful",
                        "weight" : "9"
                     }
                  },
                  {
                     "data" : {
                        "source" : "CityofGod",
                        "target" : "PulpFiction",
                        "weight" : "8"
                     }
                  },
                  {
                     "data" : {
                        "source" : "CityofGod",
                        "target" : "SavingPrivateRyan",
                        "weight" : "8"
                     }
                  },
                  {
                     "data" : {
                        "source" : "CityofGod",
                        "target" : "Schindler'sList",
                        "weight" : "11"
                     }
                  },
                  {
                     "data" : {
                        "source" : "CityofGod",
                        "target" : "Se7en",
                        "weight" : "7"
                     }
                  },
                  {
                     "data" : {
                        "source" : "CityofGod",
                        "target" : "SpiritedAway",
                        "weight" : "11"
                     }
                  },
                  {
                     "data" : {
                        "source" : "CityofGod",
                        "target" : "StarWars:EpisodeV-TheEmpireStrikesBack",
                        "weight" : "13"
                     }
                  },
                  {
                     "data" : {
                        "source" : "CityofGod",
                        "target" : "TheDarkKnight",
                        "weight" : "9"
                     }
                  },
                  {
                     "data" : {
                        "source" : "CityofGod",
                        "target" : "TheGodfather",
                        "weight" : "8"
                     }
                  },
                  {
                     "data" : {
                        "source" : "CityofGod",
                        "target" : "TheGreenMile",
                        "weight" : "7"
                     }
                  },
                  {
                     "data" : {
                        "source" : "CityofGod",
                        "target" : "TheLordoftheRings:TheFellowshipoftheRing",
                        "weight" : "11"
                     }
                  },
                  {
                     "data" : {
                        "source" : "CityofGod",
                        "target" : "TheLordoftheRings:TheReturnoftheKing",
                        "weight" : "11"
                     }
                  },
                  {
                     "data" : {
                        "source" : "CityofGod",
                        "target" : "TheMatrix",
                        "weight" : "12"
                     }
                  },
                  {
                     "data" : {
                        "source" : "CityofGod",
                        "target" : "ThePianist",
                        "weight" : "9"
                     }
                  },
                  {
                     "data" : {
                        "source" : "CityofGod",
                        "target" : "TheShawshankRedemption",
                        "weight" : "9"
                     }
                  },
                  {
                     "data" : {
                        "source" : "CityofGod",
                        "target" : "TheSilenceoftheLambs",
                        "weight" : "7"
                     }
                  },
                  {
                     "data" : {
                        "source" : "CityofGod",
                        "target" : "TheUsualSuspects",
                        "weight" : "11"
                     }
                  },
                  {
                     "data" : {
                        "source" : "FightClub",
                        "target" : "Casablanca",
                        "weight" : "8"
                     }
                  },
                  {
                     "data" : {
                        "source" : "FightClub",
                        "target" : "CityofGod",
                        "weight" : "9"
                     }
                  },
                  {
                     "data" : {
                        "source" : "FightClub",
                        "target" : "ForrestGump",
                        "weight" : "5"
                     }
                  },
                  {
                     "data" : {
                        "source" : "FightClub",
                        "target" : "Gladiator",
                        "weight" : "8"
                     }
                  },
                  {
                     "data" : {
                        "source" : "FightClub",
                        "target" : "Goodfellas",
                        "weight" : "8"
                     }
                  },
                  {
                     "data" : {
                        "source" : "FightClub",
                        "target" : "Inception",
                        "weight" : "8"
                     }
                  },
                  {
                     "data" : {
                        "source" : "FightClub",
                        "target" : "Interstellar",
                        "weight" : "8"
                     }
                  },
                  {
                     "data" : {
                        "source" : "FightClub",
                        "target" : "LifeisBeautiful",
                        "weight" : "10"
                     }
                  },
                  {
                     "data" : {
                        "source" : "FightClub",
                        "target" : "PulpFiction",
                        "weight" : "7"
                     }
                  },
                  {
                     "data" : {
                        "source" : "FightClub",
                        "target" : "SavingPrivateRyan",
                        "weight" : "7"
                     }
                  },
                  {
                     "data" : {
                        "source" : "FightClub",
                        "target" : "Schindler'sList",
                        "weight" : "8"
                     }
                  },
                  {
                     "data" : {
                        "source" : "FightClub",
                        "target" : "Se7en",
                        "weight" : "8"
                     }
                  },
                  {
                     "data" : {
                        "source" : "FightClub",
                        "target" : "SpiritedAway",
                        "weight" : "12"
                     }
                  },
                  {
                     "data" : {
                        "source" : "FightClub",
                        "target" : "StarWars:EpisodeV-TheEmpireStrikesBack",
                        "weight" : "10"
                     }
                  },
                  {
                     "data" : {
                        "source" : "FightClub",
                        "target" : "TheDarkKnight",
                        "weight" : "8"
                     }
                  },
                  {
                     "data" : {
                        "source" : "FightClub",
                        "target" : "TheGodfather",
                        "weight" : "7"
                     }
                  },
                  {
                     "data" : {
                        "source" : "FightClub",
                        "target" : "TheGreenMile",
                        "weight" : "6"
                     }
                  },
                  {
                     "data" : {
                        "source" : "FightClub",
                        "target" : "TheLordoftheRings:TheFellowshipoftheRing",
                        "weight" : "8"
                     }
                  },
                  {
                     "data" : {
                        "source" : "FightClub",
                        "target" : "TheLordoftheRings:TheReturnoftheKing",
                        "weight" : "10"
                     }
                  },
                  {
                     "data" : {
                        "source" : "FightClub",
                        "target" : "TheMatrix",
                        "weight" : "7"
                     }
                  },
                  {
                     "data" : {
                        "source" : "FightClub",
                        "target" : "ThePianist",
                        "weight" : "10"
                     }
                  },
                  {
                     "data" : {
                        "source" : "FightClub",
                        "target" : "TheShawshankRedemption",
                        "weight" : "6"
                     }
                  },
                  {
                     "data" : {
                        "source" : "FightClub",
                        "target" : "TheSilenceoftheLambs",
                        "weight" : "8"
                     }
                  },
                  {
                     "data" : {
                        "source" : "FightClub",
                        "target" : "TheUsualSuspects",
                        "weight" : "10"
                     }
                  },
                  {
                     "data" : {
                        "source" : "ForrestGump",
                        "target" : "Casablanca",
                        "weight" : "7"
                     }
                  },
                  {
                     "data" : {
                        "source" : "ForrestGump",
                        "target" : "CityofGod",
                        "weight" : "10"
                     }
                  },
                  {
                     "data" : {
                        "source" : "ForrestGump",
                        "target" : "FightClub",
                        "weight" : "5"
                     }
                  },
                  {
                     "data" : {
                        "source" : "ForrestGump",
                        "target" : "Gladiator",
                        "weight" : "9"
                     }
                  },
                  {
                     "data" : {
                        "source" : "ForrestGump",
                        "target" : "Goodfellas",
                        "weight" : "9"
                     }
                  },
                  {
                     "data" : {
                        "source" : "ForrestGump",
                        "target" : "Inception",
                        "weight" : "9"
                     }
                  },
                  {
                     "data" : {
                        "source" : "ForrestGump",
                        "target" : "Interstellar",
                        "weight" : "9"
                     }
                  },
                  {
                     "data" : {
                        "source" : "ForrestGump",
                        "target" : "LifeisBeautiful",
                        "weight" : "9"
                     }
                  },
                  {
                     "data" : {
                        "source" : "ForrestGump",
                        "target" : "PulpFiction",
                        "weight" : "6"
                     }
                  },
                  {
                     "data" : {
                        "source" : "ForrestGump",
                        "target" : "SavingPrivateRyan",
                        "weight" : "8"
                     }
                  },
                  {
                     "data" : {
                        "source" : "ForrestGump",
                        "target" : "Schindler'sList",
                        "weight" : "9"
                     }
                  },
                  {
                     "data" : {
                        "source" : "ForrestGump",
                        "target" : "Se7en",
                        "weight" : "9"
                     }
                  },
                  {
                     "data" : {
                        "source" : "ForrestGump",
                        "target" : "SpiritedAway",
                        "weight" : "13"
                     }
                  },
                  {
                     "data" : {
                        "source" : "ForrestGump",
                        "target" : "StarWars:EpisodeV-TheEmpireStrikesBack",
                        "weight" : "11"
                     }
                  },
                  {
                     "data" : {
                        "source" : "ForrestGump",
                        "target" : "TheDarkKnight",
                        "weight" : "9"
                     }
                  },
                  {
                     "data" : {
                        "source" : "ForrestGump",
                        "target" : "TheGodfather",
                        "weight" : "8"
                     }
                  },
                  {
                     "data" : {
                        "source" : "ForrestGump",
                        "target" : "TheGreenMile",
                        "weight" : "9"
                     }
                  },
                  {
                     "data" : {
                        "source" : "ForrestGump",
                        "target" : "TheLordoftheRings:TheFellowshipoftheRing",
                        "weight" : "9"
                     }
                  },
                  {
                     "data" : {
                        "source" : "ForrestGump",
                        "target" : "TheLordoftheRings:TheReturnoftheKing",
                        "weight" : "11"
                     }
                  },
                  {
                     "data" : {
                        "source" : "ForrestGump",
                        "target" : "TheMatrix",
                        "weight" : "10"
                     }
                  },
                  {
                     "data" : {
                        "source" : "ForrestGump",
                        "target" : "ThePianist",
                        "weight" : "11"
                     }
                  },
                  {
                     "data" : {
                        "source" : "ForrestGump",
                        "target" : "TheShawshankRedemption",
                        "weight" : "5"
                     }
                  },
                  {
                     "data" : {
                        "source" : "ForrestGump",
                        "target" : "TheSilenceoftheLambs",
                        "weight" : "9"
                     }
                  },
                  {
                     "data" : {
                        "source" : "ForrestGump",
                        "target" : "TheUsualSuspects",
                        "weight" : "11"
                     }
                  },
                  {
                     "data" : {
                        "source" : "Gladiator",
                        "target" : "Casablanca",
                        "weight" : "8"
                     }
                  },
                  {
                     "data" : {
                        "source" : "Gladiator",
                        "target" : "CityofGod",
                        "weight" : "11"
                     }
                  },
                  {
                     "data" : {
                        "source" : "Gladiator",
                        "target" : "FightClub",
                        "weight" : "8"
                     }
                  },
                  {
                     "data" : {
                        "source" : "Gladiator",
                        "target" : "ForrestGump",
                        "weight" : "9"
                     }
                  },
                  {
                     "data" : {
                        "source" : "Gladiator",
                        "target" : "Goodfellas",
                        "weight" : "10"
                     }
                  },
                  {
                     "data" : {
                        "source" : "Gladiator",
                        "target" : "Inception",
                        "weight" : "8"
                     }
                  },
                  {
                     "data" : {
                        "source" : "Gladiator",
                        "target" : "Interstellar",
                        "weight" : "8"
                     }
                  },
                  {
                     "data" : {
                        "source" : "Gladiator",
                        "target" : "LifeisBeautiful",
                        "weight" : "12"
                     }
                  },
                  {
                     "data" : {
                        "source" : "Gladiator",
                        "target" : "PulpFiction",
                        "weight" : "9"
                     }
                  },
                  {
                     "data" : {
                        "source" : "Gladiator",
                        "target" : "SavingPrivateRyan",
                        "weight" : "9"
                     }
                  },
                  {
                     "data" : {
                        "source" : "Gladiator",
                        "target" : "Schindler'sList",
                        "weight" : "10"
                     }
                  },
                  {
                     "data" : {
                        "source" : "Gladiator",
                        "target" : "Se7en",
                        "weight" : "10"
                     }
                  },
                  {
                     "data" : {
                        "source" : "Gladiator",
                        "target" : "SpiritedAway",
                        "weight" : "12"
                     }
                  },
                  {
                     "data" : {
                        "source" : "Gladiator",
                        "target" : "StarWars:EpisodeV-TheEmpireStrikesBack",
                        "weight" : "8"
                     }
                  },
                  {
                     "data" : {
                        "source" : "Gladiator",
                        "target" : "TheDarkKnight",
                        "weight" : "8"
                     }
                  },
                  {
                     "data" : {
                        "source" : "Gladiator",
                        "target" : "TheGodfather",
                        "weight" : "9"
                     }
                  },
                  {
                     "data" : {
                        "source" : "Gladiator",
                        "target" : "TheGreenMile",
                        "weight" : "10"
                     }
                  },
                  {
                     "data" : {
                        "source" : "Gladiator",
                        "target" : "TheLordoftheRings:TheFellowshipoftheRing",
                        "weight" : "10"
                     }
                  },
                  {
                     "data" : {
                        "source" : "Gladiator",
                        "target" : "TheLordoftheRings:TheReturnoftheKing",
                        "weight" : "10"
                     }
                  },
                  {
                     "data" : {
                        "source" : "Gladiator",
                        "target" : "TheMatrix",
                        "weight" : "9"
                     }
                  },
                  {
                     "data" : {
                        "source" : "Gladiator",
                        "target" : "ThePianist",
                        "weight" : "10"
                     }
                  },
                  {
                     "data" : {
                        "source" : "Gladiator",
                        "target" : "TheShawshankRedemption",
                        "weight" : "8"
                     }
                  },
                  {
                     "data" : {
                        "source" : "Gladiator",
                        "target" : "TheSilenceoftheLambs",
                        "weight" : "10"
                     }
                  },
                  {
                     "data" : {
                        "source" : "Gladiator",
                        "target" : "TheUsualSuspects",
                        "weight" : "10"
                     }
                  },
                  {
                     "data" : {
                        "source" : "Goodfellas",
                        "target" : "Casablanca",
                        "weight" : "10"
                     }
                  },
                  {
                     "data" : {
                        "source" : "Goodfellas",
                        "target" : "CityofGod",
                        "weight" : "9"
                     }
                  },
                  {
                     "data" : {
                        "source" : "Goodfellas",
                        "target" : "FightClub",
                        "weight" : "8"
                     }
                  },
                  {
                     "data" : {
                        "source" : "Goodfellas",
                        "target" : "ForrestGump",
                        "weight" : "9"
                     }
                  },
                  {
                     "data" : {
                        "source" : "Goodfellas",
                        "target" : "Gladiator",
                        "weight" : "10"
                     }
                  },
                  {
                     "data" : {
                        "source" : "Goodfellas",
                        "target" : "Inception",
                        "weight" : "12"
                     }
                  },
                  {
                     "data" : {
                        "source" : "Goodfellas",
                        "target" : "Interstellar",
                        "weight" : "10"
                     }
                  },
                  {
                     "data" : {
                        "source" : "Goodfellas",
                        "target" : "LifeisBeautiful",
                        "weight" : "12"
                     }
                  },
                  {
                     "data" : {
                        "source" : "Goodfellas",
                        "target" : "PulpFiction",
                        "weight" : "7"
                     }
                  },
                  {
                     "data" : {
                        "source" : "Goodfellas",
                        "target" : "SavingPrivateRyan",
                        "weight" : "9"
                     }
                  },
                  {
                     "data" : {
                        "source" : "Goodfellas",
                        "target" : "Schindler'sList",
                        "weight" : "8"
                     }
                  },
                  {
                     "data" : {
                        "source" : "Goodfellas",
                        "target" : "Se7en",
                        "weight" : "8"
                     }
                  },
                  {
                     "data" : {
                        "source" : "Goodfellas",
                        "target" : "SpiritedAway",
                        "weight" : "14"
                     }
                  },
                  {
                     "data" : {
                        "source" : "Goodfellas",
                        "target" : "StarWars:EpisodeV-TheEmpireStrikesBack",
                        "weight" : "10"
                     }
                  },
                  {
                     "data" : {
                        "source" : "Goodfellas",
                        "target" : "TheDarkKnight",
                        "weight" : "8"
                     }
                  },
                  {
                     "data" : {
                        "source" : "Goodfellas",
                        "target" : "TheGodfather",
                        "weight" : "7"
                     }
                  },
                  {
                     "data" : {
                        "source" : "Goodfellas",
                        "target" : "TheGreenMile",
                        "weight" : "8"
                     }
                  },
                  {
                     "data" : {
                        "source" : "Goodfellas",
                        "target" : "TheLordoftheRings:TheFellowshipoftheRing",
                        "weight" : "12"
                     }
                  },
                  {
                     "data" : {
                        "source" : "Goodfellas",
                        "target" : "TheLordoftheRings:TheReturnoftheKing",
                        "weight" : "12"
                     }
                  },
                  {
                     "data" : {
                        "source" : "Goodfellas",
                        "target" : "TheMatrix",
                        "weight" : "9"
                     }
                  },
                  {
                     "data" : {
                        "source" : "Goodfellas",
                        "target" : "ThePianist",
                        "weight" : "10"
                     }
                  },
                  {
                     "data" : {
                        "source" : "Goodfellas",
                        "target" : "TheShawshankRedemption",
                        "weight" : "8"
                     }
                  },
                  {
                     "data" : {
                        "source" : "Goodfellas",
                        "target" : "TheSilenceoftheLambs",
                        "weight" : "8"
                     }
                  },
                  {
                     "data" : {
                        "source" : "Goodfellas",
                        "target" : "TheUsualSuspects",
                        "weight" : "10"
                     }
                  },
                  {
                     "data" : {
                        "source" : "Inception",
                        "target" : "Casablanca",
                        "weight" : "12"
                     }
                  },
                  {
                     "data" : {
                        "source" : "Inception",
                        "target" : "CityofGod",
                        "weight" : "13"
                     }
                  },
                  {
                     "data" : {
                        "source" : "Inception",
                        "target" : "FightClub",
                        "weight" : "8"
                     }
                  },
                  {
                     "data" : {
                        "source" : "Inception",
                        "target" : "ForrestGump",
                        "weight" : "9"
                     }
                  },
                  {
                     "data" : {
                        "source" : "Inception",
                        "target" : "Gladiator",
                        "weight" : "8"
                     }
                  },
                  {
                     "data" : {
                        "source" : "Inception",
                        "target" : "Goodfellas",
                        "weight" : "12"
                     }
                  },
                  {
                     "data" : {
                        "source" : "Inception",
                        "target" : "Interstellar",
                        "weight" : "8"
                     }
                  },
                  {
                     "data" : {
                        "source" : "Inception",
                        "target" : "LifeisBeautiful",
                        "weight" : "14"
                     }
                  },
                  {
                     "data" : {
                        "source" : "Inception",
                        "target" : "PulpFiction",
                        "weight" : "11"
                     }
                  },
                  {
                     "data" : {
                        "source" : "Inception",
                        "target" : "SavingPrivateRyan",
                        "weight" : "11"
                     }
                  },
                  {
                     "data" : {
                        "source" : "Inception",
                        "target" : "Schindler'sList",
                        "weight" : "12"
                     }
                  },
                  {
                     "data" : {
                        "source" : "Inception",
                        "target" : "Se7en",
                        "weight" : "12"
                     }
                  },
                  {
                     "data" : {
                        "source" : "Inception",
                        "target" : "SpiritedAway",
                        "weight" : "12"
                     }
                  },
                  {
                     "data" : {
                        "source" : "Inception",
                        "target" : "StarWars:EpisodeV-TheEmpireStrikesBack",
                        "weight" : "8"
                     }
                  },
                  {
                     "data" : {
                        "source" : "Inception",
                        "target" : "TheDarkKnight",
                        "weight" : "10"
                     }
                  },
                  {
                     "data" : {
                        "source" : "Inception",
                        "target" : "TheGodfather",
                        "weight" : "11"
                     }
                  },
                  {
                     "data" : {
                        "source" : "Inception",
                        "target" : "TheGreenMile",
                        "weight" : "12"
                     }
                  },
                  {
                     "data" : {
                        "source" : "Inception",
                        "target" : "TheLordoftheRings:TheFellowshipoftheRing",
                        "weight" : "10"
                     }
                  },
                  {
                     "data" : {
                        "source" : "Inception",
                        "target" : "TheLordoftheRings:TheReturnoftheKing",
                        "weight" : "12"
                     }
                  },
                  {
                     "data" : {
                        "source" : "Inception",
                        "target" : "TheMatrix",
                        "weight" : "7"
                     }
                  },
                  {
                     "data" : {
                        "source" : "Inception",
                        "target" : "ThePianist",
                        "weight" : "14"
                     }
                  },
                  {
                     "data" : {
                        "source" : "Inception",
                        "target" : "TheShawshankRedemption",
                        "weight" : "10"
                     }
                  },
                  {
                     "data" : {
                        "source" : "Inception",
                        "target" : "TheSilenceoftheLambs",
                        "weight" : "12"
                     }
                  },
                  {
                     "data" : {
                        "source" : "Inception",
                        "target" : "TheUsualSuspects",
                        "weight" : "12"
                     }
                  },
                  {
                     "data" : {
                        "source" : "Interstellar",
                        "target" : "Casablanca",
                        "weight" : "10"
                     }
                  },
                  {
                     "data" : {
                        "source" : "Interstellar",
                        "target" : "CityofGod",
                        "weight" : "9"
                     }
                  },
                  {
                     "data" : {
                        "source" : "Interstellar",
                        "target" : "FightClub",
                        "weight" : "8"
                     }
                  },
                  {
                     "data" : {
                        "source" : "Interstellar",
                        "target" : "ForrestGump",
                        "weight" : "9"
                     }
                  },
                  {
                     "data" : {
                        "source" : "Interstellar",
                        "target" : "Gladiator",
                        "weight" : "8"
                     }
                  },
                  {
                     "data" : {
                        "source" : "Interstellar",
                        "target" : "Goodfellas",
                        "weight" : "10"
                     }
                  },
                  {
                     "data" : {
                        "source" : "Interstellar",
                        "target" : "Inception",
                        "weight" : "8"
                     }
                  },
                  {
                     "data" : {
                        "source" : "Interstellar",
                        "target" : "LifeisBeautiful",
                        "weight" : "10"
                     }
                  },
                  {
                     "data" : {
                        "source" : "Interstellar",
                        "target" : "PulpFiction",
                        "weight" : "9"
                     }
                  },
                  {
                     "data" : {
                        "source" : "Interstellar",
                        "target" : "SavingPrivateRyan",
                        "weight" : "7"
                     }
                  },
                  {
                     "data" : {
                        "source" : "Interstellar",
                        "target" : "Schindler'sList",
                        "weight" : "10"
                     }
                  },
                  {
                     "data" : {
                        "source" : "Interstellar",
                        "target" : "Se7en",
                        "weight" : "8"
                     }
                  },
                  {
                     "data" : {
                        "source" : "Interstellar",
                        "target" : "SpiritedAway",
                        "weight" : "10"
                     }
                  },
                  {
                     "data" : {
                        "source" : "Interstellar",
                        "target" : "StarWars:EpisodeV-TheEmpireStrikesBack",
                        "weight" : "10"
                     }
                  },
                  {
                     "data" : {
                        "source" : "Interstellar",
                        "target" : "TheDarkKnight",
                        "weight" : "10"
                     }
                  },
                  {
                     "data" : {
                        "source" : "Interstellar",
                        "target" : "TheGodfather",
                        "weight" : "9"
                     }
                  },
                  {
                     "data" : {
                        "source" : "Interstellar",
                        "target" : "TheGreenMile",
                        "weight" : "8"
                     }
                  },
                  {
                     "data" : {
                        "source" : "Interstellar",
                        "target" : "TheLordoftheRings:TheFellowshipoftheRing",
                        "weight" : "10"
                     }
                  },
                  {
                     "data" : {
                        "source" : "Interstellar",
                        "target" : "TheLordoftheRings:TheReturnoftheKing",
                        "weight" : "10"
                     }
                  },
                  {
                     "data" : {
                        "source" : "Interstellar",
                        "target" : "TheMatrix",
                        "weight" : "9"
                     }
                  },
                  {
                     "data" : {
                        "source" : "Interstellar",
                        "target" : "ThePianist",
                        "weight" : "12"
                     }
                  },
                  {
                     "data" : {
                        "source" : "Interstellar",
                        "target" : "TheShawshankRedemption",
                        "weight" : "8"
                     }
                  },
                  {
                     "data" : {
                        "source" : "Interstellar",
                        "target" : "TheSilenceoftheLambs",
                        "weight" : "8"
                     }
                  },
                  {
                     "data" : {
                        "source" : "Interstellar",
                        "target" : "TheUsualSuspects",
                        "weight" : "12"
                     }
                  },
                  {
                     "data" : {
                        "source" : "LifeisBeautiful",
                        "target" : "Casablanca",
                        "weight" : "10"
                     }
                  },
                  {
                     "data" : {
                        "source" : "LifeisBeautiful",
                        "target" : "CityofGod",
                        "weight" : "9"
                     }
                  },
                  {
                     "data" : {
                        "source" : "LifeisBeautiful",
                        "target" : "FightClub",
                        "weight" : "10"
                     }
                  },
                  {
                     "data" : {
                        "source" : "LifeisBeautiful",
                        "target" : "ForrestGump",
                        "weight" : "9"
                     }
                  },
                  {
                     "data" : {
                        "source" : "LifeisBeautiful",
                        "target" : "Gladiator",
                        "weight" : "12"
                     }
                  },
                  {
                     "data" : {
                        "source" : "LifeisBeautiful",
                        "target" : "Goodfellas",
                        "weight" : "12"
                     }
                  },
                  {
                     "data" : {
                        "source" : "LifeisBeautiful",
                        "target" : "Inception",
                        "weight" : "14"
                     }
                  },
                  {
                     "data" : {
                        "source" : "LifeisBeautiful",
                        "target" : "Interstellar",
                        "weight" : "10"
                     }
                  },
                  {
                     "data" : {
                        "source" : "LifeisBeautiful",
                        "target" : "PulpFiction",
                        "weight" : "11"
                     }
                  },
                  {
                     "data" : {
                        "source" : "LifeisBeautiful",
                        "target" : "SavingPrivateRyan",
                        "weight" : "9"
                     }
                  },
                  {
                     "data" : {
                        "source" : "LifeisBeautiful",
                        "target" : "Schindler'sList",
                        "weight" : "12"
                     }
                  },
                  {
                     "data" : {
                        "source" : "LifeisBeautiful",
                        "target" : "Se7en",
                        "weight" : "10"
                     }
                  },
                  {
                     "data" : {
                        "source" : "LifeisBeautiful",
                        "target" : "SpiritedAway",
                        "weight" : "12"
                     }
                  },
                  {
                     "data" : {
                        "source" : "LifeisBeautiful",
                        "target" : "StarWars:EpisodeV-TheEmpireStrikesBack",
                        "weight" : "14"
                     }
                  },
                  {
                     "data" : {
                        "source" : "LifeisBeautiful",
                        "target" : "TheDarkKnight",
                        "weight" : "12"
                     }
                  },
                  {
                     "data" : {
                        "source" : "LifeisBeautiful",
                        "target" : "TheGodfather",
                        "weight" : "11"
                     }
                  },
                  {
                     "data" : {
                        "source" : "LifeisBeautiful",
                        "target" : "TheGreenMile",
                        "weight" : "10"
                     }
                  },
                  {
                     "data" : {
                        "source" : "LifeisBeautiful",
                        "target" : "TheLordoftheRings:TheFellowshipoftheRing",
                        "weight" : "12"
                     }
                  },
                  {
                     "data" : {
                        "source" : "LifeisBeautiful",
                        "target" : "TheLordoftheRings:TheReturnoftheKing",
                        "weight" : "12"
                     }
                  },
                  {
                     "data" : {
                        "source" : "LifeisBeautiful",
                        "target" : "TheMatrix",
                        "weight" : "13"
                     }
                  },
                  {
                     "data" : {
                        "source" : "LifeisBeautiful",
                        "target" : "ThePianist",
                        "weight" : "12"
                     }
                  },
                  {
                     "data" : {
                        "source" : "LifeisBeautiful",
                        "target" : "TheShawshankRedemption",
                        "weight" : "10"
                     }
                  },
                  {
                     "data" : {
                        "source" : "LifeisBeautiful",
                        "target" : "TheSilenceoftheLambs",
                        "weight" : "10"
                     }
                  },
                  {
                     "data" : {
                        "source" : "LifeisBeautiful",
                        "target" : "TheUsualSuspects",
                        "weight" : "14"
                     }
                  },
                  {
                     "data" : {
                        "source" : "PulpFiction",
                        "target" : "Casablanca",
                        "weight" : "9"
                     }
                  },
                  {
                     "data" : {
                        "source" : "PulpFiction",
                        "target" : "CityofGod",
                        "weight" : "8"
                     }
                  },
                  {
                     "data" : {
                        "source" : "PulpFiction",
                        "target" : "FightClub",
                        "weight" : "7"
                     }
                  },
                  {
                     "data" : {
                        "source" : "PulpFiction",
                        "target" : "ForrestGump",
                        "weight" : "6"
                     }
                  },
                  {
                     "data" : {
                        "source" : "PulpFiction",
                        "target" : "Gladiator",
                        "weight" : "9"
                     }
                  },
                  {
                     "data" : {
                        "source" : "PulpFiction",
                        "target" : "Goodfellas",
                        "weight" : "7"
                     }
                  },
                  {
                     "data" : {
                        "source" : "PulpFiction",
                        "target" : "Inception",
                        "weight" : "11"
                     }
                  },
                  {
                     "data" : {
                        "source" : "PulpFiction",
                        "target" : "Interstellar",
                        "weight" : "9"
                     }
                  },
                  {
                     "data" : {
                        "source" : "PulpFiction",
                        "target" : "LifeisBeautiful",
                        "weight" : "11"
                     }
                  },
                  {
                     "data" : {
                        "source" : "PulpFiction",
                        "target" : "SavingPrivateRyan",
                        "weight" : "8"
                     }
                  },
                  {
                     "data" : {
                        "source" : "PulpFiction",
                        "target" : "Schindler'sList",
                        "weight" : "7"
                     }
                  },
                  {
                     "data" : {
                        "source" : "PulpFiction",
                        "target" : "Se7en",
                        "weight" : "7"
                     }
                  },
                  {
                     "data" : {
                        "source" : "PulpFiction",
                        "target" : "SpiritedAway",
                        "weight" : "13"
                     }
                  },
                  {
                     "data" : {
                        "source" : "PulpFiction",
                        "target" : "StarWars:EpisodeV-TheEmpireStrikesBack",
                        "weight" : "11"
                     }
                  },
                  {
                     "data" : {
                        "source" : "PulpFiction",
                        "target" : "TheDarkKnight",
                        "weight" : "7"
                     }
                  },
                  {
                     "data" : {
                        "source" : "PulpFiction",
                        "target" : "TheGodfather",
                        "weight" : "6"
                     }
                  },
                  {
                     "data" : {
                        "source" : "PulpFiction",
                        "target" : "TheGreenMile",
                        "weight" : "7"
                     }
                  },
                  {
                     "data" : {
                        "source" : "PulpFiction",
                        "target" : "TheLordoftheRings:TheFellowshipoftheRing",
                        "weight" : "11"
                     }
                  },
                  {
                     "data" : {
                        "source" : "PulpFiction",
                        "target" : "TheLordoftheRings:TheReturnoftheKing",
                        "weight" : "9"
                     }
                  },
                  {
                     "data" : {
                        "source" : "PulpFiction",
                        "target" : "TheMatrix",
                        "weight" : "10"
                     }
                  },
                  {
                     "data" : {
                        "source" : "PulpFiction",
                        "target" : "ThePianist",
                        "weight" : "11"
                     }
                  },
                  {
                     "data" : {
                        "source" : "PulpFiction",
                        "target" : "TheShawshankRedemption",
                        "weight" : "5"
                     }
                  },
                  {
                     "data" : {
                        "source" : "PulpFiction",
                        "target" : "TheSilenceoftheLambs",
                        "weight" : "7"
                     }
                  },
                  {
                     "data" : {
                        "source" : "PulpFiction",
                        "target" : "TheUsualSuspects",
                        "weight" : "9"
                     }
                  },
                  {
                     "data" : {
                        "source" : "SavingPrivateRyan",
                        "target" : "Casablanca",
                        "weight" : "7"
                     }
                  },
                  {
                     "data" : {
                        "source" : "SavingPrivateRyan",
                        "target" : "CityofGod",
                        "weight" : "8"
                     }
                  },
                  {
                     "data" : {
                        "source" : "SavingPrivateRyan",
                        "target" : "FightClub",
                        "weight" : "7"
                     }
                  },
                  {
                     "data" : {
                        "source" : "SavingPrivateRyan",
                        "target" : "ForrestGump",
                        "weight" : "8"
                     }
                  },
                  {
                     "data" : {
                        "source" : "SavingPrivateRyan",
                        "target" : "Gladiator",
                        "weight" : "9"
                     }
                  },
                  {
                     "data" : {
                        "source" : "SavingPrivateRyan",
                        "target" : "Goodfellas",
                        "weight" : "9"
                     }
                  },
                  {
                     "data" : {
                        "source" : "SavingPrivateRyan",
                        "target" : "Inception",
                        "weight" : "11"
                     }
                  },
                  {
                     "data" : {
                        "source" : "SavingPrivateRyan",
                        "target" : "Interstellar",
                        "weight" : "7"
                     }
                  },
                  {
                     "data" : {
                        "source" : "SavingPrivateRyan",
                        "target" : "LifeisBeautiful",
                        "weight" : "9"
                     }
                  },
                  {
                     "data" : {
                        "source" : "SavingPrivateRyan",
                        "target" : "PulpFiction",
                        "weight" : "8"
                     }
                  },
                  {
                     "data" : {
                        "source" : "SavingPrivateRyan",
                        "target" : "Schindler'sList",
                        "weight" : "9"
                     }
                  },
                  {
                     "data" : {
                        "source" : "SavingPrivateRyan",
                        "target" : "Se7en",
                        "weight" : "7"
                     }
                  },
                  {
                     "data" : {
                        "source" : "SavingPrivateRyan",
                        "target" : "SpiritedAway",
                        "weight" : "11"
                     }
                  },
                  {
                     "data" : {
                        "source" : "SavingPrivateRyan",
                        "target" : "StarWars:EpisodeV-TheEmpireStrikesBack",
                        "weight" : "11"
                     }
                  },
                  {
                     "data" : {
                        "source" : "SavingPrivateRyan",
                        "target" : "TheDarkKnight",
                        "weight" : "9"
                     }
                  },
                  {
                     "data" : {
                        "source" : "SavingPrivateRyan",
                        "target" : "TheGodfather",
                        "weight" : "8"
                     }
                  },
                  {
                     "data" : {
                        "source" : "SavingPrivateRyan",
                        "target" : "TheGreenMile",
                        "weight" : "7"
                     }
                  },
                  {
                     "data" : {
                        "source" : "SavingPrivateRyan",
                        "target" : "TheLordoftheRings:TheFellowshipoftheRing",
                        "weight" : "11"
                     }
                  },
                  {
                     "data" : {
                        "source" : "SavingPrivateRyan",
                        "target" : "TheLordoftheRings:TheReturnoftheKing",
                        "weight" : "11"
                     }
                  },
                  {
                     "data" : {
                        "source" : "SavingPrivateRyan",
                        "target" : "TheMatrix",
                        "weight" : "10"
                     }
                  },
                  {
                     "data" : {
                        "source" : "SavingPrivateRyan",
                        "target" : "ThePianist",
                        "weight" : "11"
                     }
                  },
                  {
                     "data" : {
                        "source" : "SavingPrivateRyan",
                        "target" : "TheShawshankRedemption",
                        "weight" : "7"
                     }
                  },
                  {
                     "data" : {
                        "source" : "SavingPrivateRyan",
                        "target" : "TheSilenceoftheLambs",
                        "weight" : "7"
                     }
                  },
                  {
                     "data" : {
                        "source" : "SavingPrivateRyan",
                        "target" : "TheUsualSuspects",
                        "weight" : "11"
                     }
                  },
                  {
                     "data" : {
                        "source" : "Schindler'sList",
                        "target" : "Casablanca",
                        "weight" : "10"
                     }
                  },
                  {
                     "data" : {
                        "source" : "Schindler'sList",
                        "target" : "CityofGod",
                        "weight" : "11"
                     }
                  },
                  {
                     "data" : {
                        "source" : "Schindler'sList",
                        "target" : "FightClub",
                        "weight" : "8"
                     }
                  },
                  {
                     "data" : {
                        "source" : "Schindler'sList",
                        "target" : "ForrestGump",
                        "weight" : "9"
                     }
                  },
                  {
                     "data" : {
                        "source" : "Schindler'sList",
                        "target" : "Gladiator",
                        "weight" : "10"
                     }
                  },
                  {
                     "data" : {
                        "source" : "Schindler'sList",
                        "target" : "Goodfellas",
                        "weight" : "8"
                     }
                  },
                  {
                     "data" : {
                        "source" : "Schindler'sList",
                        "target" : "Inception",
                        "weight" : "12"
                     }
                  },
                  {
                     "data" : {
                        "source" : "Schindler'sList",
                        "target" : "Interstellar",
                        "weight" : "10"
                     }
                  },
                  {
                     "data" : {
                        "source" : "Schindler'sList",
                        "target" : "LifeisBeautiful",
                        "weight" : "12"
                     }
                  },
                  {
                     "data" : {
                        "source" : "Schindler'sList",
                        "target" : "PulpFiction",
                        "weight" : "7"
                     }
                  },
                  {
                     "data" : {
                        "source" : "Schindler'sList",
                        "target" : "SavingPrivateRyan",
                        "weight" : "9"
                     }
                  },
                  {
                     "data" : {
                        "source" : "Schindler'sList",
                        "target" : "Se7en",
                        "weight" : "10"
                     }
                  },
                  {
                     "data" : {
                        "source" : "Schindler'sList",
                        "target" : "SpiritedAway",
                        "weight" : "14"
                     }
                  },
                  {
                     "data" : {
                        "source" : "Schindler'sList",
                        "target" : "StarWars:EpisodeV-TheEmpireStrikesBack",
                        "weight" : "12"
                     }
                  },
                  {
                     "data" : {
                        "source" : "Schindler'sList",
                        "target" : "TheDarkKnight",
                        "weight" : "10"
                     }
                  },
                  {
                     "data" : {
                        "source" : "Schindler'sList",
                        "target" : "TheGodfather",
                        "weight" : "9"
                     }
                  },
                  {
                     "data" : {
                        "source" : "Schindler'sList",
                        "target" : "TheGreenMile",
                        "weight" : "10"
                     }
                  },
                  {
                     "data" : {
                        "source" : "Schindler'sList",
                        "target" : "TheLordoftheRings:TheFellowshipoftheRing",
                        "weight" : "12"
                     }
                  },
                  {
                     "data" : {
                        "source" : "Schindler'sList",
                        "target" : "TheLordoftheRings:TheReturnoftheKing",
                        "weight" : "10"
                     }
                  },
                  {
                     "data" : {
                        "source" : "Schindler'sList",
                        "target" : "TheMatrix",
                        "weight" : "11"
                     }
                  },
                  {
                     "data" : {
                        "source" : "Schindler'sList",
                        "target" : "ThePianist",
                        "weight" : "10"
                     }
                  },
                  {
                     "data" : {
                        "source" : "Schindler'sList",
                        "target" : "TheShawshankRedemption",
                        "weight" : "8"
                     }
                  },
                  {
                     "data" : {
                        "source" : "Schindler'sList",
                        "target" : "TheSilenceoftheLambs",
                        "weight" : "10"
                     }
                  },
                  {
                     "data" : {
                        "source" : "Schindler'sList",
                        "target" : "TheUsualSuspects",
                        "weight" : "12"
                     }
                  },
                  {
                     "data" : {
                        "source" : "Se7en",
                        "target" : "Casablanca",
                        "weight" : "10"
                     }
                  },
                  {
                     "data" : {
                        "source" : "Se7en",
                        "target" : "CityofGod",
                        "weight" : "7"
                     }
                  },
                  {
                     "data" : {
                        "source" : "Se7en",
                        "target" : "FightClub",
                        "weight" : "8"
                     }
                  },
                  {
                     "data" : {
                        "source" : "Se7en",
                        "target" : "ForrestGump",
                        "weight" : "9"
                     }
                  },
                  {
                     "data" : {
                        "source" : "Se7en",
                        "target" : "Gladiator",
                        "weight" : "10"
                     }
                  },
                  {
                     "data" : {
                        "source" : "Se7en",
                        "target" : "Goodfellas",
                        "weight" : "8"
                     }
                  },
                  {
                     "data" : {
                        "source" : "Se7en",
                        "target" : "Inception",
                        "weight" : "12"
                     }
                  },
                  {
                     "data" : {
                        "source" : "Se7en",
                        "target" : "Interstellar",
                        "weight" : "8"
                     }
                  },
                  {
                     "data" : {
                        "source" : "Se7en",
                        "target" : "LifeisBeautiful",
                        "weight" : "10"
                     }
                  },
                  {
                     "data" : {
                        "source" : "Se7en",
                        "target" : "PulpFiction",
                        "weight" : "7"
                     }
                  },
                  {
                     "data" : {
                        "source" : "Se7en",
                        "target" : "SavingPrivateRyan",
                        "weight" : "7"
                     }
                  },
                  {
                     "data" : {
                        "source" : "Se7en",
                        "target" : "Schindler'sList",
                        "weight" : "10"
                     }
                  },
                  {
                     "data" : {
                        "source" : "Se7en",
                        "target" : "SpiritedAway",
                        "weight" : "12"
                     }
                  },
                  {
                     "data" : {
                        "source" : "Se7en",
                        "target" : "StarWars:EpisodeV-TheEmpireStrikesBack",
                        "weight" : "12"
                     }
                  },
                  {
                     "data" : {
                        "source" : "Se7en",
                        "target" : "TheDarkKnight",
                        "weight" : "8"
                     }
                  },
                  {
                     "data" : {
                        "source" : "Se7en",
                        "target" : "TheGodfather",
                        "weight" : "7"
                     }
                  },
                  {
                     "data" : {
                        "source" : "Se7en",
                        "target" : "TheGreenMile",
                        "weight" : "6"
                     }
                  },
                  {
                     "data" : {
                        "source" : "Se7en",
                        "target" : "TheLordoftheRings:TheFellowshipoftheRing",
                        "weight" : "12"
                     }
                  },
                  {
                     "data" : {
                        "source" : "Se7en",
                        "target" : "TheLordoftheRings:TheReturnoftheKing",
                        "weight" : "12"
                     }
                  },
                  {
                     "data" : {
                        "source" : "Se7en",
                        "target" : "TheMatrix",
                        "weight" : "11"
                     }
                  },
                  {
                     "data" : {
                        "source" : "Se7en",
                        "target" : "ThePianist",
                        "weight" : "12"
                     }
                  },
                  {
                     "data" : {
                        "source" : "Se7en",
                        "target" : "TheShawshankRedemption",
                        "weight" : "8"
                     }
                  },
                  {
                     "data" : {
                        "source" : "Se7en",
                        "target" : "TheSilenceoftheLambs",
                        "weight" : "6"
                     }
                  },
                  {
                     "data" : {
                        "source" : "Se7en",
                        "target" : "TheUsualSuspects",
                        "weight" : "6"
                     }
                  },
                  {
                     "data" : {
                        "source" : "SpiritedAway",
                        "target" : "Casablanca",
                        "weight" : "14"
                     }
                  },
                  {
                     "data" : {
                        "source" : "SpiritedAway",
                        "target" : "CityofGod",
                        "weight" : "11"
                     }
                  },
                  {
                     "data" : {
                        "source" : "SpiritedAway",
                        "target" : "FightClub",
                        "weight" : "12"
                     }
                  },
                  {
                     "data" : {
                        "source" : "SpiritedAway",
                        "target" : "ForrestGump",
                        "weight" : "13"
                     }
                  },
                  {
                     "data" : {
                        "source" : "SpiritedAway",
                        "target" : "Gladiator",
                        "weight" : "12"
                     }
                  },
                  {
                     "data" : {
                        "source" : "SpiritedAway",
                        "target" : "Goodfellas",
                        "weight" : "14"
                     }
                  },
                  {
                     "data" : {
                        "source" : "SpiritedAway",
                        "target" : "Inception",
                        "weight" : "12"
                     }
                  },
                  {
                     "data" : {
                        "source" : "SpiritedAway",
                        "target" : "Interstellar",
                        "weight" : "10"
                     }
                  },
                  {
                     "data" : {
                        "source" : "SpiritedAway",
                        "target" : "LifeisBeautiful",
                        "weight" : "12"
                     }
                  },
                  {
                     "data" : {
                        "source" : "SpiritedAway",
                        "target" : "PulpFiction",
                        "weight" : "13"
                     }
                  },
                  {
                     "data" : {
                        "source" : "SpiritedAway",
                        "target" : "SavingPrivateRyan",
                        "weight" : "11"
                     }
                  },
                  {
                     "data" : {
                        "source" : "SpiritedAway",
                        "target" : "Schindler'sList",
                        "weight" : "14"
                     }
                  },
                  {
                     "data" : {
                        "source" : "SpiritedAway",
                        "target" : "Se7en",
                        "weight" : "12"
                     }
                  },
                  {
                     "data" : {
                        "source" : "SpiritedAway",
                        "target" : "StarWars:EpisodeV-TheEmpireStrikesBack",
                        "weight" : "12"
                     }
                  },
                  {
                     "data" : {
                        "source" : "SpiritedAway",
                        "target" : "TheDarkKnight",
                        "weight" : "14"
                     }
                  },
                  {
                     "data" : {
                        "source" : "SpiritedAway",
                        "target" : "TheGodfather",
                        "weight" : "13"
                     }
                  },
                  {
                     "data" : {
                        "source" : "SpiritedAway",
                        "target" : "TheGreenMile",
                        "weight" : "12"
                     }
                  },
                  {
                     "data" : {
                        "source" : "SpiritedAway",
                        "target" : "TheLordoftheRings:TheFellowshipoftheRing",
                        "weight" : "10"
                     }
                  },
                  {
                     "data" : {
                        "source" : "SpiritedAway",
                        "target" : "TheLordoftheRings:TheReturnoftheKing",
                        "weight" : "12"
                     }
                  },
                  {
                     "data" : {
                        "source" : "SpiritedAway",
                        "target" : "TheMatrix",
                        "weight" : "13"
                     }
                  },
                  {
                     "data" : {
                        "source" : "SpiritedAway",
                        "target" : "ThePianist",
                        "weight" : "14"
                     }
                  },
                  {
                     "data" : {
                        "source" : "SpiritedAway",
                        "target" : "TheShawshankRedemption",
                        "weight" : "12"
                     }
                  },
                  {
                     "data" : {
                        "source" : "SpiritedAway",
                        "target" : "TheSilenceoftheLambs",
                        "weight" : "12"
                     }
                  },
                  {
                     "data" : {
                        "source" : "SpiritedAway",
                        "target" : "TheUsualSuspects",
                        "weight" : "14"
                     }
                  },
                  {
                     "data" : {
                        "source" : "StarWars:EpisodeV-TheEmpireStrikesBack",
                        "target" : "Casablanca",
                        "weight" : "12"
                     }
                  },
                  {
                     "data" : {
                        "source" : "StarWars:EpisodeV-TheEmpireStrikesBack",
                        "target" : "CityofGod",
                        "weight" : "13"
                     }
                  },
                  {
                     "data" : {
                        "source" : "StarWars:EpisodeV-TheEmpireStrikesBack",
                        "target" : "FightClub",
                        "weight" : "10"
                     }
                  },
                  {
                     "data" : {
                        "source" : "StarWars:EpisodeV-TheEmpireStrikesBack",
                        "target" : "ForrestGump",
                        "weight" : "11"
                     }
                  },
                  {
                     "data" : {
                        "source" : "StarWars:EpisodeV-TheEmpireStrikesBack",
                        "target" : "Gladiator",
                        "weight" : "8"
                     }
                  },
                  {
                     "data" : {
                        "source" : "StarWars:EpisodeV-TheEmpireStrikesBack",
                        "target" : "Goodfellas",
                        "weight" : "10"
                     }
                  },
                  {
                     "data" : {
                        "source" : "StarWars:EpisodeV-TheEmpireStrikesBack",
                        "target" : "Inception",
                        "weight" : "8"
                     }
                  },
                  {
                     "data" : {
                        "source" : "StarWars:EpisodeV-TheEmpireStrikesBack",
                        "target" : "Interstellar",
                        "weight" : "10"
                     }
                  },
                  {
                     "data" : {
                        "source" : "StarWars:EpisodeV-TheEmpireStrikesBack",
                        "target" : "LifeisBeautiful",
                        "weight" : "14"
                     }
                  },
                  {
                     "data" : {
                        "source" : "StarWars:EpisodeV-TheEmpireStrikesBack",
                        "target" : "PulpFiction",
                        "weight" : "11"
                     }
                  },
                  {
                     "data" : {
                        "source" : "StarWars:EpisodeV-TheEmpireStrikesBack",
                        "target" : "SavingPrivateRyan",
                        "weight" : "11"
                     }
                  },
                  {
                     "data" : {
                        "source" : "StarWars:EpisodeV-TheEmpireStrikesBack",
                        "target" : "Schindler'sList",
                        "weight" : "12"
                     }
                  },
                  {
                     "data" : {
                        "source" : "StarWars:EpisodeV-TheEmpireStrikesBack",
                        "target" : "Se7en",
                        "weight" : "12"
                     }
                  },
                  {
                     "data" : {
                        "source" : "StarWars:EpisodeV-TheEmpireStrikesBack",
                        "target" : "SpiritedAway",
                        "weight" : "12"
                     }
                  },
                  {
                     "data" : {
                        "source" : "StarWars:EpisodeV-TheEmpireStrikesBack",
                        "target" : "TheDarkKnight",
                        "weight" : "10"
                     }
                  },
                  {
                     "data" : {
                        "source" : "StarWars:EpisodeV-TheEmpireStrikesBack",
                        "target" : "TheGodfather",
                        "weight" : "11"
                     }
                  },
                  {
                     "data" : {
                        "source" : "StarWars:EpisodeV-TheEmpireStrikesBack",
                        "target" : "TheGreenMile",
                        "weight" : "10"
                     }
                  },
                  {
                     "data" : {
                        "source" : "StarWars:EpisodeV-TheEmpireStrikesBack",
                        "target" : "TheLordoftheRings:TheFellowshipoftheRing",
                        "weight" : "10"
                     }
                  },
                  {
                     "data" : {
                        "source" : "StarWars:EpisodeV-TheEmpireStrikesBack",
                        "target" : "TheLordoftheRings:TheReturnoftheKing",
                        "weight" : "10"
                     }
                  },
                  {
                     "data" : {
                        "source" : "StarWars:EpisodeV-TheEmpireStrikesBack",
                        "target" : "TheMatrix",
                        "weight" : "7"
                     }
                  },
                  {
                     "data" : {
                        "source" : "StarWars:EpisodeV-TheEmpireStrikesBack",
                        "target" : "ThePianist",
                        "weight" : "14"
                     }
                  },
                  {
                     "data" : {
                        "source" : "StarWars:EpisodeV-TheEmpireStrikesBack",
                        "target" : "TheShawshankRedemption",
                        "weight" : "10"
                     }
                  },
                  {
                     "data" : {
                        "source" : "StarWars:EpisodeV-TheEmpireStrikesBack",
                        "target" : "TheSilenceoftheLambs",
                        "weight" : "12"
                     }
                  },
                  {
                     "data" : {
                        "source" : "StarWars:EpisodeV-TheEmpireStrikesBack",
                        "target" : "TheUsualSuspects",
                        "weight" : "12"
                     }
                  },
                  {
                     "data" : {
                        "source" : "TheDarkKnight",
                        "target" : "Casablanca",
                        "weight" : "10"
                     }
                  },
                  {
                     "data" : {
                        "source" : "TheDarkKnight",
                        "target" : "CityofGod",
                        "weight" : "9"
                     }
                  },
                  {
                     "data" : {
                        "source" : "TheDarkKnight",
                        "target" : "FightClub",
                        "weight" : "8"
                     }
                  },
                  {
                     "data" : {
                        "source" : "TheDarkKnight",
                        "target" : "ForrestGump",
                        "weight" : "9"
                     }
                  },
                  {
                     "data" : {
                        "source" : "TheDarkKnight",
                        "target" : "Gladiator",
                        "weight" : "8"
                     }
                  },
                  {
                     "data" : {
                        "source" : "TheDarkKnight",
                        "target" : "Goodfellas",
                        "weight" : "8"
                     }
                  },
                  {
                     "data" : {
                        "source" : "TheDarkKnight",
                        "target" : "Inception",
                        "weight" : "10"
                     }
                  },
                  {
                     "data" : {
                        "source" : "TheDarkKnight",
                        "target" : "Interstellar",
                        "weight" : "10"
                     }
                  },
                  {
                     "data" : {
                        "source" : "TheDarkKnight",
                        "target" : "LifeisBeautiful",
                        "weight" : "12"
                     }
                  },
                  {
                     "data" : {
                        "source" : "TheDarkKnight",
                        "target" : "PulpFiction",
                        "weight" : "7"
                     }
                  },
                  {
                     "data" : {
                        "source" : "TheDarkKnight",
                        "target" : "SavingPrivateRyan",
                        "weight" : "9"
                     }
                  },
                  {
                     "data" : {
                        "source" : "TheDarkKnight",
                        "target" : "Schindler'sList",
                        "weight" : "10"
                     }
                  },
                  {
                     "data" : {
                        "source" : "TheDarkKnight",
                        "target" : "Se7en",
                        "weight" : "8"
                     }
                  },
                  {
                     "data" : {
                        "source" : "TheDarkKnight",
                        "target" : "SpiritedAway",
                        "weight" : "14"
                     }
                  },
                  {
                     "data" : {
                        "source" : "TheDarkKnight",
                        "target" : "StarWars:EpisodeV-TheEmpireStrikesBack",
                        "weight" : "10"
                     }
                  },
                  {
                     "data" : {
                        "source" : "TheDarkKnight",
                        "target" : "TheGodfather",
                        "weight" : "7"
                     }
                  },
                  {
                     "data" : {
                        "source" : "TheDarkKnight",
                        "target" : "TheGreenMile",
                        "weight" : "8"
                     }
                  },
                  {
                     "data" : {
                        "source" : "TheDarkKnight",
                        "target" : "TheLordoftheRings:TheFellowshipoftheRing",
                        "weight" : "12"
                     }
                  },
                  {
                     "data" : {
                        "source" : "TheDarkKnight",
                        "target" : "TheLordoftheRings:TheReturnoftheKing",
                        "weight" : "12"
                     }
                  },
                  {
                     "data" : {
                        "source" : "TheDarkKnight",
                        "target" : "TheMatrix",
                        "weight" : "9"
                     }
                  },
                  {
                     "data" : {
                        "source" : "TheDarkKnight",
                        "target" : "ThePianist",
                        "weight" : "12"
                     }
                  },
                  {
                     "data" : {
                        "source" : "TheDarkKnight",
                        "target" : "TheShawshankRedemption",
                        "weight" : "8"
                     }
                  },
                  {
                     "data" : {
                        "source" : "TheDarkKnight",
                        "target" : "TheSilenceoftheLambs",
                        "weight" : "8"
                     }
                  },
                  {
                     "data" : {
                        "source" : "TheDarkKnight",
                        "target" : "TheUsualSuspects",
                        "weight" : "10"
                     }
                  },
                  {
                     "data" : {
                        "source" : "TheGodfather",
                        "target" : "Casablanca",
                        "weight" : "9"
                     }
                  },
                  {
                     "data" : {
                        "source" : "TheGodfather",
                        "target" : "CityofGod",
                        "weight" : "8"
                     }
                  },
                  {
                     "data" : {
                        "source" : "TheGodfather",
                        "target" : "FightClub",
                        "weight" : "7"
                     }
                  },
                  {
                     "data" : {
                        "source" : "TheGodfather",
                        "target" : "ForrestGump",
                        "weight" : "8"
                     }
                  },
                  {
                     "data" : {
                        "source" : "TheGodfather",
                        "target" : "Gladiator",
                        "weight" : "9"
                     }
                  },
                  {
                     "data" : {
                        "source" : "TheGodfather",
                        "target" : "Goodfellas",
                        "weight" : "7"
                     }
                  },
                  {
                     "data" : {
                        "source" : "TheGodfather",
                        "target" : "Inception",
                        "weight" : "11"
                     }
                  },
                  {
                     "data" : {
                        "source" : "TheGodfather",
                        "target" : "Interstellar",
                        "weight" : "9"
                     }
                  },
                  {
                     "data" : {
                        "source" : "TheGodfather",
                        "target" : "LifeisBeautiful",
                        "weight" : "11"
                     }
                  },
                  {
                     "data" : {
                        "source" : "TheGodfather",
                        "target" : "PulpFiction",
                        "weight" : "6"
                     }
                  },
                  {
                     "data" : {
                        "source" : "TheGodfather",
                        "target" : "SavingPrivateRyan",
                        "weight" : "8"
                     }
                  },
                  {
                     "data" : {
                        "source" : "TheGodfather",
                        "target" : "Schindler'sList",
                        "weight" : "9"
                     }
                  },
                  {
                     "data" : {
                        "source" : "TheGodfather",
                        "target" : "Se7en",
                        "weight" : "7"
                     }
                  },
                  {
                     "data" : {
                        "source" : "TheGodfather",
                        "target" : "SpiritedAway",
                        "weight" : "13"
                     }
                  },
                  {
                     "data" : {
                        "source" : "TheGodfather",
                        "target" : "StarWars:EpisodeV-TheEmpireStrikesBack",
                        "weight" : "11"
                     }
                  },
                  {
                     "data" : {
                        "source" : "TheGodfather",
                        "target" : "TheDarkKnight",
                        "weight" : "7"
                     }
                  },
                  {
                     "data" : {
                        "source" : "TheGodfather",
                        "target" : "TheGreenMile",
                        "weight" : "7"
                     }
                  },
                  {
                     "data" : {
                        "source" : "TheGodfather",
                        "target" : "TheLordoftheRings:TheFellowshipoftheRing",
                        "weight" : "11"
                     }
                  },
                  {
                     "data" : {
                        "source" : "TheGodfather",
                        "target" : "TheLordoftheRings:TheReturnoftheKing",
                        "weight" : "11"
                     }
                  },
                  {
                     "data" : {
                        "source" : "TheGodfather",
                        "target" : "TheMatrix",
                        "weight" : "10"
                     }
                  },
                  {
                     "data" : {
                        "source" : "TheGodfather",
                        "target" : "ThePianist",
                        "weight" : "11"
                     }
                  },
                  {
                     "data" : {
                        "source" : "TheGodfather",
                        "target" : "TheShawshankRedemption",
                        "weight" : "7"
                     }
                  },
                  {
                     "data" : {
                        "source" : "TheGodfather",
                        "target" : "TheSilenceoftheLambs",
                        "weight" : "7"
                     }
                  },
                  {
                     "data" : {
                        "source" : "TheGodfather",
                        "target" : "TheUsualSuspects",
                        "weight" : "9"
                     }
                  },
                  {
                     "data" : {
                        "source" : "TheGreenMile",
                        "target" : "Casablanca",
                        "weight" : "10"
                     }
                  },
                  {
                     "data" : {
                        "source" : "TheGreenMile",
                        "target" : "CityofGod",
                        "weight" : "7"
                     }
                  },
                  {
                     "data" : {
                        "source" : "TheGreenMile",
                        "target" : "FightClub",
                        "weight" : "6"
                     }
                  },
                  {
                     "data" : {
                        "source" : "TheGreenMile",
                        "target" : "ForrestGump",
                        "weight" : "9"
                     }
                  },
                  {
                     "data" : {
                        "source" : "TheGreenMile",
                        "target" : "Gladiator",
                        "weight" : "10"
                     }
                  },
                  {
                     "data" : {
                        "source" : "TheGreenMile",
                        "target" : "Goodfellas",
                        "weight" : "8"
                     }
                  },
                  {
                     "data" : {
                        "source" : "TheGreenMile",
                        "target" : "Inception",
                        "weight" : "12"
                     }
                  },
                  {
                     "data" : {
                        "source" : "TheGreenMile",
                        "target" : "Interstellar",
                        "weight" : "8"
                     }
                  },
                  {
                     "data" : {
                        "source" : "TheGreenMile",
                        "target" : "LifeisBeautiful",
                        "weight" : "10"
                     }
                  },
                  {
                     "data" : {
                        "source" : "TheGreenMile",
                        "target" : "PulpFiction",
                        "weight" : "7"
                     }
                  },
                  {
                     "data" : {
                        "source" : "TheGreenMile",
                        "target" : "SavingPrivateRyan",
                        "weight" : "7"
                     }
                  },
                  {
                     "data" : {
                        "source" : "TheGreenMile",
                        "target" : "Schindler'sList",
                        "weight" : "10"
                     }
                  },
                  {
                     "data" : {
                        "source" : "TheGreenMile",
                        "target" : "Se7en",
                        "weight" : "6"
                     }
                  },
                  {
                     "data" : {
                        "source" : "TheGreenMile",
                        "target" : "SpiritedAway",
                        "weight" : "12"
                     }
                  },
                  {
                     "data" : {
                        "source" : "TheGreenMile",
                        "target" : "StarWars:EpisodeV-TheEmpireStrikesBack",
                        "weight" : "10"
                     }
                  },
                  {
                     "data" : {
                        "source" : "TheGreenMile",
                        "target" : "TheDarkKnight",
                        "weight" : "8"
                     }
                  },
                  {
                     "data" : {
                        "source" : "TheGreenMile",
                        "target" : "TheGodfather",
                        "weight" : "7"
                     }
                  },
                  {
                     "data" : {
                        "source" : "TheGreenMile",
                        "target" : "TheLordoftheRings:TheFellowshipoftheRing",
                        "weight" : "10"
                     }
                  },
                  {
                     "data" : {
                        "source" : "TheGreenMile",
                        "target" : "TheLordoftheRings:TheReturnoftheKing",
                        "weight" : "10"
                     }
                  },
                  {
                     "data" : {
                        "source" : "TheGreenMile",
                        "target" : "TheMatrix",
                        "weight" : "9"
                     }
                  },
                  {
                     "data" : {
                        "source" : "TheGreenMile",
                        "target" : "ThePianist",
                        "weight" : "12"
                     }
                  },
                  {
                     "data" : {
                        "source" : "TheGreenMile",
                        "target" : "TheShawshankRedemption",
                        "weight" : "8"
                     }
                  },
                  {
                     "data" : {
                        "source" : "TheGreenMile",
                        "target" : "TheSilenceoftheLambs",
                        "weight" : "6"
                     }
                  },
                  {
                     "data" : {
                        "source" : "TheGreenMile",
                        "target" : "TheUsualSuspects",
                        "weight" : "10"
                     }
                  },
                  {
                     "data" : {
                        "source" : "TheLordoftheRings:TheFellowshipoftheRing",
                        "target" : "Casablanca",
                        "weight" : "12"
                     }
                  },
                  {
                     "data" : {
                        "source" : "TheLordoftheRings:TheFellowshipoftheRing",
                        "target" : "CityofGod",
                        "weight" : "11"
                     }
                  },
                  {
                     "data" : {
                        "source" : "TheLordoftheRings:TheFellowshipoftheRing",
                        "target" : "FightClub",
                        "weight" : "8"
                     }
                  },
                  {
                     "data" : {
                        "source" : "TheLordoftheRings:TheFellowshipoftheRing",
                        "target" : "ForrestGump",
                        "weight" : "9"
                     }
                  },
                  {
                     "data" : {
                        "source" : "TheLordoftheRings:TheFellowshipoftheRing",
                        "target" : "Gladiator",
                        "weight" : "10"
                     }
                  },
                  {
                     "data" : {
                        "source" : "TheLordoftheRings:TheFellowshipoftheRing",
                        "target" : "Goodfellas",
                        "weight" : "12"
                     }
                  },
                  {
                     "data" : {
                        "source" : "TheLordoftheRings:TheFellowshipoftheRing",
                        "target" : "Inception",
                        "weight" : "10"
                     }
                  },
                  {
                     "data" : {
                        "source" : "TheLordoftheRings:TheFellowshipoftheRing",
                        "target" : "Interstellar",
                        "weight" : "10"
                     }
                  },
                  {
                     "data" : {
                        "source" : "TheLordoftheRings:TheFellowshipoftheRing",
                        "target" : "LifeisBeautiful",
                        "weight" : "12"
                     }
                  },
                  {
                     "data" : {
                        "source" : "TheLordoftheRings:TheFellowshipoftheRing",
                        "target" : "PulpFiction",
                        "weight" : "11"
                     }
                  },
                  {
                     "data" : {
                        "source" : "TheLordoftheRings:TheFellowshipoftheRing",
                        "target" : "SavingPrivateRyan",
                        "weight" : "11"
                     }
                  },
                  {
                     "data" : {
                        "source" : "TheLordoftheRings:TheFellowshipoftheRing",
                        "target" : "Schindler'sList",
                        "weight" : "12"
                     }
                  },
                  {
                     "data" : {
                        "source" : "TheLordoftheRings:TheFellowshipoftheRing",
                        "target" : "Se7en",
                        "weight" : "12"
                     }
                  },
                  {
                     "data" : {
                        "source" : "TheLordoftheRings:TheFellowshipoftheRing",
                        "target" : "SpiritedAway",
                        "weight" : "10"
                     }
                  },
                  {
                     "data" : {
                        "source" : "TheLordoftheRings:TheFellowshipoftheRing",
                        "target" : "StarWars:EpisodeV-TheEmpireStrikesBack",
                        "weight" : "10"
                     }
                  },
                  {
                     "data" : {
                        "source" : "TheLordoftheRings:TheFellowshipoftheRing",
                        "target" : "TheDarkKnight",
                        "weight" : "12"
                     }
                  },
                  {
                     "data" : {
                        "source" : "TheLordoftheRings:TheFellowshipoftheRing",
                        "target" : "TheGodfather",
                        "weight" : "11"
                     }
                  },
                  {
                     "data" : {
                        "source" : "TheLordoftheRings:TheFellowshipoftheRing",
                        "target" : "TheGreenMile",
                        "weight" : "10"
                     }
                  },
                  {
                     "data" : {
                        "source" : "TheLordoftheRings:TheFellowshipoftheRing",
                        "target" : "TheLordoftheRings:TheReturnoftheKing",
                        "weight" : "6"
                     }
                  },
                  {
                     "data" : {
                        "source" : "TheLordoftheRings:TheFellowshipoftheRing",
                        "target" : "TheMatrix",
                        "weight" : "13"
                     }
                  },
                  {
                     "data" : {
                        "source" : "TheLordoftheRings:TheFellowshipoftheRing",
                        "target" : "ThePianist",
                        "weight" : "12"
                     }
                  },
                  {
                     "data" : {
                        "source" : "TheLordoftheRings:TheFellowshipoftheRing",
                        "target" : "TheShawshankRedemption",
                        "weight" : "10"
                     }
                  },
                  {
                     "data" : {
                        "source" : "TheLordoftheRings:TheFellowshipoftheRing",
                        "target" : "TheSilenceoftheLambs",
                        "weight" : "12"
                     }
                  },
                  {
                     "data" : {
                        "source" : "TheLordoftheRings:TheFellowshipoftheRing",
                        "target" : "TheUsualSuspects",
                        "weight" : "14"
                     }
                  },
                  {
                     "data" : {
                        "source" : "TheLordoftheRings:TheReturnoftheKing",
                        "target" : "Casablanca",
                        "weight" : "12"
                     }
                  },
                  {
                     "data" : {
                        "source" : "TheLordoftheRings:TheReturnoftheKing",
                        "target" : "CityofGod",
                        "weight" : "11"
                     }
                  },
                  {
                     "data" : {
                        "source" : "TheLordoftheRings:TheReturnoftheKing",
                        "target" : "FightClub",
                        "weight" : "10"
                     }
                  },
                  {
                     "data" : {
                        "source" : "TheLordoftheRings:TheReturnoftheKing",
                        "target" : "ForrestGump",
                        "weight" : "11"
                     }
                  },
                  {
                     "data" : {
                        "source" : "TheLordoftheRings:TheReturnoftheKing",
                        "target" : "Gladiator",
                        "weight" : "10"
                     }
                  },
                  {
                     "data" : {
                        "source" : "TheLordoftheRings:TheReturnoftheKing",
                        "target" : "Goodfellas",
                        "weight" : "12"
                     }
                  },
                  {
                     "data" : {
                        "source" : "TheLordoftheRings:TheReturnoftheKing",
                        "target" : "Inception",
                        "weight" : "12"
                     }
                  },
                  {
                     "data" : {
                        "source" : "TheLordoftheRings:TheReturnoftheKing",
                        "target" : "Interstellar",
                        "weight" : "10"
                     }
                  },
                  {
                     "data" : {
                        "source" : "TheLordoftheRings:TheReturnoftheKing",
                        "target" : "LifeisBeautiful",
                        "weight" : "12"
                     }
                  },
                  {
                     "data" : {
                        "source" : "TheLordoftheRings:TheReturnoftheKing",
                        "target" : "PulpFiction",
                        "weight" : "9"
                     }
                  },
                  {
                     "data" : {
                        "source" : "TheLordoftheRings:TheReturnoftheKing",
                        "target" : "SavingPrivateRyan",
                        "weight" : "11"
                     }
                  },
                  {
                     "data" : {
                        "source" : "TheLordoftheRings:TheReturnoftheKing",
                        "target" : "Schindler'sList",
                        "weight" : "10"
                     }
                  },
                  {
                     "data" : {
                        "source" : "TheLordoftheRings:TheReturnoftheKing",
                        "target" : "Se7en",
                        "weight" : "12"
                     }
                  },
                  {
                     "data" : {
                        "source" : "TheLordoftheRings:TheReturnoftheKing",
                        "target" : "SpiritedAway",
                        "weight" : "12"
                     }
                  },
                  {
                     "data" : {
                        "source" : "TheLordoftheRings:TheReturnoftheKing",
                        "target" : "StarWars:EpisodeV-TheEmpireStrikesBack",
                        "weight" : "10"
                     }
                  },
                  {
                     "data" : {
                        "source" : "TheLordoftheRings:TheReturnoftheKing",
                        "target" : "TheDarkKnight",
                        "weight" : "12"
                     }
                  },
                  {
                     "data" : {
                        "source" : "TheLordoftheRings:TheReturnoftheKing",
                        "target" : "TheGodfather",
                        "weight" : "11"
                     }
                  },
                  {
                     "data" : {
                        "source" : "TheLordoftheRings:TheReturnoftheKing",
                        "target" : "TheGreenMile",
                        "weight" : "10"
                     }
                  },
                  {
                     "data" : {
                        "source" : "TheLordoftheRings:TheReturnoftheKing",
                        "target" : "TheLordoftheRings:TheFellowshipoftheRing",
                        "weight" : "6"
                     }
                  },
                  {
                     "data" : {
                        "source" : "TheLordoftheRings:TheReturnoftheKing",
                        "target" : "TheMatrix",
                        "weight" : "13"
                     }
                  },
                  {
                     "data" : {
                        "source" : "TheLordoftheRings:TheReturnoftheKing",
                        "target" : "ThePianist",
                        "weight" : "12"
                     }
                  },
                  {
                     "data" : {
                        "source" : "TheLordoftheRings:TheReturnoftheKing",
                        "target" : "TheShawshankRedemption",
                        "weight" : "10"
                     }
                  },
                  {
                     "data" : {
                        "source" : "TheLordoftheRings:TheReturnoftheKing",
                        "target" : "TheSilenceoftheLambs",
                        "weight" : "12"
                     }
                  },
                  {
                     "data" : {
                        "source" : "TheLordoftheRings:TheReturnoftheKing",
                        "target" : "TheUsualSuspects",
                        "weight" : "14"
                     }
                  },
                  {
                     "data" : {
                        "source" : "TheMatrix",
                        "target" : "Casablanca",
                        "weight" : "11"
                     }
                  },
                  {
                     "data" : {
                        "source" : "TheMatrix",
                        "target" : "CityofGod",
                        "weight" : "12"
                     }
                  },
                  {
                     "data" : {
                        "source" : "TheMatrix",
                        "target" : "FightClub",
                        "weight" : "7"
                     }
                  },
                  {
                     "data" : {
                        "source" : "TheMatrix",
                        "target" : "ForrestGump",
                        "weight" : "10"
                     }
                  },
                  {
                     "data" : {
                        "source" : "TheMatrix",
                        "target" : "Gladiator",
                        "weight" : "9"
                     }
                  },
                  {
                     "data" : {
                        "source" : "TheMatrix",
                        "target" : "Goodfellas",
                        "weight" : "9"
                     }
                  },
                  {
                     "data" : {
                        "source" : "TheMatrix",
                        "target" : "Inception",
                        "weight" : "7"
                     }
                  },
                  {
                     "data" : {
                        "source" : "TheMatrix",
                        "target" : "Interstellar",
                        "weight" : "9"
                     }
                  },
                  {
                     "data" : {
                        "source" : "TheMatrix",
                        "target" : "LifeisBeautiful",
                        "weight" : "13"
                     }
                  },
                  {
                     "data" : {
                        "source" : "TheMatrix",
                        "target" : "PulpFiction",
                        "weight" : "10"
                     }
                  },
                  {
                     "data" : {
                        "source" : "TheMatrix",
                        "target" : "SavingPrivateRyan",
                        "weight" : "10"
                     }
                  },
                  {
                     "data" : {
                        "source" : "TheMatrix",
                        "target" : "Schindler'sList",
                        "weight" : "11"
                     }
                  },
                  {
                     "data" : {
                        "source" : "TheMatrix",
                        "target" : "Se7en",
                        "weight" : "11"
                     }
                  },
                  {
                     "data" : {
                        "source" : "TheMatrix",
                        "target" : "SpiritedAway",
                        "weight" : "13"
                     }
                  },
                  {
                     "data" : {
                        "source" : "TheMatrix",
                        "target" : "StarWars:EpisodeV-TheEmpireStrikesBack",
                        "weight" : "7"
                     }
                  },
                  {
                     "data" : {
                        "source" : "TheMatrix",
                        "target" : "TheDarkKnight",
                        "weight" : "9"
                     }
                  },
                  {
                     "data" : {
                        "source" : "TheMatrix",
                        "target" : "TheGodfather",
                        "weight" : "10"
                     }
                  },
                  {
                     "data" : {
                        "source" : "TheMatrix",
                        "target" : "TheGreenMile",
                        "weight" : "9"
                     }
                  },
                  {
                     "data" : {
                        "source" : "TheMatrix",
                        "target" : "TheLordoftheRings:TheFellowshipoftheRing",
                        "weight" : "13"
                     }
                  },
                  {
                     "data" : {
                        "source" : "TheMatrix",
                        "target" : "TheLordoftheRings:TheReturnoftheKing",
                        "weight" : "13"
                     }
                  },
                  {
                     "data" : {
                        "source" : "TheMatrix",
                        "target" : "ThePianist",
                        "weight" : "13"
                     }
                  },
                  {
                     "data" : {
                        "source" : "TheMatrix",
                        "target" : "TheShawshankRedemption",
                        "weight" : "9"
                     }
                  },
                  {
                     "data" : {
                        "source" : "TheMatrix",
                        "target" : "TheSilenceoftheLambs",
                        "weight" : "11"
                     }
                  },
                  {
                     "data" : {
                        "source" : "TheMatrix",
                        "target" : "TheUsualSuspects",
                        "weight" : "11"
                     }
                  },
                  {
                     "data" : {
                        "source" : "ThePianist",
                        "target" : "Casablanca",
                        "weight" : "10"
                     }
                  },
                  {
                     "data" : {
                        "source" : "ThePianist",
                        "target" : "CityofGod",
                        "weight" : "9"
                     }
                  },
                  {
                     "data" : {
                        "source" : "ThePianist",
                        "target" : "FightClub",
                        "weight" : "10"
                     }
                  },
                  {
                     "data" : {
                        "source" : "ThePianist",
                        "target" : "ForrestGump",
                        "weight" : "11"
                     }
                  },
                  {
                     "data" : {
                        "source" : "ThePianist",
                        "target" : "Gladiator",
                        "weight" : "10"
                     }
                  },
                  {
                     "data" : {
                        "source" : "ThePianist",
                        "target" : "Goodfellas",
                        "weight" : "10"
                     }
                  },
                  {
                     "data" : {
                        "source" : "ThePianist",
                        "target" : "Inception",
                        "weight" : "14"
                     }
                  },
                  {
                     "data" : {
                        "source" : "ThePianist",
                        "target" : "Interstellar",
                        "weight" : "12"
                     }
                  },
                  {
                     "data" : {
                        "source" : "ThePianist",
                        "target" : "LifeisBeautiful",
                        "weight" : "12"
                     }
                  },
                  {
                     "data" : {
                        "source" : "ThePianist",
                        "target" : "PulpFiction",
                        "weight" : "11"
                     }
                  },
                  {
                     "data" : {
                        "source" : "ThePianist",
                        "target" : "SavingPrivateRyan",
                        "weight" : "11"
                     }
                  },
                  {
                     "data" : {
                        "source" : "ThePianist",
                        "target" : "Schindler'sList",
                        "weight" : "10"
                     }
                  },
                  {
                     "data" : {
                        "source" : "ThePianist",
                        "target" : "Se7en",
                        "weight" : "12"
                     }
                  },
                  {
                     "data" : {
                        "source" : "ThePianist",
                        "target" : "SpiritedAway",
                        "weight" : "14"
                     }
                  },
                  {
                     "data" : {
                        "source" : "ThePianist",
                        "target" : "StarWars:EpisodeV-TheEmpireStrikesBack",
                        "weight" : "14"
                     }
                  },
                  {
                     "data" : {
                        "source" : "ThePianist",
                        "target" : "TheDarkKnight",
                        "weight" : "12"
                     }
                  },
                  {
                     "data" : {
                        "source" : "ThePianist",
                        "target" : "TheGodfather",
                        "weight" : "11"
                     }
                  },
                  {
                     "data" : {
                        "source" : "ThePianist",
                        "target" : "TheGreenMile",
                        "weight" : "12"
                     }
                  },
                  {
                     "data" : {
                        "source" : "ThePianist",
                        "target" : "TheLordoftheRings:TheFellowshipoftheRing",
                        "weight" : "12"
                     }
                  },
                  {
                     "data" : {
                        "source" : "ThePianist",
                        "target" : "TheLordoftheRings:TheReturnoftheKing",
                        "weight" : "12"
                     }
                  },
                  {
                     "data" : {
                        "source" : "ThePianist",
                        "target" : "TheMatrix",
                        "weight" : "13"
                     }
                  },
                  {
                     "data" : {
                        "source" : "ThePianist",
                        "target" : "TheShawshankRedemption",
                        "weight" : "10"
                     }
                  },
                  {
                     "data" : {
                        "source" : "ThePianist",
                        "target" : "TheSilenceoftheLambs",
                        "weight" : "12"
                     }
                  },
                  {
                     "data" : {
                        "source" : "ThePianist",
                        "target" : "TheUsualSuspects",
                        "weight" : "12"
                     }
                  },
                  {
                     "data" : {
                        "source" : "TheShawshankRedemption",
                        "target" : "Casablanca",
                        "weight" : "8"
                     }
                  },
                  {
                     "data" : {
                        "source" : "TheShawshankRedemption",
                        "target" : "CityofGod",
                        "weight" : "9"
                     }
                  },
                  {
                     "data" : {
                        "source" : "TheShawshankRedemption",
                        "target" : "FightClub",
                        "weight" : "6"
                     }
                  },
                  {
                     "data" : {
                        "source" : "TheShawshankRedemption",
                        "target" : "ForrestGump",
                        "weight" : "5"
                     }
                  },
                  {
                     "data" : {
                        "source" : "TheShawshankRedemption",
                        "target" : "Gladiator",
                        "weight" : "8"
                     }
                  },
                  {
                     "data" : {
                        "source" : "TheShawshankRedemption",
                        "target" : "Goodfellas",
                        "weight" : "8"
                     }
                  },
                  {
                     "data" : {
                        "source" : "TheShawshankRedemption",
                        "target" : "Inception",
                        "weight" : "10"
                     }
                  },
                  {
                     "data" : {
                        "source" : "TheShawshankRedemption",
                        "target" : "Interstellar",
                        "weight" : "8"
                     }
                  },
                  {
                     "data" : {
                        "source" : "TheShawshankRedemption",
                        "target" : "LifeisBeautiful",
                        "weight" : "10"
                     }
                  },
                  {
                     "data" : {
                        "source" : "TheShawshankRedemption",
                        "target" : "PulpFiction",
                        "weight" : "5"
                     }
                  },
                  {
                     "data" : {
                        "source" : "TheShawshankRedemption",
                        "target" : "SavingPrivateRyan",
                        "weight" : "7"
                     }
                  },
                  {
                     "data" : {
                        "source" : "TheShawshankRedemption",
                        "target" : "Schindler'sList",
                        "weight" : "8"
                     }
                  },
                  {
                     "data" : {
                        "source" : "TheShawshankRedemption",
                        "target" : "Se7en",
                        "weight" : "8"
                     }
                  },
                  {
                     "data" : {
                        "source" : "TheShawshankRedemption",
                        "target" : "SpiritedAway",
                        "weight" : "12"
                     }
                  },
                  {
                     "data" : {
                        "source" : "TheShawshankRedemption",
                        "target" : "StarWars:EpisodeV-TheEmpireStrikesBack",
                        "weight" : "10"
                     }
                  },
                  {
                     "data" : {
                        "source" : "TheShawshankRedemption",
                        "target" : "TheDarkKnight",
                        "weight" : "8"
                     }
                  },
                  {
                     "data" : {
                        "source" : "TheShawshankRedemption",
                        "target" : "TheGodfather",
                        "weight" : "7"
                     }
                  },
                  {
                     "data" : {
                        "source" : "TheShawshankRedemption",
                        "target" : "TheGreenMile",
                        "weight" : "8"
                     }
                  },
                  {
                     "data" : {
                        "source" : "TheShawshankRedemption",
                        "target" : "TheLordoftheRings:TheFellowshipoftheRing",
                        "weight" : "10"
                     }
                  },
                  {
                     "data" : {
                        "source" : "TheShawshankRedemption",
                        "target" : "TheLordoftheRings:TheReturnoftheKing",
                        "weight" : "10"
                     }
                  },
                  {
                     "data" : {
                        "source" : "TheShawshankRedemption",
                        "target" : "TheMatrix",
                        "weight" : "9"
                     }
                  },
                  {
                     "data" : {
                        "source" : "TheShawshankRedemption",
                        "target" : "ThePianist",
                        "weight" : "10"
                     }
                  },
                  {
                     "data" : {
                        "source" : "TheShawshankRedemption",
                        "target" : "TheSilenceoftheLambs",
                        "weight" : "8"
                     }
                  },
                  {
                     "data" : {
                        "source" : "TheShawshankRedemption",
                        "target" : "TheUsualSuspects",
                        "weight" : "10"
                     }
                  },
                  {
                     "data" : {
                        "source" : "TheSilenceoftheLambs",
                        "target" : "Casablanca",
                        "weight" : "10"
                     }
                  },
                  {
                     "data" : {
                        "source" : "TheSilenceoftheLambs",
                        "target" : "CityofGod",
                        "weight" : "7"
                     }
                  },
                  {
                     "data" : {
                        "source" : "TheSilenceoftheLambs",
                        "target" : "FightClub",
                        "weight" : "8"
                     }
                  },
                  {
                     "data" : {
                        "source" : "TheSilenceoftheLambs",
                        "target" : "ForrestGump",
                        "weight" : "9"
                     }
                  },
                  {
                     "data" : {
                        "source" : "TheSilenceoftheLambs",
                        "target" : "Gladiator",
                        "weight" : "10"
                     }
                  },
                  {
                     "data" : {
                        "source" : "TheSilenceoftheLambs",
                        "target" : "Goodfellas",
                        "weight" : "8"
                     }
                  },
                  {
                     "data" : {
                        "source" : "TheSilenceoftheLambs",
                        "target" : "Inception",
                        "weight" : "12"
                     }
                  },
                  {
                     "data" : {
                        "source" : "TheSilenceoftheLambs",
                        "target" : "Interstellar",
                        "weight" : "8"
                     }
                  },
                  {
                     "data" : {
                        "source" : "TheSilenceoftheLambs",
                        "target" : "LifeisBeautiful",
                        "weight" : "10"
                     }
                  },
                  {
                     "data" : {
                        "source" : "TheSilenceoftheLambs",
                        "target" : "PulpFiction",
                        "weight" : "7"
                     }
                  },
                  {
                     "data" : {
                        "source" : "TheSilenceoftheLambs",
                        "target" : "SavingPrivateRyan",
                        "weight" : "7"
                     }
                  },
                  {
                     "data" : {
                        "source" : "TheSilenceoftheLambs",
                        "target" : "Schindler'sList",
                        "weight" : "10"
                     }
                  },
                  {
                     "data" : {
                        "source" : "TheSilenceoftheLambs",
                        "target" : "Se7en",
                        "weight" : "6"
                     }
                  },
                  {
                     "data" : {
                        "source" : "TheSilenceoftheLambs",
                        "target" : "SpiritedAway",
                        "weight" : "12"
                     }
                  },
                  {
                     "data" : {
                        "source" : "TheSilenceoftheLambs",
                        "target" : "StarWars:EpisodeV-TheEmpireStrikesBack",
                        "weight" : "12"
                     }
                  },
                  {
                     "data" : {
                        "source" : "TheSilenceoftheLambs",
                        "target" : "TheDarkKnight",
                        "weight" : "8"
                     }
                  },
                  {
                     "data" : {
                        "source" : "TheSilenceoftheLambs",
                        "target" : "TheGodfather",
                        "weight" : "7"
                     }
                  },
                  {
                     "data" : {
                        "source" : "TheSilenceoftheLambs",
                        "target" : "TheGreenMile",
                        "weight" : "6"
                     }
                  },
                  {
                     "data" : {
                        "source" : "TheSilenceoftheLambs",
                        "target" : "TheLordoftheRings:TheFellowshipoftheRing",
                        "weight" : "12"
                     }
                  },
                  {
                     "data" : {
                        "source" : "TheSilenceoftheLambs",
                        "target" : "TheLordoftheRings:TheReturnoftheKing",
                        "weight" : "12"
                     }
                  },
                  {
                     "data" : {
                        "source" : "TheSilenceoftheLambs",
                        "target" : "TheMatrix",
                        "weight" : "11"
                     }
                  },
                  {
                     "data" : {
                        "source" : "TheSilenceoftheLambs",
                        "target" : "ThePianist",
                        "weight" : "12"
                     }
                  },
                  {
                     "data" : {
                        "source" : "TheSilenceoftheLambs",
                        "target" : "TheShawshankRedemption",
                        "weight" : "8"
                     }
                  },
                  {
                     "data" : {
                        "source" : "TheSilenceoftheLambs",
                        "target" : "TheUsualSuspects",
                        "weight" : "8"
                     }
                  },
                  {
                     "data" : {
                        "source" : "TheUsualSuspects",
                        "target" : "Casablanca",
                        "weight" : "10"
                     }
                  },
                  {
                     "data" : {
                        "source" : "TheUsualSuspects",
                        "target" : "CityofGod",
                        "weight" : "11"
                     }
                  },
                  {
                     "data" : {
                        "source" : "TheUsualSuspects",
                        "target" : "FightClub",
                        "weight" : "10"
                     }
                  },
                  {
                     "data" : {
                        "source" : "TheUsualSuspects",
                        "target" : "ForrestGump",
                        "weight" : "11"
                     }
                  },
                  {
                     "data" : {
                        "source" : "TheUsualSuspects",
                        "target" : "Gladiator",
                        "weight" : "10"
                     }
                  },
                  {
                     "data" : {
                        "source" : "TheUsualSuspects",
                        "target" : "Goodfellas",
                        "weight" : "10"
                     }
                  },
                  {
                     "data" : {
                        "source" : "TheUsualSuspects",
                        "target" : "Inception",
                        "weight" : "12"
                     }
                  },
                  {
                     "data" : {
                        "source" : "TheUsualSuspects",
                        "target" : "Interstellar",
                        "weight" : "12"
                     }
                  },
                  {
                     "data" : {
                        "source" : "TheUsualSuspects",
                        "target" : "LifeisBeautiful",
                        "weight" : "14"
                     }
                  },
                  {
                     "data" : {
                        "source" : "TheUsualSuspects",
                        "target" : "PulpFiction",
                        "weight" : "9"
                     }
                  },
                  {
                     "data" : {
                        "source" : "TheUsualSuspects",
                        "target" : "SavingPrivateRyan",
                        "weight" : "11"
                     }
                  },
                  {
                     "data" : {
                        "source" : "TheUsualSuspects",
                        "target" : "Schindler'sList",
                        "weight" : "12"
                     }
                  },
                  {
                     "data" : {
                        "source" : "TheUsualSuspects",
                        "target" : "Se7en",
                        "weight" : "6"
                     }
                  },
                  {
                     "data" : {
                        "source" : "TheUsualSuspects",
                        "target" : "SpiritedAway",
                        "weight" : "14"
                     }
                  },
                  {
                     "data" : {
                        "source" : "TheUsualSuspects",
                        "target" : "StarWars:EpisodeV-TheEmpireStrikesBack",
                        "weight" : "12"
                     }
                  },
                  {
                     "data" : {
                        "source" : "TheUsualSuspects",
                        "target" : "TheDarkKnight",
                        "weight" : "10"
                     }
                  },
                  {
                     "data" : {
                        "source" : "TheUsualSuspects",
                        "target" : "TheGodfather",
                        "weight" : "9"
                     }
                  },
                  {
                     "data" : {
                        "source" : "TheUsualSuspects",
                        "target" : "TheGreenMile",
                        "weight" : "10"
                     }
                  },
                  {
                     "data" : {
                        "source" : "TheUsualSuspects",
                        "target" : "TheLordoftheRings:TheFellowshipoftheRing",
                        "weight" : "14"
                     }
                  },
                  {
                     "data" : {
                        "source" : "TheUsualSuspects",
                        "target" : "TheLordoftheRings:TheReturnoftheKing",
                        "weight" : "14"
                     }
                  },
                  {
                     "data" : {
                        "source" : "TheUsualSuspects",
                        "target" : "TheMatrix",
                        "weight" : "11"
                     }
                  },
                  {
                     "data" : {
                        "source" : "TheUsualSuspects",
                        "target" : "ThePianist",
                        "weight" : "12"
                     }
                  },
                  {
                     "data" : {
                        "source" : "TheUsualSuspects",
                        "target" : "TheShawshankRedemption",
                        "weight" : "10"
                     }
                  },
                  {
                     "data" : {
                        "source" : "TheUsualSuspects",
                        "target" : "TheSilenceoftheLambs",
                        "weight" : "8"
                     }
                  }
               ],
               "nodes" : [
                  {
                     "data" : {
                        "id" : "Casablanca"
                     }
                  },
                  {
                     "data" : {
                        "id" : "CityofGod"
                     }
                  },
                  {
                     "data" : {
                        "id" : "FightClub"
                     }
                  },
                  {
                     "data" : {
                        "id" : "ForrestGump"
                     }
                  },
                  {
                     "data" : {
                        "id" : "Gladiator"
                     }
                  },
                  {
                     "data" : {
                        "id" : "Goodfellas"
                     }
                  },
                  {
                     "data" : {
                        "id" : "Inception"
                     }
                  },
                  {
                     "data" : {
                        "id" : "Interstellar"
                     }
                  },
                  {
                     "data" : {
                        "id" : "LifeisBeautiful"
                     }
                  },
                  {
                     "data" : {
                        "id" : "PulpFiction"
                     }
                  },
                  {
                     "data" : {
                        "id" : "SavingPrivateRyan"
                     }
                  },
                  {
                     "data" : {
                        "id" : "Schindler'sList"
                     }
                  },
                  {
                     "data" : {
                        "id" : "Se7en"
                     }
                  },
                  {
                     "data" : {
                        "id" : "SpiritedAway"
                     }
                  },
                  {
                     "data" : {
                        "id" : "StarWars:EpisodeV-TheEmpireStrikesBack"
                     }
                  },
                  {
                     "data" : {
                        "id" : "TheDarkKnight"
                     }
                  },
                  {
                     "data" : {
                        "id" : "TheGodfather"
                     }
                  },
                  {
                     "data" : {
                        "id" : "TheGreenMile"
                     }
                  },
                  {
                     "data" : {
                        "id" : "TheLordoftheRings:TheFellowshipoftheRing"
                     }
                  },
                  {
                     "data" : {
                        "id" : "TheLordoftheRings:TheReturnoftheKing"
                     }
                  },
                  {
                     "data" : {
                        "id" : "TheMatrix"
                     }
                  },
                  {
                     "data" : {
                        "id" : "ThePianist"
                     }
                  },
                  {
                     "data" : {
                        "id" : "TheShawshankRedemption"
                     }
                  },
                  {
                     "data" : {
                        "id" : "TheSilenceoftheLambs"
                     }
                  },
                  {
                     "data" : {
                        "id" : "TheUsualSuspects"
                     }
                  }
               ]
            }
         }
        ```         
        
    You can also get summary statistics on the graph

      
    ```bash
    pheno-ranker -r t/movies.json --cytoscape-json cytoscape.json --graph-stats graph_stats.txt --config t/movies_config.yaml
    ```

    ??? Example "See `graph_stats.txt`"
    
        ```bash
        Metric: Hamming
        Number of vertices: 25
        Number of edges: 300
        Is connected: 1
        Connected Components: 1
        Graph Diameter: Casablanca->SpiritedAway
        Average Path Length: 9.85333333333333
        Degree of vertex Casablanca: 24
        Degree of vertex CityofGod: 24
        Degree of vertex FightClub: 24
        Degree of vertex ForrestGump: 24
        Degree of vertex Gladiator: 24
        Degree of vertex Goodfellas: 24
        Degree of vertex Inception: 24
        Degree of vertex Interstellar: 24
        Degree of vertex LifeisBeautiful: 24
        Degree of vertex PulpFiction: 24
        Degree of vertex SavingPrivateRyan: 24
        Degree of vertex Schindler'sList: 24
        Degree of vertex Se7en: 24
        Degree of vertex SpiritedAway: 24
        Degree of vertex StarWars:EpisodeV-TheEmpireStrikesBack: 24
        Degree of vertex TheDarkKnight: 24
        Degree of vertex TheGodfather: 24
        Degree of vertex TheGreenMile: 24
        Degree of vertex TheLordoftheRings:TheFellowshipoftheRing: 24
        Degree of vertex TheLordoftheRings:TheReturnoftheKing: 24
        Degree of vertex TheMatrix: 24
        Degree of vertex ThePianist: 24
        Degree of vertex TheShawshankRedemption: 24
        Degree of vertex TheSilenceoftheLambs: 24
        Degree of vertex TheUsualSuspects: 24
        MST has 24 edges
        Shortest path from Casablanca to CityofGod is Casablanca->CityofGod [2] with length 11
        Shortest path from Casablanca to FightClub is Casablanca->FightClub [2] with length 8
        Shortest path from Casablanca to ForrestGump is Casablanca->ForrestGump [2] with length 7
        Shortest path from Casablanca to Gladiator is Casablanca->Gladiator [2] with length 8
        Shortest path from Casablanca to Goodfellas is Casablanca->Goodfellas [2] with length 10
        Shortest path from Casablanca to Inception is Casablanca->Inception [2] with length 12
        Shortest path from Casablanca to Interstellar is Casablanca->Interstellar [2] with length 10
        Shortest path from Casablanca to LifeisBeautiful is Casablanca->LifeisBeautiful [2] with length 10
        Shortest path from Casablanca to PulpFiction is Casablanca->PulpFiction [2] with length 9
        Shortest path from Casablanca to SavingPrivateRyan is Casablanca->SavingPrivateRyan [2] with length 7
        Shortest path from Casablanca to Schindler'sList is Casablanca->Schindler'sList [2] with length 10
        Shortest path from Casablanca to Se7en is Casablanca->Se7en [2] with length 10
        Shortest path from Casablanca to SpiritedAway is Casablanca->SpiritedAway [2] with length 14
        Shortest path from Casablanca to StarWars:EpisodeV-TheEmpireStrikesBack is Casablanca->StarWars:EpisodeV-TheEmpireStrikesBack [2] with length 12
        Shortest path from Casablanca to TheDarkKnight is Casablanca->TheDarkKnight [2] with length 10
        Shortest path from Casablanca to TheGodfather is Casablanca->TheGodfather [2] with length 9
        Shortest path from Casablanca to TheGreenMile is Casablanca->TheGreenMile [2] with length 10
        Shortest path from Casablanca to TheLordoftheRings:TheFellowshipoftheRing is Casablanca->TheLordoftheRings:TheFellowshipoftheRing [2] with length 12
        Shortest path from Casablanca to TheLordoftheRings:TheReturnoftheKing is Casablanca->TheLordoftheRings:TheReturnoftheKing [2] with length 12
        Shortest path from Casablanca to TheMatrix is Casablanca->TheMatrix [2] with length 11
        Shortest path from Casablanca to ThePianist is Casablanca->ThePianist [2] with length 10
        Shortest path from Casablanca to TheShawshankRedemption is Casablanca->TheShawshankRedemption [2] with length 8
        Shortest path from Casablanca to TheSilenceoftheLambs is Casablanca->TheSilenceoftheLambs [2] with length 10
        Shortest path from Casablanca to TheUsualSuspects is Casablanca->TheUsualSuspects [2] with length 10
        Shortest path from CityofGod to Casablanca is CityofGod->Casablanca [2] with length 11
        Shortest path from CityofGod to FightClub is CityofGod->FightClub [2] with length 9
        Shortest path from CityofGod to ForrestGump is CityofGod->ForrestGump [2] with length 10
        Shortest path from CityofGod to Gladiator is CityofGod->Gladiator [2] with length 11
        Shortest path from CityofGod to Goodfellas is CityofGod->Goodfellas [2] with length 9
        Shortest path from CityofGod to Inception is CityofGod->Inception [2] with length 13
        Shortest path from CityofGod to Interstellar is CityofGod->Interstellar [2] with length 9
        Shortest path from CityofGod to LifeisBeautiful is CityofGod->LifeisBeautiful [2] with length 9
        Shortest path from CityofGod to PulpFiction is CityofGod->PulpFiction [2] with length 8
        Shortest path from CityofGod to SavingPrivateRyan is CityofGod->SavingPrivateRyan [2] with length 8
        Shortest path from CityofGod to Schindler'sList is CityofGod->Schindler'sList [2] with length 11
        Shortest path from CityofGod to Se7en is CityofGod->Se7en [2] with length 7
        Shortest path from CityofGod to SpiritedAway is CityofGod->SpiritedAway [2] with length 11
        Shortest path from CityofGod to StarWars:EpisodeV-TheEmpireStrikesBack is CityofGod->StarWars:EpisodeV-TheEmpireStrikesBack [2] with length 13
        Shortest path from CityofGod to TheDarkKnight is CityofGod->TheDarkKnight [2] with length 9
        Shortest path from CityofGod to TheGodfather is CityofGod->TheGodfather [2] with length 8
        Shortest path from CityofGod to TheGreenMile is CityofGod->TheGreenMile [2] with length 7
        Shortest path from CityofGod to TheLordoftheRings:TheFellowshipoftheRing is CityofGod->TheLordoftheRings:TheFellowshipoftheRing [2] with length 11
        Shortest path from CityofGod to TheLordoftheRings:TheReturnoftheKing is CityofGod->TheLordoftheRings:TheReturnoftheKing [2] with length 11
        Shortest path from CityofGod to TheMatrix is CityofGod->TheMatrix [2] with length 12
        Shortest path from CityofGod to ThePianist is CityofGod->ThePianist [2] with length 9
        Shortest path from CityofGod to TheShawshankRedemption is CityofGod->TheShawshankRedemption [2] with length 9
        Shortest path from CityofGod to TheSilenceoftheLambs is CityofGod->TheSilenceoftheLambs [2] with length 7
        Shortest path from CityofGod to TheUsualSuspects is CityofGod->TheUsualSuspects [2] with length 11
        Shortest path from FightClub to Casablanca is FightClub->Casablanca [2] with length 8
        Shortest path from FightClub to CityofGod is FightClub->CityofGod [2] with length 9
        Shortest path from FightClub to ForrestGump is FightClub->ForrestGump [2] with length 5
        Shortest path from FightClub to Gladiator is FightClub->Gladiator [2] with length 8
        Shortest path from FightClub to Goodfellas is FightClub->Goodfellas [2] with length 8
        Shortest path from FightClub to Inception is FightClub->Inception [2] with length 8
        Shortest path from FightClub to Interstellar is FightClub->Interstellar [2] with length 8
        Shortest path from FightClub to LifeisBeautiful is FightClub->LifeisBeautiful [2] with length 10
        Shortest path from FightClub to PulpFiction is FightClub->PulpFiction [2] with length 7
        Shortest path from FightClub to SavingPrivateRyan is FightClub->SavingPrivateRyan [2] with length 7
        Shortest path from FightClub to Schindler'sList is FightClub->Schindler'sList [2] with length 8
        Shortest path from FightClub to Se7en is FightClub->Se7en [2] with length 8
        Shortest path from FightClub to SpiritedAway is FightClub->SpiritedAway [2] with length 12
        Shortest path from FightClub to StarWars:EpisodeV-TheEmpireStrikesBack is FightClub->StarWars:EpisodeV-TheEmpireStrikesBack [2] with length 10
        Shortest path from FightClub to TheDarkKnight is FightClub->TheDarkKnight [2] with length 8
        Shortest path from FightClub to TheGodfather is FightClub->TheGodfather [2] with length 7
        Shortest path from FightClub to TheGreenMile is FightClub->TheGreenMile [2] with length 6
        Shortest path from FightClub to TheLordoftheRings:TheFellowshipoftheRing is FightClub->TheLordoftheRings:TheFellowshipoftheRing [2] with length 8
        Shortest path from FightClub to TheLordoftheRings:TheReturnoftheKing is FightClub->TheLordoftheRings:TheReturnoftheKing [2] with length 10
        Shortest path from FightClub to TheMatrix is FightClub->TheMatrix [2] with length 7
        Shortest path from FightClub to ThePianist is FightClub->ThePianist [2] with length 10
        Shortest path from FightClub to TheShawshankRedemption is FightClub->TheShawshankRedemption [2] with length 6
        Shortest path from FightClub to TheSilenceoftheLambs is FightClub->TheSilenceoftheLambs [2] with length 8
        Shortest path from FightClub to TheUsualSuspects is FightClub->TheUsualSuspects [2] with length 10
        Shortest path from ForrestGump to Casablanca is ForrestGump->Casablanca [2] with length 7
        Shortest path from ForrestGump to CityofGod is ForrestGump->CityofGod [2] with length 10
        Shortest path from ForrestGump to FightClub is ForrestGump->FightClub [2] with length 5
        Shortest path from ForrestGump to Gladiator is ForrestGump->Gladiator [2] with length 9
        Shortest path from ForrestGump to Goodfellas is ForrestGump->Goodfellas [2] with length 9
        Shortest path from ForrestGump to Inception is ForrestGump->Inception [2] with length 9
        Shortest path from ForrestGump to Interstellar is ForrestGump->Interstellar [2] with length 9
        Shortest path from ForrestGump to LifeisBeautiful is ForrestGump->LifeisBeautiful [2] with length 9
        Shortest path from ForrestGump to PulpFiction is ForrestGump->PulpFiction [2] with length 6
        Shortest path from ForrestGump to SavingPrivateRyan is ForrestGump->SavingPrivateRyan [2] with length 8
        Shortest path from ForrestGump to Schindler'sList is ForrestGump->Schindler'sList [2] with length 9
        Shortest path from ForrestGump to Se7en is ForrestGump->Se7en [2] with length 9
        Shortest path from ForrestGump to SpiritedAway is ForrestGump->SpiritedAway [2] with length 13
        Shortest path from ForrestGump to StarWars:EpisodeV-TheEmpireStrikesBack is ForrestGump->StarWars:EpisodeV-TheEmpireStrikesBack [2] with length 11
        Shortest path from ForrestGump to TheDarkKnight is ForrestGump->TheDarkKnight [2] with length 9
        Shortest path from ForrestGump to TheGodfather is ForrestGump->TheGodfather [2] with length 8
        Shortest path from ForrestGump to TheGreenMile is ForrestGump->TheGreenMile [2] with length 9
        Shortest path from ForrestGump to TheLordoftheRings:TheFellowshipoftheRing is ForrestGump->TheLordoftheRings:TheFellowshipoftheRing [2] with length 9
        Shortest path from ForrestGump to TheLordoftheRings:TheReturnoftheKing is ForrestGump->TheLordoftheRings:TheReturnoftheKing [2] with length 11
        Shortest path from ForrestGump to TheMatrix is ForrestGump->TheMatrix [2] with length 10
        Shortest path from ForrestGump to ThePianist is ForrestGump->ThePianist [2] with length 11
        Shortest path from ForrestGump to TheShawshankRedemption is ForrestGump->TheShawshankRedemption [2] with length 5
        Shortest path from ForrestGump to TheSilenceoftheLambs is ForrestGump->TheSilenceoftheLambs [2] with length 9
        Shortest path from ForrestGump to TheUsualSuspects is ForrestGump->TheUsualSuspects [2] with length 11
        Shortest path from Gladiator to Casablanca is Gladiator->Casablanca [2] with length 8
        Shortest path from Gladiator to CityofGod is Gladiator->CityofGod [2] with length 11
        Shortest path from Gladiator to FightClub is Gladiator->FightClub [2] with length 8
        Shortest path from Gladiator to ForrestGump is Gladiator->ForrestGump [2] with length 9
        Shortest path from Gladiator to Goodfellas is Gladiator->Goodfellas [2] with length 10
        Shortest path from Gladiator to Inception is Gladiator->Inception [2] with length 8
        Shortest path from Gladiator to Interstellar is Gladiator->Interstellar [2] with length 8
        Shortest path from Gladiator to LifeisBeautiful is Gladiator->LifeisBeautiful [2] with length 12
        Shortest path from Gladiator to PulpFiction is Gladiator->PulpFiction [2] with length 9
        Shortest path from Gladiator to SavingPrivateRyan is Gladiator->SavingPrivateRyan [2] with length 9
        Shortest path from Gladiator to Schindler'sList is Gladiator->Schindler'sList [2] with length 10
        Shortest path from Gladiator to Se7en is Gladiator->Se7en [2] with length 10
        Shortest path from Gladiator to SpiritedAway is Gladiator->SpiritedAway [2] with length 12
        Shortest path from Gladiator to StarWars:EpisodeV-TheEmpireStrikesBack is Gladiator->StarWars:EpisodeV-TheEmpireStrikesBack [2] with length 8
        Shortest path from Gladiator to TheDarkKnight is Gladiator->TheDarkKnight [2] with length 8
        Shortest path from Gladiator to TheGodfather is Gladiator->TheGodfather [2] with length 9
        Shortest path from Gladiator to TheGreenMile is Gladiator->TheGreenMile [2] with length 10
        Shortest path from Gladiator to TheLordoftheRings:TheFellowshipoftheRing is Gladiator->TheLordoftheRings:TheFellowshipoftheRing [2] with length 10
        Shortest path from Gladiator to TheLordoftheRings:TheReturnoftheKing is Gladiator->TheLordoftheRings:TheReturnoftheKing [2] with length 10
        Shortest path from Gladiator to TheMatrix is Gladiator->TheMatrix [2] with length 9
        Shortest path from Gladiator to ThePianist is Gladiator->ThePianist [2] with length 10
        Shortest path from Gladiator to TheShawshankRedemption is Gladiator->TheShawshankRedemption [2] with length 8
        Shortest path from Gladiator to TheSilenceoftheLambs is Gladiator->TheSilenceoftheLambs [2] with length 10
        Shortest path from Gladiator to TheUsualSuspects is Gladiator->TheUsualSuspects [2] with length 10
        Shortest path from Goodfellas to Casablanca is Goodfellas->Casablanca [2] with length 10
        Shortest path from Goodfellas to CityofGod is Goodfellas->CityofGod [2] with length 9
        Shortest path from Goodfellas to FightClub is Goodfellas->FightClub [2] with length 8
        Shortest path from Goodfellas to ForrestGump is Goodfellas->ForrestGump [2] with length 9
        Shortest path from Goodfellas to Gladiator is Goodfellas->Gladiator [2] with length 10
        Shortest path from Goodfellas to Inception is Goodfellas->Inception [2] with length 12
        Shortest path from Goodfellas to Interstellar is Goodfellas->Interstellar [2] with length 10
        Shortest path from Goodfellas to LifeisBeautiful is Goodfellas->LifeisBeautiful [2] with length 12
        Shortest path from Goodfellas to PulpFiction is Goodfellas->PulpFiction [2] with length 7
        Shortest path from Goodfellas to SavingPrivateRyan is Goodfellas->SavingPrivateRyan [2] with length 9
        Shortest path from Goodfellas to Schindler'sList is Goodfellas->Schindler'sList [2] with length 8
        Shortest path from Goodfellas to Se7en is Goodfellas->Se7en [2] with length 8
        Shortest path from Goodfellas to SpiritedAway is Goodfellas->SpiritedAway [2] with length 14
        Shortest path from Goodfellas to StarWars:EpisodeV-TheEmpireStrikesBack is Goodfellas->StarWars:EpisodeV-TheEmpireStrikesBack [2] with length 10
        Shortest path from Goodfellas to TheDarkKnight is Goodfellas->TheDarkKnight [2] with length 8
        Shortest path from Goodfellas to TheGodfather is Goodfellas->TheGodfather [2] with length 7
        Shortest path from Goodfellas to TheGreenMile is Goodfellas->TheGreenMile [2] with length 8
        Shortest path from Goodfellas to TheLordoftheRings:TheFellowshipoftheRing is Goodfellas->TheLordoftheRings:TheFellowshipoftheRing [2] with length 12
        Shortest path from Goodfellas to TheLordoftheRings:TheReturnoftheKing is Goodfellas->TheLordoftheRings:TheReturnoftheKing [2] with length 12
        Shortest path from Goodfellas to TheMatrix is Goodfellas->TheMatrix [2] with length 9
        Shortest path from Goodfellas to ThePianist is Goodfellas->ThePianist [2] with length 10
        Shortest path from Goodfellas to TheShawshankRedemption is Goodfellas->TheShawshankRedemption [2] with length 8
        Shortest path from Goodfellas to TheSilenceoftheLambs is Goodfellas->TheSilenceoftheLambs [2] with length 8
        Shortest path from Goodfellas to TheUsualSuspects is Goodfellas->TheUsualSuspects [2] with length 10
        Shortest path from Inception to Casablanca is Inception->Casablanca [2] with length 12
        Shortest path from Inception to CityofGod is Inception->CityofGod [2] with length 13
        Shortest path from Inception to FightClub is Inception->FightClub [2] with length 8
        Shortest path from Inception to ForrestGump is Inception->ForrestGump [2] with length 9
        Shortest path from Inception to Gladiator is Inception->Gladiator [2] with length 8
        Shortest path from Inception to Goodfellas is Inception->Goodfellas [2] with length 12
        Shortest path from Inception to Interstellar is Inception->Interstellar [2] with length 8
        Shortest path from Inception to LifeisBeautiful is Inception->LifeisBeautiful [2] with length 14
        Shortest path from Inception to PulpFiction is Inception->PulpFiction [2] with length 11
        Shortest path from Inception to SavingPrivateRyan is Inception->SavingPrivateRyan [2] with length 11
        Shortest path from Inception to Schindler'sList is Inception->Schindler'sList [2] with length 12
        Shortest path from Inception to Se7en is Inception->Se7en [2] with length 12
        Shortest path from Inception to SpiritedAway is Inception->SpiritedAway [2] with length 12
        Shortest path from Inception to StarWars:EpisodeV-TheEmpireStrikesBack is Inception->StarWars:EpisodeV-TheEmpireStrikesBack [2] with length 8
        Shortest path from Inception to TheDarkKnight is Inception->TheDarkKnight [2] with length 10
        Shortest path from Inception to TheGodfather is Inception->TheGodfather [2] with length 11
        Shortest path from Inception to TheGreenMile is Inception->TheGreenMile [2] with length 12
        Shortest path from Inception to TheLordoftheRings:TheFellowshipoftheRing is Inception->TheLordoftheRings:TheFellowshipoftheRing [2] with length 10
        Shortest path from Inception to TheLordoftheRings:TheReturnoftheKing is Inception->TheLordoftheRings:TheReturnoftheKing [2] with length 12
        Shortest path from Inception to TheMatrix is Inception->TheMatrix [2] with length 7
        Shortest path from Inception to ThePianist is Inception->ThePianist [2] with length 14
        Shortest path from Inception to TheShawshankRedemption is Inception->TheShawshankRedemption [2] with length 10
        Shortest path from Inception to TheSilenceoftheLambs is Inception->TheSilenceoftheLambs [2] with length 12
        Shortest path from Inception to TheUsualSuspects is Inception->TheUsualSuspects [2] with length 12
        Shortest path from Interstellar to Casablanca is Interstellar->Casablanca [2] with length 10
        Shortest path from Interstellar to CityofGod is Interstellar->CityofGod [2] with length 9
        Shortest path from Interstellar to FightClub is Interstellar->FightClub [2] with length 8
        Shortest path from Interstellar to ForrestGump is Interstellar->ForrestGump [2] with length 9
        Shortest path from Interstellar to Gladiator is Interstellar->Gladiator [2] with length 8
        Shortest path from Interstellar to Goodfellas is Interstellar->Goodfellas [2] with length 10
        Shortest path from Interstellar to Inception is Interstellar->Inception [2] with length 8
        Shortest path from Interstellar to LifeisBeautiful is Interstellar->LifeisBeautiful [2] with length 10
        Shortest path from Interstellar to PulpFiction is Interstellar->PulpFiction [2] with length 9
        Shortest path from Interstellar to SavingPrivateRyan is Interstellar->SavingPrivateRyan [2] with length 7
        Shortest path from Interstellar to Schindler'sList is Interstellar->Schindler'sList [2] with length 10
        Shortest path from Interstellar to Se7en is Interstellar->Se7en [2] with length 8
        Shortest path from Interstellar to SpiritedAway is Interstellar->SpiritedAway [2] with length 10
        Shortest path from Interstellar to StarWars:EpisodeV-TheEmpireStrikesBack is Interstellar->StarWars:EpisodeV-TheEmpireStrikesBack [2] with length 10
        Shortest path from Interstellar to TheDarkKnight is Interstellar->TheDarkKnight [2] with length 10
        Shortest path from Interstellar to TheGodfather is Interstellar->TheGodfather [2] with length 9
        Shortest path from Interstellar to TheGreenMile is Interstellar->TheGreenMile [2] with length 8
        Shortest path from Interstellar to TheLordoftheRings:TheFellowshipoftheRing is Interstellar->TheLordoftheRings:TheFellowshipoftheRing [2] with length 10
        Shortest path from Interstellar to TheLordoftheRings:TheReturnoftheKing is Interstellar->TheLordoftheRings:TheReturnoftheKing [2] with length 10
        Shortest path from Interstellar to TheMatrix is Interstellar->TheMatrix [2] with length 9
        Shortest path from Interstellar to ThePianist is Interstellar->ThePianist [2] with length 12
        Shortest path from Interstellar to TheShawshankRedemption is Interstellar->TheShawshankRedemption [2] with length 8
        Shortest path from Interstellar to TheSilenceoftheLambs is Interstellar->TheSilenceoftheLambs [2] with length 8
        Shortest path from Interstellar to TheUsualSuspects is Interstellar->TheUsualSuspects [2] with length 12
        Shortest path from LifeisBeautiful to Casablanca is LifeisBeautiful->Casablanca [2] with length 10
        Shortest path from LifeisBeautiful to CityofGod is LifeisBeautiful->CityofGod [2] with length 9
        Shortest path from LifeisBeautiful to FightClub is LifeisBeautiful->FightClub [2] with length 10
        Shortest path from LifeisBeautiful to ForrestGump is LifeisBeautiful->ForrestGump [2] with length 9
        Shortest path from LifeisBeautiful to Gladiator is LifeisBeautiful->Gladiator [2] with length 12
        Shortest path from LifeisBeautiful to Goodfellas is LifeisBeautiful->Goodfellas [2] with length 12
        Shortest path from LifeisBeautiful to Inception is LifeisBeautiful->Inception [2] with length 14
        Shortest path from LifeisBeautiful to Interstellar is LifeisBeautiful->Interstellar [2] with length 10
        Shortest path from LifeisBeautiful to PulpFiction is LifeisBeautiful->PulpFiction [2] with length 11
        Shortest path from LifeisBeautiful to SavingPrivateRyan is LifeisBeautiful->SavingPrivateRyan [2] with length 9
        Shortest path from LifeisBeautiful to Schindler'sList is LifeisBeautiful->Schindler'sList [2] with length 12
        Shortest path from LifeisBeautiful to Se7en is LifeisBeautiful->Se7en [2] with length 10
        Shortest path from LifeisBeautiful to SpiritedAway is LifeisBeautiful->SpiritedAway [2] with length 12
        Shortest path from LifeisBeautiful to StarWars:EpisodeV-TheEmpireStrikesBack is LifeisBeautiful->StarWars:EpisodeV-TheEmpireStrikesBack [2] with length 14
        Shortest path from LifeisBeautiful to TheDarkKnight is LifeisBeautiful->TheDarkKnight [2] with length 12
        Shortest path from LifeisBeautiful to TheGodfather is LifeisBeautiful->TheGodfather [2] with length 11
        Shortest path from LifeisBeautiful to TheGreenMile is LifeisBeautiful->TheGreenMile [2] with length 10
        Shortest path from LifeisBeautiful to TheLordoftheRings:TheFellowshipoftheRing is LifeisBeautiful->TheLordoftheRings:TheFellowshipoftheRing [2] with length 12
        Shortest path from LifeisBeautiful to TheLordoftheRings:TheReturnoftheKing is LifeisBeautiful->TheLordoftheRings:TheReturnoftheKing [2] with length 12
        Shortest path from LifeisBeautiful to TheMatrix is LifeisBeautiful->TheMatrix [2] with length 13
        Shortest path from LifeisBeautiful to ThePianist is LifeisBeautiful->ThePianist [2] with length 12
        Shortest path from LifeisBeautiful to TheShawshankRedemption is LifeisBeautiful->TheShawshankRedemption [2] with length 10
        Shortest path from LifeisBeautiful to TheSilenceoftheLambs is LifeisBeautiful->TheSilenceoftheLambs [2] with length 10
        Shortest path from LifeisBeautiful to TheUsualSuspects is LifeisBeautiful->TheUsualSuspects [2] with length 14
        Shortest path from PulpFiction to Casablanca is PulpFiction->Casablanca [2] with length 9
        Shortest path from PulpFiction to CityofGod is PulpFiction->CityofGod [2] with length 8
        Shortest path from PulpFiction to FightClub is PulpFiction->FightClub [2] with length 7
        Shortest path from PulpFiction to ForrestGump is PulpFiction->ForrestGump [2] with length 6
        Shortest path from PulpFiction to Gladiator is PulpFiction->Gladiator [2] with length 9
        Shortest path from PulpFiction to Goodfellas is PulpFiction->Goodfellas [2] with length 7
        Shortest path from PulpFiction to Inception is PulpFiction->Inception [2] with length 11
        Shortest path from PulpFiction to Interstellar is PulpFiction->Interstellar [2] with length 9
        Shortest path from PulpFiction to LifeisBeautiful is PulpFiction->LifeisBeautiful [2] with length 11
        Shortest path from PulpFiction to SavingPrivateRyan is PulpFiction->SavingPrivateRyan [2] with length 8
        Shortest path from PulpFiction to Schindler'sList is PulpFiction->Schindler'sList [2] with length 7
        Shortest path from PulpFiction to Se7en is PulpFiction->Se7en [2] with length 7
        Shortest path from PulpFiction to SpiritedAway is PulpFiction->SpiritedAway [2] with length 13
        Shortest path from PulpFiction to StarWars:EpisodeV-TheEmpireStrikesBack is PulpFiction->StarWars:EpisodeV-TheEmpireStrikesBack [2] with length 11
        Shortest path from PulpFiction to TheDarkKnight is PulpFiction->TheDarkKnight [2] with length 7
        Shortest path from PulpFiction to TheGodfather is PulpFiction->TheGodfather [2] with length 6
        Shortest path from PulpFiction to TheGreenMile is PulpFiction->TheGreenMile [2] with length 7
        Shortest path from PulpFiction to TheLordoftheRings:TheFellowshipoftheRing is PulpFiction->TheLordoftheRings:TheFellowshipoftheRing [2] with length 11
        Shortest path from PulpFiction to TheLordoftheRings:TheReturnoftheKing is PulpFiction->TheLordoftheRings:TheReturnoftheKing [2] with length 9
        Shortest path from PulpFiction to TheMatrix is PulpFiction->TheMatrix [2] with length 10
        Shortest path from PulpFiction to ThePianist is PulpFiction->ThePianist [2] with length 11
        Shortest path from PulpFiction to TheShawshankRedemption is PulpFiction->TheShawshankRedemption [2] with length 5
        Shortest path from PulpFiction to TheSilenceoftheLambs is PulpFiction->TheSilenceoftheLambs [2] with length 7
        Shortest path from PulpFiction to TheUsualSuspects is PulpFiction->TheUsualSuspects [2] with length 9
        Shortest path from SavingPrivateRyan to Casablanca is SavingPrivateRyan->Casablanca [2] with length 7
        Shortest path from SavingPrivateRyan to CityofGod is SavingPrivateRyan->CityofGod [2] with length 8
        Shortest path from SavingPrivateRyan to FightClub is SavingPrivateRyan->FightClub [2] with length 7
        Shortest path from SavingPrivateRyan to ForrestGump is SavingPrivateRyan->ForrestGump [2] with length 8
        Shortest path from SavingPrivateRyan to Gladiator is SavingPrivateRyan->Gladiator [2] with length 9
        Shortest path from SavingPrivateRyan to Goodfellas is SavingPrivateRyan->Goodfellas [2] with length 9
        Shortest path from SavingPrivateRyan to Inception is SavingPrivateRyan->Inception [2] with length 11
        Shortest path from SavingPrivateRyan to Interstellar is SavingPrivateRyan->Interstellar [2] with length 7
        Shortest path from SavingPrivateRyan to LifeisBeautiful is SavingPrivateRyan->LifeisBeautiful [2] with length 9
        Shortest path from SavingPrivateRyan to PulpFiction is SavingPrivateRyan->PulpFiction [2] with length 8
        Shortest path from SavingPrivateRyan to Schindler'sList is SavingPrivateRyan->Schindler'sList [2] with length 9
        Shortest path from SavingPrivateRyan to Se7en is SavingPrivateRyan->Se7en [2] with length 7
        Shortest path from SavingPrivateRyan to SpiritedAway is SavingPrivateRyan->SpiritedAway [2] with length 11
        Shortest path from SavingPrivateRyan to StarWars:EpisodeV-TheEmpireStrikesBack is SavingPrivateRyan->StarWars:EpisodeV-TheEmpireStrikesBack [2] with length 11
        Shortest path from SavingPrivateRyan to TheDarkKnight is SavingPrivateRyan->TheDarkKnight [2] with length 9
        Shortest path from SavingPrivateRyan to TheGodfather is SavingPrivateRyan->TheGodfather [2] with length 8
        Shortest path from SavingPrivateRyan to TheGreenMile is SavingPrivateRyan->TheGreenMile [2] with length 7
        Shortest path from SavingPrivateRyan to TheLordoftheRings:TheFellowshipoftheRing is SavingPrivateRyan->TheLordoftheRings:TheFellowshipoftheRing [2] with length 11
        Shortest path from SavingPrivateRyan to TheLordoftheRings:TheReturnoftheKing is SavingPrivateRyan->TheLordoftheRings:TheReturnoftheKing [2] with length 11
        Shortest path from SavingPrivateRyan to TheMatrix is SavingPrivateRyan->TheMatrix [2] with length 10
        Shortest path from SavingPrivateRyan to ThePianist is SavingPrivateRyan->ThePianist [2] with length 11
        Shortest path from SavingPrivateRyan to TheShawshankRedemption is SavingPrivateRyan->TheShawshankRedemption [2] with length 7
        Shortest path from SavingPrivateRyan to TheSilenceoftheLambs is SavingPrivateRyan->TheSilenceoftheLambs [2] with length 7
        Shortest path from SavingPrivateRyan to TheUsualSuspects is SavingPrivateRyan->TheUsualSuspects [2] with length 11
        Shortest path from Schindler'sList to Casablanca is Schindler'sList->Casablanca [2] with length 10
        Shortest path from Schindler'sList to CityofGod is Schindler'sList->CityofGod [2] with length 11
        Shortest path from Schindler'sList to FightClub is Schindler'sList->FightClub [2] with length 8
        Shortest path from Schindler'sList to ForrestGump is Schindler'sList->ForrestGump [2] with length 9
        Shortest path from Schindler'sList to Gladiator is Schindler'sList->Gladiator [2] with length 10
        Shortest path from Schindler'sList to Goodfellas is Schindler'sList->Goodfellas [2] with length 8
        Shortest path from Schindler'sList to Inception is Schindler'sList->Inception [2] with length 12
        Shortest path from Schindler'sList to Interstellar is Schindler'sList->Interstellar [2] with length 10
        Shortest path from Schindler'sList to LifeisBeautiful is Schindler'sList->LifeisBeautiful [2] with length 12
        Shortest path from Schindler'sList to PulpFiction is Schindler'sList->PulpFiction [2] with length 7
        Shortest path from Schindler'sList to SavingPrivateRyan is Schindler'sList->SavingPrivateRyan [2] with length 9
        Shortest path from Schindler'sList to Se7en is Schindler'sList->Se7en [2] with length 10
        Shortest path from Schindler'sList to SpiritedAway is Schindler'sList->SpiritedAway [2] with length 14
        Shortest path from Schindler'sList to StarWars:EpisodeV-TheEmpireStrikesBack is Schindler'sList->StarWars:EpisodeV-TheEmpireStrikesBack [2] with length 12
        Shortest path from Schindler'sList to TheDarkKnight is Schindler'sList->TheDarkKnight [2] with length 10
        Shortest path from Schindler'sList to TheGodfather is Schindler'sList->TheGodfather [2] with length 9
        Shortest path from Schindler'sList to TheGreenMile is Schindler'sList->TheGreenMile [2] with length 10
        Shortest path from Schindler'sList to TheLordoftheRings:TheFellowshipoftheRing is Schindler'sList->TheLordoftheRings:TheFellowshipoftheRing [2] with length 12
        Shortest path from Schindler'sList to TheLordoftheRings:TheReturnoftheKing is Schindler'sList->TheLordoftheRings:TheReturnoftheKing [2] with length 10
        Shortest path from Schindler'sList to TheMatrix is Schindler'sList->TheMatrix [2] with length 11
        Shortest path from Schindler'sList to ThePianist is Schindler'sList->ThePianist [2] with length 10
        Shortest path from Schindler'sList to TheShawshankRedemption is Schindler'sList->TheShawshankRedemption [2] with length 8
        Shortest path from Schindler'sList to TheSilenceoftheLambs is Schindler'sList->TheSilenceoftheLambs [2] with length 10
        Shortest path from Schindler'sList to TheUsualSuspects is Schindler'sList->TheUsualSuspects [2] with length 12
        Shortest path from Se7en to Casablanca is Se7en->Casablanca [2] with length 10
        Shortest path from Se7en to CityofGod is Se7en->CityofGod [2] with length 7
        Shortest path from Se7en to FightClub is Se7en->FightClub [2] with length 8
        Shortest path from Se7en to ForrestGump is Se7en->ForrestGump [2] with length 9
        Shortest path from Se7en to Gladiator is Se7en->Gladiator [2] with length 10
        Shortest path from Se7en to Goodfellas is Se7en->Goodfellas [2] with length 8
        Shortest path from Se7en to Inception is Se7en->Inception [2] with length 12
        Shortest path from Se7en to Interstellar is Se7en->Interstellar [2] with length 8
        Shortest path from Se7en to LifeisBeautiful is Se7en->LifeisBeautiful [2] with length 10
        Shortest path from Se7en to PulpFiction is Se7en->PulpFiction [2] with length 7
        Shortest path from Se7en to SavingPrivateRyan is Se7en->SavingPrivateRyan [2] with length 7
        Shortest path from Se7en to Schindler'sList is Se7en->Schindler'sList [2] with length 10
        Shortest path from Se7en to SpiritedAway is Se7en->SpiritedAway [2] with length 12
        Shortest path from Se7en to StarWars:EpisodeV-TheEmpireStrikesBack is Se7en->StarWars:EpisodeV-TheEmpireStrikesBack [2] with length 12
        Shortest path from Se7en to TheDarkKnight is Se7en->TheDarkKnight [2] with length 8
        Shortest path from Se7en to TheGodfather is Se7en->TheGodfather [2] with length 7
        Shortest path from Se7en to TheGreenMile is Se7en->TheGreenMile [2] with length 6
        Shortest path from Se7en to TheLordoftheRings:TheFellowshipoftheRing is Se7en->TheLordoftheRings:TheFellowshipoftheRing [2] with length 12
        Shortest path from Se7en to TheLordoftheRings:TheReturnoftheKing is Se7en->TheLordoftheRings:TheReturnoftheKing [2] with length 12
        Shortest path from Se7en to TheMatrix is Se7en->TheMatrix [2] with length 11
        Shortest path from Se7en to ThePianist is Se7en->ThePianist [2] with length 12
        Shortest path from Se7en to TheShawshankRedemption is Se7en->TheShawshankRedemption [2] with length 8
        Shortest path from Se7en to TheSilenceoftheLambs is Se7en->TheSilenceoftheLambs [2] with length 6
        Shortest path from Se7en to TheUsualSuspects is Se7en->TheUsualSuspects [2] with length 6
        Shortest path from SpiritedAway to Casablanca is SpiritedAway->Casablanca [2] with length 14
        Shortest path from SpiritedAway to CityofGod is SpiritedAway->CityofGod [2] with length 11
        Shortest path from SpiritedAway to FightClub is SpiritedAway->FightClub [2] with length 12
        Shortest path from SpiritedAway to ForrestGump is SpiritedAway->ForrestGump [2] with length 13
        Shortest path from SpiritedAway to Gladiator is SpiritedAway->Gladiator [2] with length 12
        Shortest path from SpiritedAway to Goodfellas is SpiritedAway->Goodfellas [2] with length 14
        Shortest path from SpiritedAway to Inception is SpiritedAway->Inception [2] with length 12
        Shortest path from SpiritedAway to Interstellar is SpiritedAway->Interstellar [2] with length 10
        Shortest path from SpiritedAway to LifeisBeautiful is SpiritedAway->LifeisBeautiful [2] with length 12
        Shortest path from SpiritedAway to PulpFiction is SpiritedAway->PulpFiction [2] with length 13
        Shortest path from SpiritedAway to SavingPrivateRyan is SpiritedAway->SavingPrivateRyan [2] with length 11
        Shortest path from SpiritedAway to Schindler'sList is SpiritedAway->Schindler'sList [2] with length 14
        Shortest path from SpiritedAway to Se7en is SpiritedAway->Se7en [2] with length 12
        Shortest path from SpiritedAway to StarWars:EpisodeV-TheEmpireStrikesBack is SpiritedAway->StarWars:EpisodeV-TheEmpireStrikesBack [2] with length 12
        Shortest path from SpiritedAway to TheDarkKnight is SpiritedAway->TheDarkKnight [2] with length 14
        Shortest path from SpiritedAway to TheGodfather is SpiritedAway->TheGodfather [2] with length 13
        Shortest path from SpiritedAway to TheGreenMile is SpiritedAway->TheGreenMile [2] with length 12
        Shortest path from SpiritedAway to TheLordoftheRings:TheFellowshipoftheRing is SpiritedAway->TheLordoftheRings:TheFellowshipoftheRing [2] with length 10
        Shortest path from SpiritedAway to TheLordoftheRings:TheReturnoftheKing is SpiritedAway->TheLordoftheRings:TheReturnoftheKing [2] with length 12
        Shortest path from SpiritedAway to TheMatrix is SpiritedAway->TheMatrix [2] with length 13
        Shortest path from SpiritedAway to ThePianist is SpiritedAway->ThePianist [2] with length 14
        Shortest path from SpiritedAway to TheShawshankRedemption is SpiritedAway->TheShawshankRedemption [2] with length 12
        Shortest path from SpiritedAway to TheSilenceoftheLambs is SpiritedAway->TheSilenceoftheLambs [2] with length 12
        Shortest path from SpiritedAway to TheUsualSuspects is SpiritedAway->TheUsualSuspects [2] with length 14
        Shortest path from StarWars:EpisodeV-TheEmpireStrikesBack to Casablanca is StarWars:EpisodeV-TheEmpireStrikesBack->Casablanca [2] with length 12
        Shortest path from StarWars:EpisodeV-TheEmpireStrikesBack to CityofGod is StarWars:EpisodeV-TheEmpireStrikesBack->CityofGod [2] with length 13
        Shortest path from StarWars:EpisodeV-TheEmpireStrikesBack to FightClub is StarWars:EpisodeV-TheEmpireStrikesBack->FightClub [2] with length 10
        Shortest path from StarWars:EpisodeV-TheEmpireStrikesBack to ForrestGump is StarWars:EpisodeV-TheEmpireStrikesBack->ForrestGump [2] with length 11
        Shortest path from StarWars:EpisodeV-TheEmpireStrikesBack to Gladiator is StarWars:EpisodeV-TheEmpireStrikesBack->Gladiator [2] with length 8
        Shortest path from StarWars:EpisodeV-TheEmpireStrikesBack to Goodfellas is StarWars:EpisodeV-TheEmpireStrikesBack->Goodfellas [2] with length 10
        Shortest path from StarWars:EpisodeV-TheEmpireStrikesBack to Inception is StarWars:EpisodeV-TheEmpireStrikesBack->Inception [2] with length 8
        Shortest path from StarWars:EpisodeV-TheEmpireStrikesBack to Interstellar is StarWars:EpisodeV-TheEmpireStrikesBack->Interstellar [2] with length 10
        Shortest path from StarWars:EpisodeV-TheEmpireStrikesBack to LifeisBeautiful is StarWars:EpisodeV-TheEmpireStrikesBack->LifeisBeautiful [2] with length 14
        Shortest path from StarWars:EpisodeV-TheEmpireStrikesBack to PulpFiction is StarWars:EpisodeV-TheEmpireStrikesBack->PulpFiction [2] with length 11
        Shortest path from StarWars:EpisodeV-TheEmpireStrikesBack to SavingPrivateRyan is StarWars:EpisodeV-TheEmpireStrikesBack->SavingPrivateRyan [2] with length 11
        Shortest path from StarWars:EpisodeV-TheEmpireStrikesBack to Schindler'sList is StarWars:EpisodeV-TheEmpireStrikesBack->Schindler'sList [2] with length 12
        Shortest path from StarWars:EpisodeV-TheEmpireStrikesBack to Se7en is StarWars:EpisodeV-TheEmpireStrikesBack->Se7en [2] with length 12
        Shortest path from StarWars:EpisodeV-TheEmpireStrikesBack to SpiritedAway is StarWars:EpisodeV-TheEmpireStrikesBack->SpiritedAway [2] with length 12
        Shortest path from StarWars:EpisodeV-TheEmpireStrikesBack to TheDarkKnight is StarWars:EpisodeV-TheEmpireStrikesBack->TheDarkKnight [2] with length 10
        Shortest path from StarWars:EpisodeV-TheEmpireStrikesBack to TheGodfather is StarWars:EpisodeV-TheEmpireStrikesBack->TheGodfather [2] with length 11
        Shortest path from StarWars:EpisodeV-TheEmpireStrikesBack to TheGreenMile is StarWars:EpisodeV-TheEmpireStrikesBack->TheGreenMile [2] with length 10
        Shortest path from StarWars:EpisodeV-TheEmpireStrikesBack to TheLordoftheRings:TheFellowshipoftheRing is StarWars:EpisodeV-TheEmpireStrikesBack->TheLordoftheRings:TheFellowshipoftheRing [2] with length 10
        Shortest path from StarWars:EpisodeV-TheEmpireStrikesBack to TheLordoftheRings:TheReturnoftheKing is StarWars:EpisodeV-TheEmpireStrikesBack->TheLordoftheRings:TheReturnoftheKing [2] with length 10
        Shortest path from StarWars:EpisodeV-TheEmpireStrikesBack to TheMatrix is StarWars:EpisodeV-TheEmpireStrikesBack->TheMatrix [2] with length 7
        Shortest path from StarWars:EpisodeV-TheEmpireStrikesBack to ThePianist is StarWars:EpisodeV-TheEmpireStrikesBack->ThePianist [2] with length 14
        Shortest path from StarWars:EpisodeV-TheEmpireStrikesBack to TheShawshankRedemption is StarWars:EpisodeV-TheEmpireStrikesBack->TheShawshankRedemption [2] with length 10
        Shortest path from StarWars:EpisodeV-TheEmpireStrikesBack to TheSilenceoftheLambs is StarWars:EpisodeV-TheEmpireStrikesBack->TheSilenceoftheLambs [2] with length 12
        Shortest path from StarWars:EpisodeV-TheEmpireStrikesBack to TheUsualSuspects is StarWars:EpisodeV-TheEmpireStrikesBack->TheUsualSuspects [2] with length 12
        Shortest path from TheDarkKnight to Casablanca is TheDarkKnight->Casablanca [2] with length 10
        Shortest path from TheDarkKnight to CityofGod is TheDarkKnight->CityofGod [2] with length 9
        Shortest path from TheDarkKnight to FightClub is TheDarkKnight->FightClub [2] with length 8
        Shortest path from TheDarkKnight to ForrestGump is TheDarkKnight->ForrestGump [2] with length 9
        Shortest path from TheDarkKnight to Gladiator is TheDarkKnight->Gladiator [2] with length 8
        Shortest path from TheDarkKnight to Goodfellas is TheDarkKnight->Goodfellas [2] with length 8
        Shortest path from TheDarkKnight to Inception is TheDarkKnight->Inception [2] with length 10
        Shortest path from TheDarkKnight to Interstellar is TheDarkKnight->Interstellar [2] with length 10
        Shortest path from TheDarkKnight to LifeisBeautiful is TheDarkKnight->LifeisBeautiful [2] with length 12
        Shortest path from TheDarkKnight to PulpFiction is TheDarkKnight->PulpFiction [2] with length 7
        Shortest path from TheDarkKnight to SavingPrivateRyan is TheDarkKnight->SavingPrivateRyan [2] with length 9
        Shortest path from TheDarkKnight to Schindler'sList is TheDarkKnight->Schindler'sList [2] with length 10
        Shortest path from TheDarkKnight to Se7en is TheDarkKnight->Se7en [2] with length 8
        Shortest path from TheDarkKnight to SpiritedAway is TheDarkKnight->SpiritedAway [2] with length 14
        Shortest path from TheDarkKnight to StarWars:EpisodeV-TheEmpireStrikesBack is TheDarkKnight->StarWars:EpisodeV-TheEmpireStrikesBack [2] with length 10
        Shortest path from TheDarkKnight to TheGodfather is TheDarkKnight->TheGodfather [2] with length 7
        Shortest path from TheDarkKnight to TheGreenMile is TheDarkKnight->TheGreenMile [2] with length 8
        Shortest path from TheDarkKnight to TheLordoftheRings:TheFellowshipoftheRing is TheDarkKnight->TheLordoftheRings:TheFellowshipoftheRing [2] with length 12
        Shortest path from TheDarkKnight to TheLordoftheRings:TheReturnoftheKing is TheDarkKnight->TheLordoftheRings:TheReturnoftheKing [2] with length 12
        Shortest path from TheDarkKnight to TheMatrix is TheDarkKnight->TheMatrix [2] with length 9
        Shortest path from TheDarkKnight to ThePianist is TheDarkKnight->ThePianist [2] with length 12
        Shortest path from TheDarkKnight to TheShawshankRedemption is TheDarkKnight->TheShawshankRedemption [2] with length 8
        Shortest path from TheDarkKnight to TheSilenceoftheLambs is TheDarkKnight->TheSilenceoftheLambs [2] with length 8
        Shortest path from TheDarkKnight to TheUsualSuspects is TheDarkKnight->TheUsualSuspects [2] with length 10
        Shortest path from TheGodfather to Casablanca is TheGodfather->Casablanca [2] with length 9
        Shortest path from TheGodfather to CityofGod is TheGodfather->CityofGod [2] with length 8
        Shortest path from TheGodfather to FightClub is TheGodfather->FightClub [2] with length 7
        Shortest path from TheGodfather to ForrestGump is TheGodfather->ForrestGump [2] with length 8
        Shortest path from TheGodfather to Gladiator is TheGodfather->Gladiator [2] with length 9
        Shortest path from TheGodfather to Goodfellas is TheGodfather->Goodfellas [2] with length 7
        Shortest path from TheGodfather to Inception is TheGodfather->Inception [2] with length 11
        Shortest path from TheGodfather to Interstellar is TheGodfather->Interstellar [2] with length 9
        Shortest path from TheGodfather to LifeisBeautiful is TheGodfather->LifeisBeautiful [2] with length 11
        Shortest path from TheGodfather to PulpFiction is TheGodfather->PulpFiction [2] with length 6
        Shortest path from TheGodfather to SavingPrivateRyan is TheGodfather->SavingPrivateRyan [2] with length 8
        Shortest path from TheGodfather to Schindler'sList is TheGodfather->Schindler'sList [2] with length 9
        Shortest path from TheGodfather to Se7en is TheGodfather->Se7en [2] with length 7
        Shortest path from TheGodfather to SpiritedAway is TheGodfather->SpiritedAway [2] with length 13
        Shortest path from TheGodfather to StarWars:EpisodeV-TheEmpireStrikesBack is TheGodfather->StarWars:EpisodeV-TheEmpireStrikesBack [2] with length 11
        Shortest path from TheGodfather to TheDarkKnight is TheGodfather->TheDarkKnight [2] with length 7
        Shortest path from TheGodfather to TheGreenMile is TheGodfather->TheGreenMile [2] with length 7
        Shortest path from TheGodfather to TheLordoftheRings:TheFellowshipoftheRing is TheGodfather->TheLordoftheRings:TheFellowshipoftheRing [2] with length 11
        Shortest path from TheGodfather to TheLordoftheRings:TheReturnoftheKing is TheGodfather->TheLordoftheRings:TheReturnoftheKing [2] with length 11
        Shortest path from TheGodfather to TheMatrix is TheGodfather->TheMatrix [2] with length 10
        Shortest path from TheGodfather to ThePianist is TheGodfather->ThePianist [2] with length 11
        Shortest path from TheGodfather to TheShawshankRedemption is TheGodfather->TheShawshankRedemption [2] with length 7
        Shortest path from TheGodfather to TheSilenceoftheLambs is TheGodfather->TheSilenceoftheLambs [2] with length 7
        Shortest path from TheGodfather to TheUsualSuspects is TheGodfather->TheUsualSuspects [2] with length 9
        Shortest path from TheGreenMile to Casablanca is TheGreenMile->Casablanca [2] with length 10
        Shortest path from TheGreenMile to CityofGod is TheGreenMile->CityofGod [2] with length 7
        Shortest path from TheGreenMile to FightClub is TheGreenMile->FightClub [2] with length 6
        Shortest path from TheGreenMile to ForrestGump is TheGreenMile->ForrestGump [2] with length 9
        Shortest path from TheGreenMile to Gladiator is TheGreenMile->Gladiator [2] with length 10
        Shortest path from TheGreenMile to Goodfellas is TheGreenMile->Goodfellas [2] with length 8
        Shortest path from TheGreenMile to Inception is TheGreenMile->Inception [2] with length 12
        Shortest path from TheGreenMile to Interstellar is TheGreenMile->Interstellar [2] with length 8
        Shortest path from TheGreenMile to LifeisBeautiful is TheGreenMile->LifeisBeautiful [2] with length 10
        Shortest path from TheGreenMile to PulpFiction is TheGreenMile->PulpFiction [2] with length 7
        Shortest path from TheGreenMile to SavingPrivateRyan is TheGreenMile->SavingPrivateRyan [2] with length 7
        Shortest path from TheGreenMile to Schindler'sList is TheGreenMile->Schindler'sList [2] with length 10
        Shortest path from TheGreenMile to Se7en is TheGreenMile->Se7en [2] with length 6
        Shortest path from TheGreenMile to SpiritedAway is TheGreenMile->SpiritedAway [2] with length 12
        Shortest path from TheGreenMile to StarWars:EpisodeV-TheEmpireStrikesBack is TheGreenMile->StarWars:EpisodeV-TheEmpireStrikesBack [2] with length 10
        Shortest path from TheGreenMile to TheDarkKnight is TheGreenMile->TheDarkKnight [2] with length 8
        Shortest path from TheGreenMile to TheGodfather is TheGreenMile->TheGodfather [2] with length 7
        Shortest path from TheGreenMile to TheLordoftheRings:TheFellowshipoftheRing is TheGreenMile->TheLordoftheRings:TheFellowshipoftheRing [2] with length 10
        Shortest path from TheGreenMile to TheLordoftheRings:TheReturnoftheKing is TheGreenMile->TheLordoftheRings:TheReturnoftheKing [2] with length 10
        Shortest path from TheGreenMile to TheMatrix is TheGreenMile->TheMatrix [2] with length 9
        Shortest path from TheGreenMile to ThePianist is TheGreenMile->ThePianist [2] with length 12
        Shortest path from TheGreenMile to TheShawshankRedemption is TheGreenMile->TheShawshankRedemption [2] with length 8
        Shortest path from TheGreenMile to TheSilenceoftheLambs is TheGreenMile->TheSilenceoftheLambs [2] with length 6
        Shortest path from TheGreenMile to TheUsualSuspects is TheGreenMile->TheUsualSuspects [2] with length 10
        Shortest path from TheLordoftheRings:TheFellowshipoftheRing to Casablanca is TheLordoftheRings:TheFellowshipoftheRing->Casablanca [2] with length 12
        Shortest path from TheLordoftheRings:TheFellowshipoftheRing to CityofGod is TheLordoftheRings:TheFellowshipoftheRing->CityofGod [2] with length 11
        Shortest path from TheLordoftheRings:TheFellowshipoftheRing to FightClub is TheLordoftheRings:TheFellowshipoftheRing->FightClub [2] with length 8
        Shortest path from TheLordoftheRings:TheFellowshipoftheRing to ForrestGump is TheLordoftheRings:TheFellowshipoftheRing->ForrestGump [2] with length 9
        Shortest path from TheLordoftheRings:TheFellowshipoftheRing to Gladiator is TheLordoftheRings:TheFellowshipoftheRing->Gladiator [2] with length 10
        Shortest path from TheLordoftheRings:TheFellowshipoftheRing to Goodfellas is TheLordoftheRings:TheFellowshipoftheRing->Goodfellas [2] with length 12
        Shortest path from TheLordoftheRings:TheFellowshipoftheRing to Inception is TheLordoftheRings:TheFellowshipoftheRing->Inception [2] with length 10
        Shortest path from TheLordoftheRings:TheFellowshipoftheRing to Interstellar is TheLordoftheRings:TheFellowshipoftheRing->Interstellar [2] with length 10
        Shortest path from TheLordoftheRings:TheFellowshipoftheRing to LifeisBeautiful is TheLordoftheRings:TheFellowshipoftheRing->LifeisBeautiful [2] with length 12
        Shortest path from TheLordoftheRings:TheFellowshipoftheRing to PulpFiction is TheLordoftheRings:TheFellowshipoftheRing->PulpFiction [2] with length 11
        Shortest path from TheLordoftheRings:TheFellowshipoftheRing to SavingPrivateRyan is TheLordoftheRings:TheFellowshipoftheRing->SavingPrivateRyan [2] with length 11
        Shortest path from TheLordoftheRings:TheFellowshipoftheRing to Schindler'sList is TheLordoftheRings:TheFellowshipoftheRing->Schindler'sList [2] with length 12
        Shortest path from TheLordoftheRings:TheFellowshipoftheRing to Se7en is TheLordoftheRings:TheFellowshipoftheRing->Se7en [2] with length 12
        Shortest path from TheLordoftheRings:TheFellowshipoftheRing to SpiritedAway is TheLordoftheRings:TheFellowshipoftheRing->SpiritedAway [2] with length 10
        Shortest path from TheLordoftheRings:TheFellowshipoftheRing to StarWars:EpisodeV-TheEmpireStrikesBack is TheLordoftheRings:TheFellowshipoftheRing->StarWars:EpisodeV-TheEmpireStrikesBack [2] with length 10
        Shortest path from TheLordoftheRings:TheFellowshipoftheRing to TheDarkKnight is TheLordoftheRings:TheFellowshipoftheRing->TheDarkKnight [2] with length 12
        Shortest path from TheLordoftheRings:TheFellowshipoftheRing to TheGodfather is TheLordoftheRings:TheFellowshipoftheRing->TheGodfather [2] with length 11
        Shortest path from TheLordoftheRings:TheFellowshipoftheRing to TheGreenMile is TheLordoftheRings:TheFellowshipoftheRing->TheGreenMile [2] with length 10
        Shortest path from TheLordoftheRings:TheFellowshipoftheRing to TheLordoftheRings:TheReturnoftheKing is TheLordoftheRings:TheFellowshipoftheRing->TheLordoftheRings:TheReturnoftheKing [2] with length 6
        Shortest path from TheLordoftheRings:TheFellowshipoftheRing to TheMatrix is TheLordoftheRings:TheFellowshipoftheRing->TheMatrix [2] with length 13
        Shortest path from TheLordoftheRings:TheFellowshipoftheRing to ThePianist is TheLordoftheRings:TheFellowshipoftheRing->ThePianist [2] with length 12
        Shortest path from TheLordoftheRings:TheFellowshipoftheRing to TheShawshankRedemption is TheLordoftheRings:TheFellowshipoftheRing->TheShawshankRedemption [2] with length 10
        Shortest path from TheLordoftheRings:TheFellowshipoftheRing to TheSilenceoftheLambs is TheLordoftheRings:TheFellowshipoftheRing->TheSilenceoftheLambs [2] with length 12
        Shortest path from TheLordoftheRings:TheFellowshipoftheRing to TheUsualSuspects is TheLordoftheRings:TheFellowshipoftheRing->TheUsualSuspects [2] with length 14
        Shortest path from TheLordoftheRings:TheReturnoftheKing to Casablanca is TheLordoftheRings:TheReturnoftheKing->Casablanca [2] with length 12
        Shortest path from TheLordoftheRings:TheReturnoftheKing to CityofGod is TheLordoftheRings:TheReturnoftheKing->CityofGod [2] with length 11
        Shortest path from TheLordoftheRings:TheReturnoftheKing to FightClub is TheLordoftheRings:TheReturnoftheKing->FightClub [2] with length 10
        Shortest path from TheLordoftheRings:TheReturnoftheKing to ForrestGump is TheLordoftheRings:TheReturnoftheKing->ForrestGump [2] with length 11
        Shortest path from TheLordoftheRings:TheReturnoftheKing to Gladiator is TheLordoftheRings:TheReturnoftheKing->Gladiator [2] with length 10
        Shortest path from TheLordoftheRings:TheReturnoftheKing to Goodfellas is TheLordoftheRings:TheReturnoftheKing->Goodfellas [2] with length 12
        Shortest path from TheLordoftheRings:TheReturnoftheKing to Inception is TheLordoftheRings:TheReturnoftheKing->Inception [2] with length 12
        Shortest path from TheLordoftheRings:TheReturnoftheKing to Interstellar is TheLordoftheRings:TheReturnoftheKing->Interstellar [2] with length 10
        Shortest path from TheLordoftheRings:TheReturnoftheKing to LifeisBeautiful is TheLordoftheRings:TheReturnoftheKing->LifeisBeautiful [2] with length 12
        Shortest path from TheLordoftheRings:TheReturnoftheKing to PulpFiction is TheLordoftheRings:TheReturnoftheKing->PulpFiction [2] with length 9
        Shortest path from TheLordoftheRings:TheReturnoftheKing to SavingPrivateRyan is TheLordoftheRings:TheReturnoftheKing->SavingPrivateRyan [2] with length 11
        Shortest path from TheLordoftheRings:TheReturnoftheKing to Schindler'sList is TheLordoftheRings:TheReturnoftheKing->Schindler'sList [2] with length 10
        Shortest path from TheLordoftheRings:TheReturnoftheKing to Se7en is TheLordoftheRings:TheReturnoftheKing->Se7en [2] with length 12
        Shortest path from TheLordoftheRings:TheReturnoftheKing to SpiritedAway is TheLordoftheRings:TheReturnoftheKing->SpiritedAway [2] with length 12
        Shortest path from TheLordoftheRings:TheReturnoftheKing to StarWars:EpisodeV-TheEmpireStrikesBack is TheLordoftheRings:TheReturnoftheKing->StarWars:EpisodeV-TheEmpireStrikesBack [2] with length 10
        Shortest path from TheLordoftheRings:TheReturnoftheKing to TheDarkKnight is TheLordoftheRings:TheReturnoftheKing->TheDarkKnight [2] with length 12
        Shortest path from TheLordoftheRings:TheReturnoftheKing to TheGodfather is TheLordoftheRings:TheReturnoftheKing->TheGodfather [2] with length 11
        Shortest path from TheLordoftheRings:TheReturnoftheKing to TheGreenMile is TheLordoftheRings:TheReturnoftheKing->TheGreenMile [2] with length 10
        Shortest path from TheLordoftheRings:TheReturnoftheKing to TheLordoftheRings:TheFellowshipoftheRing is TheLordoftheRings:TheReturnoftheKing->TheLordoftheRings:TheFellowshipoftheRing [2] with length 6
        Shortest path from TheLordoftheRings:TheReturnoftheKing to TheMatrix is TheLordoftheRings:TheReturnoftheKing->TheMatrix [2] with length 13
        Shortest path from TheLordoftheRings:TheReturnoftheKing to ThePianist is TheLordoftheRings:TheReturnoftheKing->ThePianist [2] with length 12
        Shortest path from TheLordoftheRings:TheReturnoftheKing to TheShawshankRedemption is TheLordoftheRings:TheReturnoftheKing->TheShawshankRedemption [2] with length 10
        Shortest path from TheLordoftheRings:TheReturnoftheKing to TheSilenceoftheLambs is TheLordoftheRings:TheReturnoftheKing->TheSilenceoftheLambs [2] with length 12
        Shortest path from TheLordoftheRings:TheReturnoftheKing to TheUsualSuspects is TheLordoftheRings:TheReturnoftheKing->TheUsualSuspects [2] with length 14
        Shortest path from TheMatrix to Casablanca is TheMatrix->Casablanca [2] with length 11
        Shortest path from TheMatrix to CityofGod is TheMatrix->CityofGod [2] with length 12
        Shortest path from TheMatrix to FightClub is TheMatrix->FightClub [2] with length 7
        Shortest path from TheMatrix to ForrestGump is TheMatrix->ForrestGump [2] with length 10
        Shortest path from TheMatrix to Gladiator is TheMatrix->Gladiator [2] with length 9
        Shortest path from TheMatrix to Goodfellas is TheMatrix->Goodfellas [2] with length 9
        Shortest path from TheMatrix to Inception is TheMatrix->Inception [2] with length 7
        Shortest path from TheMatrix to Interstellar is TheMatrix->Interstellar [2] with length 9
        Shortest path from TheMatrix to LifeisBeautiful is TheMatrix->LifeisBeautiful [2] with length 13
        Shortest path from TheMatrix to PulpFiction is TheMatrix->PulpFiction [2] with length 10
        Shortest path from TheMatrix to SavingPrivateRyan is TheMatrix->SavingPrivateRyan [2] with length 10
        Shortest path from TheMatrix to Schindler'sList is TheMatrix->Schindler'sList [2] with length 11
        Shortest path from TheMatrix to Se7en is TheMatrix->Se7en [2] with length 11
        Shortest path from TheMatrix to SpiritedAway is TheMatrix->SpiritedAway [2] with length 13
        Shortest path from TheMatrix to StarWars:EpisodeV-TheEmpireStrikesBack is TheMatrix->StarWars:EpisodeV-TheEmpireStrikesBack [2] with length 7
        Shortest path from TheMatrix to TheDarkKnight is TheMatrix->TheDarkKnight [2] with length 9
        Shortest path from TheMatrix to TheGodfather is TheMatrix->TheGodfather [2] with length 10
        Shortest path from TheMatrix to TheGreenMile is TheMatrix->TheGreenMile [2] with length 9
        Shortest path from TheMatrix to TheLordoftheRings:TheFellowshipoftheRing is TheMatrix->TheLordoftheRings:TheFellowshipoftheRing [2] with length 13
        Shortest path from TheMatrix to TheLordoftheRings:TheReturnoftheKing is TheMatrix->TheLordoftheRings:TheReturnoftheKing [2] with length 13
        Shortest path from TheMatrix to ThePianist is TheMatrix->ThePianist [2] with length 13
        Shortest path from TheMatrix to TheShawshankRedemption is TheMatrix->TheShawshankRedemption [2] with length 9
        Shortest path from TheMatrix to TheSilenceoftheLambs is TheMatrix->TheSilenceoftheLambs [2] with length 11
        Shortest path from TheMatrix to TheUsualSuspects is TheMatrix->TheUsualSuspects [2] with length 11
        Shortest path from ThePianist to Casablanca is ThePianist->Casablanca [2] with length 10
        Shortest path from ThePianist to CityofGod is ThePianist->CityofGod [2] with length 9
        Shortest path from ThePianist to FightClub is ThePianist->FightClub [2] with length 10
        Shortest path from ThePianist to ForrestGump is ThePianist->ForrestGump [2] with length 11
        Shortest path from ThePianist to Gladiator is ThePianist->Gladiator [2] with length 10
        Shortest path from ThePianist to Goodfellas is ThePianist->Goodfellas [2] with length 10
        Shortest path from ThePianist to Inception is ThePianist->Inception [2] with length 14
        Shortest path from ThePianist to Interstellar is ThePianist->Interstellar [2] with length 12
        Shortest path from ThePianist to LifeisBeautiful is ThePianist->LifeisBeautiful [2] with length 12
        Shortest path from ThePianist to PulpFiction is ThePianist->PulpFiction [2] with length 11
        Shortest path from ThePianist to SavingPrivateRyan is ThePianist->SavingPrivateRyan [2] with length 11
        Shortest path from ThePianist to Schindler'sList is ThePianist->Schindler'sList [2] with length 10
        Shortest path from ThePianist to Se7en is ThePianist->Se7en [2] with length 12
        Shortest path from ThePianist to SpiritedAway is ThePianist->SpiritedAway [2] with length 14
        Shortest path from ThePianist to StarWars:EpisodeV-TheEmpireStrikesBack is ThePianist->StarWars:EpisodeV-TheEmpireStrikesBack [2] with length 14
        Shortest path from ThePianist to TheDarkKnight is ThePianist->TheDarkKnight [2] with length 12
        Shortest path from ThePianist to TheGodfather is ThePianist->TheGodfather [2] with length 11
        Shortest path from ThePianist to TheGreenMile is ThePianist->TheGreenMile [2] with length 12
        Shortest path from ThePianist to TheLordoftheRings:TheFellowshipoftheRing is ThePianist->TheLordoftheRings:TheFellowshipoftheRing [2] with length 12
        Shortest path from ThePianist to TheLordoftheRings:TheReturnoftheKing is ThePianist->TheLordoftheRings:TheReturnoftheKing [2] with length 12
        Shortest path from ThePianist to TheMatrix is ThePianist->TheMatrix [2] with length 13
        Shortest path from ThePianist to TheShawshankRedemption is ThePianist->TheShawshankRedemption [2] with length 10
        Shortest path from ThePianist to TheSilenceoftheLambs is ThePianist->TheSilenceoftheLambs [2] with length 12
        Shortest path from ThePianist to TheUsualSuspects is ThePianist->TheUsualSuspects [2] with length 12
        Shortest path from TheShawshankRedemption to Casablanca is TheShawshankRedemption->Casablanca [2] with length 8
        Shortest path from TheShawshankRedemption to CityofGod is TheShawshankRedemption->CityofGod [2] with length 9
        Shortest path from TheShawshankRedemption to FightClub is TheShawshankRedemption->FightClub [2] with length 6
        Shortest path from TheShawshankRedemption to ForrestGump is TheShawshankRedemption->ForrestGump [2] with length 5
        Shortest path from TheShawshankRedemption to Gladiator is TheShawshankRedemption->Gladiator [2] with length 8
        Shortest path from TheShawshankRedemption to Goodfellas is TheShawshankRedemption->Goodfellas [2] with length 8
        Shortest path from TheShawshankRedemption to Inception is TheShawshankRedemption->Inception [2] with length 10
        Shortest path from TheShawshankRedemption to Interstellar is TheShawshankRedemption->Interstellar [2] with length 8
        Shortest path from TheShawshankRedemption to LifeisBeautiful is TheShawshankRedemption->LifeisBeautiful [2] with length 10
        Shortest path from TheShawshankRedemption to PulpFiction is TheShawshankRedemption->PulpFiction [2] with length 5
        Shortest path from TheShawshankRedemption to SavingPrivateRyan is TheShawshankRedemption->SavingPrivateRyan [2] with length 7
        Shortest path from TheShawshankRedemption to Schindler'sList is TheShawshankRedemption->Schindler'sList [2] with length 8
        Shortest path from TheShawshankRedemption to Se7en is TheShawshankRedemption->Se7en [2] with length 8
        Shortest path from TheShawshankRedemption to SpiritedAway is TheShawshankRedemption->SpiritedAway [2] with length 12
        Shortest path from TheShawshankRedemption to StarWars:EpisodeV-TheEmpireStrikesBack is TheShawshankRedemption->StarWars:EpisodeV-TheEmpireStrikesBack [2] with length 10
        Shortest path from TheShawshankRedemption to TheDarkKnight is TheShawshankRedemption->TheDarkKnight [2] with length 8
        Shortest path from TheShawshankRedemption to TheGodfather is TheShawshankRedemption->TheGodfather [2] with length 7
        Shortest path from TheShawshankRedemption to TheGreenMile is TheShawshankRedemption->TheGreenMile [2] with length 8
        Shortest path from TheShawshankRedemption to TheLordoftheRings:TheFellowshipoftheRing is TheShawshankRedemption->TheLordoftheRings:TheFellowshipoftheRing [2] with length 10
        Shortest path from TheShawshankRedemption to TheLordoftheRings:TheReturnoftheKing is TheShawshankRedemption->TheLordoftheRings:TheReturnoftheKing [2] with length 10
        Shortest path from TheShawshankRedemption to TheMatrix is TheShawshankRedemption->TheMatrix [2] with length 9
        Shortest path from TheShawshankRedemption to ThePianist is TheShawshankRedemption->ThePianist [2] with length 10
        Shortest path from TheShawshankRedemption to TheSilenceoftheLambs is TheShawshankRedemption->TheSilenceoftheLambs [2] with length 8
        Shortest path from TheShawshankRedemption to TheUsualSuspects is TheShawshankRedemption->TheUsualSuspects [2] with length 10
        Shortest path from TheSilenceoftheLambs to Casablanca is TheSilenceoftheLambs->Casablanca [2] with length 10
        Shortest path from TheSilenceoftheLambs to CityofGod is TheSilenceoftheLambs->CityofGod [2] with length 7
        Shortest path from TheSilenceoftheLambs to FightClub is TheSilenceoftheLambs->FightClub [2] with length 8
        Shortest path from TheSilenceoftheLambs to ForrestGump is TheSilenceoftheLambs->ForrestGump [2] with length 9
        Shortest path from TheSilenceoftheLambs to Gladiator is TheSilenceoftheLambs->Gladiator [2] with length 10
        Shortest path from TheSilenceoftheLambs to Goodfellas is TheSilenceoftheLambs->Goodfellas [2] with length 8
        Shortest path from TheSilenceoftheLambs to Inception is TheSilenceoftheLambs->Inception [2] with length 12
        Shortest path from TheSilenceoftheLambs to Interstellar is TheSilenceoftheLambs->Interstellar [2] with length 8
        Shortest path from TheSilenceoftheLambs to LifeisBeautiful is TheSilenceoftheLambs->LifeisBeautiful [2] with length 10
        Shortest path from TheSilenceoftheLambs to PulpFiction is TheSilenceoftheLambs->PulpFiction [2] with length 7
        Shortest path from TheSilenceoftheLambs to SavingPrivateRyan is TheSilenceoftheLambs->SavingPrivateRyan [2] with length 7
        Shortest path from TheSilenceoftheLambs to Schindler'sList is TheSilenceoftheLambs->Schindler'sList [2] with length 10
        Shortest path from TheSilenceoftheLambs to Se7en is TheSilenceoftheLambs->Se7en [2] with length 6
        Shortest path from TheSilenceoftheLambs to SpiritedAway is TheSilenceoftheLambs->SpiritedAway [2] with length 12
        Shortest path from TheSilenceoftheLambs to StarWars:EpisodeV-TheEmpireStrikesBack is TheSilenceoftheLambs->StarWars:EpisodeV-TheEmpireStrikesBack [2] with length 12
        Shortest path from TheSilenceoftheLambs to TheDarkKnight is TheSilenceoftheLambs->TheDarkKnight [2] with length 8
        Shortest path from TheSilenceoftheLambs to TheGodfather is TheSilenceoftheLambs->TheGodfather [2] with length 7
        Shortest path from TheSilenceoftheLambs to TheGreenMile is TheSilenceoftheLambs->TheGreenMile [2] with length 6
        Shortest path from TheSilenceoftheLambs to TheLordoftheRings:TheFellowshipoftheRing is TheSilenceoftheLambs->TheLordoftheRings:TheFellowshipoftheRing [2] with length 12
        Shortest path from TheSilenceoftheLambs to TheLordoftheRings:TheReturnoftheKing is TheSilenceoftheLambs->TheLordoftheRings:TheReturnoftheKing [2] with length 12
        Shortest path from TheSilenceoftheLambs to TheMatrix is TheSilenceoftheLambs->TheMatrix [2] with length 11
        Shortest path from TheSilenceoftheLambs to ThePianist is TheSilenceoftheLambs->ThePianist [2] with length 12
        Shortest path from TheSilenceoftheLambs to TheShawshankRedemption is TheSilenceoftheLambs->TheShawshankRedemption [2] with length 8
        Shortest path from TheSilenceoftheLambs to TheUsualSuspects is TheSilenceoftheLambs->TheUsualSuspects [2] with length 8
        Shortest path from TheUsualSuspects to Casablanca is TheUsualSuspects->Casablanca [2] with length 10
        Shortest path from TheUsualSuspects to CityofGod is TheUsualSuspects->CityofGod [2] with length 11
        Shortest path from TheUsualSuspects to FightClub is TheUsualSuspects->FightClub [2] with length 10
        Shortest path from TheUsualSuspects to ForrestGump is TheUsualSuspects->ForrestGump [2] with length 11
        Shortest path from TheUsualSuspects to Gladiator is TheUsualSuspects->Gladiator [2] with length 10
        Shortest path from TheUsualSuspects to Goodfellas is TheUsualSuspects->Goodfellas [2] with length 10
        Shortest path from TheUsualSuspects to Inception is TheUsualSuspects->Inception [2] with length 12
        Shortest path from TheUsualSuspects to Interstellar is TheUsualSuspects->Interstellar [2] with length 12
        Shortest path from TheUsualSuspects to LifeisBeautiful is TheUsualSuspects->LifeisBeautiful [2] with length 14
        Shortest path from TheUsualSuspects to PulpFiction is TheUsualSuspects->PulpFiction [2] with length 9
        Shortest path from TheUsualSuspects to SavingPrivateRyan is TheUsualSuspects->SavingPrivateRyan [2] with length 11
        Shortest path from TheUsualSuspects to Schindler'sList is TheUsualSuspects->Schindler'sList [2] with length 12
        Shortest path from TheUsualSuspects to Se7en is TheUsualSuspects->Se7en [2] with length 6
        Shortest path from TheUsualSuspects to SpiritedAway is TheUsualSuspects->SpiritedAway [2] with length 14
        Shortest path from TheUsualSuspects to StarWars:EpisodeV-TheEmpireStrikesBack is TheUsualSuspects->StarWars:EpisodeV-TheEmpireStrikesBack [2] with length 12
        Shortest path from TheUsualSuspects to TheDarkKnight is TheUsualSuspects->TheDarkKnight [2] with length 10
        Shortest path from TheUsualSuspects to TheGodfather is TheUsualSuspects->TheGodfather [2] with length 9
        Shortest path from TheUsualSuspects to TheGreenMile is TheUsualSuspects->TheGreenMile [2] with length 10
        Shortest path from TheUsualSuspects to TheLordoftheRings:TheFellowshipoftheRing is TheUsualSuspects->TheLordoftheRings:TheFellowshipoftheRing [2] with length 14
        Shortest path from TheUsualSuspects to TheLordoftheRings:TheReturnoftheKing is TheUsualSuspects->TheLordoftheRings:TheReturnoftheKing [2] with length 14
        Shortest path from TheUsualSuspects to TheMatrix is TheUsualSuspects->TheMatrix [2] with length 11
        Shortest path from TheUsualSuspects to ThePianist is TheUsualSuspects->ThePianist [2] with length 12
        Shortest path from TheUsualSuspects to TheShawshankRedemption is TheUsualSuspects->TheShawshankRedemption [2] with length 10
        Shortest path from TheUsualSuspects to TheSilenceoftheLambs is TheUsualSuspects->TheSilenceoftheLambs [2] with length 8
        ```

=== "Inter-catalog comparison"

    Imagine you have several **MoviePacket** :smile: catalogs and you want to compare the similarity among them.

    The way you will compute this with `Pheno-Ranker` is similar to intra-catalog, the only thing to have in mind is that the catalogs (i.e., cohorts) will have a preffix so that we can identify them.

    ## Example 1: Default catalog (cohort) nomenclature 

    For demonstration purposes, in this example we are re-using the same file (`t/movies.json`)

    ```bash
    pheno-ranker -r t/movies.json t/movies.json --config t/movies_config.yaml
    ```

    After executing this command you will obtain a file named `matrix.txt` which is a matrix consisting of all (25+25)*(25+25) pairwise comparisons.

    !!! Abstract "Dimensionality reduction"
        We will use the included [R scripts]((https://github.com/CNAG-Biomedical-Informatics/pheno-ranker/tree/main/share/r)) to perform dimensionality reduction via [MDS](https://en.wikipedia.org/wiki/Multidimensional_scaling). Note that you can use other dimensinality reduction techniques such as t-SNE or UMAP.

    <figure markdown>
      ![Beacon v2](img/movies5.png){ width="600" }
      <figcaption>Inter-catalog multidimensional scaling</figcaption>
    </figure>


    By default, the ids in each catalog will be renamed to `C1_`, `C2_` and so on, but you can add your own preffixes with `--append-prefix`.

    ## Example 2: Set up catalog nomenclature prefixes 

    ```bash
    pheno-ranker -r t/movies.json t/movies.json t/movies.json --append-prefixes NETFLIX HBO PRIME_VIDEO --config t/movies_config.yaml
    ```

    <figure markdown>
      ![Beacon v2](img/movies6.png){ width="600" }
      <figcaption>Inter-catalog multidimensional scaling</figcaption>
    </figure>

=== "Movie recommendations"

    Imagine you'd like to discover movies similar to a specific one, such as [Interstellar](https://en.wikipedia.org/wiki/Interstellar_(film)).

    ## Step 1: Isolate the Movie

    To single out the 'Interstellar' movie data:

    ```bash
    pheno-ranker -r t/movies.json --patients-of-interest Interstellar --config t/movies_config.yaml
    ```

    This command will carry out a dry-run, producing an extracted JSON object named `Interstellar.json`.

    ```json
    {
       "country" : "USA",
       "genre" : [
          "Adventure",
          "Drama",
          "Sci-Fi"
       ],
       "rating" : 8.6,
       "title" : "Interstellar",
       "year" : 2014
    }
    ```
 

    ## Step 2: Rank Similar Movies

    Next, run the following command to initiate the ranking process:

    ```bash
    pheno-ranker -r t/movies.json -t Interstellar.json --config t/movies_config.yaml
    ```

    This will output the results to the console and additionally save them in a file titled `rank.txt`.

    | RANK | REFERENCE(ID) | TARGET(ID) | FORMAT | LENGTH | WEIGHTED | HAMMING-DISTANCE | DISTANCE-Z-SCORE | DISTANCE-P-VALUE | DISTANCE-Z-SCORE(RAND) | JACCARD-INDEX | JACCARD-Z-SCORE | JACCARD-P-VALUE |
    | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
    | 1 | Interstellar | Interstellar | MXF |      7 | False |    0 |  -3.994 |    0.0000325 |  -2.6458 |   1.000 |   4.529 |    0.0002087 |
    | 2 | SavingPrivateRyan | Interstellar | MXF |     10 | False |    7 |  -0.846 |    0.1988972 |   1.2649 |   0.300 |   0.438 |    0.7129606 |
    | 3 | TheShawshankRedemption | Interstellar | MXF |     10 | False |    8 |  -0.396 |    0.3461273 |   1.8974 |   0.200 |  -0.146 |    0.8742001 |
    | 4 | Se7en | Interstellar | MXF |     11 | False |    8 |  -0.396 |    0.3461273 |   1.5076 |   0.273 |   0.279 |    0.7646809 |
    | 5 | Gladiator | Interstellar | MXF |     11 | False |    8 |  -0.396 |    0.3461273 |   1.5076 |   0.273 |   0.279 |    0.7646809 |
    | 6 | Inception | Interstellar | MXF |     11 | False |    8 |  -0.396 |    0.3461273 |   1.5076 |   0.273 |   0.279 |    0.7646809 |
    | 7 | FightClub | Interstellar | MXF |     10 | False |    8 |  -0.396 |    0.3461273 |   1.8974 |   0.200 |  -0.146 |    0.8742001 |
    | 8 | TheGreenMile | Interstellar | MXF |     11 | False |    8 |  -0.396 |    0.3461273 |   1.5076 |   0.273 |   0.279 |    0.7646809 |
    | 9 | TheSilenceoftheLambs | Interstellar | MXF |     11 | False |    8 |  -0.396 |    0.3461273 |   1.5076 |   0.273 |   0.279 |    0.7646809 |
    | 10 | ForrestGump | Interstellar | MXF |     11 | False |    9 |   0.054 |    0.5215214 |   2.1106 |   0.182 |  -0.253 |    0.8948480 |
    | 11 | TheMatrix | Interstellar | MXF |     11 | False |    9 |   0.054 |    0.5215214 |   2.1106 |   0.182 |  -0.253 |    0.8948480 |
    | 12 | CityofGod | Interstellar | MXF |     11 | False |    9 |   0.054 |    0.5215214 |   2.1106 |   0.182 |  -0.253 |    0.8948480 |
    | 13 | PulpFiction | Interstellar | MXF |     11 | False |    9 |   0.054 |    0.5215214 |   2.1106 |   0.182 |  -0.253 |    0.8948480 |
    | 14 | TheGodfather | Interstellar | MXF |     11 | False |    9 |   0.054 |    0.5215214 |   2.1106 |   0.182 |  -0.253 |    0.8948480 |
    | 15 | Goodfellas | Interstellar | MXF |     12 | False |   10 |   0.504 |    0.6927786 |   2.3094 |   0.167 |  -0.341 |    0.9100849 |
    | 16 | TheLordoftheRings:TheFellowshipoftheRing | Interstellar | MXF |     12 | False |   10 |   0.504 |    0.6927786 |   2.3094 |   0.167 |  -0.341 |    0.9100849 |
    | 17 | Casablanca | Interstellar | MXF |     12 | False |   10 |   0.504 |    0.6927786 |   2.3094 |   0.167 |  -0.341 |    0.9100849 |
    | 18 | Schindler'sList | Interstellar | MXF |     12 | False |   10 |   0.504 |    0.6927786 |   2.3094 |   0.167 |  -0.341 |    0.9100849 |
    | 19 | LifeisBeautiful | Interstellar | MXF |     12 | False |   10 |   0.504 |    0.6927786 |   2.3094 |   0.167 |  -0.341 |    0.9100849 |
    | 20 | SpiritedAway | Interstellar | MXF |     12 | False |   10 |   0.504 |    0.6927786 |   2.3094 |   0.167 |  -0.341 |    0.9100849 |
    | 21 | TheLordoftheRings:TheReturnoftheKing | Interstellar | MXF |     12 | False |   10 |   0.504 |    0.6927786 |   2.3094 |   0.167 |  -0.341 |    0.9100849 |
    | 22 | TheDarkKnight | Interstellar | MXF |     12 | False |   10 |   0.504 |    0.6927786 |   2.3094 |   0.167 |  -0.341 |    0.9100849 |
    | 23 | StarWars:EpisodeV-TheEmpireStrikesBack | Interstellar | MXF |     12 | False |   10 |   0.504 |    0.6927786 |   2.3094 |   0.167 |  -0.341 |    0.9100849 |
    | 24 | TheUsualSuspects | Interstellar | MXF |     13 | False |   12 |   1.403 |    0.9197335 |   3.0509 |   0.077 |  -0.866 |    0.9689622 |
    | 25 | ThePianist | Interstellar | MXF |     13 | False |   12 |   1.403 |    0.9197335 |   3.0509 |   0.077 |  -0.866 |    0.9689622 |

    Of course you can perform tha ranking against multiple cohorts and select specific terms.

    ```bash
    pheno-ranker -r t/movies.json t/movies.json --append-prefixes NETFLIX HBO -t Interstellar.json --include-terms genre year --config t/movies_config.yaml --max-out 10
    ```


    | RANK | REFERENCE(ID) | TARGET(ID) | FORMAT | LENGTH | WEIGHTED | HAMMING-DISTANCE | DISTANCE-Z-SCORE | DISTANCE-P-VALUE | DISTANCE-Z-SCORE(RAND) | JACCARD-INDEX | JACCARD-Z-SCORE | JACCARD-P-VALUE |
    | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
    | 1 | NETFLIX_Interstellar | Interstellar | MXF |      4 | False |    0 |  -3.561 |    0.0001845 |  -2.0000 |   1.000 |   4.387 |    0.0003529 |
    | 2 | HBO_Interstellar | Interstellar | MXF |      4 | False |    0 |  -3.561 |    0.0001845 |  -2.0000 |   1.000 |   4.387 |    0.0003529 |
    | 3 | HBO_FightClub | Interstellar | MXF |      5 | False |    4 |  -0.779 |    0.2179810 |   1.3416 |   0.200 |  -0.068 |    0.8572146 |
    | 4 | NETFLIX_Inception | Interstellar | MXF |      6 | False |    4 |  -0.779 |    0.2179810 |   0.8165 |   0.333 |   0.675 |    0.6275454 |
    | 5 | HBO_TheShawshankRedemption | Interstellar | MXF |      5 | False |    4 |  -0.779 |    0.2179810 |   1.3416 |   0.200 |  -0.068 |    0.8572146 |
    | 6 | NETFLIX_TheLordoftheRings:TheReturnoftheKing | Interstellar | MXF |      6 | False |    4 |  -0.779 |    0.2179810 |   0.8165 |   0.333 |   0.675 |    0.6275454 |
    | 7 | HBO_Gladiator | Interstellar | MXF |      6 | False |    4 |  -0.779 |    0.2179810 |   0.8165 |   0.333 |   0.675 |    0.6275454 |
    | 8 | NETFLIX_Gladiator | Interstellar | MXF |      6 | False |    4 |  -0.779 |    0.2179810 |   0.8165 |   0.333 |   0.675 |    0.6275454 |
    | 9 | NETFLIX_TheShawshankRedemption | Interstellar | MXF |      5 | False |    4 |  -0.779 |    0.2179810 |   1.3416 |   0.200 |  -0.068 |    0.8572146 |
    | 10 | NETFLIX_FightClub | Interstellar | MXF |      5 | False |    4 |  -0.779 |    0.2179810 |   1.3416 |   0.200 |  -0.068 |    0.8572146 |
 
=== "Timings"

    Expected times and memory:

    | Rows  |Cohort |      | Patient|      | 
    | ---   |------ |----- | ----   | ---  |
    |Number | Time  | RAM  | Time  | RAM  |
    | 100   | 0.5s  | <1GB | <0.5s | <1GB |
    | 1K    | 1s    | <1GB | <0.5s | <1GB |
    | 5K    | 15s   | <1GB | <0.5s | <1GB |
    | 10K   | 1m30s | <1GB*| <1s   | <1GB |
    | 50K   | 1h    | <1GB*|  3s   | <1GB |
    | 100K  |  -    |  -   |  6s   | <1GB |
    | 1M    |  -    |  -   |  1m   | <4GB |

    (Imported `CSV` with 19 variables)

    1 x Intel(R) Xeon(R) W-1350P @ 4.00GHz - 32GB RAM - SSD

    !!! Note "* About RAM usage in cohort mode"
        After reaching 5K rows, Pheno-Ranker adopts a RAM-efficient approach, where it calculates the entire symmetric matrix without storing it in memory.
