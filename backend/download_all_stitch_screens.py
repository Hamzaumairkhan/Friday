import os
import re
import urllib.request

html_screens = {
    "1_explore.html": "https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ6Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpZCiVodG1sXzAwMDY1YTA5M2ZjM2RlYzcwMjNiZWE2MGJmMDFiOGM3EgsSBxD7nKOQnBwYAZIBIgoKcHJvamVjdF9pZBIUQhI5ODMzMTEyMjIwMjc0Mzk0NTY&filename=&opi=89354086",
    "2_hunza_escape.html": "https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ6Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpZCiVodG1sXzAwMDY1YTA5M2ZlOWRlMDMwNGU3NGE2YjlmMTVkMjk4EgsSBxD7nKOQnBwYAZIBIgoKcHJvamVjdF9pZBIUQhI5ODMzMTEyMjIwMjc0Mzk0NTY&filename=&opi=89354086",
    "3_copilot.html": "https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ6Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpZCiVodG1sXzAwMDY1YTA5NDAzMmI0MGQwNGU3NTdkNjNhMzg0NzExEgsSBxD7nKOQnBwYAZIBIgoKcHJvamVjdF9pZBIUQhI5ODMzMTEyMjIwMjc0Mzk0NTY&filename=&opi=89354086",
    "4_itinerary.html": "https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ6Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpZCiVodG1sXzAwMDY1YTA5NDA1YWIzMzYwNDVhZGExMjViMTAwMDFkEgsSBxD7nKOQnBwYAZIBIgoKcHJvamVjdF9pZBIUQhI5ODMzMTEyMjIwMjc0Mzk0NTY&filename=&opi=89354086",
    "5_organizer_workspace.html": "https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ6Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpZCiVodG1sXzAwMDY1YTA5NDA5MzY3M2EwNGU3NGE2YjlmMTVkMjk4EgsSBxD7nKOQnBwYAZIBIgoKcHJvamVjdF9pZBIUQhI5ODMzMTEyMjIwMjc0Mzk0NTY&filename=&opi=89354086",
}

base_dir = os.path.dirname(os.path.dirname(__file__))
html_dir = os.path.join(base_dir, "backend", "data", "stitch_screens")
images_dir = os.path.join(base_dir, "frontend", "public", "images", "stitch")

os.makedirs(html_dir, exist_ok=True)
os.makedirs(images_dir, exist_ok=True)

all_image_urls = set()

for filename, url in html_screens.items():
    dest = os.path.join(html_dir, filename)
    print(f"Downloading {filename}...")
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req) as response:
        content = response.read().decode("utf-8")
        with open(dest, "w", encoding="utf-8") as f:
            f.write(content)
        print(f"Saved {filename}")

        # Extract all image URLs from src and background-image
        found_imgs = re.findall(r'(https://lh3\.googleusercontent\.com/aida-public/[^\'"\)\s]+)', content)
        for img in found_imgs:
            all_image_urls.add(img)

print(f"\nFound {len(all_image_urls)} unique Stitch images across the 5 screens.")

img_map = {}
for idx, img_url in enumerate(sorted(all_image_urls)):
    img_name = f"stitch_asset_{idx + 1}.jpg"
    img_dest = os.path.join(images_dir, img_name)
    print(f"Downloading image {idx + 1}/{len(all_image_urls)}: {img_name}...")
    try:
        req = urllib.request.Request(img_url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req) as response, open(img_dest, "wb") as f:
            f.write(response.read())
        img_map[img_url] = f"/images/stitch/{img_name}"
        print(f"Saved {img_name}")
    except Exception as e:
        print(f"Failed {img_name}: {e}")

import json
with open(os.path.join(html_dir, "image_map.json"), "w", encoding="utf-8") as f:
    json.dump(img_map, f, indent=2)

print("All screens and assets downloaded and mapped successfully!")
