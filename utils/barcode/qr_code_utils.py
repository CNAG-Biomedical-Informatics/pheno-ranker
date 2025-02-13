import json
import csv
import os
import argparse
import re
import zlib
import base64
import qrcode
import glob
from PIL import Image
from pyzbar.pyzbar import decode

# Utility functions
def load_json_file(file_path):
    """ Loads JSON data from a file. """
    with open(file_path, 'r') as file:
        return json.load(file)

def save_json_file(data, file_path):
    """ Saves JSON data to a file and ensures it ends with a newline character. """
    with open(file_path, 'w', newline='\n') as file:
        json.dump(data, file, indent=4)
        file.write('\n')  # Add a newline character at the end

# Functions for QR code generation from JSON
def compress_binary_string(binary_digit_string, compress=True):
    if compress:
        # Substitute '0' with '2' and '1' with '3' to avoid 
        # byte_code.encode padding issues with leading zeroes
        substituted_string = binary_digit_string.replace('0', '2').replace('1', '3')

        # Convert to bytes and compress
        byte_code = substituted_string.encode()  # Directly encode the ASCII string to bytes
        compressed_bytes = zlib.compress(byte_code)
        return compressed_bytes
    else:
        return binary_digit_string.encode()

def decompress_binary_string(compressed_bytes):
    try:
        # Decompress the bytes
        decompressed_bytes = zlib.decompress(compressed_bytes)

        # Convert the decompressed bytes back to the substituted string
        substituted_string = decompressed_bytes.decode()

        # Revert the substitution
        original_binary_string = substituted_string.replace('2', '0').replace('3', '1')
        return original_binary_string
    except Exception as e:
        print("Error in decompression:", e)
        return ''

def generate_qr_from_data(binary_digit_string, output_path, qr_version, compress=True):
    # Check if non-compressed mode is being used with a very long binary string.
    if not compress and len(binary_digit_string) > 1000:
        raise ValueError("Error: The binary digit string exceeds 1,000 characters in non-compressed mode. "
                         "Please use the default --compress option.")

    if compress:
        # Compress and then base64 encode the data
        compressed_data = compress_binary_string(binary_digit_string, compress)
        data_to_encode = base64.b64encode(compressed_data)
    else:
        # Prepend a unique marker to force byte mode
        data_to_encode = ("UNCOMP:" + binary_digit_string).encode('utf-8')

    # Create QR code
    qr = qrcode.QRCode(
        version=qr_version,
        error_correction=qrcode.constants.ERROR_CORRECT_L,
        box_size=10,
        border=4,
    )
    qr.add_data(data_to_encode)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")
    img.save(output_path)

def generate_qr_codes_from_json(json_data, output_dir, qr_version, compress=True):
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)
    for key, value in json_data.items():
        if 'binary_digit_string' in value:
            binary_digit_string = value['binary_digit_string']
            safe_key = key.replace(':', '_').replace('/', '_')
            img_path = os.path.join(output_dir, f"{safe_key}.png")
            generate_qr_from_data(binary_digit_string, img_path, qr_version, compress)

# Functions for decoding QR codes to JSON
def decode_qr_code(filepath):
    # Open the image and decode the QR code
    data = decode(Image.open(filepath))
    if not data:
        print(f"No QR code data found in file: {filepath}")
        return None, None, False

    qr_data = data[0].data

    try:
        # Decode as UTF-8 to inspect the string
        decoded_str = qr_data.decode('utf-8', errors='ignore')
        
        # If the string starts with our unique non-compressed marker, remove it.
        if decoded_str.startswith("UNCOMP:"):
            binary_digit_string = decoded_str[len("UNCOMP:"):]
            is_compressed = False
            return qr_data, binary_digit_string, is_compressed

        # Otherwise, assume the data is base64 encoded (i.e., compressed)
        base64_decoded_data = base64.b64decode(qr_data)
        try:
            decompressed_data = zlib.decompress(base64_decoded_data)
            decompressed_and_reverted_string = decompressed_data.decode().replace('2', '0').replace('3', '1')
            is_compressed = True
        except zlib.error:
            decompressed_and_reverted_string = base64_decoded_data.decode('utf-8', errors='ignore')
            is_compressed = False

        return qr_data, decompressed_and_reverted_string, is_compressed
    except Exception as e:
        print(f"Error during decoding: {e}")
        return None, None, False

def is_data_compressed(qr_data):
    # Check the first character to determine if data is compressed
    try:
        marker = qr_data[:1].decode()
        return marker == 'C'
    except Exception as e:
        print(f"Error determining data compression: {e}")
        return False


def decode_binary_string(binary_string, json_template):
    keys = list(json_template.keys())
    decoded_data = {}
    for i, bit in enumerate(binary_string):
        if i < len(keys) and bit == '1':
            full_key = keys[i]
            *key_parts, value = full_key.split('.')
            key = '.'.join(key_parts)
            decoded_data[key] = value
    return decoded_data

