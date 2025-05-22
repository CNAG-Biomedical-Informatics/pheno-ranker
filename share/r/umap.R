# -- Install uwot on the fly if needed
if (!requireNamespace("uwot", quietly = TRUE)) {
    install.packages("uwot", repos="https://cloud.r-project.org")
}

# -- Load libraries
library(uwot)
library(ggplot2)
library(ggrepel)

# -- Read in the input file as a full distance matrix
data <- as.matrix(
    read.table("matrix.txt",
               header=TRUE,
               row.names=1,
               check.names=FALSE)
)

# -- Convert to a 'dist' object so uwot knows these are distances
d <- as.dist(data)

# -- Set seed for reproducibility
set.seed(42)

# -- Run UMAP directly on the distances
#    Passing a 'dist' object lets uwot build the k-NN graph from your distances
umap_res <- umap(
    d,
    n_neighbors=30,
    min_dist=0.3,
    n_components=2
)

# -- Extract UMAP coordinates
x <- umap_res[,1]
y <- umap_res[,2]

# -- Build a data frame for plotting
df <- data.frame(
    x=x,
    y=y,
    label=rownames(data)
)

# -- Open PNG device
png(filename="umap.png",
    width=1000,
    height=1000,
    units="px",
    pointsize=12,
    bg="white",
    res=NA)

# -- Create scatter plot with labels
ggplot(df, aes(x=x, y=y, label=label)) +
    geom_point() +
    geom_text_repel(
        size=5,
        box.padding=0.2,
        max.overlaps=10
    ) +
    labs(
        title="UMAP Embedding of Hamming Distance Matrix",
        x="UMAP Coordinate 1",
        y="UMAP Coordinate 2"
    ) +
    theme(
        plot.title=element_text(size=30, face="bold", hjust=0.5),
        axis.title=element_text(size=25),
        axis.text=element_text(size=15)
    )

# -- Close the device
dev.off()
