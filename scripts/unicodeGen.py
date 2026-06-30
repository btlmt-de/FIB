#!/usr/bin/env python3
"""
FIB Resource Pack Generator
"""

import os
import sys
import json
import argparse
from pathlib import Path

TAB_TILE_COUNT = 3
TAB_TILE_HEIGHT = 35
TAB_TILE_ASCENT = 30
TAB_SPACE_ADVANCE = -1


def material_start_index() -> int:
    return TAB_TILE_COUNT + 1

def get_png_files(folder_path: str) -> list[str]:
    materials = []

    folder = Path(folder_path)
    if not folder.exists():
        print(f"Error: Folder '{folder_path}' does not exist!")
        sys.exit(1)

    for file in folder.iterdir():
        if file.suffix.lower() == '.png':
            # Convert filename to material name (uppercase)
            material = file.stem.upper()
            materials.append(material)

    # Sort alphabetically
    materials.sort()
    return materials


def int_to_unicode_char(n: int) -> str:
    return chr(0xe000 + n)


def generate_unicode_items(materials: list[str]) -> list[dict]:
    """Generate unicodeItems.json content"""
    items = []
    unicode_index = material_start_index()

    for material in materials:
        # Normal entry (for bossbar)
        items.append({
            "material": material,
            "unicode": int_to_unicode_char(unicode_index)
        })
        unicode_index += 1

        # TabChat entry
        items.append({
            "material": f"{material}_tabChat",
            "unicode": int_to_unicode_char(unicode_index)
        })
        unicode_index += 1

    return items


def generate_default_json(materials: list[str]) -> dict:
    """Generate default.json content"""
    providers = []

    for i in range(TAB_TILE_COUNT):
        providers.append({
            "type": "bitmap",
            "file": f"minecraft:fib/tab_logo_{i}.png",
            "height": TAB_TILE_HEIGHT,
            "ascent": TAB_TILE_ASCENT,
            "chars": [int_to_unicode_char(i)]
        })

    # Negative-space
    providers.append({
        "type": "space",
        "advances": {int_to_unicode_char(TAB_TILE_COUNT): TAB_SPACE_ADVANCE}
    })

    unicode_index = material_start_index()

    for material in materials:
        filename = material.lower()

        # Normal entry (height: 15)
        providers.append({
            "type": "bitmap",
            "file": f"minecraft:fib/{filename}.png",
            "height": 15,
            "ascent": 9,
            "chars": [int_to_unicode_char(unicode_index)]
        })
        unicode_index += 1

        # TabChat entry (height: 10)
        providers.append({
            "type": "bitmap",
            "file": f"minecraft:fib/{filename}.png",
            "height": 10,
            "ascent": 9,
            "chars": [int_to_unicode_char(unicode_index)]
        })
        unicode_index += 1

    return {"providers": providers}


def write_json_file(filepath: str, data, indent: int = 2):
    # Create directory if it doesn't exist
    os.makedirs(os.path.dirname(filepath) or '.', exist_ok=True)

    with open(filepath, 'w', encoding='utf-8') as f:
        # Use ensure_ascii=True to get \uXXXX escapes
        json.dump(data, f, indent=indent, ensure_ascii=True)
    print(f"✓ Generated: {filepath}")


def main():
    parser = argparse.ArgumentParser(
        description='Generate unicodeItems.json and default.json from PNG files'
    )
    parser.add_argument(
        'png_folder',
        help='Path to folder containing PNG files'
    )
    parser.add_argument(
        '--unicode-output',
        default='./unicodeItems.json',
        help='Output path for unicodeItems.json (default: ./unicodeItems.json)'
    )
    parser.add_argument(
        '--font-output',
        default='./default.json',
        help='Output path for default.json (default: ./default.json)'
    )

    args = parser.parse_args()

    print(f"Scanning folder: {args.png_folder}")

    # Get all PNG files
    materials = get_png_files(args.png_folder)

    materials = [
        m for m in materials
        if m.lower() != 'tab' and not m.lower().startswith('tab_logo')
    ]

    print(f"Found {len(materials)} materials")

    # Generate unicodeItems.json
    unicode_items = generate_unicode_items(materials)
    write_json_file(args.unicode_output, unicode_items)

    # Generate default.json
    default_json = generate_default_json(materials)
    write_json_file(args.font_output, default_json)

    # Print summary
    # tab tiles + spacer + (normal + tabChat) per material
    total_unicodes = TAB_TILE_COUNT + 1 + len(materials) * 2
    last_unicode = 0xe000 + total_unicodes - 1
    print(f"\nSummary:")
    print(f"  Tab tiles: {TAB_TILE_COUNT} (+1 spacer)")
    print(f"  Materials: {len(materials)}")
    print(f"  Material glyphs start at: \\u{0xe000 + material_start_index():04x}")
    print(f"  Unicode entries: {len(unicode_items)}")
    print(f"  Font providers: {len(default_json['providers'])}")
    print(f"  Unicode range: \\ue000 - \\u{last_unicode:04x}")


if __name__ == "__main__":
    main()