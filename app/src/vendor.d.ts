declare module 'plotly.js-dist-min' {
  const Plotly: {newPlot: (element: HTMLElement, data: unknown[], layout: Record<string, unknown>, config: Record<string, unknown>) => Promise<void>; purge: (element: HTMLElement) => void; Plots: {resize: (element: HTMLElement) => Promise<void>}}
  export default Plotly
}
declare module 'cytoscape' {
  const cytoscape: (options: Record<string, unknown>) => {destroy(): void; resize(): void; fit(): void; on(event: string, selector: string, callback: (event: {target: {data(): Record<string, unknown>}}) => void): void}
  export default cytoscape
}
