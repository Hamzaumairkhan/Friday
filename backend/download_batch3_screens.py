import os
import re
import urllib.request

html_screens = {
    "11_organizer_dashboard.html": "https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ6Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpZCiVodG1sXzAwMDY1YTBhZjQzODU4Y2YwMjNiYzAxNDVmMGVjY2Q2EgsSBxD7nKOQnBwYAZIBIgoKcHJvamVjdF9pZBIUQhI5ODMzMTEyMjIwMjc0Mzk0NTY&filename=&opi=89354086",
    "12_my_tour_packages.html": "https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ6Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpZCiVodG1sXzAwMDY1YTBhZjQ2MDZhMDcwNDRmNjllYjc2MTliN2I2EgsSBxD7nKOQnBwYAZIBIgoKcHJvamVjdF9pZBIUQhI5ODMzMTEyMjIwMjc0Mzk0NTY&filename=&opi=89354086",
    "13_organizer_onboarding.html": "https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ6Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpZCiVodG1sXzAwMDY1YTBhZjM5ZTA0ZjIwMjNiYzJhNjIyMWVkNWRmEgsSBxD7nKOQnBwYAZIBIgoKcHJvamVjdF9pZBIUQhI5ODMzMTEyMjIwMjc0Mzk0NTY&filename=&opi=89354086",
    "14_package_builder.html": "https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ6Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpZCiVodG1sXzAwMDY1YTBhZjQ3NjIyM2IwMjNiYzJhNjIyMWVkNWRmEgsSBxD7nKOQnBwYAZIBIgoKcHJvamVjdF9pZBIUQhI5ODMzMTEyMjIwMjc0Mzk0NTY&filename=&opi=89354086",
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

        found_imgs = re.findall(r'(https://lh3\.googleusercontent\.com/aida-public/[^\'"\)\s]+)', content)
        for img in found_imgs:
            all_image_urls.add(img)

print(f"\nFound {len(all_image_urls)} unique Stitch images across batch 3.")

for idx, img_url in enumerate(sorted(all_image_urls)):
    img_name = f"stitch_batch3_{idx + 1}.jpg"
    img_dest = os.path.join(images_dir, img_name)
    if os.path.exists(img_dest):
        continue
    print(f"Downloading image {idx + 1}/{len(all_image_urls)}: {img_name}...")
    try:
        req = urllib.request.Request(img_url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req) as response, open(img_dest, "wb") as f:
            f.write(response.read())
        print(f"Saved {img_name}")
    except Exception as e:
        print(f"Failed {img_name}: {e}")

print("Batch 3 download complete!")
