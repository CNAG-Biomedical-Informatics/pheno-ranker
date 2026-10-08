import argparse
import base64
from io import BytesIO
import json
import textwrap
import yaml
import matplotlib.pyplot as plt
import os
from collections import Counter
from statistics import median
from html import escape


# From docs-site/static/img/iconhex.svg; embedded for standalone and frozen builds.
REPORT_LOGO_SVG = """<svg width="301" height="346" viewBox="0 0 301 346" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M9 251.858V92.2015L150.985 10.3956L292 92.1842V251.875L150.985 335.544L9 251.858Z" fill="white" stroke="#0E3F71" stroke-width="18"/>
<circle cx="138.617" cy="146.135" r="10.135" fill="#FBB79F"/>
<path d="M126 171.369C126 164.401 131.649 158.752 138.617 158.752V158.752C145.585 158.752 151.234 164.401 151.234 171.369V186.49C151.234 187.163 150.688 187.709 150.015 187.709H127.219C126.546 187.709 126 187.163 126 186.49V171.369Z" fill="#FBB79F"/>
<circle cx="95.6171" cy="146.426" r="10.135" fill="#FBB79F"/>
<path d="M83 171.66C83 164.692 88.6488 159.043 95.617 159.043V159.043C102.585 159.043 108.234 164.692 108.234 171.66V186.781C108.234 187.454 107.688 188 107.015 188H84.2192C83.5459 188 83 187.454 83 186.781V171.66Z" fill="#FBB79F"/>
<circle cx="190.617" cy="146.135" r="10.135" fill="#FBB79F"/>
<path d="M178 171.369C178 164.401 183.649 158.752 190.617 158.752V158.752C197.585 158.752 203.234 164.401 203.234 171.369V186.49C203.234 187.163 202.688 187.709 202.015 187.709H179.219C178.546 187.709 178 187.163 178 186.49V171.369Z" fill="#FBB79F"/>
<circle cx="222.396" cy="159.564" r="11.564" fill="#90CAF9"/>
<path d="M208 188.356C208 180.405 214.445 173.96 222.396 173.96V173.96C230.347 173.96 236.792 180.405 236.792 188.356V205.609C236.792 206.377 236.169 207 235.401 207H209.391C208.623 207 208 206.377 208 205.609V188.356Z" fill="#90CAF9"/>
<circle cx="116.396" cy="159.564" r="11.564" fill="#90CAF9"/>
<path d="M102 188.356C102 180.405 108.445 173.96 116.396 173.96V173.96C124.347 173.96 130.792 180.405 130.792 188.356V205.609C130.792 206.377 130.169 207 129.401 207H103.391C102.623 207 102 206.377 102 205.609V188.356Z" fill="#90CAF9"/>
<circle cx="79.396" cy="159.564" r="11.564" fill="#90CAF9"/>
<path d="M65 188.356C65 180.405 71.4453 173.96 79.396 173.96V173.96C87.3467 173.96 93.792 180.405 93.792 188.356V205.609C93.792 206.377 93.1692 207 92.4008 207H66.3912C65.6228 207 65 206.377 65 205.609V188.356Z" fill="#90CAF9"/>
<circle cx="169.5" cy="140.5" r="24.5" fill="#1976D2"/>
<path d="M139 201.5C139 184.655 152.655 171 169.5 171V171C186.345 171 200 184.655 200 201.5V239C200 240.105 199.105 241 198 241H141C139.895 241 139 240.105 139 239V201.5Z" fill="#1976D2"/>
<rect x="105.781" y="201.735" width="20.1279" height="55.7687" rx="4" transform="rotate(30 105.781 201.735)" fill="#0E3F71"/>
<circle cx="149" cy="156" r="61.5" stroke="#0E3F71" stroke-width="17"/>
</svg>"""

ANNOTATION_NOTE = ("Descriptor counts reflect the available annotations, not necessarily "
                   "disease complexity or annotation quality.")

CHART_COLORS = {
    "phenotypicFeatures": "#527aab",
    "diseases": "#aa7852",
    "Phenotypes (not excluded)": "#527aab",
    "Diseases (not excluded)": "#aa7852",
    "Excluded phenotypes": "#ae5960",
    "Section coverage": "#7c8795",
}


def chart_color(key):
    return CHART_COLORS.get(key, "#73899e")


UNIQUE_PHENOTYPES = "Unique non-excluded phenotype IDs"


def distribution_summary(values):
    """Summarize counts with linearly interpolated percentiles over all records."""
    if not values:
        raise ValueError("Cannot summarize an empty collection of records")
    ordered = sorted(values)

    def percentile(fraction):
        position = (len(ordered) - 1) * fraction
        lower = int(position)
        upper = min(lower + 1, len(ordered) - 1)
        return ordered[lower] + (ordered[upper] - ordered[lower]) * (position - lower)

    return {"mean": sum(values) / len(values), "median": median(ordered),
            "q1": percentile(.25), "q3": percentile(.75),
            "p10": percentile(.1), "p90": percentile(.9),
            "min": ordered[0], "max": ordered[-1]}


