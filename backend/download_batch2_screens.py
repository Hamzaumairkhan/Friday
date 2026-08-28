import os
import re
import urllib.request

html_screens = {
    "6_login.html": "https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ6Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpZCiVodG1sXzAwMDY1YTBhYjU5ZmNlMWMwNGU3NTdkNjNhMzg0NzExEgsSBxD7nKOQnBwYAZIBIgoKcHJvamVjdF9pZBIUQhI5ODMzMTEyMjIwMjc0Mzk0NTY&filename=&opi=89354086",
    "7_complete_booking.html": "https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ6Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpZCiVodG1sXzAwMDY1YTBhYjRmY2YwNGYwMjNiYzJhNjIyMWVkNWRmEgsSBxD7nKOQnBwYAZIBIgoKcHJvamVjdF9pZBIUQhI5ODMzMTEyMjIwMjc0Mzk0NTY&filename=&opi=89354086",
    "8_trip_itinerary.html": "https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ6Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpZCiVodG1sXzAwMDY1YTBhYjY1MDIzNDgwNGU3NGE2YjlmMTVkMjk4EgsSBxD7nKOQnBwYAZIBIgoKcHJvamVjdF9pZBIUQhI5ODMzMTEyMjIwMjc0Mzk0NTY&filename=&opi=89354086",
    "9_trip_group.html": "https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ6Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpZCiVodG1sXzAwMDY1YTBhYjYyODUwMjAwMjNiZWE2MGJmMDFiOGM3EgsSBxD7nKOQnBwYAZIBIgoKcHJvamVjdF9pZBIUQhI5ODMzMTEyMjIwMjc0Mzk0NTY&filename=&opi=89354086",
    "10_register.html": "https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ6Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpZCiVodG1sXzAwMDY1YTBhZTAxMTk2NGMwNGU3NTdkNjNhMzg0NzExEgsSBxD7nKOQnBwYAZIBIgoKcHJvamVjdF9pZBIUQhI5ODMzMTEyMjIwMjc0Mzk0NTY&filename=&opi=89354086",
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

print(f"\nFound {len(all_image_urls)} unique Stitch images across batch 2.")

for idx, img_url in enumerate(sorted(all_image_urls)):
    img_name = f"stitch_batch2_{idx + 1}.jpg"
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

print("Batch 2 download complete!")
