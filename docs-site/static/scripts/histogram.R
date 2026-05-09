# Load required packages
library(ggplot2)

# Read the CSV file into a data frame
df <- read.csv("counts.csv")

# Calculate the average and median counts
average_count <- mean(df$count)
median_count <- median(df$count)

# Generate the histogram and add vertical lines for the average and median
plot <- ggplot(df, aes(x = count)) +
  geom_histogram(binwidth = 1, fill = "steelblue", color = "black") +
  geom_vline(aes(xintercept = average_count), color = "black", linetype = "dashed", linewidth = 1) +
  geom_vline(aes(xintercept = median_count), color = "red", linetype = "dashed", linewidth = 1) +
  labs(title = "Distribution of Element Counts per Object",
       x = "Number of Elements",
       y = "Frequency") +
  theme_minimal() +
  annotate("text", x = average_count + 0.5, y = Inf, label = paste("Mean:", round(average_count, 2)), vjust = 2) +
  annotate("text", x = median_count - 0.5, y = Inf, label = paste("Median:", round(median_count, 2)), vjust = 2, color = "red")

# Save the plot as a PNG file
ggsave("histogram_with_mean_median.png", plot = plot, width = 8, height = 6, dpi = 300)

# Print confirmation
cat("Histogram saved as histogram_with_mean_median.png\n")