def term_frequencies(data, is_pxf):
    """Count each ontology ID once per record and status, never by label alone."""
    counts = {key: Counter() for key in ("Phenotypes (not excluded)", "Excluded phenotypes", "Diseases (not excluded)")}
    labels = {}
    skipped = Counter()
    unique_counts = []
    for record in data:
        seen = {key: set() for key in counts}
        for section, field in (("phenotypicFeatures", "type" if is_pxf else "featureType"),
                               ("diseases", "term" if is_pxf else "diseaseCode")):
            for entry in record.get(section) or []:
                if not isinstance(entry, dict):
                    raise ValueError(f"{section} entries must be objects")
                excluded = entry.get("excluded", False)
                if not isinstance(excluded, bool):
                    raise ValueError(f"{section}.excluded must be true or false")
                if section == "diseases" and excluded:
                    skipped["excluded disease entries"] += 1
                    continue
                group = ("Diseases (not excluded)" if section == "diseases" else
                         "Excluded phenotypes" if excluded else "Phenotypes (not excluded)")
                term = entry.get(field)
                if not isinstance(term, dict) or not isinstance(term.get("id"), str) or not term["id"].strip():
                    skipped["entries without a usable ontology ID"] += 1
                    continue
                identity = term["id"].strip()
                seen[group].add(identity)
                label = term.get("label")
                if isinstance(label, str) and label.strip():
                    labels.setdefault(identity, set()).add(label.strip())
        for group, terms in seen.items():
            counts[group].update(terms)
        unique_counts.append(len(seen["Phenotypes (not excluded)"]))
    # Stable choice if the same ID has different labels in different records.
    return {group: [{"id": identity, "label": min(labels.get(identity, {""})),
                     "count": count} for identity, count in
                    sorted(counter.items(), key=lambda pair: (-pair[1], pair[0]))]
            for group, counter in counts.items()}, dict(skipped), unique_counts


def draw_frequency_axis(ax, title, entries, total, coverage=False):
    """Keep labels inside the panel rather than squeezing adjacent panels."""
    shown = entries if coverage else entries[:6]
    ax.set_title(title, loc="left", fontsize=12, fontweight="bold", color="#183b45", pad=30)
    for spine in ax.spines.values():
        spine.set_visible(False)
    ax.set_xlim(0, 118)
    ax.set_ylim(len(shown) - .35, -.8)
    ax.set_yticks([])
    ax.set_xticks([0, 25, 50, 75, 100])
    ax.tick_params(length=0, colors="#52616f", labelsize=9)
    ax.set_xlabel("Records (%)", fontsize=9, color="#52616f")
    ax.set_axisbelow(True)
    ax.grid(axis="x", color="#e6ecec", linewidth=.6)
    for index, row in enumerate(shown):
        percent = row["count"] / total * 100
        ax.barh(index, percent, height=.22, color=chart_color(title))
        label = row["id"] if coverage else (textwrap.shorten(row["label"], 39, placeholder="...") + " | " + row["id"] if row["label"] else row["id"])
        ax.text(0, index - .18, label, fontsize=8, color="#183b45", va="bottom")
        ax.text(percent + 1, index, f'{row["count"]:,}', fontsize=8, color="#52616f", va="center")
    note = "Records with at least one entry" if coverage else f"Top {len(shown)} of {len(entries):,} terms | once per record"
    ax.text(0, 1.035, note, transform=ax.transAxes, fontsize=8.5, color="#52616f")
    if not shown:
        ax.text(.5, .5, "No qualifying annotations", transform=ax.transAxes,
                ha="center", color="#52616f")


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

    raw_value = str(value).strip()
    if not raw_value:
        return "Unknown"

    try:
        parsed = yaml.safe_load(raw_value)
        if isinstance(parsed, (dict, list)):
            return normalize_category_label(parsed)
    except Exception:
        pass

    return raw_value


def load_data(file_path):
    """
    Load data from a JSON or YAML file based on the file extension.
    """
    _, file_ext = os.path.splitext(file_path)
    if file_ext.lower() == '.json':
        with open(file_path, 'r', encoding='utf-8') as file:
            return json.load(file)
    elif file_ext.lower() in ['.yaml', '.yml']:
        with open(file_path, 'r', encoding='utf-8') as file:
            return yaml.safe_load(file)
    else:
        raise ValueError("Unsupported file type. Please use a JSON or YAML file.")

