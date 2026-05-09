import {useEffect, useRef, useState} from 'react';
import useBaseUrl from '@docusaurus/useBaseUrl';

type GraphElement = {
  data: {
    id?: string;
    source?: string;
    target?: string;
    weight?: string | number;
  };
};

type CytoscapePayload = {
  elements?: {
    nodes?: GraphElement[];
    edges?: GraphElement[];
  };
};

type Props = {
  id: string;
  graphPath: string;
  limit?: number;
};

export default function CytoscapeGraph({id, graphPath, limit = 100}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [status, setStatus] = useState('Loading graph...');
  const resolvedGraphPath = useBaseUrl(graphPath);

  useEffect(() => {
    let destroyed = false;
    let cy: {destroy: () => void} | undefined;

    async function renderGraph() {
      const [{default: cytoscape}, response] = await Promise.all([
        import('cytoscape'),
        fetch(resolvedGraphPath),
      ]);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = (await response.json()) as CytoscapePayload;
      const nodes = data.elements?.nodes ?? [];
      const edges = data.elements?.edges ?? [];

      if (!containerRef.current || destroyed) {
        return;
      }

      if (!nodes.length) {
        setStatus('No graph nodes available.');
        return;
      }

      const limitedNodes = nodes.slice(0, limit);
      const nodeIds = new Set(limitedNodes.map((node) => node.data.id).filter(Boolean));
      const edgeCount: Record<string, number> = {};
      const maxEdgesPerNode = 5;

      const limitedEdges = edges
        .filter((edge) => nodeIds.has(edge.data.source) && nodeIds.has(edge.data.target))
        .sort((a, b) => Number(b.data.weight ?? 0) - Number(a.data.weight ?? 0))
        .filter((edge) => {
          const source = edge.data.source ?? '';
          const target = edge.data.target ?? '';
          edgeCount[source] ??= 0;
          edgeCount[target] ??= 0;

          if (edgeCount[source] >= maxEdgesPerNode || edgeCount[target] >= maxEdgesPerNode) {
            return false;
          }

          edgeCount[source] += 1;
          edgeCount[target] += 1;
          return true;
        });

      cy = cytoscape({
        container: containerRef.current,
        elements: {
          nodes: limitedNodes as never,
          edges: limitedEdges as never,
        },
        style: [
          {
            selector: 'node',
            style: {
              'background-color': '#147c94',
              label: 'data(id)',
              'text-valign': 'center',
              'text-halign': 'center',
              color: '#0f172a',
              'font-size': '10px',
              width: '40px',
              height: '40px',
              'text-wrap': 'wrap',
              'text-max-width': '150px',
            },
          },
          {
            selector: 'edge',
            style: {
              width: '2px',
              'line-color': '#e69a3f',
              opacity: 0.8,
              'curve-style': 'bezier',
              'target-arrow-shape': 'triangle',
              'target-arrow-color': '#e69a3f',
              label: 'data(weight)',
              'font-size': '8px',
              'text-rotation': 'autorotate',
              'text-margin-y': -10,
              color: '#475569',
            },
          },
        ],
        layout: {
          name: 'cose',
          animate: false,
          padding: 30,
        },
        pixelRatio: 1,
        autoungrabify: false,
        boxSelectionEnabled: false,
        userZoomingEnabled: true,
        userPanningEnabled: true,
      });

      setStatus(`Showing ${limitedNodes.length} of ${nodes.length} nodes and ${limitedEdges.length} edges.`);
    }

    renderGraph().catch((error: unknown) => {
      if (!destroyed) {
        setStatus(`Could not load graph: ${error instanceof Error ? error.message : String(error)}`);
      }
    });

    return () => {
      destroyed = true;
      cy?.destroy();
    };
  }, [limit, resolvedGraphPath]);

  return (
    <div className="cytoscapeGraph" aria-label={`Cytoscape graph ${id}`}>
      <div id={id} ref={containerRef} className="cytoscapeGraph__canvas" />
      <p className="cytoscapeGraph__status">{status}</p>
    </div>
  );
}
