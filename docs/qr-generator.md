# Converting pheno-clinical data to 2D-barcodes

=== "Explanation"

    As a proof of concept, we created an utility that encodes/decodes the `Pheno-Ranker` format to a [QR codes](https://en.wikipedia.org/wiki/QR_code).

    ???+ Example "About the utility of QR codes"
        2D barcodes are straightforward and easy to scan, typically using a smartphone camera. They offer the convenience of encoding various data. Below are a few examples:

        * Enrolling in clinical trial or health data program via QR
        * Patient-doctor pass of information
        * Medical reports with augmented data

        Of course if you are using `Pheno-Ranker` with non pheno-clinical data you will need to come up with your own examples :smile:.

    Ok, let's convert `Pheno-Ranker` data to QRs.

    
    !!! Danger "Experimental feature"
        This feature serves as a **proof of concept**. The generated QR code images exclusively encode `Pheno-Ranker` data and do not include any clinical information. To decode these images back into phenotypic-clinical data, a specific `template` is required. In a production environment, implementing an additional security layer, such as AES encryption, is recommended to enhance data safety.
    
    === "From Pheno-Ranker to QR"
    
        The first thing is to run `Pheno-Ranker` with your data, but using the flag `--export`:
        
        ```bash
        ./pheno-ranker -r individuals.json --export my_export_name
        ```
        
        This will create a set of files, including `my_export_name.glob_hash.json` and `my_export_name.ref_binary_hash.json`.

        Now you can run the following command:
        
        ```bash
        ./pheno-ranker2barcode -i my_export_name.ref_binary_hash.json -o my_fav_dir
        ```
        
        This will create 1 `png` image (inside `my_fav_dir`) for each individual in `individuals.json`. Like this one:
        <figure markdown>
         ![Pheno-Ranker](img/107_week_0_arm_1.png){width="350"}
         <figcaption>QR code from Pheno-Ranker</figcaption>
        </figure>

    === "From QR to Pheno-Ranker"

        To decode a QR into `Pheno-Ranker` original format use the following:

        ```bash
        ./barcode2pheno-ranker -i my_fav_dir/*png -t my_export_name.glob_hash.json -o individuals.qr.json 
        ```
    
=== "Usage"

    --8<-- "https://raw.githubusercontent.com/CNAG-Biomedical-Informatics/pheno-ranker/main/utils/barcode/README.md"

