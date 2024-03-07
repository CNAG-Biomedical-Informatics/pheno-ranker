# Load required libraries
library(ggplot2)
library(ggrepel)
library(dplyr)
library(stringr)

parseArguments <- function() {
  args <- commandArgs(trailingOnly = TRUE)
  
  # Notify the user about the required files
  cat("Note: Ensure 'matrix.txt' and 'pheno_table.csv' are in the same directory as this script.\n\n")
  
  # Ensure the correct number of arguments are passed; otherwise, print the usage information
  if (length(args) < 4) {
    cat("Usage: Rscript script_name.R <disease_column> <ID_column> '<numeric_comorbidities>'\n")
    cat("<disease_column>: Name of the column in 'pheno_table.csv' for disease information (e.g., 'Diagnosis_Disease.at.onset').\n")
    cat("<ID_column>: Name of the column in 'pheno_table.csv' that matches the IDs in 'matrix.txt' (e.g., 'ID').\n")
    cat("<numeric_comorbidities>: Names of the columns in 'pheno_table.csv' representing numeric comorbidities, enclosed in quotes and separated by spaces (e.g., 'Demography_Age Demography_Year.of.birth'). Note: Include all numeric comorbidities in a single string enclosed in quotes.\n\n")
    cat("Example: Rscript this_script.R Diagnosis_Disease.at.onset ID 'Demography_Age Demography_Year.of.birth Diagnosis_Age.at.onset Medication_Average.Weekly.Dose Sampling_Disease.duration Symptom_Disease.activity'\n")
    stop("Insufficient arguments provided.")
  }
  
  # Parsing command line arguments
  disease_column <- args[1]
  ID_column <- args[2]
  numeric_comorbidities <- unlist(strsplit(args[3], " "))
  
  # Return parsed arguments as a list
  return(list(disease_column = disease_column, ID_column = ID_column, numeric_comorbidities = numeric_comorbidities))
}

# Use the function at the start of your script to parse and validate arguments
parsed_args <- parseArguments()

# Accessing the parsed arguments
disease_column <- parsed_args$disease_column
ID_column <- parsed_args$ID_column
numeric_comorbidities <- parsed_args$numeric_comorbidities

# Use the function at the start of your script to parse and validate arguments
parsed_args <- parseArguments()

# Accessing the parsed arguments
disease_column <- parsed_args$disease_column
ID_column <- parsed_args$ID_column
numeric_comorbidities <- parsed_args$numeric_comorbidities

# Read in the expression data matrix
data <- as.matrix(read.table("matrix.txt", header = TRUE, row.names = 1))

# Perform Multidimensional Scaling (MDS) on the data matrix
fit <- cmdscale(data, eig=TRUE, k=2)

# Extract the (x, y) coordinates from the MDS result
x <- fit$points[,1]
y <- fit$points[,2]

# Create a data frame with x, y coordinates and labels
df <- data.frame(x, y, label=row.names(data))

# Extract and add disease and ID columns from the label
df <- df %>%
  mutate(
    disease = str_extract(label, "^[^_]*"),  # Disease extracted from label before "_"
    ID = str_extract(label, "(?<=_)[^_]*$")  # ID extracted from label after "_"
  )

# Read phenotype table
pheno_table <- read.table(file="pheno_table.csv", sep=';', header=TRUE)

# Define the ANOVA function
anova_all <- function(mds, pheno_table, omicID_column, numeric_comorbidities) {
  # Prepare the data by merging MDS coordinates with phenotype data
  big_table <- merge(mds, pheno_table, by.x='label', by.y=omicID_column)
  
  # Initialize the results table
  results_list <- list()
  
  # Loop over each dimension (x, y) and each comorbidity
  for (dim in c("x", "y")) {
    for (comorbidity in setdiff(names(pheno_table), omicID_column)) {
      # Handle numeric and categorical comorbidities differently
      if (comorbidity %in% numeric_comorbidities) {
        # Numeric comorbidity analysis
        formula <- as.formula(paste0(dim, "~", comorbidity))
        aov_res <- summary(aov(formula, data = big_table))
        results_list[[paste0(dim, "_", comorbidity)]] <- c(coor=dim, comorbidity=comorbidity, aov_res[[1]][, -1])
      } else {
        # Categorical comorbidity analysis, converting to factor
        big_table[[comorbidity]] <- factor(big_table[[comorbidity]])
        if (length(unique(big_table[[comorbidity]])) > 1) {
          formula <- as.formula(paste0(dim, "~", comorbidity))
          aov_res <- summary(aov(formula, data = big_table))
          results_list[[paste0(dim, "_", comorbidity)]] <- c(coor=dim, comorbidity=comorbidity, aov_res[[1]][, -1])
        }
      }
    }
  }
  
  # Convert the results list to a data frame
  table.results <- do.call(rbind, results_list)
  
  # Adjust p-values for multiple testing
  table.results$p_BH <- p.adjust(table.results$Pr, method = "BH")
  
  # Return the results
  return(table.results)
}

# Perform the ANOVA analysis with the specified columns and numeric comorbidities
anova_all_table <- anova_all(df, pheno_table, args[1], as.numeric(args[3:length(args)]))

# Format and write the output table to a file
write.table(anova_all_table, file="anova_mds.csv", quote=FALSE, sep=";", row.names=FALSE, col.names=TRUE, dec=".")