def draw_summary_axis(ax, key, values, categorical=False):
    """Draw comparable counts without relying on pie areas or crowded legends."""
    from matplotlib.ticker import MaxNLocator
    ax.set_facecolor("white")
    for spine in ax.spines.values():
        spine.set_visible(False)
    ax.tick_params(length=0, colors="#52616f", labelsize=9, pad=7)
    ax.set_axisbelow(True)
    ax.set_title(key, loc="left", fontsize=12, fontweight="bold", color="#183b45", pad=30)
    total = len(values)
    empty = all(value == "Unknown" for value in values) if categorical else not any(values)
    if empty:
        ax.set_axis_off()
        ax.text(.5, .58, "No reported category" if categorical else "No entries recorded",
                transform=ax.transAxes, ha="center", fontsize=15, color="#626b77")
        ax.text(.5, .42, f"All {total:,} records are Unknown" if categorical else
                f"All {total:,} records have zero entries",
                transform=ax.transAxes, ha="center", fontsize=10, color="#7c8795")
        if not categorical:
            ax.text(.5, .24, "Mean 0   |   Median 0", transform=ax.transAxes,
                    ha="center", fontsize=11, fontweight="bold", color="#29323e")
        return
    if categorical and key == "sex":
        counts = Counter(values)
        ordered = sorted(counts.items(), key=lambda item: (-item[1], str(item[0])))
        shown = ordered[:7]
        if len(ordered) > 7:
            shown.append(("Remaining categories (combined)", sum(count for _, count in ordered[7:])))
        palette = ["#527aab", "#c39561", "#7c8795", "#ae5960", "#88946e", "#668b9b", "#b09a89", "#999999"]
        wedges, _ = ax.pie([count for _, count in shown], startangle=90, counterclock=False,
                          colors=["#c7cbd0" if label == "Unknown" else palette[index]
                                  for index, (label, _) in enumerate(shown)],
                          wedgeprops={"edgecolor": "white", "linewidth": 1.5})
        labels = [f"{textwrap.fill(str(label), 22)}\n{count:,} records ({count / total:.1%})"
                  for label, count in shown]
        ax.legend(wedges, labels, loc="center left", bbox_to_anchor=(1, .5),
                  frameon=False, fontsize=9, labelspacing=1.2, handlelength=1.1,
                  labelcolor="#29323e")
        ax.text(0, 1.035, f"{total:,} records | missing values included as Unknown",
                transform=ax.transAxes, fontsize=8.5, color="#52616f")
        return
    if categorical:
        counts = Counter(values)
        ordered = sorted(counts.items(), key=lambda item: (-item[1], str(item[0])))
        remainder = sum(count for _, count in ordered[7:])
        shown = ordered[:7]
        if remainder:
            shown.append(("Remaining categories (combined)", remainder))
        labels = [textwrap.fill(str(label), 28, break_long_words=True) for label, _ in shown]
        numbers = [count for _, count in shown]
        bars = ax.barh(range(len(shown)), numbers, height=.58,
                       color=["#c7cbd0" if label == "Unknown" else chart_color(key) for label, _ in shown])
        ax.set_yticks(range(len(shown)), labels)
        ax.invert_yaxis()
        ax.set_xlim(0, max(numbers, default=1) * 1.4)
        ax.xaxis.set_major_locator(MaxNLocator(integer=True, nbins=4))
        ax.grid(axis="x", color="#e6ecec", linewidth=.6)
        ax.set_xlabel("Records", fontsize=9, color="#52616f", labelpad=8)
        for bar, count in zip(bars, numbers):
            ax.annotate(f"{count:,}  ({count / total:.0%})",
                        (bar.get_width(), bar.get_y() + bar.get_height() / 2),
                        xytext=(6, 0), textcoords="offset points", va="center",
                        fontsize=9, color="#183b45")
        note = f"{total - counts.get('Unknown', 0):,} of {total:,} records with a reported category"
        if remainder:
            note += " | 7 largest categories shown"
    else:
        distribution = Counter(values)
        xs = sorted(distribution)
        ax.bar(xs, [distribution[x] for x in xs], width=.78,
               color=chart_color(key), edgecolor="white", linewidth=.6)
        ax.grid(axis="y", color="#e6ecec", linewidth=.6)
        ax.xaxis.set_major_locator(MaxNLocator(integer=True, nbins=7, min_n_ticks=1))
        ax.yaxis.set_major_locator(MaxNLocator(integer=True, nbins=5))
        ax.set_xlabel("Unique non-excluded IDs per record" if key == UNIQUE_PHENOTYPES else "Entries per record", fontsize=9, color="#52616f", labelpad=8)
        ax.set_ylabel("Records", fontsize=9, color="#52616f", labelpad=8)
        ax.set_ylim(0, max(distribution.values(), default=1) * 1.18)
        if len(xs) == 1:
            ax.set_xlim(xs[0] - .8, xs[0] + .8)
            ax.set_xticks(xs)
        present = sum(value > 0 for value in values)
        average, middle = sum(values) / total, median(values)
        if abs(average - middle) < 1e-9:
            ax.axvline(average, color="#29323e", linestyle="--", linewidth=1.3,
                       label=f"Mean = Median  {average:g}")
        else:
            ax.axvline(average, color="#29323e", linestyle="--", linewidth=1.3,
                       label=f"Mean  {average:.1f}")
            ax.axvline(middle, color="#a35843", linestyle=":", linewidth=1.8,
                       label=f"Median  {middle:g}")
        ax.legend(loc="upper right", frameon=True, facecolor="white", edgecolor="#dddfe3",
                  framealpha=.95, fontsize=10)
        note = f"{present:,} of {total:,} records with entries"
    ax.text(0, 1.035, note, transform=ax.transAxes, fontsize=8.5, color="#52616f")


