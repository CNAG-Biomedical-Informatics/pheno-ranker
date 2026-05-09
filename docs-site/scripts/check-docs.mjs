import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const docsSiteDir = path.resolve(path.dirname(__filename), '..');
const docsDir = path.join(docsSiteDir, 'docs');
const staticDir = path.join(docsSiteDir, 'static');

const failures = [];

function readDoc(name) {
  const file = path.join(docsDir, name);
  if (!fs.existsSync(file)) {
    failures.push(`${name}: documentation file is missing`);
    return '';
  }
  return fs.readFileSync(file, 'utf8');
}

function assertContains(name, content, needle, message) {
  if (!content.includes(needle)) {
    failures.push(`${name}: ${message}`);
  }
}

function assertNotContains(name, content, needle, message) {
  if (content.includes(needle)) {
    failures.push(`${name}: ${message}`);
  }
}

function assertBefore(name, content, first, second, message) {
  const firstIndex = content.indexOf(first);
  const secondIndex = content.indexOf(second);
  if (firstIndex === -1 || secondIndex === -1 || firstIndex >= secondIndex) {
    failures.push(`${name}: ${message}`);
  }
}

const simulator = readDoc('bff-pxf-simulator.mdx');
assertContains('bff-pxf-simulator.mdx', simulator, '<Tabs>', 'utility page should render MkDocs tabs as Docusaurus tabs');
assertContains('bff-pxf-simulator.mdx', simulator, '<TabItem value="usage" label="Usage">', 'Usage tab is missing');
assertBefore(
  'bff-pxf-simulator.mdx',
  simulator,
  '<summary>Default Ontologies used</summary>',
  '<TabItem value="usage" label="Usage">',
  'folded ontology block should stay inside the Explanation tab',
);
assertContains('bff-pxf-simulator.mdx', simulator, '-f, --format <format>', 'README usage placeholders should render literally');
assertNotContains('bff-pxf-simulator.mdx', simulator, '&lt;format&gt;', 'README usage placeholders should not remain HTML-escaped');

const corpus = readDoc('phenopackets-corpus.mdx');
assertContains('phenopackets-corpus.mdx', corpus, '<summary>About reproducibility</summary>', 'folded reproducibility block is missing');
assertContains('phenopackets-corpus.mdx', corpus, '<summary>See R code</summary>', 'folded R code block is missing');
assertContains('phenopackets-corpus.mdx', corpus, '```R\nlibrary(ggplot2)', 'R snippet should be inserted into a single R code fence');
assertNotContains('phenopackets-corpus.mdx', corpus, '```bash\n```text', 'snippet insertion should not create nested code fences');

const usage = readDoc('usage.mdx');
assertContains('usage.mdx', usage, '<code>{"-r, --reference <file>"}</code>', 'inline option placeholders should be MDX-safe code');
assertContains('usage.mdx', usage, '<code>{"--matrix-format <dense\\u007cmtx>"}</code>', 'pipes inside inline-code tables should be escaped for MDX');
assertNotContains('usage.mdx', usage, '&lt;file&gt;', 'inline placeholders should not remain HTML-escaped');

const omop = readDoc('omop-cdm.mdx');
assertContains('omop-cdm.mdx', omop, "require('@site/static/img/ohdsi-logo.svg').default", 'OMOP page should use the local OHDSI image');

const citation = readDoc('citation.mdx');
assertContains('citation.mdx', citation, '[Publication link](https://doi.org/10.1186/s12859-024-05993-2)', 'citation publication link is missing');

const about = readDoc('about.mdx');
assertContains('about.mdx', about, 'className="about-card"', 'About page card layout is missing');
assertNotContains('about.mdx', about, '&lt;article', 'About page HTML tags should not be escaped');

const whatIs = readDoc('what-is-pheno-ranker.mdx');
assertContains(
  'what-is-pheno-ranker.mdx',
  whatIs,
  "src={require('@site/static/media/pheno-ranker-notebook-llm.mp3').default}",
  'Notebook LM audio should use Docusaurus static media resolution',
);
assertNotContains('what-is-pheno-ranker.mdx', whatIs, 'src="../media/', 'Notebook LM audio should not use fragile relative media paths');

const imageRefs = [...fs.readdirSync(docsDir)]
  .filter((name) => name.endsWith('.mdx'))
  .flatMap((name) => {
    const content = readDoc(name);
    return [...content.matchAll(/require\('@site\/static\/([^']+)'\)\.default/g)]
      .map((match) => ({name, ref: match[1]}));
  });

for (const {name, ref} of imageRefs) {
  const staticPath = path.join(staticDir, ref);
  if (!fs.existsSync(staticPath)) {
    failures.push(`${name}: static asset is missing: ${ref}`);
  }
}

if (failures.length > 0) {
  console.error('Documentation smoke checks failed:');
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log(`Documentation smoke checks passed (${imageRefs.length} static assets checked).`);
