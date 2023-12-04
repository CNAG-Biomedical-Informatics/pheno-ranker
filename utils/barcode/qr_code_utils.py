import json
import os
import argparse
import re
from PIL import Image
from pyzbar.pyzbar import decode
import qrcode
import glob

# Utility functions
def load_json_file(file_path):
    """ Loads JSON data from a file. """
    with open(file_path, 'r') as file:
        return json.load(file)

def save_json_file(data, file_path):
    """ Saves JSON data to a file. """
    with open(file_path, 'w') as file:
        json.dump(data, file, indent=4)

# Functions for QR code generation from JSON
def generate_qr_from_data(binary_digit_string, output_path):
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_L,
        box_size=10,
        border=4,
    )
    qr.add_data(binary_digit_string)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")
    img.save(output_path)

def generate_qr_codes_from_json(json_data, output_dir):
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)

    for key, value in json_data.items():
        if 'binary_digit_string' in value:
            binary_digit_string = value['binary_digit_string']
            safe_key = key.replace(':', '_')
            img_path = os.path.join(output_dir, f"{safe_key}.png")
            generate_qr_from_data(binary_digit_string, img_path)

# Functions for decoding QR codes to JSON
def decode_qr_code(filepath):
    data = decode(Image.open(filepath))
    return data[0].data.decode() if data else None

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
            binary_string = decode_qr_code(filepath)
            if binary_string:
                result = decode_binary_string(binary_string, json_template)
                unflattened_result = unflatten(result)
                final_result = convert_curie_objects_to_array(unflattened_result)
                results.append(final_result)
            else:
                print(f"No QR code found in {filepath}")
    return results

# CLI setup functions
def setup_qr_generation_cli():
    parser = argparse.ArgumentParser(description='Generate QR codes from JSON data.')
    parser.add_argument('-i', '--input', required=True, help='Input JSON file path')
    parser.add_argument('-o', '--output', default='qr_codes', help='Output directory for QR codes')
    return parser.parse_args()

def setup_qr_decoding_cli():
    parser = argparse.ArgumentParser(description='Decode QR codes to JSON format.')
    parser.add_argument('-i', '--input', nargs='+', required=True, help='Input PNG files (e.g., "image1.png image2.png")')
    parser.add_argument('-t', '--template', required=True, help='JSON template file')
    parser.add_argument('-o', '--output', default='decoded.json', help='Output JSON file')
    return parser.parse_args()

# Main functions for CLI
def main_generate():
    args = setup_qr_generation_cli()
    json_data = load_json_file(args.input)
    generate_qr_codes_from_json(json_data, args.output)
    print(f"QR codes generated successfully in {args.output}")

def main_decode():
    args = setup_qr_decoding_cli()
    json_template = load_json_file(args.template)
    decoded_data = decode_qr_codes_to_json(args.input, json_template)
    save_json_file(decoded_data, args.output)
    print(f"Decoded data saved to {args.output}")
