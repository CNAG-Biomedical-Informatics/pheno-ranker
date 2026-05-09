import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

const config: Config = {
  title: 'Pheno-Ranker Documentation',
  tagline: 'Phenotypic similarity analysis for cohorts and patient matching',
  favicon: 'img/favicon-2x.png',
  url: 'https://cnag-biomedical-informatics.github.io',
  baseUrl: '/pheno-ranker/',
  organizationName: 'CNAG-Biomedical-Informatics',
  projectName: 'pheno-ranker',
  onBrokenLinks: 'throw',
  onBrokenAnchors: 'throw',
  markdown: {
    mermaid: true,
    hooks: {
      onBrokenMarkdownLinks: 'throw',
    },
  },
  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },
  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          routeBasePath: '/',
          remarkPlugins: [remarkMath],
          rehypePlugins: [rehypeKatex],
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],
  themes: ['@docusaurus/theme-mermaid'],
  stylesheets: [
    {
      href: 'https://cdn.jsdelivr.net/npm/katex@0.16.22/dist/katex.min.css',
      type: 'text/css',
      integrity: 'sha384-5TcZemv2l/9On385z///+d7MSYlvIEw9FuZTIdZ14vJLqWphw7e7ZPuOiCHJcFCP',
      crossorigin: 'anonymous',
    },
  ],
  themeConfig: {
    image: 'img/PR-logo.png',
    colorMode: {
      respectPrefersColorScheme: true,
    },
    navbar: {
      title: 'Pheno-Ranker',
      logo: {
        alt: 'Pheno-Ranker',
        src: 'img/iconhex.svg',
        srcDark: 'img/iconhex.svg',
      },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'docsSidebar',
          position: 'left',
          label: 'Docs',
        },
        {
          to: '/download-and-installation',
          label: 'Install',
          position: 'left',
        },
        {
          to: '/usage',
          label: 'Usage',
          position: 'left',
        },
        {
          href: 'https://pheno-ranker.cnag.eu',
          label: 'Web App',
          position: 'left',
        },
        {
          href: 'https://github.com/CNAG-Biomedical-Informatics/pheno-ranker',
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Docs',
          items: [
            {
              label: 'Overview',
              to: '/',
            },
            {
              label: 'Algorithm',
              to: '/algorithm',
            },
            {
              label: 'Usage',
              to: '/usage',
            },
          ],
        },
        {
          title: 'Project',
          items: [
            {
              label: 'Repository',
              href: 'https://github.com/CNAG-Biomedical-Informatics/pheno-ranker',
            },
            {
              label: 'CPAN',
              href: 'https://metacpan.org/pod/Pheno::Ranker',
            },
            {
              label: 'CNAG',
              href: 'https://www.cnag.eu',
            },
          ],
        },
      ],
      copyright: 'Copyright © 2023-2026 Manuel Rueda, CNAG.',
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