def summary_format(data):
    """Recognize reportable BFF/PXF structure, not full schema validity."""
    if not isinstance(data, list) or not data or any(not isinstance(item, dict) for item in data):
        raise ValueError("Expected a nonempty array of BFF or PXF records")
    if any('subject' in item for item in data):
        if not all(isinstance(item.get('subject'), dict) for item in data):
            raise ValueError("PXF records must each contain a subject object; do not mix BFF and PXF")
        return 'pxf'
    fields = {'phenotypicFeatures', 'diseases', 'measures', 'treatments',
              'interventionsOrProcedures', 'exposures', 'sex', 'karyotypicSex',
              'ethnicity', 'geographicOrigin'}
    if not any(fields.intersection(item) for item in data):
        raise ValueError("Phenotype summary supports BFF or PXF records only, not generic JSON or analysis exports")
    if any(item and not fields.intersection(item) and set(item) != {'id'} for item in data):
        raise ValueError("Unrecognized record structure; provide one cohort of BFF or PXF records")
    return 'bff'


def plot_data(data, output_file):
    if not str(output_file).lower().endswith('.html'):
        raise ValueError("Output must end with .html; PNG export has been replaced by the HTML report")
    is_pxf = summary_format(data) == 'pxf'
    if is_pxf:
        histogram_keys = ["phenotypicFeatures", "diseases", "measurements", "medicalActions", "interpretations"]
        category_keys = ["sex", "vitalStatus"]
        report_title = "Phenotype Exchange Format"
    else:
        histogram_keys = ["phenotypicFeatures", "diseases", "measures", "treatments", "interventionsOrProcedures", "exposures"]
        category_keys = ["sex", "karyotypicSex", "ethnicity", "geographicOrigin"]
        report_title = "Beacon Friendly Format"
    counts = {key: [] for key in histogram_keys}
    categories = {key: [] for key in category_keys}
    for item in data:
        for key in histogram_keys:
            value = item.get(key)
            if value is None:
                value = []
            if not isinstance(value, list):
                raise ValueError(f"{key} must be an array")
            counts[key].append(len(value))
        container = (item.get("subject") or {}) if is_pxf else item
        if not isinstance(container, dict):
            raise ValueError("subject must be an object")
        for key in category_keys:
            value = container.get(key)
            if not is_pxf and isinstance(value, dict):
                value = value.get("label", "Unknown")
            categories[key].append(normalize_category_label(value))
    frequencies, skipped, unique_counts = term_frequencies(data, is_pxf)
    distributions = {"phenotypicFeatures": counts["phenotypicFeatures"], UNIQUE_PHENOTYPES: unique_counts,
                     **{key: values for key, values in counts.items() if key != "phenotypicFeatures"}}
    coverage = [{"id": key, "count": sum(value > 0 for value in counts[key])} for key in histogram_keys]
    panels = []
    for anchor, heading, description, values, categorical in (
            ("distributions", "Entries per record", "Raw entry counts and unique non-excluded phenotype IDs, including records with zero counts.", distributions, False),
            ("categories", "Recorded categories", "Category counts across all records, including unknown values.", categories, True)):
        charts, empty_keys = [], []
        for key, entries in values.items():
            has_values = any(value != "Unknown" for value in entries) if categorical else any(entries)
            if has_values:
                charts.append(render_chart(draw_summary_axis, key, entries, categorical=categorical))
            else:
                empty_keys.append(key)
        empty_note = empty_sections_note("Unknown for every record" if categorical else "No entries in any record", empty_keys)
        panels.append(f'<section id="{anchor}"><h2>{heading}</h2><p class="section-description">{description}</p>'
                      + empty_note + '<div class="charts">' + ''.join(charts) + '</div></section>')
    charts = [render_chart(draw_frequency_axis, "Section coverage", coverage, len(data), coverage=True)] if any(row["count"] for row in coverage) else []
    charts.extend(render_chart(draw_frequency_axis, group, entries, len(data)) for group, entries in frequencies.items() if entries)
    empty_note = empty_sections_note("No qualifying ontology IDs", [group for group, entries in frequencies.items() if not entries])
    panels.append('<section id="frequencies"><h2>Coverage and frequent annotations</h2><p class="section-description">Which sections are populated, and which terms occur most often?</p>'
                  + empty_note + '<div class="charts">' + ''.join(charts) + '</div></section>')
    write_html_report(output_file, report_title, len(data), ''.join(panels), counts, frequencies, skipped, unique_counts)


