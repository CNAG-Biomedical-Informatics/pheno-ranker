??? Tip "Google Colab notebook"
    Try out `Pheno-Ranker` using our [Google Colab](https://colab.research.google.com/drive/1n3Etu4fnwuDWNveSMb1SzuN50O2a05Rg#scrollTo=8tbJ0f5-hJAB) notebook. You can view it without signing in, but running the code requires a Google account.

    <a target="_blank" href="https://colab.research.google.com/drive/1n3Etu4fnwuDWNveSMb1SzuN50O2a05Rg#scrollTo=8tbJ0f5-hJAB">
      <img src="https://colab.research.google.com/assets/colab-badge.svg" alt="Open In Colab"/>
    </a>

    We also have a local copy of the notebook that can be downloaded from the [repo](https://github.com/CNAG-Biomedical-Informatics/pheno-ranker/blob/main/nb/convert_pheno_cli_tutorial.ipynb). 

<div className="phenoFormatSummary" aria-label="At a glance">
  <div><span>Role</span><strong>Config-driven input</strong></div>
  <div><span>Accepted input</span><strong>Generic JSON/YAML records</strong></div>
  <div><span>Configuration</span><strong>User-provided YAML/JSON</strong></div>
  <div><span>Best for</span><strong>Custom categorical data models</strong></div>
</div>

???+ Warning "About this tutorial"
    This tutorial deliberately uses generic JSON data (i.e., movies) to illustrate the capabilities of `Pheno-Ranker`, as starting with familiar examples can help you better grasp its usage.

    Once you are comfortable with the concepts using movie data, you will find it easier to apply `Pheno-Ranker` to real GA4GH standards. For specific examples, please refer to the [cohort](cohort.md) and [patient](patient.md) pages in this documentation.

### Moviepackets

For this tutorial, we will use **Moviepackets** to show how `Pheno-Ranker` can work with generic `JSON` files.

<figure markdown>
 MoviePackets logo
 ![MoviePackets](img/moviepackets-logo.png){ width="300" }
 <figcaption>Image created by ChatGPT4o</figcaption>
</figure>

??? Question "What is a Moviepacket file?"
    A Moviepacket is an invented data exchange format :smile: designed for movies. In this tutorial it plays the same role that Phenotype Exchange Format ([PXF](pxf.md)) plays for pheno-clinical data: it is simply the input data model. Since it is generic JSON, its `Pheno-Ranker` configuration uses `format: JSON`.


Imagine you have a catalog of 25 movies described in `JSON` format. Each movie is one record, and each record has several properties, such as `title`, `genre`, `year`, `country`, and `rating`. In `Pheno-Ranker` documentation, these selectable properties are often called `terms`.

??? Example "See JSON"

    ```json
    --8<-- "https://raw.githubusercontent.com/CNAG-Biomedical-Informatics/pheno-ranker/refs/heads/main/share/ex/movies.json"
    ```

You are interested in checking the variety of your catalog and plan to use `Pheno-Ranker`. Because Moviepackets are not one of the built-in formats, the first thing to create is a **configuration file**.

??? Question "What is a `Pheno-Ranker` configuration file?"
    A configuration file is a text file in [YAML](https://en.wikipedia.org/wiki/YAML) format ([JSON](https://en.wikipedia.org/wiki/JSON) is also accepted) that tells `Pheno-Ranker` how to interpret your input. It is particularly important when you are not using the two supported formats _out-of-the-box_: [BFF](bff.md) and [PXF](pxf.md).

    !!! Note "Configuration names from v1.08"
        The configuration names shown here (`indexed_terms`, `index_regex`, and `identity_paths`) are used from `Pheno-Ranker` v1.08 onward. Older configuration files using the previous names are still accepted for compatibility.

??? Tip "Do I need to create a configuration file?"
    This file only has to be created if you are working with **your own JSON format**. If you have `CSV`, please go to this [page](csv-import.md).

    For generic JSON, the configuration mainly tells `Pheno-Ranker` three things:

    - Which field identifies each record (`primary_key`).
    - Which fields can be compared (`allowed_terms`).
    - Which first-level fields are arrays (`indexed_terms`), when present.

    If your file format resembles Moviepackets, you can use the Moviepacket configuration as a template. Just ensure you **modify the terms** to align with your data.

    In the Moviepacket example, `rating` exists in the JSON data but is not listed in `allowed_terms`; therefore it is not used in the tutorial comparisons. This keeps the example categorical and avoids mixing in quantitative values.

    ### Creating a configuration file
    
    Because Moviepacket records are identified by `title` and include the array field `genre`, the configuration can be minimal:
    
    ```yaml
    format: JSON
    primary_key: title
    allowed_terms: [country,genre,year,title]
    indexed_terms: [genre]
    ```

    This is enough for scalar arrays such as `genre`, because `Pheno-Ranker` can use values like `Drama` or `Sci-Fi` directly as identities.

    ### Optional identity paths

    You can also be explicit about how first-level array elements should be named. This is useful when the array contains objects, or when you want output keys to be easier to inspect.
    
    The Moviepacket configuration included with the repo uses this explicit form:
    
    ```yaml
    format: JSON
    primary_key: title
    allowed_terms: [country,genre,year,title]
    indexed_terms: [genre]
    index_regex: '^([^:]+):(\d+)'
    identity_paths:
      JSON:
        genre: genre
    ```

    For `format: JSON`, `identity_paths` is recommended but not mandatory. If it is absent, first-level arrays are canonicalized automatically:

    - Scalar arrays use the scalar value itself.
    - Object arrays first try direct fields such as `id`, `identifier`, `code`, `name`, `title`, or `value`.
    - If none of those fields exist, `Pheno-Ranker` derives a stable identity from the object's meaningful content.

    !!! Note "Nested arrays from v1.08"
        From `Pheno-Ranker` v1.08 onward, arrays nested inside other arrays are also compared independently of their original order. Deeper arrays are handled automatically from their meaningful content, so equivalent nested objects can match even if they appear at different numeric positions.

        Fields ignored by the configuration do not define the identity of nested objects. If a nested object has no usable content after filtering, `Pheno-Ranker` keeps its numeric position instead of guessing an identity.
    
    The table below summarizes which parameters are needed depending on the format:
    
    | Format      | Required properties | Optional properties | Pre-configured |
    | ----------- | ------------------- | ------------------- |  -----  | 
    | BFF / PXF   | `primary_key, allowed_terms, indexed_terms, index_regex, identity_paths` | `format` | ✓ |
    | CSV-derived JSON | `format, primary_key, allowed_terms, indexed_terms, identity_paths` | `index_regex` | generated by utility |
    | Generic JSON (`array`) | `format, primary_key, allowed_terms, indexed_terms` | `index_regex, identity_paths` | ✗ |
    | Others (`non-array`) |  `primary_key, allowed_terms` | `format` | ✗ |
    
    
     * Where:
        - **format** is a `string` that defines your particular format. Use `JSON` for generic JSON files with array-based properties. If `identity_paths` is provided, it has to match the key used under `identity_paths`.
        - **primary_key** is the key that will be used as the record identifier.
        - **allowed_terms** is an array that lists the terms permitted for use with `--include-terms` and `--exclude-terms`. This helps validate input and catch typos. If `--include-terms` or `--exclude-terms` are not specified, all terms present in the JSON file can be considered.
        - **indexed_terms** is an array that lists which first-level array properties should have their numeric indexes replaced.
        - **index_regex** is a string used to parse flattened first-level array keys. It is used together with `identity_paths`.
        - **identity_paths** is an object that, together with `index_regex`, renames first-level array elements so comparisons do not rely on numeric indexes. For `format: JSON`, this is optional because default identities can be inferred, but explicit paths make output keys easier to read.
    
### Running `Pheno-Ranker`

Once you have created the configuration file, you can run `pheno-ranker` with the **command-line interface**.

=== "Intra-catalog comparison"

    ## Example 1: Let's start by using all configured terms

    ```bash
    pheno-ranker -r t/data/movies.json --config t/data/movies_config.yaml
    ```

    The result is a file named `matrix.txt`. In this run, `Pheno-Ranker` uses the terms allowed by `t/data/movies_config.yaml`. Find below the result of clustering the matrix with `R`.

    ??? Example "Included R scripts"

        You can find in the link below a few examples to perform clustering and multidimensional scaling with your data:

        [R scripts at GitHub](https://github.com/CNAG-Biomedical-Informatics/pheno-ranker/tree/main/share/r).

    <figure markdown>
      ![Beacon v2](img/movies1.png){ width="600" }
      <figcaption>Intra-cohort pairwise comparison</figcaption>
    </figure>

    ## Example 2: Let's cluster by year

    ```bash
    pheno-ranker -r t/data/movies.json --include-terms year --config t/data/movies_config.yaml
    ```

    <figure markdown>
      ![Beacon v2](img/movies2.png){ width="600" }
      <figcaption>Intra-cohort pairwise comparison</figcaption>
    </figure>

    ## Example 3: Let's cluster by `genre`

    ```bash
    pheno-ranker -r t/data/movies.json --include-terms genre --config t/data/movies_config.yaml
    ```

    <figure markdown>
       ![Beacon v2](img/movies3.png){ width="600" }
       <figcaption>Intra-cohort pairwise comparison</figcaption>
    </figure>

    ## Example 4: Let's apply weights to `genre`

    We will use the file `t/data/movies_weights.yaml` that has the following content:

    ```yaml
    ---
    genre.Biography: 25
    ```

    ```bash
    pheno-ranker -r t/data/movies.json --include-terms genre --w t/data/movies_weights.yaml --config t/data/movies_config.yaml
    ```

    <figure markdown>
      ![Beacon v2](img/movies4.png){ width="600" }
      <figcaption>Intra-cohort pairwise comparison</figcaption>
    </figure>

    ## Example 5: Let's create a graph to be used in Cytoscape

    `Pheno-Ranker` can export a graph in a `JSON` format that is compatible with the [Cytoscape](https://cytoscape.org) ecosystem:

    ```bash
    pheno-ranker -r t/data/movies.json --cytoscape-json cytoscape.json --graph-stats graph_stats.txt --config t/data/movies_config.yaml
    ```

    !!! Question "Directed or undirected graph?" 
        The `cytoscape.json` file contains one edge per pairwise comparison and avoids duplicated symmetric edges. The graph is intended to be interpreted as **undirected** for visual purposes. Ensure that your application logic or analysis tools interpret this accordingly if they rely on undirected connectivity.

    ??? Example "See `cytoscape.json`"


        ```json
        --8<-- "data/movies_cytoscape.json"
        ```

    ???+ Example "Display plot"
    
        <div id="cy2" style="width: 100%; height: 500px; border: 1px solid black;"></div>
       
        <script>
          document.addEventListener("DOMContentLoaded", function () {
            const repoName = "pheno-ranker"; // Change this if needed
            loadCytoscapeGraph("cy2", "/data/movies_cytoscape.json", repoName, 50);
           });
        </script>
        
    ??? Example "See `graph_stats.txt`"
    
        ```bash
        --8<-- "data/graph_stats.txt"
        ```

=== "Inter-catalog comparison"

    Imagine you have several **Moviepacket** :smile: catalogs and you want to compare the similarity among them.

    The way you compute this with `Pheno-Ranker` is similar to the intra-catalog example. The main difference is that the catalogs (i.e., cohorts) receive prefixes so that records from different input files can be identified.

    ## Example 1: Default catalog (cohort) nomenclature 

    For demonstration purposes, this example reuses the same file (`t/data/movies.json`):

    ```bash
    pheno-ranker -r t/data/movies.json t/data/movies.json --config t/data/movies_config.yaml
    ```

    After executing this command, you will obtain a file named `matrix.txt`, consisting of all `(25+25) x (25+25)` pairwise comparisons.

    !!! Abstract "Dimensionality reduction"
        We will use the included [R scripts](https://github.com/CNAG-Biomedical-Informatics/pheno-ranker/tree/main/share/r) to perform dimensionality reduction via [MDS](https://en.wikipedia.org/wiki/Multidimensional_scaling). Note that you can use other dimensionality reduction techniques such as t-SNE or UMAP.

    <figure markdown>
      ![Beacon v2](img/movies5.png){ width="600" }
      <figcaption>Inter-catalog multidimensional scaling</figcaption>
    </figure>


    By default, the IDs in each catalog will be renamed to `C1_`, `C2_` and so on, but you can add your own prefixes with `--append-prefixes`.

    ## Example 2: Set up catalog nomenclature prefixes 

    ```bash
    pheno-ranker -r t/data/movies.json t/data/movies.json t/data/movies.json --append-prefixes NETFLIX HBO PRIME_VIDEO --config t/data/movies_config.yaml
    ```

    <figure markdown>
      ![Beacon v2](img/movies6.png){ width="600" }
      <figcaption>Inter-catalog multidimensional scaling</figcaption>
    </figure>

=== "Movie recommendations"

    Imagine you'd like to discover movies similar to a specific one, such as [Interstellar](https://en.wikipedia.org/wiki/Interstellar_(film)).

    ## Step 1: Isolate the Movie

    To single out the `Interstellar` movie data:

    ```bash
    pheno-ranker -r t/data/movies.json --patients-of-interest Interstellar --config t/data/movies_config.yaml
    ```

    This command will carry out a dry-run, producing an extracted JSON object named `Interstellar.json`.

    ```json
    --8<-- "tbl/Interstellar.json"
    ```
 

    ## Step 2: Rank Similar Movies

    Next, run the following command to initiate the ranking process:

    ```bash
    pheno-ranker -r t/data/movies.json -t Interstellar.json --config t/data/movies_config.yaml
    ```

    This will output the results to the console and additionally save them in a file titled `rank.txt`.

    ??? Example "See `rank.txt`"

        --8<-- "tbl/rank_movies.md"

    You can also perform the ranking against multiple cohorts and select specific terms.

    ```bash
    pheno-ranker -r t/data/movies.json t/data/movies.json --append-prefixes NETFLIX HBO -t Interstellar.json --include-terms genre year --config t/data/movies_config.yaml --max-out 10
    ```

    ??? Example "See `rank.txt`"

        --8<-- "tbl/rank_movies_inter.md"
