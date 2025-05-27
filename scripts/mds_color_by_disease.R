# Load necessary libraries
library(ggplot2)
library(ggrepel)
library(jsonlite)

# Read in the input file as a matrix 
data <- as.matrix(read.table("matrix.txt", header = TRUE, row.names = 1))

# Perform multidimensional scaling
fit <- cmdscale(data, eig=TRUE, k=2)

# Extract (x, y) coordinates
x <- fit$points[,1]
y <- fit$points[,2]

# Create data frame
df <- data.frame(x, y, label = row.names(data))

# Read the JSON file
diseases_info <- fromJSON("diseases_info.json")

# Function to process disease code
process_disease_code <- function(code) {
    # Extract the OMIM number or meaningful part of the disease code
    matches <- regexpr("OMIM:[0-9]+", code)
    omim_ids <- regmatches(code, matches)
    # Remove "OMIM:" prefix
    omim_ids <- sub("OMIM:", "", omim_ids)
    # Return the first OMIM ID or "Unknown" if none found
    if (length(omim_ids) > 0 && nchar(omim_ids[1]) > 0) {
        return(omim_ids[1])
    } else {
        return("Unknown")
    }
}

# Map disease labels
disease_labels <- sapply(df$label, function(label) {
    disease_info <- diseases_info[[label]]
    if (!is.null(disease_info)) {
        disease_codes <- names(disease_info)
        process_disease_code(disease_codes[1])
    } else {
        "Unknown"
    }
})

# Add disease labels to df
df$disease <- disease_labels

# Decide which points to label
# For example, label only points with disease "142900"
# Or set to "" to label no points
df$label_to_show <- ""  # No labels will be displayed

# Alternatively, label specific points (uncomment and adjust as needed)
# df$label_to_show <- ifelse(df$disease == "142900", df$label, "")
# df$label_to_show <- ifelse(1:nrow(df) %in% c(1, 5, 10), df$label, "")  # Label specific indices

# Create the plot
ggplot(df, aes(x, y)) +
  geom_point(aes(color = disease), size = 3) +
  geom_text_repel(
      aes(label = label_to_show),
      size = 5,
      box.padding = 0.2,
      max.overlaps = Inf,   # Allows all specified labels to be shown
      color = "black",      # Labels in default color
      show.legend = FALSE   # Do not include labels in the legend
  ) +
  labs(
      title = "Multidimensional Scaling Results",
      x = "Hamming Distance MDS Coordinate 1",
      y = "Hamming Distance MDS Coordinate 2"
  ) +
  theme(
      plot.title = element_text(size = 30, face = "bold", hjust = 0.5),
      axis.title = element_text(size = 25),
      axis.text = element_text(size = 15),
      legend.position = "none"  # Remove the legend
  )

# Save the plot
ggsave("mds_color_by_disease.png", width = 10, height = 10, units = "in", dpi = 300)
