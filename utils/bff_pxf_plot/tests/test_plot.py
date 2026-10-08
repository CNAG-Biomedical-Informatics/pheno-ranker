import copy
import base64
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import bff_pxf_plot_utils as plot


class PlotTest(unittest.TestCase):
    def tearDown(self):
        plt.close("all")

    def test_count_percentiles_include_zeros_and_use_linear_interpolation(self):
        stats = plot.distribution_summary([9, 0, 1, 0])
        expected = {'mean': 2.5, 'median': .5, 'q1': 0, 'q3': 3,
                    'p10': 0, 'p90': 6.6, 'min': 0, 'max': 9}
        for key, value in expected.items():
            self.assertAlmostEqual(stats[key], value)
        self.assertEqual(stats, plot.distribution_summary([0, 1, 0, 9]))
        for values in ([0], [7], [3] * 10):
            self.assertTrue(all(value == values[0] for value in plot.distribution_summary(values).values()))
        with self.assertRaises(ValueError):
            plot.distribution_summary([])

    def test_unique_descriptor_counts_keep_zero_records_and_deduplicate_ids(self):
        for is_pxf, field in ((True, 'type'), (False, 'featureType')):
            records = [{'phenotypicFeatures': [
                {field: {'id': 'HP:1', 'label': 'First'}},
                {field: {'id': 'HP:1', 'label': 'Alias'}},
                {field: {'id': 'HP:2'}, 'excluded': True},
                {field: {'label': 'No ID'}},
            ]}, {}, {'phenotypicFeatures': [
                {field: {'id': 'HP:3'}, 'excluded': True},
            ]}]
            original = copy.deepcopy(records)
            _, _, counts = plot.term_frequencies(records, is_pxf)
            self.assertEqual(counts, [1, 0, 0])
            self.assertEqual(records, original)

    def test_embedded_logo_matches_the_repository_asset(self):
        root = Path(__file__).resolve().parents[3]
        self.assertEqual(plot.REPORT_LOGO_SVG.strip(),
                         (root / 'docs-site/static/img/iconhex.svg').read_text().strip())

    def test_empty_sections_are_compact_and_still_present_in_tables(self):
        with tempfile.TemporaryDirectory() as tmp, patch.object(plot, 'render_chart') as draw:
            path = Path(tmp) / 'empty.html'
            plot.plot_data([{'phenotypicFeatures': []}, {'phenotypicFeatures': []}], str(path))
            html = path.read_text()
        draw.assert_not_called()
        self.assertIn('No entries in any record', html)
        self.assertIn('Unknown for every record', html)
        self.assertIn('No qualifying ontology IDs', html)
        self.assertIn('0 / 2 (0%)', html)
        self.assertIn('<th scope="row">phenotypicFeatures</th><td>0</td>', html)
        self.assertNotIn('<figure', html)
        self.assertIn('class="report-logo"', html)
        self.assertIn(base64.b64encode(plot.REPORT_LOGO_SVG.encode()).decode(), html)

    def test_categories_include_missing_in_percentages(self):
        _, ax = plt.subplots()
        plot.draw_summary_axis(ax, "ethnicity", ["F", "F", "Unknown", "M"], True)
        self.assertEqual([bar.get_width() for bar in ax.patches], [2, 1, 1])
        self.assertIn("2  (50%)", [text.get_text() for text in ax.texts])
        self.assertIn("3 of 4 records", ax.texts[-1].get_text())

    def test_sex_pie_shows_counts_and_percentages_including_unknown(self):
        from matplotlib.patches import Wedge
        _, ax = plt.subplots()
        plot.draw_summary_axis(ax, "sex", ["F", "F", "M", "Unknown"], True)
        self.assertEqual(len(ax.patches), 3)
        self.assertTrue(all(isinstance(patch, Wedge) for patch in ax.patches))
        self.assertAlmostEqual(sum(w.theta2 - w.theta1 for w in ax.patches), 360)
        labels = [text.get_text() for text in ax.get_legend().get_texts()]
        self.assertIn("F\n2 records (50.0%)", labels)
        self.assertIn("Unknown\n1 records (25.0%)", labels)

    def test_category_aggregation_preserves_total(self):
        _, ax = plt.subplots()
        plot.draw_summary_axis(ax, "ethnicity", [str(i) for i in range(12)], True)
        self.assertEqual(len(ax.patches), 8)
        self.assertEqual(sum(bar.get_width() for bar in ax.patches), 12)
        self.assertIn("Remaining categories", ax.get_yticklabels()[-1].get_text())

    def test_entry_counts_and_integer_ticks(self):
        _, ax = plt.subplots()
        plot.draw_summary_axis(ax, "phenotypicFeatures", [0, 1, 1, 3])
        self.assertEqual([bar.get_height() for bar in ax.patches], [1, 2, 1])
        self.assertEqual(ax.get_title(loc="left"), "phenotypicFeatures")
        _, ax = plt.subplots()
        plot.draw_summary_axis(ax, "diseases", [10, 10])
        self.assertEqual(list(ax.get_xticks()), [10])
        self.assertEqual(len(ax.lines), 1)
        self.assertIn("Mean = Median", ax.lines[0].get_label())

    def test_distinct_mean_and_median_markers(self):
        _, ax = plt.subplots()
        plot.draw_summary_axis(ax, "phenotypicFeatures", [0, 1, 1, 10])
        self.assertEqual([line.get_xdata()[0] for line in ax.lines], [3, 1])

    def test_zero_and_unknown_panels_do_not_draw_large_bars(self):
        for values, categorical, message in (([0, 0], False, "No entries recorded"),
                                              (["Unknown"] * 2, True, "No reported category")):
            _, ax = plt.subplots()
            plot.draw_summary_axis(ax, "example", values, categorical)
            self.assertEqual(len(ax.patches), 0)
            self.assertEqual(len(ax.lines), 0)
            self.assertIn(message, [text.get_text() for text in ax.texts])

    def test_both_formats_keep_data_and_count_missing_categories(self):
        for data in ([{"sex": {"label": "F"}, "measures": [{}, {}]}, {}],
                     [{"subject": {"sex": "F"}, "measurements": [{}, {}]}, {"subject": {}}]):
            original = copy.deepcopy(data)
            with tempfile.TemporaryDirectory() as tmp, patch.object(plot, "draw_summary_axis") as draw:
                plot.plot_data(data, str(Path(tmp) / "summary.html"))
            calls = {call.args[1]: call.args[2] for call in draw.call_args_list}
            self.assertEqual(calls["sex"], ["F", "Unknown"])
            self.assertEqual(calls.get("measures", calls.get("measurements")), [2, 0])
            self.assertEqual(data, original)

    def test_invalid_inputs_rejected(self):
        for data in ([], {}, [None], [{"diseases": {}}], [{"diseases": "bad"}]):
            with self.subTest(data=data), self.assertRaises(ValueError):
                plot.plot_data(data, "unused.html")

    def test_summary_requires_recognizable_bff_or_pxf(self):
        for data in ([{'id': 'one', 'colour': 'blue'}], [{}],
                     [{'binary_digit_string': '01'}],
                     [{'subject': {}}, {'phenotypicFeatures': []}],
                     [{'subject': 'not an object'}],
                     [{'phenotypicFeatures': []}, {'colour': 'blue'}]):
            with self.subTest(data=data), self.assertRaises(ValueError):
                plot.summary_format(data)
        self.assertEqual(plot.summary_format([{'subject': {}}]), 'pxf')
        self.assertEqual(plot.summary_format([{'phenotypicFeatures': []}]), 'bff')

    def test_frequencies_deduplicate_ids_and_separate_excluded(self):
        for pxf, field in ((False, "featureType"), (True, "type")):
            data = [{"phenotypicFeatures": [
                {field: {"id": "HP:1", "label": "Z label"}},
                {field: {"id": "HP:1", "label": "A label"}},
                {field: {"id": "HP:1"}, "excluded": True},
                {field: {"label": "No ID"}}]},
                {"phenotypicFeatures": [{field: {"id": "HP:1"}}]}]
            frequencies, skipped, unique_counts = plot.term_frequencies(data, pxf)
            self.assertEqual(unique_counts, [1, 1])
            self.assertEqual(frequencies["Phenotypes (not excluded)"],
                             [{"id": "HP:1", "label": "A label", "count": 2}])
            self.assertEqual(frequencies["Excluded phenotypes"][0]["count"], 1)
            self.assertEqual(skipped["entries without a usable ontology ID"], 1)
            self.assertEqual(plot.term_frequencies(list(reversed(data)), pxf), (frequencies, skipped, list(reversed(unique_counts))))

    def test_html_escapes_labels_and_has_vector_charts(self):
        data = [{"phenotypicFeatures": [{"featureType": {"id": "HP:1", "label": '<script>alert("x")</script>'}}]}]
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "report.html"
            plot.plot_data(data, str(path))
            html = path.read_text()
        self.assertIn("data:image/svg+xml;base64,", html)
        self.assertIn("&lt;script&gt;", html)
        self.assertNotIn('<script>alert("x")</script>', html)
        self.assertIn("Q1 (25%)", html)
        self.assertIn("P10&ndash;P90", html)
        self.assertIn('alt="Unique non-excluded phenotype IDs"', html)
        self.assertIn('<h1>Cohort summary</h1>', html)
        self.assertIn('<span>Beacon Friendly Format</span>', html)
        self.assertIn('<strong>1</strong> records', html)
        self.assertIn("At a glance", html)
        self.assertIn('class="report-nav"', html)
        for section in ('overview', 'distributions', 'categories', 'frequencies', 'tables', 'methods'):
            self.assertIn(f'href="#{section}"', html)
            self.assertIn(f'id="{section}"', html)
        self.assertIn('<table class="summary-table"', html)
        self.assertIn("1 / 1 (100%)", html)
        self.assertIn("Distinct phenotype IDs, not excluded", html)
        self.assertIn("Filter terms", html)
        self.assertEqual(plt.get_fignums(), [])

    def test_png_output_rejected(self):
        with self.assertRaisesRegex(ValueError, "HTML report"):
            plot.plot_data([{}], "unused.png")

    def test_diseases_use_ids_not_labels_and_omit_excluded(self):
        for pxf, field in ((False, "diseaseCode"), (True, "term")):
            data = [{"diseases": [
                {field: {"id": "OMIM:1", "label": "Same label"}},
                {field: {"id": "OMIM:2", "label": "Same label"}},
                {field: {"id": "OMIM:3"}, "excluded": True}]}]
            groups, skipped, _ = plot.term_frequencies(data, pxf)
            self.assertEqual([row["id"] for row in groups["Diseases (not excluded)"]], ["OMIM:1", "OMIM:2"])
            self.assertEqual(skipped, {"excluded disease entries": 1})

    def test_malformed_exclusion_is_not_silently_treated_as_present(self):
        with self.assertRaisesRegex(ValueError, "true or false"):
            plot.term_frequencies([{"phenotypicFeatures": [{"excluded": "false"}]}], False)


if __name__ == "__main__":
    unittest.main()