def empty_sections_note(message, keys):
    if not keys:
        return ''
    return ('<p class="empty-sections"><strong>' + escape(message) + '</strong> '
            + '<span>' + ', '.join(escape(key) for key in keys) + '</span></p>')


def render_chart(draw, title, *args, **kwargs):
    """Embed crisp vector charts; only one small figure is in memory at a time."""
    with plt.rc_context({"font.family": "DejaVu Sans", "font.size": 9, "svg.fonttype": "none", "text.parse_math": False}):
        fig, ax = plt.subplots(figsize=(7, 4.4), facecolor="white")
        try:
            draw(ax, title, *args, **kwargs)
            pie = title == "sex" and kwargs.get("categorical")
            fig.subplots_adjust(left=.08 if pie else .32 if kwargs.get("categorical") else .12,
                                right=.65 if pie else .95, top=.77, bottom=.17)
            buffer = BytesIO()
            fig.savefig(buffer, format="svg", metadata={"Date": None})
            encoded = base64.b64encode(buffer.getvalue()).decode("ascii")
            return f'<figure tabindex="0" aria-label="{escape(title, quote=True)} chart; scroll horizontally on small screens"><img class="chart-image" src="data:image/svg+xml;base64,{encoded}" alt="{escape(title, quote=True)}"></figure>'
        finally:
            plt.close(fig)

