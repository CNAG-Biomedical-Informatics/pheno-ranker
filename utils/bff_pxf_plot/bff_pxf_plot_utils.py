import argparse
import json
import textwrap
import yaml
import pandas as pd
import matplotlib.pyplot as plt
from matplotlib import colors as mcolors
import os


BASE_COLORS = [
    "#1f4e79",
    "#2a9d8f",
    "#e9c46a",
    "#f4a261",
    "#e76f51",
    "#6d597a",
    "#577590",
]


def format_key_title(key):
    """
    Preserve schema field names while spacing camelCase keys for display.
    """
    spaced = []
    for idx, char in enumerate(key):
        if idx > 0 and char.isupper() and key[idx - 1].islower():
            spaced.append(" ")
        spaced.append(char)
    return "".join(spaced)


def lighten_color(color, amount=0.25):
    """
    Blend a color towards white to create a softer palette.
    """
    r, g, b = mcolors.to_rgb(color)
    return (
        r + (1 - r) * amount,
        g + (1 - g) * amount,
        b + (1 - b) * amount,
    )


def stylize_axis(ax):
    """
    Apply a lighter chart style without relying on external themes.
    """
    ax.set_facecolor("#f8fafc")
    ax.grid(axis="y", color="#d9e2ec", linestyle="--", linewidth=0.8, alpha=0.8)
    ax.set_axisbelow(True)
    ax.spines["top"].set_visible(False)
    ax.spines["right"].set_visible(False)
    ax.spines["left"].set_color("#bcccdc")
    ax.spines["bottom"].set_color("#bcccdc")
    ax.tick_params(colors="#486581", length=3)


def get_histogram_bins(values):
    """
    Keep bins readable for small integer counts.
    """
    if not values:
        return 1
    max_value = max(values)
    return range(0, max_value + 2)


def set_integer_ticks(ax, bins):
    ticks = list(bins)
    if len(ticks) > 10:
        step = max(1, int(round(len(ticks) / 8.0)))
        ticks = ticks[::step]
        if ticks[-1] != list(bins)[-1]:
            ticks.append(list(bins)[-1])
    ax.set_xticks(ticks)


def style_pie_texts(texts, autotexts=None):
    for text in texts:
        text.set_color("#334e68")
        text.set_fontsize(8)
    if autotexts is not None:
        for autotext in autotexts:
            autotext.set_color("#102a43")
            autotext.set_fontsize(8)


def get_pie_colors(size):
    return [lighten_color(BASE_COLORS[i % len(BASE_COLORS)], 0.10) for i in range(size)]


def normalize_category_label(value):
    """
    Make categorical labels shorter and more readable without changing meaning.
    """
    if value is None:
        return "Unknown"

    if isinstance(value, dict):
        if "status" in value:
            return str(value.get("status", "Unknown"))
        if len(value) == 1:
            key = list(value.keys())[0]
            return str(value.get(key, "Unknown"))
        return "Unknown"

    if isinstance(value, list):
        if not value:
            return "Unknown"
        return normalize_category_label(value[0])

    raw_value = value.strip()
    if not raw_value:
        return "Unknown"

    try:
        parsed = yaml.safe_load(raw_value)
        if isinstance(parsed, (dict, list)):
            return normalize_category_label(parsed)
    except Exception:
        pass

    return raw_value


def format_legend_label(label, width=16):
    return textwrap.fill(str(label), width=width, break_long_words=False)


def autopct_factory(total):
    """
    Show both percentage and count when the slice is large enough.
    """
    def _autopct(pct):
        count = int(round((pct / 100.0) * total))
        if pct < 4:
            return ""
        return "{:.0f}%\n(n={})".format(pct, count)
    return _autopct


def pie_needs_legend(labels):
    """
    Use legends for verbose labels so they do not collide above the chart.
    """
    return any(len(str(label)) > 14 for label in labels) or sum(len(str(label)) for label in labels) > 34

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
        histogram_keys = ["diseases", "interpretations", "measurements", "medicalActions", "phenotypicFeatures"]
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
                pie_data[key].append(normalize_category_label(subject.get(key, "Unknown")))
        else:
            for key in pie_chart_keys:
                if key in item:
                    label = item[key]['label'] if 'label' in item[key] else 'Unknown'
                    pie_data[key].append(normalize_category_label(label))

    # Determine the number of rows and columns for subplots
    num_plots = len(histogram_keys) + len(pie_chart_keys)
    num_cols = 2
    num_rows = num_plots // num_cols + num_plots % num_cols

    plt.rcParams.update({
        "font.family": "DejaVu Sans",
        "font.size": 9,
        "axes.titlesize": 12,
        "axes.titleweight": "bold",
        "axes.labelsize": 9,
        "xtick.labelsize": 8,
        "ytick.labelsize": 8,
    })

    fig_height = 4.5 * num_rows
    fig, axes = plt.subplots(
        nrows=num_rows,
        ncols=num_cols,
        figsize=(14.5, fig_height),
        facecolor="#eef4f8",
    )
    if num_rows == 1:
        axes = [axes] if num_cols == 1 else axes.reshape(1, -1)

    # Function to get the subplot index
    get_subplot_index = lambda key: all_keys.index(key)

    # Plot histograms and pie charts
    for key in all_keys:
        row, col = divmod(get_subplot_index(key), num_cols)
        ax = axes[row, col]
        schema_label = format_key_title(key)
        base_color = BASE_COLORS[get_subplot_index(key) % len(BASE_COLORS)]
        if key in histogram_keys:
            values = counts[key]
            bins = get_histogram_bins(values)
            ax.hist(
                values,
                bins=bins,
                color=lighten_color(base_color, 0.15),
                edgecolor=base_color,
                linewidth=1.2,
                rwidth=0.82,
            )
            stylize_axis(ax)
            ax.set_title("Histogram of '{}'".format(schema_label), loc="left", color="#102a43")
            ax.set_xlabel("Number of Elements")
            ax.set_ylabel("Frequency")
            ax.margins(x=0.03)
            if values:
                ax.text(
                    0.98,
                    0.95,
                    "mean elements {:.1f}".format(sum(values) / float(len(values))),
                    transform=ax.transAxes,
                    ha="right",
                    va="top",
                    fontsize=9,
                    color="#486581",
                    bbox=dict(boxstyle="round,pad=0.25", facecolor="white", edgecolor="none", alpha=0.9),
                )
                set_integer_ticks(ax, bins)
        elif key in pie_chart_keys:
            pie_series = pd.Series(pie_data[key], dtype=object).value_counts()
            ax.set_facecolor("#f8fafc")
            if pie_series.empty or (len(pie_series) == 1 and pie_series.index[0] == "Unknown"):
                ax.set_title("Pie Chart of '{}'".format(schema_label), loc="left", color="#102a43")
                ax.set_xticks([])
                ax.set_yticks([])
                for spine in ax.spines.values():
                    spine.set_visible(False)
                ax.text(
                    0.5,
                    0.5,
                    "No data",
                    transform=ax.transAxes,
                    ha="center",
                    va="center",
                    fontsize=12,
                    color="#7b8794",
                    fontweight="bold",
                )
            elif len(pie_series) == 1:
                wedges, texts, autotexts = ax.pie(
                    pie_series,
                    labels=pie_series.index,
                    autopct=autopct_factory(int(pie_series.sum())),
                    startangle=90,
                    counterclock=False,
                    colors=get_pie_colors(len(pie_series)),
                    wedgeprops=dict(edgecolor="white", linewidth=1.5),
                    pctdistance=0.62,
                    textprops=dict(color="#334e68", fontsize=8),
                )
                style_pie_texts(texts, autotexts)
            elif len(pie_series) <= 4:
                use_legend = pie_needs_legend(pie_series.index)
                wedges, texts, autotexts = ax.pie(
                    pie_series,
                    labels=None if use_legend else pie_series.index,
                    autopct=autopct_factory(int(pie_series.sum())),
                    startangle=90,
                    counterclock=False,
                    colors=get_pie_colors(len(pie_series)),
                    wedgeprops=dict(width=0.45, edgecolor="white", linewidth=1.5),
                    pctdistance=0.74,
                    labeldistance=1.07,
                    textprops=dict(color="#334e68", fontsize=9),
                )
                style_pie_texts(texts, autotexts)
                if use_legend:
                    legend_labels = [format_legend_label(label) for label in pie_series.index]
                    ax.legend(
                        wedges,
                        legend_labels,
                        loc="center left",
                        bbox_to_anchor=(0.96, 0.5),
                        frameon=False,
                        fontsize=8,
                    )
                ax.text(
                    0,
                    0,
                    str(int(pie_series.sum())),
                    ha="center",
                    va="center",
                    fontsize=14,
                    fontweight="bold",
                    color="#102a43",
                )
            else:
                top_n = 7
                if len(pie_series) > top_n:
                    others = pie_series.iloc[top_n:].sum()
                    pie_series = pd.concat(
                        [pie_series.iloc[:top_n], pd.Series([others], index=["Other"])],
                    )
                wedges, texts, autotexts = ax.pie(
                    pie_series,
                    labels=None,
                    autopct=autopct_factory(int(pie_series.sum())),
                    startangle=90,
                    counterclock=False,
                    colors=get_pie_colors(len(pie_series)),
                    wedgeprops=dict(edgecolor="white", linewidth=1.2),
                    pctdistance=0.76,
                    labeldistance=1.1,
                    textprops=dict(color="#334e68", fontsize=8),
                )
                style_pie_texts(texts, autotexts)
                legend_labels = [format_legend_label(label) for label in pie_series.index]
                ax.legend(
                    wedges,
                    legend_labels,
                    loc="center left",
                    bbox_to_anchor=(0.96, 0.5),
                    frameon=False,
                    fontsize=8,
                )
            ax.set_title("Pie Chart of '{}'".format(schema_label), loc="left", color="#102a43")

    # Hide empty subplots if any
    for i in range(len(all_keys), num_rows * num_cols):
        row, col = divmod(i, num_cols)
        axes[row, col].axis('off')

    # Create the main figure title
    plt.suptitle(main_title, fontsize=18, fontweight="bold", color="#102a43", y=0.995)

    # Adjust layout and spacing for the main title
    plt.tight_layout(pad=2.0, h_pad=2.4, w_pad=1.6)
    plt.subplots_adjust(top=0.93)

    # Save the figure as a PNG file
    plt.savefig(output_file, bbox_inches='tight', dpi=220, facecolor=fig.get_facecolor())
    plt.close(fig)

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
