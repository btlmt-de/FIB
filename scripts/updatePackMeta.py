import json
import re
import sys
from pathlib import Path

RESOURCE_PACK_META = Path("ForceItemBattle/pack.mcmeta")
DATAPACK_META = Path("FIB_Worldgen/pack.mcmeta")

def parse_build(description_str):
    build_match = re.search(r'\[([^\]]+)\]', description_str)
    return float(build_match.group(1)) if build_match else 1.0

def next_build(current_build):
    return round(current_build + 0.1, 1)

def update_resource_pack_meta(mc_version, resource_format, is_new_version):
    with open(RESOURCE_PACK_META, "r", encoding="utf-8") as f:
        data = json.load(f)

    current_desc = data["pack"]["description"]
    current_build = parse_build(current_desc)

    if is_new_version:
        new_build = 1.0
        print(f"  New MC version detected, resetting build to {new_build}")
    else:
        new_build = next_build(current_build)
        print(f"  Same MC version, incrementing build {current_build} -> {new_build}")

    new_desc = f"§6§lMcPlayHD.net ({mc_version}) [{new_build}]"
    data["pack"]["description"] = new_desc
    data["pack"]["max_format"] = float(resource_format)

    with open(RESOURCE_PACK_META, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

    print(f"  Resource pack: '{new_desc}', max_format={resource_format}")

def update_datapack_meta(mc_version, data_format, is_new_version):
    with open(DATAPACK_META, "r", encoding="utf-8") as f:
        data = json.load(f)

    first_component = data["pack"]["description"][0]
    current_desc = first_component["text"]
    current_build = parse_build(current_desc)

    if is_new_version:
        new_build = 1.0
        print(f"  New MC version detected, resetting build to {new_build}")
    else:
        new_build = next_build(current_build)
        print(f"  Same MC version, incrementing build {current_build} -> {new_build}")

    new_text = f"FIB Worldgeneration ({mc_version}) [{new_build}]"
    first_component["text"] = new_text
    data["pack"]["max_format"] = float(data_format)

    with open(DATAPACK_META, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

    print(f"  Datapack: '{new_text}', max_format={data_format}")

def main():
    if len(sys.argv) != 5:
        print("Usage: updatePackMeta.py <mc_version> <resource_format> <data_format> <is_new_version>")
        sys.exit(1)

    mc_version = sys.argv[1]
    resource_format = sys.argv[2]
    data_format = sys.argv[3]
    is_new_version = sys.argv[4].lower() == 'true'

    print(f"MC version: {mc_version}")
    print(f"Resource pack format: {resource_format}")
    print(f"Data pack format: {data_format}")
    print(f"New MC version: {is_new_version}")

    print("\nUpdating resource pack meta...")
    update_resource_pack_meta(mc_version, resource_format, is_new_version)

    print("\nUpdating datapack meta...")
    update_datapack_meta(mc_version, data_format, is_new_version)

    print("\nDone!")

if __name__ == "__main__":
    main()
