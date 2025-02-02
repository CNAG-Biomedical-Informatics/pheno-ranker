 # Install the necessary packages if not already installed
 if (!requireNamespace("qgraph", quietly = TRUE)) {
     install.packages("qgraph")
 }
 library(qgraph)
 data <- as.matrix(read.table("matrix.txt", header = TRUE, row.names = 1, check.names = FALSE))
 
 # Start PNG device
 png(filename = "qgraph.png", width = 1000, height = 1000,
     units = "px", pointsize = 12, bg = "white", res = NA)
 
 # Toggle for coloring the last node black
 colorLastNodeBlack <- FALSE  # Change to TRUE for black / FALSE to retain original color
 
 # Function to determine color based on threshold values
 getColorBasedOnThreshold <- function(value, thresholdHigh, thresholdMid, colorHigh, colorMid, colorLow) {
   if (value > thresholdHigh) {
     return(colorHigh)
   } else if (value > thresholdMid) {
     return(colorMid)
   } else {
     return(colorLow)
   }
 }
 
 # Apply this function to each node and edge
 node_thresholds <- apply(data, 1, function(x) sum(x > 0.9))
 max_node_threshold <- max(node_thresholds)
 min_node_threshold <- min(node_thresholds)
 normalized_node_thresholds <- (node_thresholds - min_node_threshold) / (max_node_threshold - min_node_threshold)
 
 # Color nodes based on normalized threshold
 node_colors <- colorRampPalette(c("red", "green", "blue"))(length(unique(normalized_node_thresholds)))
 node_colors <- node_colors[as.integer(cut(normalized_node_thresholds, breaks = length(node_colors), include.lowest = TRUE))]
 
 # Conditionally color the last node black
 if (colorLastNodeBlack) {
     node_colors[length(node_colors)] <- "black"  # Last node in black
 }
 
 # Edge colors with similar logic
 edge_colors <- apply(data, c(1,2), function(x) getColorBasedOnThreshold(x, 0.90, 0.50, "blue", "green", "red"))
 edge_colors <- matrix(edge_colors, nrow=nrow(data), ncol=ncol(data))
 
 # Create and plot the graph
 qgraph(data,
        labels=colnames(data),
        layout='spring',
        label.font=2,  # Bold labels
        vsize=10,      # Node size
        threshold=0.50,  # Edge visibility threshold
        shape='circle',
        color=node_colors,  # Node colors
        edge.color=edge_colors,  # Edge colors
        edge.width=1)  # Edge width
 
 # Close the device to save the PNG file
 dev.off()