def unflatten(dictionary):
    result = {}
    for key, value in dictionary.items():
        parts = key.split('.')
        d = result
        for part in parts[:-1]:
            if part not in d:
                d[part] = {}
            d = d[part]
        d[parts[-1]] = value
    return result

def convert_curie_objects_to_array(data):
    def is_curie(key):
        return re.match(r'^\w+:[^:]+$', key)
    def recursive_convert(obj):
        if isinstance(obj, dict):
            curie_keys = [key for key in obj if is_curie(key) and isinstance(obj[key], dict)]
            if curie_keys:
                array = [obj[key] for key in curie_keys]
                for key in curie_keys:
                    del obj[key]
                non_curie_keys = set(obj.keys()) - set(curie_keys)
                if non_curie_keys:
                    return {**obj, 'array': array}
                else:
                    return array
            else:
                for key in obj:
                    obj[key] = recursive_convert(obj[key])
        return obj
    return recursive_convert(data)

def decode_qr_codes_to_json(file_paths, json_template):
    results = []

    for filepath in file_paths:
        if filepath.endswith('.png'):
            qr_data, binary_digit_string, is_compressed = decode_qr_code(filepath)

            if binary_digit_string:
                result = decode_binary_string(binary_digit_string, json_template)
                unflattened_result = unflatten(result)
                final_result = convert_curie_objects_to_array(unflattened_result)

                # Extract the ID from the filename (this will be the sanitized ID)
                id_from_filename = os.path.splitext(os.path.basename(filepath))[0]
                final_result["id_from_qr"] = id_from_filename

                results.append(final_result)
            else:
                print(f"No valid QR code data found in {filepath}")

    return results

def generate_csv_from_pngs(png_files, csv_file_path):
    with open(csv_file_path, 'w', newline='\n') as csvfile:
        csvwriter = csv.writer(csvfile, delimiter=',', quotechar='"',
                               quoting=csv.QUOTE_MINIMAL, escapechar='\\')
        csvwriter.writerow(["Name_of_PNG", "Raw_QR_Data", "Processed_Data", "Was_Compressed"])

        for png_file in png_files:
            qr_data, processed_data, was_compressed = decode_qr_code(png_file)

            if qr_data is not None:
                # If qr_data is bytes, decode it to a string.
                if isinstance(qr_data, bytes):
                    qr_raw_str = qr_data.decode('utf-8', errors='ignore')
                else:
                    qr_raw_str = str(qr_data)
                csvwriter.writerow([os.path.basename(png_file),
                                    qr_raw_str,
                                    processed_data,
                                    was_compressed])
            else:
                print(f"Failed to decode QR code in file: {png_file}")

# CLI setup functions
def setup_qr_generation_cli():
    parser = argparse.ArgumentParser(description='Generate QR codes from JSON data.')
    parser.add_argument('-i', '--input', required=True, help='Input JSON file path')
    parser.add_argument('-o', '--output', default='qr_codes', help='Output directory for QR codes')
    parser.add_argument('--qr-version', type=int, default=1, help='Specifies the version of the QR code (integer from 1 to 40).')
    parser.add_argument('--no-compress', action='store_true', help='Disable compression of the binary digit string')
    return parser.parse_args()

def setup_qr_decoding_cli():
    parser = argparse.ArgumentParser(description='Decode QR codes to JSON format.')
    parser.add_argument('-i', '--input', nargs='+', required=True, help='Input PNG files (e.g., "image1.png image2.png")')
    parser.add_argument('-t', '--template', required=True, help='JSON template file')
    parser.add_argument('-o', '--output', default='decoded.json', help='Output JSON file')
    parser.add_argument('--generate-csv', action='store_true', help='Generate a CSV file with QR code data')
    parser.add_argument('--csv-file', default='qr_data.csv', help='Output CSV file path (default: qr_data.csv)')
    return parser.parse_args()

# Main functions for CLI
def main_generate():
    args = setup_qr_generation_cli()
    json_data = load_json_file(args.input)
    qr_version = args.qr_version
    compress = not args.no_compress  # Determine whether to compress based on the --no-compress flag
    generate_qr_codes_from_json(json_data, args.output, qr_version, compress)
    print(f"QR codes generated successfully in {args.output}")

def main_decode():
    args = setup_qr_decoding_cli()
    json_template = load_json_file(args.template)
    decoded_data = decode_qr_codes_to_json(args.input, json_template)
    save_json_file(decoded_data, args.output)
    print(f"Decoded data saved to {args.output}")
    if args.generate_csv:
        # Pass the list of PNG file paths directly
        generate_csv_from_pngs(args.input, args.csv_file)
        print(f"CSV file generated at {args.csv_file}")
