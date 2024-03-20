# Proposal: Implementing Pheno-Ranker in a Federated Network

In this proposal, we aim to explore the potential application of Pheno-Ranker within two distinct contexts: the Inter-Hospital Network and the Beacon v2 Network.

<figure markdown>
 Federated network diagram
 ![Pheno-Ranker](img/federated-matching.png){width="250"}
 <figcaption>Image created by DAL.LE-3</figcaption>
</figure>

=== "Use Case A: Inter-Hospital Network"

    The current version of Pheno-Ranker is designed for file-based operations and initiates calculations from scratch each time. To adapt the algorithm for use in multiple hospitals without directly sharing clinical data, we propose the following approach:
    
    ### 1. Preparation Stage:
    _Vector Standardization_: Ensure all hospitals use a standardized vector format.
    
      *	Store each patient’s vector in a local-database.
      	*	“id_1": "1101010101010...n",
      	*	"id_2": "0101010101000...n
      *	Utilize a network aggregator to regularly update a global reference vector. Each update gets a new version identifier.
      *	Periodically update the vector database at each site to ensure current data.
    
    _Privacy Protocols_: Set up differential privacy mechanisms or encryption protocols.
    
    _Threshold Agreement_: Establish a common threshold for the Hamming distance (or other metric) for matches.
    
    ```mermaid
    %%{init: {'theme':'neutral'}}%%
    graph TD
      subgraph "Hospital A"
      A[Pheno-Ranker]--> B[Global Vector A]
      end
    
      subgraph "Hospital B"
      C[Pheno-Ranker] --> D[Global Vector B]
      end
    
      subgraph "Hospital C"
      E[Pheno-Ranker] --> F[Global Vector C]
      end
    
      subgraph "Network Aggregator"
      G[Global Vector A+B+C]
      end
    
      B --> G
      D --> G
      F --> G
    
      style A fill: #6495ED, stroke: #6495ED
      style B fill: #6495ED, stroke: #6495ED
      style C fill: #AFEEEE, stroke: #AFEEEE
      style D fill: #AFEEEE, stroke: #AFEEEE
      style E fill: #3CB371, stroke: #3CB371
      style F fill: #3CB371, stroke: #3CB371
      style G fill: #FFFF33, stroke: #FFFF33
    ```
    <figcaption>Preparation stage of Pheno-Ranker algorithm in an inter-hospital network</figcaption>
    
    
    ### 2. Query Initiation:
    The querying hospital prepares a vector representation of the individual or set of individuals.
    The vector is processed using the agreed-upon privacy protocols.
    
    ### 3. Aggregator Mediation:
    The querying hospital sends the processed vector to the network aggregator.
    The network aggregator distributes the query to all hospitals in the federated network.
    
    ### 4. Local Computation:
    Each receiving hospital computes the Hamming distance against its local patient vectors.
    The computation is done entirely within the local environment of each hospital.
    
    ### 5. Thresholding:
    Each hospital applies the agreed-upon thresholding to identify vectors that are considered a "match."
    
    ### 6. Response to Aggregator:
    Each hospital sends its response (list of matching vectors, counts, etc.) back to the network aggregator.
    
    ### 7. Aggregation:
    The network aggregator collects all the responses, processes them, and sends the aggregated result to the querying hospital.
    
    ### 8. Post-Processing:
    The querying hospital undertakes further analysis, potentially reaching out to specific hospitals for more information based on the aggregated results, and decides on subsequent actions.      
    
    ```mermaid
    %%{init: {'theme':'neutral'}}%%
    graph LR
      A[Querying Hospital] --> B[Prepare Vector]
      B --> C[Apply Privacy Protocols]
      C --> D[Send Query to Aggregator]
    
      AGG[Network Aggregator] --> E1[Receiving Hospital 1]
      AGG --> E2[Receiving Hospital 2]
      AGG --> En[Receiving Hospital n]
    
      E1 --> F1[Compute Hamming Distance]
      E2 --> F2[Compute Hamming Distance]
      En --> Fn[Compute Hamming Distance]
    
      F1 --> G1[Apply Threshold]
      F2 --> G2[Apply Threshold]
      Fn --> Gn[Apply Threshold]
    
      G1 --> H1[Prepare Response]
      G2 --> H2[Prepare Response]
      Gn --> Hn[Prepare Response]
    
      H1 --> AGG
      H2 --> AGG
      Hn --> AGG
    
      AGG --> I[Aggregate Responses at Querying Hospital]
      I --> J[Post-Processing & Analysis]
    
      style A fill:#f9d77e,stroke:#333,stroke-width:2px
      style AGG fill:#8fd4aa,stroke:#333,stroke-width:2px
      style E1 fill:#f9d77e,stroke:#333,stroke-width:2px
      style E2 fill:#f9d77e,stroke:#333,stroke-width:2px
      style En fill:#f9d77e,stroke:#333,stroke-width:2px
    ```
    <figcaption>Pheno-Ranker algorithm in a fedarated network</figcaption>
    
=== "Use Case B: Beacon v2 Network"
    
    To facilitate Pheno-Ranker's integration into the Beacon v2 API ecosystem, we propose the addition of a specific term to the JSON Schema of the _individuals_ entry type in [Beacon v2 Models](https://docs.genomebeacons.org/schemas-md/individuals_defaultSchema). We propose two distinct pathways for query submission to enhance flexibility and security:
    
    1. The first mirrors the method used within hospital networks, where queries utilize a precomputed vector. This approach ensures secure and swift similarity evaluations against an existing database. To facilitate this, a Beacon aggregator would periodically aggregate ontologies via the _filtering_terms_ endpoint from each Beacon v2 API, creating a global lookup table.
    2. Alternatively, centers may submit queries using actual `JSON` data (either `BFF` or `PXF` objects`), which should be anonymized or meet the network's security standards. This option allows the recipient site to perform similarity analyses either on precomputed data or on-the-fly using Pheno-Ranker's CLI or module, offering greater adaptability.
    The response schema can either adhere to the Beacon v2 specification standards or be adapted to include similarity metrics, enhancing the utility and adaptability of the integration.
    
    ??? Example "Draft Proposal for the JSON Schema of the `phenoRanker` property"
       
        Note: In YAML, subject to future modifications:
    
        ```yaml
        $schema: "https://json-schema.org/draft/2020-12/schema"
        type: object
        properties:
          phenoRanker:
            type: array
            description: "Array of objects representing the phenoRanker data. Each object must contain exactly one of 'vector', 'bff', or 'pxf'."
            items:
              type: object
              properties:
                info:
                  type: string
                  description: "Additional information about the phenoRanker object. This field is optional."
                  example: "This is a sample description for the phenoRanker object."
              oneOf:
                - properties:
                    vector:
                      type: string
                      pattern: "^[01]+$"
                      description: "A binary string composed of ones and zeros representing a specific vector."
                      example: "1010101"
                    version:
                      type: string
                      description: "The version of global lookup table for the phenoRanker object."
                      example: "1.0.0"
                  required:
                    - vector
                    - version
                - properties:
                    bff:
                      type: object
                      description: "Object representing the BFF data."
                  required:
                    - bff
                - properties:
                    pxf:
                      type: object
                      description: "Object representing the PXF data."
                  required:
                    - pxf
              description: "Object structure for each item in the phenoRanker array must contain exactly one of 'vector', 'bff', or 'pxf'."
        required:
          - phenoRanker
        description: "Schema for phenoRanker property. Each object in the 'phenoRanker' array must contain exactly one of the specified properties: 'vector', 'bff', or 'pxf'."
        ```
