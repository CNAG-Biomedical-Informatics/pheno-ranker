## Usage

When using the `pheno-ranker` command-line interface, simply ensure the [correct syntax](https://github.com/cnag-biomedical-informatics/pheno-ranker#synopsis) is provided.

!!! Hint "Hint"
    It is possible to export all intermediate files, as well as a file indicating coverage with the flag `--e`.

=== "Intra-cohort"

    We'll be using `individuals.json` which consists of 36 patients.

    ```
    ./pheno-ranker -r individuals.json 

    ```

    This will create a `matrix.txt` file of 36 x 36 cells. 

    --8<-- "tbl/matrix.md"

     The matrix can be processed to obtain a heatmap:

    ```R
    # Load library
    library("pheatmap")

    # Read in the input file as a matrix
    data <- as.matrix(read.table("matrix.txt", header = TRUE, row.names = 1))

    # Save image
    png(filename = "heatmap.png", width = 1000, height = 1000,
        units = "px", pointsize = 12, bg = "white", res = NA)

    # Create the heatmap with row and column labels
    pheatmap(data)
    ```

    <figure markdown>
       ![Beacon v2](img/heatmap.png){ width="400" }
       <figcaption> Heatmap of a intra-cohort pairwise comparison</figcaption>
    </figure>


    The same matrix can be processed with multidimensional scaling to reduce the dimensionality

    ```R
    library(ggplot2)
    library(ggrepel)
    
    # Read in the input file as a matrix 
    data <- as.matrix(read.table("matrix.txt", header = TRUE, row.names = 1))
    
    #calculate distance matrix
    d <- dist(data)
    
    #perform multidimensional scaling
    fit <- cmdscale(d, eig=TRUE, k=2)
    
    #extract (x, y) coordinates of multidimensional scaling
    x <- fit$points[,1]
    y <- fit$points[,2]
    
    # Create example data frame
    df <- data.frame(x, y, label=row.names(data))
    
    # Save image
    png(filename = "mds.png", width = 1000, height = 1000,
        units = "px", pointsize = 12, bg = "white", res = NA)
    
    # Create scatter plot
    ggplot(df, aes(x, y, label = label)) +
      geom_point() +
      geom_text_repel(size = 5, # Adjust the size of the text
                      box.padding = 0.2, # Adjust the padding around the text
                      max.overlaps = 10) + # Change the maximum number of overlaps
      labs(title = "Multidimensional Scaling Results",
           x = "Hamming Distance MDS Coordinate 1",
           y = "Hamming Distance MDS Coordinate 2") + # Add title and axis labels
      theme(
            plot.title = element_text(size = 30, face = "bold", hjust = 0.5),
            axis.title = element_text(size = 25),
            axis.text = element_text(size = 15))
    ```

    <figure markdown>
       ![Beacon v2](img/mds.png){ width="400" }
       <figcaption> Multidimensional scaling of a intra-cohort pairwise comparison</figcaption>
    </figure>


=== "Inter-cohort"

    We'll be using again `individuals.json` which consists of 36 patients. To keep track of which patient come from which file the prefix Cx will bed added to the ids

    ```
    ./pheno-ranker -r individuals.json individuals.json

    ```

    The prefixes can be changed with the flag `--append-prefixes`:

    ```
    ./pheno-ranker -r individuals.json individuals.json --append-prefixes REF TAR

    ```
    This will create a `matrix.txt` file of (36+36) x (36+36) cells. Again, this matrix can be processed with R:
