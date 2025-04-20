 # Install the necessary packages if not already installed
 if (!requireNamespace("igraph", quietly = TRUE)) {
     install.packages("igraph")
 }
 library(igraph)
 
 # Define start and end nodes
 START_NODE <- "PR_1"
 END_NODE <- "PR_2"
 
 # Read the data matrix from a file, assuming it's a distance matrix
 data <- as.matrix(read.table("matrix.txt", header = TRUE, row.names = 1, check.names = FALSE))
 
 # Adjust weights of zero to a small positive value for calculation
 data[data == 0] <- 1e-10
 
 # Create an igraph graph from the adjusted distance matrix
 g <- graph_from_adjacency_matrix(data, mode = "undirected", weighted = TRUE, diag = FALSE)
 
 # Set node names
 V(g)$label <- V(g)$name  # assuming node names are already defined
 
 # Find the shortest paths between START_NODE and END_NODE
 shortest_path <- shortest_paths(g, from = START_NODE, to = END_NODE, mode = "out", output = "vpath")
 
 # Extract the edges in the shortest path
 edges_in_path <- E(g, path = unlist(shortest_path$vpath))
 
 # Define colors for vertices and edges
 vertex_colors <- ifelse(V(g)$name == START_NODE, "orange", ifelse(V(g)$name == END_NODE, "green", "grey"))
 edge_colors <- ifelse(E(g) %in% edges_in_path, "black", "grey")
 edge_widths <- ifelse(E(g) %in% edges_in_path, 3, 0.2)
 
 # Prepare edge labels to display original values
 edge_labels <- ifelse(E(g)$weight == 1e-10, 0, E(g)$weight)
 
 # Start PNG device
 png(filename = "igraph.png", width = 1000, height = 1000,
     units = "px", pointsize = 12, bg = "white", res = NA)
 
 # Plot the graph
 plot(g, layout = layout_nicely(g),
      edge.label.cex = 3,  # Edge label size
      edge.color = edge_colors,
      edge.width = edge_widths,
      edge.label = edge_labels,  # Use adjusted labels for display
      label.font=2,  # Bold labels
      label.distance = 1,
      vertex.color = vertex_colors,
      vertex.size = 40,  # Increased node size
      vertex.label.cex = 3.0, # Size of labels
      vertex.label.color = "black", # Label color
      vertex.label.font = 2, # Bold labels
      vertex.label.family = "sans", # Font family
      vertex.label.fontcolor = "black") # Font color
 dev.off()
