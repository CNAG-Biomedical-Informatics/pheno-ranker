import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  docsSidebar: [
    {
      type: 'doc',
      id: 'overview',
      label: 'Overview',
    },
    {
      type: 'category',
      label: 'Introduction',
      items: [
        {
          type: 'doc',
          id: 'what-is-pheno-ranker',
          label: 'What Is Pheno-Ranker?',
        },
        {
          type: 'doc',
          id: 'user-workflow',
          label: 'User Workflow',
        },
        {
          type: 'category',
          label: 'Input Formats',
          items: [
            {
              type: 'doc',
              id: 'bff',
              label: 'Beacon v2 Models',
            },
            {
              type: 'doc',
              id: 'pxf',
              label: 'Phenopackets v2',
            },
            {
              type: 'doc',
              id: 'other-formats',
              label: 'Other Formats',
            },
          ],
        },
      ],
    },
    {
      type: 'doc',
      label: 'Download & Installation',
      id: 'download-and-installation',
    },
    {
      type: 'category',
      label: 'Modes of Operation',
      items: [
        {
          type: 'doc',
          id: 'cohort',
          label: 'Cohort Mode',
        },
        {
          type: 'doc',
          id: 'patient',
          label: 'Patient Mode',
        },
      ],
    },
    {
      type: 'category',
      label: 'Technical Details',
      items: [
        {
          type: 'doc',
          id: 'implementation',
          label: 'Implementation',
        },
        {
          type: 'doc',
          id: 'algorithm',
          label: 'Algorithm',
        },
      ],
    },
    {
      type: 'category',
      label: 'Utilities',
      items: [
        {
          type: 'doc',
          id: 'bff-pxf-plot',
          label: 'BFF/PXF Plot',
        },
        {
          type: 'doc',
          id: 'bff-pxf-simulator',
          label: 'BFF/PXF Simulator',
        },
        {
          type: 'doc',
          id: 'csv-import',
          label: 'CSV Import',
        },
        {
          type: 'doc',
          id: 'qr-code-generator',
          label: 'QR Code Generator',
        },
      ],
    },
    {
      type: 'category',
      label: 'Use Cases',
      items: [
        {
          type: 'doc',
          id: 'phenopackets-corpus',
          label: 'Phenopackets Corpus',
        },
        {
          type: 'doc',
          id: 'omim-database',
          label: 'OMIM Database',
        },
        {
          type: 'doc',
          id: 'tcga-clinical',
          label: 'TCGA Clinical',
        },
      ],
    },
    {
      type: 'category',
      label: 'Formats Beyond BFF/PXF',
      items: [
        {
          type: 'doc',
          id: 'generic-json',
          label: 'Generic JSON',
        },
        {
          type: 'doc',
          id: 'open-ehr',
          label: 'openEHR',
        },
        {
          type: 'doc',
          id: 'omop-cdm',
          label: 'OMOP-CDM',
        },
        {
          type: 'doc',
          id: 'vcf',
          label: 'VCF',
        },
      ],
    },
    {
      type: 'category',
      label: 'Help',
      items: [
        {
          type: 'link',
          href: 'https://colab.research.google.com/drive/1gpMikEQ8gz8cFlppem5lMmHu4qGmuooe?usp=sharing',
          label: 'Google Colab',
        },
        {
          type: 'doc',
          id: 'usage',
          label: 'Usage',
        },
        {
          type: 'doc',
          id: 'use-from-r',
          label: 'Use from R',
        },
        {
          type: 'doc',
          id: 'faq',
          label: 'FAQs',
        },
      ],
    },
    {
      type: 'category',
      label: 'Addendum',
      items: [
        {
          type: 'doc',
          id: 'federated-version-proposal',
          label: 'Federated Version Proposal',
        },
      ],
    },
    {
      type: 'category',
      label: 'About',
      items: [
        {
          type: 'doc',
          id: 'about',
          label: 'About',
        },
        {
          type: 'doc',
          id: 'citation',
          label: 'Citation',
        },
      ],
    },
  ],
};

export default sidebars;
