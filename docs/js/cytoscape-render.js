// cytoscape-render.js

// Initialize cyInstances as an empty object to store Cytoscape instances
if (!window.cyInstances) {
    window.cyInstances = {};
}

/**
 * Function to load and render the Cytoscape graph
 * @param {string} containerId - The ID of the container div (e.g., "cy1")
 * @param {string} jsonPath - The path to the JSON data file (e.g., "data/corpus_cytoscape.json")
 * @param {number} limit - Number of nodes to display per page (for pagination)
 * @param {number} page - Page number for pagination
 * @param {function} callback - Callback function after loading the graph
 */
window.loadCytoscapeGraph = function(containerId, jsonPath, repoName, limit = 100, page = 1, callback) {
    if (!jsonPath || !repoName) {
        console.error("Error: Both jsonPath and repoName must be provided.");
        return;
    }

    // Detect if running on GitHub Pages
    let baseUrl = window.location.origin;
    if (window.location.hostname.includes("github.io")) {
        baseUrl += "/" + repoName; // Append GitHub repo name
    }

    const fullJsonPath = baseUrl + "/" + jsonPath;
    console.log("Loading Cytoscape JSON from:", fullJsonPath);

    fetch(fullJsonPath)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            // Validate the structure of the JSON data
            if (!data.elements || !Array.isArray(data.elements.nodes) || !Array.isArray(data.elements.edges)) {
                throw new Error("Invalid JSON structure. Expected 'elements' with 'nodes' and 'edges'.");
            }

            const totalNodes = data.elements.nodes.length;
            const maxPage = Math.ceil(totalNodes / limit);
            const start = (page - 1) * limit;
            const end = start + limit;

            // Slice the nodes array for pagination
            const limitedNodes = data.elements.nodes.slice(start, end);
            const nodeIds = new Set(limitedNodes.map(node => node.data.id));

            // Define maximum edges per node and minimum weight for edge filtering
            const maxEdgesPerNode = 5;
            const minWeight = 0;

            // Create a map to count edges per node to enforce maxEdgesPerNode
            const edgeCount = {};

            // Filter and limit edges based on the defined criteria
            const limitedEdges = data.elements.edges
                .filter(edge => nodeIds.has(edge.data.source) && nodeIds.has(edge.data.target))
                .sort((a, b) => {
                    const weightA = parseFloat(a.data.weight) || 0;
                    const weightB = parseFloat(b.data.weight) || 0;
                    return weightB - weightA; // Sort edges by descending weight
                })
                .filter(edge => {
                    const source = edge.data.source;
                    const target = edge.data.target;

                    // Initialize edge counts if not present
                    if (!edgeCount[source]) edgeCount[source] = 0;
                    if (!edgeCount[target]) edgeCount[target] = 0;

                    const edgeWeight = parseFloat(edge.data.weight) || 0;

                    // Check if edge meets the weight and edge count criteria
                    if (
                        edgeWeight >= minWeight &&
                        edgeCount[source] < maxEdgesPerNode &&
                        edgeCount[target] < maxEdgesPerNode
                    ) {
                        edgeCount[source]++;
                        edgeCount[target]++;
                        return true;
                    }
                    return false;
                });

            const limitedData = {
                elements: {
                    nodes: limitedNodes,
                    edges: limitedEdges
                }
            };

            // Initialize Cytoscape and store the instance in window.cyInstances
            window.cyInstances[containerId] = cytoscape({
                container: document.getElementById(containerId),

                elements: limitedData.elements,

                style: [
                    {
                        selector: 'node',
                        style: {
                            'background-color': '#0074D9',
                            'label': 'data(id)', // Use 'id' as the label
                            'text-valign': 'center',
                            'text-halign': 'center',
                            'color': '#000',
                            'font-size': 10, // Increased font size for better readability
                            'width': 40,      // Increased node size to accommodate labels
                            'height': 40,
                            'text-wrap': 'wrap',
                            'text-max-width': 150
                        }
                    },
                    {
                        selector: 'edge',
                        style: {
                            'width': function(ele) { return (parseFloat(ele.data("weight")) >= minWeight ? 2 : 1); },
                            'line-color': function(ele) { return (parseFloat(ele.data("weight")) >= minWeight ? '#FF4136' : '#999'); },
                            'opacity': function(ele) { return (parseFloat(ele.data("weight")) >= minWeight ? 0.8 : 0.3); },
                            'curve-style': 'bezier',
                            'target-arrow-shape': 'triangle', // Adds arrowheads for directionality
                            'target-arrow-color': '#FF4136',
                            'label': 'data(weight)', // Display 'weight' as edge label
                            'font-size': 8,
                            'text-rotation': 'autorotate',
                            'text-margin-x': 0,
                            'text-margin-y': -10, // Adjusts label position above the edge
                            'color': '#555' // Color of the edge labels
                        }
                    }
                ],

                layout: {
                    name: 'cose', // Force-directed layout
                    animate: true,
                    padding: 30
                },

                pixelRatio: 1,
                autoungrabify: false, // Allow nodes to be grabbed and dragged
                boxSelectionEnabled: false,
                userZoomingEnabled: true,
                userPanningEnabled: true
            });

            // Make the Cytoscape instance responsive to window resizing
            window.addEventListener('resize', () => {
                const cy = window.cyInstances[containerId];
                if (cy) {
                    cy.resize();
                    cy.fit(); // Optional: Fit the graph to the container after resizing
                }
            });

            // Execute the callback function if provided
            if (typeof callback === 'function') {
                callback(totalNodes, maxPage);
            }
        })
        .catch(error => {
            console.error(`Error loading Cytoscape JSON from ${jsonPath}:`, error);
        });
};