def write_html_report(output_file, title, total_objects, charts_html, counts=None, frequencies=None, skipped=None, unique_counts=None):
    """Write an offline report with searchable, escaped annotation tables."""
    descriptor_counts = (counts or {}).get("phenotypicFeatures", [])
    overview = ''
    if descriptor_counts:
        annotated = sum(value > 0 for value in descriptor_counts)
        distinct = len((frequencies or {}).get("Phenotypes (not excluded)", []))
        stats = distribution_summary(descriptor_counts)
        unique_row = ''
        if unique_counts is not None:
            unique = distribution_summary(unique_counts)
            unique_row = (f'<tr><th scope="row">Unique non-excluded IDs per record, mean (median)</th>'
                          f'<td>{unique["mean"]:.1f} ({unique["median"]:g})</td></tr>')
        overview = (
            '<section id="overview" class="overview" aria-label="Cohort at a glance"><h2>At a glance</h2>'
            '<table class="summary-table" aria-label="Phenotype annotation summary"><thead><tr><th scope="col">Measure</th><th scope="col">Value</th></tr></thead><tbody>'
            f'<tr><th scope="row">Records with phenotype entries</th><td>{annotated:,} / {total_objects:,} ({annotated / total_objects:.0%})</td></tr>'
            f'<tr><th scope="row">Mean descriptors per record</th><td>{sum(descriptor_counts) / total_objects:.1f}</td></tr>'
            f'<tr><th scope="row">Median descriptors per record</th><td>{median(descriptor_counts):g}</td></tr>'
            f'<tr><th scope="row">Descriptor count, Q1&ndash;Q3</th><td>{stats["q1"]:.2f}&ndash;{stats["q3"]:.2f}</td></tr>'
            f'<tr><th scope="row">Descriptor count, P10&ndash;P90</th><td>{stats["p10"]:.2f}&ndash;{stats["p90"]:.2f}</td></tr>'
            f'{unique_row}'
            f'<tr><th scope="row">Distinct phenotype IDs, not excluded</th><td>{distinct:,}</td></tr></tbody></table>'
            '<p class="summary-footnote">Descriptors are phenotypicFeatures entries. '
            'Raw counts include duplicates and excluded entries; unique counts do not. All records are included, even those with zero entries. '
            '<a href="#methods">Counting details</a></p></section>'
        )
    tables = []
    if counts:
        table_counts = dict(counts)
        if unique_counts is not None:
            table_counts[UNIQUE_PHENOTYPES] = unique_counts
        rows = ''
        for key, values in table_counts.items():
            stats = distribution_summary(values)
            rows += (f'<tr><th scope="row">{escape(key)}</th><td>{sum(v > 0 for v in values):,}</td>'
                     f'<td>{stats["mean"]:.2f}</td><td>{stats["median"]:g}</td>'
                     f'<td>{stats["q1"]:.2f}</td><td>{stats["q3"]:.2f}</td>'
                     f'<td>{stats["p10"]:.2f}</td><td>{stats["p90"]:.2f}</td>'
                     f'<td>{stats["min"]}-{stats["max"]}</td></tr>')
        tables.append('<section><h2>Annotation depth and coverage</h2><p>All records are included in the mean and median. '
                      'Absent or null sections count as zero. Raw entries include duplicates and excluded annotations; the unique-ID row does not.</p>'
                      '<div class="table-scroll"><table><thead><tr><th>Section</th><th>Records with entries</th>'
                      '<th>Mean</th><th>Median</th><th>Q1 (25%)</th><th>Q3 (75%)</th><th>P10</th><th>P90</th><th>Range</th></tr></thead><tbody>' + rows + '</tbody></table></div></section>')
    for group, entries in (frequencies or {}).items():
        if not entries:
            tables.append(f'<details><summary>{escape(group)}: 0 distinct terms</summary>'
                          '<p>No qualifying ontology IDs were recorded.</p></details>')
            continue
        rows = ''.join(f'<tr><td>{escape(row["id"])}</td><td>{escape(row["label"])}</td>'
                       f'<td>{row["count"]:,}</td><td>{row["count"] / total_objects:.1%}</td></tr>' for row in entries)
        tables.append(f'<details><summary>{escape(group)}: {len(entries):,} distinct terms</summary>'
                      '<p>Counted once per record per status. Percentages use all records; terms can co-occur.</p>'
                      '<label>Filter terms <input type="search" placeholder="Label or ontology ID" aria-label="Filter terms"></label>'
                      '<div class="table-scroll"><table><thead><tr><th>Ontology ID</th><th>Label</th>'
                      '<th>Records</th><th>Records (%)</th></tr></thead><tbody>' + rows + '</tbody></table></div></details>')
    skipped_note = '; '.join(f'{count:,} {key}' for key, count in (skipped or {}).items())
    tables_html = '\n'.join(tables)
    logo = base64.b64encode(REPORT_LOGO_SVG.encode('utf-8')).decode('ascii')
    document = f"""<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data:; style-src 'unsafe-inline'; script-src 'unsafe-inline'; base-uri 'none'; form-action 'none'">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Cohort summary | Pheno-Ranker | {escape(title)}</title>
  <style>
    :root {{ color-scheme: light; font-family: 'Trebuchet MS', sans-serif;
      --paper: #f4f5f7; --ink: #273343; --muted: #596574; --line: #dce2e9; --surface: #fff; --accent: #274b76; }}
    body {{ margin: 0; background: radial-gradient(ellipse at 8% 0, #e9eef6 0, transparent 44rem), var(--paper); color: var(--ink); }}
    main {{ width: min(82rem, calc(100% - 3rem)); margin: 0 auto 3rem; }}
    .report-header {{ display: flex; align-items: center; justify-content: space-between; gap: 1rem 2rem; padding: 2rem 0 1.4rem; flex-wrap: wrap; }}
    .report-identity {{ display: flex; align-items: center; gap: .85rem; }}
    .report-logo {{ display: block; width: 42px; height: 49px; flex-shrink: 0; }}
    .report-brand {{ font-size: .8rem; font-weight: 600; margin-bottom: .35rem; color: var(--accent); }}
    h1 {{ margin: 0; font: 600 clamp(1.5rem, 2.5vw, 1.9rem)/1.2 'Trebuchet MS', sans-serif; letter-spacing: -.025em; }}
    .report-meta {{ display: flex; align-items: baseline; flex-wrap: wrap; gap: .4rem .85rem; font-size: .85rem; line-height: 1.5; }}
    .report-records {{ padding-left: .85rem; border-left: 1px solid #ccc; white-space: nowrap; font-variant-numeric: tabular-nums; }}
    .report-records strong {{ color: var(--ink); font-weight: 600; }}
    .report-nav {{ position: sticky; top: .5rem; z-index: 5; display: flex; gap: .25rem; overflow-x: auto; padding: .3rem; border: 1px solid #d2dbe7; border-radius: 8px; background: #e4eaf2; box-shadow: 0 2px 5px #213d6009; scrollbar-width: thin; font-size: .85rem; }}
    .report-nav a {{ flex: 1 0 auto; text-align: center; white-space: nowrap; font-weight: 600; color: #51627a; text-decoration: none; padding: .75rem 1rem; border-radius: 5px; }}
    .report-nav a:hover {{ color: #243f61; background: #f6f8fb; }}
    .report-nav a[aria-current="location"] {{ background: var(--accent); color: white; box-shadow: 0 1px 3px #213d6030; }}
    .report-nav a:focus-visible {{ outline-offset: -3px; outline-color: #8ab3e3; }}
    .overview {{ padding: 1.35rem 1.5rem; border-left: 3px solid var(--accent); border-radius: 4px; background: linear-gradient(110deg, #e7edf6, #eef1f6); }}
    .overview h2 {{ border: 0; padding: 0; }}
    .summary-table {{ margin: .5rem 0 1rem; background: var(--surface); }}
    .summary-table th, .summary-table td {{ padding: .65rem .85rem; }}
    .summary-table thead {{ position: static; background: #dde5f0; }}
    .summary-table tbody th {{ font-weight: 400; }}
    .summary-table td, .summary-table thead th:last-child {{ text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }}
    .summary-table td {{ font-weight: 600; color: #213d60; }}
    .summary-footnote {{ font-size: .8rem; line-height: 1.5; }}
    @media (max-width: 550px) {{
      main {{ width: calc(100% - 2rem); }}
      .report-header {{ padding-top: 1.5rem; }}
      .report-header {{ align-items: flex-start; flex-direction: column; gap: .8rem; }}
      .overview {{ padding: 1rem; }}
      .summary-table th, .summary-table td {{ padding: .6rem .5rem; }}
      .summary-table {{ font-size: .8rem; }}
      section {{ margin: 1.75rem 0; }}
    }}
    p {{ margin: 0; color: var(--muted); }}
    figure {{ margin: 0; overflow: auto; background: white; border: 1px solid var(--line); border-radius: 6px; }}
    .chart-image {{ display: block; width: 100%; min-width: 32rem; height: auto; }}
    .charts {{ display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 1rem; }}
    .charts:empty {{ display: none; }}
    .empty-sections {{ display: flex; flex-wrap: wrap; align-items: baseline; gap: .4rem 1rem; margin: .75rem 0 1rem; padding: .75rem 1rem; border-left: 2px solid #aab7c7; background: #e9edf2; font-size: .85rem; line-height: 1.5; }}
    .empty-sections strong {{ font-weight: 500; color: var(--ink); }}
    .chart-hint {{ display: none; }}
    @media (max-width: 600px) {{ .chart-hint {{ display: block; font-size: .8rem; margin: 1rem 0; }} }}
    @media (max-width: 850px) {{ .charts {{ grid-template-columns: minmax(0, 1fr); }} }}
    figcaption {{ padding: .75rem 0; color: var(--muted); }}
    section {{ margin: 2.5rem 0; scroll-margin-top: 5rem; }}
    .section-description {{ font-size: .9rem; line-height: 1.6; margin-top: -.45rem; margin-bottom: 1rem; }}
    #tables {{ background: var(--surface); padding: 1.25rem; border: 1px solid var(--line); border-radius: 6px; }}
    #tables > section {{ margin-top: 0; }}
    #methods {{ padding: 1.2rem; background: #e9edf3; border: 0; border-radius: 5px; scroll-margin-top: 5rem; }}
    details {{ margin: 0; padding: 1.2rem 0; border-top: 1px solid var(--line); }}
    summary {{ cursor: pointer; font-weight: 600; }}
    details[open] summary {{ margin-bottom: 1rem; }}
    h2 {{ font-size: 1rem; font-weight: 600; margin: 0 0 1rem; padding-bottom: .7rem; border-bottom: 1px solid var(--line); color: #243f61; }}
    .table-scroll {{ overflow: auto; max-height: 32rem; margin-top: 1rem; }}
    table {{ border-collapse: collapse; width: 100%; font-size: .9rem; }}
    th, td {{ text-align: left; padding: .7rem; border-bottom: 1px solid var(--line); }}
    thead {{ background: var(--paper); color: var(--ink); position: sticky; top: 0; }}
    input {{ padding: .65rem; margin: .75rem; max-width: 90%; border: 1px solid var(--line); border-radius: 3px; background: var(--surface); color: var(--ink); }}
    .method-note {{ margin: 1.2rem 0; line-height: 1.7; font-size: .9rem; max-width: 75rem; }}
    .summary-footnote a {{ color: var(--muted); text-underline-offset: .2em; }}
    :focus-visible {{ outline: 2px solid #527aab; outline-offset: 3px; }}
    @media print {{ body, main, .overview, #methods {{ background: white; }} main {{ width: 100%; margin: 0; }} figure {{ border: 0; break-inside: avoid; }} nav {{ display: none; }} }}
  </style>
</head>
<body>
  <main>
    <header class="report-header">
      <div class="report-identity">
        <img class="report-logo" src="data:image/svg+xml;base64,{logo}" width="42" height="49" alt="">
        <div><p class="report-brand">Pheno-Ranker</p><h1>Cohort summary</h1></div>
      </div>
      <p class="report-meta"><span>{escape(title)}</span><span class="report-records"><strong>{total_objects:,}</strong> records</span></p>
    </header>
    <nav class="report-nav" aria-label="Report sections"><a href="#overview" aria-current="location">Summary</a><a href="#distributions">Distributions</a><a href="#categories">Categories</a><a href="#frequencies">Term frequencies</a><a href="#tables">Data tables</a><a href="#methods">Reading this report</a></nav>
    {overview}
    <p class="chart-hint">Charts scroll horizontally to keep labels readable.</p>
    {charts_html}
    <section id="tables" aria-label="Data tables">{tables_html}</section>
    <details id="methods"><summary>Reading this report</summary>
    <p class="method-note">{ANNOTATION_NOTE} Descriptor distributions count all phenotypicFeatures entries,
    including duplicates and excluded annotations. Mean and median include records with zero entries.</p>
    <p class="method-note">Q1 and Q3 are the 25th and 75th percentiles; P10 and P90 are the 10th and 90th.
    Percentiles use linear interpolation at position (N &minus; 1) &times; p in the sorted counts, so they can be fractional.
    A single-record dataset has the same value at every percentile. Unique non-excluded phenotype counts deduplicate IDs
    within each record, omit missing IDs and excluded entries, and include zero-count records. If an ID is recorded both
    excluded and non-excluded, it counts once in the non-excluded distribution.</p>
    <p class="method-note">Records may represent people or disease profiles. Bar labels show record counts; frequency axes show percentages.
    Frequencies describe these records, not population prevalence. "Not excluded" means excluded is false or absent.
    The same term can occur in both status groups if recorded that way. Label variants sharing an ID are combined;
    a label is chosen in lexical order. Entries without IDs are omitted only from term frequencies.</p>
    <p class="method-note">{escape('Omitted from frequency tables: ' + skipped_note) if skipped_note else ''}</p>
    </details>
  </main>
  <script>
    const navigation = document.querySelector('.report-nav');
    const sectionLinks = Array.from(navigation.querySelectorAll('a'));
    const sections = sectionLinks.map(link => document.getElementById(link.hash.slice(1)));
    function markSection(index) {{
      sectionLinks.forEach((link, i) => {{
        if (i === index) link.setAttribute('aria-current', 'location');
        else link.removeAttribute('aria-current');
      }});
    }}
    function trackSection() {{
      const threshold = navigation.getBoundingClientRect().bottom + 24;
      let current = 0;
      sections.forEach((section, i) => {{
        if (section && section.getBoundingClientRect().top <= threshold) current = i;
      }});
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2) current = sections.length - 1;
      markSection(current);
    }}
    let scrollPending = false;
    window.addEventListener('scroll', () => {{
      if (!scrollPending) {{
        scrollPending = true;
        requestAnimationFrame(() => {{ trackSection(); scrollPending = false; }});
      }}
    }}, {{passive: true}});
    sectionLinks.forEach((link, i) => link.addEventListener('click', () => {{
      if (link.hash === '#methods') document.getElementById('methods').open = true;
      markSection(i);
    }}));
    function revealSection() {{
      if (location.hash === '#methods') document.getElementById('methods').open = true;
      requestAnimationFrame(trackSection);
    }}
    window.addEventListener('hashchange', revealSection);
    revealSection();
    document.querySelectorAll('input[type="search"]').forEach(input => {{
      input.addEventListener('input', () => {{
        const query = input.value.toLocaleLowerCase();
        input.closest('details').querySelectorAll('tbody tr').forEach(row => {{
          row.hidden = !row.textContent.toLocaleLowerCase().includes(query);
        }});
      }});
    }});
  </script>
</body>
</html>
"""
    with open(output_file, 'w', encoding='utf-8', newline='\n') as handle:
        handle.write(document)


def validate_file_extension(file_name, valid_extensions):
    if not any(file_name.lower().endswith(ext) for ext in valid_extensions):
        raise argparse.ArgumentTypeError(f"File must have one of the following extensions: {', '.join(valid_extensions)}")
    return file_name 

# Main functions for CLI
def main_generate():
    parser = argparse.ArgumentParser(description='Process BFF/PXF (JSON or YAML) data and generate a self-contained HTML report.')
    parser.add_argument('-i', '--input', type=lambda f: validate_file_extension(f, ['.json', '.yaml', '.yml']), required=True, help='Input JSON or YAML file path (e.g., "data.json" or "data.yaml").')
    parser.add_argument('-o', '--output', type=lambda f: validate_file_extension(f, ['.html']), default='output_plots.html', help='Output HTML file path (default: "output_plots.html")')
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
