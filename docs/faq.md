Frequently Asked Questions

## General

??? faq "What does `Pheno-Ranker` do?"

    Advancing Semantic Similarity Analysis of Phenotypic Data Stored in GA4GH Standards and Beyond

    ##### last change 2023-09-23 by Manuel Rueda [:fontawesome-brands-github:](https://github.com/mrueda)

??? faq "Is `Pheno-Ranker` free?"

    Yes. See the [license](https://github.com/mrueda/pheno-ranker/blob/main/LICENSE).

    ##### last change 2023-09-23 by Manuel Rueda [:fontawesome-brands-github:](https://github.com/mrueda)

??? faq "Can I export intermediate files?"

    Yes.

    It is possible to export all intermediate files, as well as a file indicating coverage with the flag `--e`.

    In `patient` mode, alignment files can be obtained by using `--align`.

    ##### last change 2023-10-13 by Manuel Rueda [:fontawesome-brands-github:](https://github.com/mrueda)

??? faq "How could I implement Pheno-Ranker in a federated network?"
 
    The current implementation of Pheno-Ranker performs all calculations from scratch each time, as it's designed for local operation. To adapt the algorithm for use across multiple hospitals without directly sharing clinical data, one suggestion would be to:

    1.  Store the vectors for each patient in a **database**. 
          ```json
          "id_1": "1101010101010...n",
          "id_2": "0101010101000...n"
          ```
    2.  Use a **Pheno-Ranker Aggregator** to build a _global vector_ periodically.
    3.  **Re-build** the vector database on each site periodically.
    4.  Perform **inter-hospital queries** by sending the vector to each site database (similar to [Matchmaker Exchange](https://www.matchmakerexchange.org/)).

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

    <figcaption>Pheno-Ranker algorithm in a federated network</figcaption>

    ##### last change 2023-10-14 by Manuel Rueda [:fontawesome-brands-github:](https://github.com/mrueda)

## Installation
