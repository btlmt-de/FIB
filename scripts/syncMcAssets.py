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

    api_url = "https://api.github.com/repos/Owen1212055/mc-assets/contents/item-assets"
    print(f"Fetching asset list from {api_url}...")
    items = fetch_json(api_url)

    pngs = [item for item in items if item["name"].endswith(".png")]
    print(f"Found {len(pngs)} PNG files")

    for i, item in enumerate(pngs, 1):
        original_name = item["name"]
        new_name = original_name.lower()
        dest_path = output_dir / new_name
        download_url = item["download_url"]

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
