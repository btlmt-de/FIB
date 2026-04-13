import os
import sys
import urllib.request
import json
from pathlib import Path

def fetch_json(url):
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req) as r:
        return json.loads(r.read().decode())

def download_file(url, dest):
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req) as r, open(dest, "wb") as f:
        f.write(r.read())

def main():
    output_dir = Path(sys.argv[1]) if len(sys.argv) > 1 else Path("ForceItemBattle/assets/minecraft/textures/fib")
    output_dir.mkdir(parents=True, exist_ok=True)

    try:
        from PIL import Image
    except ImportError:
        print("Pillow not found, installing...")
        os.system("pip install Pillow --break-system-packages -q")
        from PIL import Image

    tree_url = "https://api.github.com/repos/Owen1212055/mc-assets/git/trees/main?recursive=1"
    print(f"Fetching full asset tree...")
    tree = fetch_json(tree_url)

    pngs = [
        item for item in tree["tree"]
        if item["path"].startswith("item-assets/") and item["path"].endswith(".png")
    ]
    print(f"Found {len(pngs)} PNG files")

    raw_base = "https://raw.githubusercontent.com/Owen1212055/mc-assets/main/"

    for i, item in enumerate(pngs, 1):
        original_name = Path(item["path"]).name
        new_name = original_name.lower()
        dest_path = output_dir / new_name
        download_url = raw_base + item["path"]

        print(f"[{i}/{len(pngs)}] {original_name} -> {new_name}")

        tmp_path = dest_path.with_suffix(".tmp.png")
        download_file(download_url, tmp_path)

        with Image.open(tmp_path) as img:
            resized = img.resize((128, 128), Image.LANCZOS)
            resized.save(dest_path, "PNG")

        tmp_path.unlink()

    print(f"\nDone! {len(pngs)} files written to {output_dir}")

if __name__ == "__main__":
    main()
