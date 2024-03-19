import argparse
import json
import yaml
import pandas as pd
import matplotlib.pyplot as plt
import sys
import os

def load_data(file_path):
    """
    Load data from a JSON or YAML file based on the file extension.
    """
    _, file_ext = os.path.splitext(file_path)
    if file_ext.lower() == '.json':
        with open(file_path, 'r') as file:
            return json.load(file)
    elif file_ext.lower() in ['.yaml', '.yml']:
        with open(file_path, 'r') as file:
            return yaml.safe_load(file)
    else:
        raise ValueError("Unsupported file type. Please use a JSON or YAML file.")

def plot_data(data, output_file):
    # Determine if data is PXF based on the presence of 'subject' in the first item
    is_pxf = 'subject' in data[0]

    # Define histogram and pie chart keys for both formats
    if is_pxf:
        histogram_keys = ["diseases", "measurements", "medicalActions"]
        pie_chart_keys = ["sex", "vitalStatus"]
        main_title = "Phenotype Exchange Format"
    else:
        histogram_keys = ["diseases", "exposures", "interventionsOrProcedures", "measures", "phenotypicFeatures", "treatments"]
        pie_chart_keys = ["ethnicity", "geographicOrigin", "karyotypicSex", "sex"]
        main_title = "Beacon Friendly Format"

    # Count the total number of objects
    total_objects = len(data)

    # Modify the main title to include the count of objects with 'n' in italics
    main_title = f"{main_title} ($n$ = {total_objects})"

    # Combine all keys and sort them
    all_keys = sorted(set(histogram_keys + pie_chart_keys))

    # Initialize dictionaries for counts and pie chart data
    counts = {key: [] for key in histogram_keys}
    pie_data = {key: [] for key in pie_chart_keys}

    # Process the data
    for item in data:
        for key in histogram_keys:
            # Ensure that item.get(key, []) always returns a list
            key_data = item.get(key)
            if key_data is None:
                key_data = []
            counts[key].append(len(key_data))
        if is_pxf:
            subject = item.get("subject", {})
            for key in pie_chart_keys:
                pie_data[key].append(subject.get(key, "Unknown"))
        else:
            for key in pie_chart_keys:
                if key in item:
                    pie_data[key].append(item[key]['label'] if 'label' in item[key] else 'Unknown')

    # Determine the number of rows and columns for subplots
    num_plots = len(histogram_keys) + len(pie_chart_keys)
    num_cols = 2
    num_rows = num_plots // num_cols + num_plots % num_cols

    # Increase the figure height to provide more vertical space
    fig_height = 5 * num_rows
    fig, axes = plt.subplots(nrows=num_rows, ncols=num_cols, figsize=(14, fig_height))

    # Function to get the subplot index
    get_subplot_index = lambda key: all_keys.index(key)

    # Plot histograms and pie charts
    for key in all_keys:
        row, col = divmod(get_subplot_index(key), num_cols)
        ax = axes[row, col]
        if key in histogram_keys:
            ax.hist(counts[key], bins=10, edgecolor='black')
            ax.set_title(f"Histogram of '{key}'")
            #ax.set_title(f"Histogram of $\it{{{key}}}$") # Difficult to read
            ax.set_xlabel('Number of Elements')
            ax.set_ylabel('Frequency')
        elif key in pie_chart_keys:
            pie_series = pd.Series(pie_data[key], dtype=object).value_counts()
            ax.pie(pie_series, labels=pie_series.index, autopct='%1.1f%%', startangle=90)
            ax.set_title(f"Pie Chart of '{key}'")
            #ax.set_title(f"Pie Chart of $\it{{{key}}}$") # # Difficult to read

    # Hide empty subplots if any
    for i in range(len(all_keys), num_rows * num_cols):
        row, col = divmod(i, num_cols)
        axes[row, col].axis('off')

    # Adjust layout with increased vertical spacing
    plt.tight_layout(pad=3.0, h_pad=5.0)

    # Create the main figure title
    plt.suptitle(main_title, fontsize=16)

    # Adjust layout and spacing for the main title
    plt.tight_layout(pad=3.0, h_pad=5.0)
    plt.subplots_adjust(top=0.95)  # Adjust the top padding

    # Save the figure as a PNG file
    plt.savefig(output_file, bbox_inches='tight')

    # Optionally, you can also display the plot if needed
    # plt.show()

def validate_file_extension(file_name, valid_extensions):
    if not any(file_name.endswith(ext) for ext in valid_extensions):
        raise argparse.ArgumentTypeError(f"File must have one of the following extensions: {', '.join(valid_extensions)}")
    return file_name 

# Main functions for CLI
def main_generate():
    parser = argparse.ArgumentParser(description='Process BFF/PXF (JSON or YAML) data and generate plots in a PNG file.')
    parser.add_argument('-i', '--input', type=lambda f: validate_file_extension(f, ['.json', '.yaml', '.yml']), required=True, help='Input JSON or YAML file path (e.g., "data.json" or "data.yaml").')
    parser.add_argument('-o', '--output', type=lambda f: validate_file_extension(f, ['.png']), default='output_plots.png', help='Optional: Output PNG file path (default: "output_plots.png")')
    parser.add_argument('-v', '--verbose', action='store_true', help='Increase output verbosity')

    args = parser.parse_args()

    if args.verbose:
        print(f"Loading data from {args.input}...")
    
    data = load_data(args.input)

    if args.verbose:
        print(f"Generating plot and saving to {args.output}...")

    plot_data(data, args.output)

    if args.verbose:
        print("Plot generation completed!")
