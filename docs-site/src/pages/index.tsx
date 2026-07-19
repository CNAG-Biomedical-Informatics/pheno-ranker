import Link from '@docusaurus/Link';
import Layout from '@theme/Layout';
import useBaseUrl from '@docusaurus/useBaseUrl';
import styles from './index.module.css';

export default function Home() {
  const objectiveUrl = useBaseUrl('/img/pheno-ranker-objective.svg');

  return (
    <Layout
      title="Pheno-Ranker"
      description="Phenotypic similarity analysis for cohorts and patient matching">
      <main className={styles.page}>
        <section className={styles.hero}>
          <div className={styles.heroInner}>
            <div className={styles.heroCopy}>
              <p className={styles.kicker}>Phenotypic and clinical record comparison</p>
              <h1>Pheno-Ranker</h1>
              <p className={styles.claim}>
                Compare cohorts and rank target records from structured phenotypic
                and clinical data.
              </p>
              <p className={styles.lede}>
                Pheno-Ranker compares Beacon v2 Models, Phenopackets v2, and
                configured JSON or YAML records using Hamming distance or Jaccard
                similarity. The command-line interface is the primary interface;
                CSV preparation and a web application are available as companion
                workflows.
              </p>
              <div className={styles.actions}>
                <Link className={styles.action} to="/usage">
                  Quickstart
                </Link>
                <Link className={styles.action} to="/other-formats">
                  Supported Inputs
                </Link>
                <Link className={styles.action} to="/citation">
                  Publication
                </Link>
              </div>
            </div>

            <figure className={styles.objectiveFigure}>
              <img
                className={styles.objective}
                src={objectiveUrl}
                alt="Structured phenotypic and clinical records are compared by Pheno-Ranker to produce rankings and matrices"
              />
              <figcaption>
                Structured records are compared to produce target rankings or
                cohort matrices.
              </figcaption>
            </figure>
          </div>
        </section>

        <section className={styles.scopeSection}>
          <div className={styles.sectionHeading}>
            <div>
              <p className={styles.sectionLabel}>Current scope</p>
              <h2>Supported operations</h2>
            </div>
            <p>
              Available outputs and statistics depend on the selected mode and
              similarity metric. Input-specific requirements are documented with
              each supported format.
            </p>
          </div>

          <div className={styles.operationGrid}>
            <article className={styles.operation}>
              <span>Cohort mode</span>
              <h3>Compute all-vs-all comparisons</h3>
              <p>
                Calculate pairwise Hamming distances or Jaccard similarities and
                write dense or sparse matrices.
              </p>
            </article>
            <article className={styles.operation}>
              <span>Patient mode</span>
              <h3>Rank records against a target</h3>
              <p>
                Compare target records with reference cohorts and report ranked
                matches with overlap and completeness statistics.
              </p>
            </article>
            <article className={styles.operation}>
              <span>Structured inputs</span>
              <h3>Use native or configured records</h3>
              <p>
                Read BFF and PXF directly, configure generic JSON or YAML, or
                prepare CSV data with the included import utility.
              </p>
            </article>
            <article className={styles.operation}>
              <span>Result export</span>
              <h3>Inspect and reuse outputs</h3>
              <p>
                Export rankings, matrices, coverage information, intermediate
                records, and thresholded graphs for downstream analysis.
              </p>
            </article>
          </div>

          <aside className={styles.scopeNote}>
            <strong>Scope</strong>
            <p>
              Pheno-Ranker measures similarity between encoded categorical
              profiles. It does not establish a diagnosis, curate source
              terminology, or replace clinical interpretation and data-quality
              review.
            </p>
          </aside>
        </section>
      </main>
    </Layout>
  );
}
