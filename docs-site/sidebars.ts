import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  docsSidebar: [
    {type: 'doc', id: 'overview', label: 'Overview'},
    {type: 'doc', id: 'desktop', label: 'Desktop App'},
    {
      type: 'category', label: 'Analysis', collapsed: true,
      items: ['user-workflow', 'patient', 'cohort'],
    },
    {
      type: 'category', label: 'Input Formats', collapsed: true,
      link: {type: 'doc', id: 'other-formats'},
      items: ['generic-json', 'bff', 'pxf', 'clinical-formats', 'vcf'],
    },
    {
      type: 'category', label: 'CLI', collapsed: true,
      items: [
        {type: 'doc', id: 'download-and-installation', label: 'CLI Installation & First Run'},
        {type: 'doc', id: 'usage', label: 'CLI Reference'},
        'use-from-r',
        {type: 'link', href: 'https://colab.research.google.com/drive/1n3Etu4fnwuDWNveSMb1SzuN50O2a05Rg', label: 'Try the CLI in Colab'},
      ],
    },
    {
      type: 'category', label: 'Utilities', collapsed: true,
      items: [
        {type: 'doc', id: 'bff-pxf-plot', label: 'BFF/PXF Plot'},
        {type: 'doc', id: 'bff-pxf-simulator', label: 'BFF/PXF Simulator'},
        {type: 'doc', id: 'csv-import', label: 'CSV Import'},
        {type: 'doc', id: 'qr-code-generator', label: 'QR Code Generator'},
      ],
    },
    {
      type: 'category', label: 'Use Cases', collapsed: true,
      items: ['phenopackets-corpus', 'omim-database', 'tcga-clinical'],
    },
    {
      type: 'category', label: 'Reference & Help', collapsed: true,
      items: ['faq', 'algorithm', 'implementation', 'federated-version-proposal', 'about', 'citation'],
    },
  ],
};

export default sidebars;
