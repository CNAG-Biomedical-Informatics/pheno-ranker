import Link from '@docusaurus/Link';
import Layout from '@theme/Layout';
import useBaseUrl from '@docusaurus/useBaseUrl';
import styles from './index.module.css';

export default function Home() {
  const logoUrl = useBaseUrl('/img/iconhex.svg');

  return (
    <Layout
      title="Pheno-Ranker"
      description="Phenotypic similarity analysis for cohorts and patient matching">
      <main className={styles.page}>
        <section className={styles.hero}>
          <div className={styles.heroGrid}>
            <div className={styles.copy}>
              <p className={styles.kicker}>Pheno-Ranker</p>
              <h1>Phenotypic similarity analysis for cohorts and patient matching.</h1>
              <p className={styles.lede}>
                Rank patients, compare cohorts, export similarity matrices, and explore
                phenotypic relationships from Beacon v2 Models, Phenopackets, CSV, and
                generic JSON data with the <code>pheno-ranker</code> command-line workflow.
              </p>
              <div className={styles.actions}>
                <Link className="button button--primary button--lg" to="/what-is-pheno-ranker">
                  Start Here
                </Link>
                <Link className="button button--secondary button--lg" to="/usage">
                  CLI Usage
                </Link>
                <Link className="button button--secondary button--lg" to="/download-and-installation">
                  Install
                </Link>
              </div>
            </div>

            <div className={styles.flowCard} aria-label="Pheno-Ranker workflow">
              <Link className={styles.identity} to="/algorithm">
                <img className={styles.heroLogo} src={logoUrl} alt="Pheno-Ranker logo" />
                <span>Pheno-Ranker</span>
              </Link>
              <div className={styles.flow}>
                <div>
                  <span>Input</span>
                  <strong>BFF · PXF · CSV · JSON</strong>
                </div>
                <div className={styles.arrow}>→</div>
                <div className={styles.centerModel}>
                  <span>Similarity engine</span>
                  <strong>Comparable patient profiles</strong>
                </div>
                <div className={styles.arrow}>→</div>
                <div>
                  <span>Output</span>
                  <strong>Ranks · matrices · graphs</strong>
                </div>
              </div>
              <div className={styles.tokens}>
                <span>cohort mode</span>
                <span>patient mode</span>
                <span>Jaccard</span>
                <span>Hamming</span>
              </div>
            </div>
          </div>
        </section>

        <section className={styles.sections}>
          <div className={styles.grid}>
            <Link className={styles.card} to="/cohort">
              <span>Compare</span>
              <h2>Cohort Mode</h2>
              <p>Compute pairwise distances, similarity matrices, graph exports, and dimensionality-reduction inputs.</p>
            </Link>
            <Link className={styles.card} to="/patient">
              <span>Match</span>
              <h2>Patient Mode</h2>
              <p>Rank one or more patients against reference cohorts with interpretable overlap and completeness statistics.</p>
            </Link>
            <Link className={styles.card} to="/algorithm">
              <span>Method</span>
              <h2>Algorithm</h2>
              <p>Understand canonicalization, term weighting, filtering, and distance calculations.</p>
            </Link>
            <Link className={styles.card} to="/generic-json">
              <span>Flexible Input</span>
              <h2>Generic JSON</h2>
              <p>Use Pheno-Ranker beyond BFF and PXF when your data can be represented as structured JSON.</p>
            </Link>
            <Link className={styles.card} to="/use-from-r">
              <span>R Workflows</span>
              <h2>Use from R</h2>
              <p>Call the CLI from R, then read matrices, rankings, exported JSON, or sparse Matrix Market output.</p>
            </Link>
            <Link className={styles.card} to="/qr-code-generator">
              <span>Utilities</span>
              <h2>QR and PDF</h2>
              <p>Encode patient-level data into QR codes or PDF summaries for compact exchange workflows.</p>
            </Link>
          </div>
        </section>
      </main>
    </Layout>
  );
}
