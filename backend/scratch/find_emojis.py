import os
import re

frontend_src = r"e:\Hackathons\Alibaba Ai hackathon ~Friday\frontend\src"
# Match emojis and miscellaneous symbols
pattern = re.compile(r'[\U00010000-\U0010ffff\u2600-\u27bf\u2300-\u23ff\u2b50-\u2b55\u200d\ufe0f\u2713\u2714\u2728\u2705\u2605\u2726\u2727\u2733\u2734\u274c\u2757\u2753\u2754\u2755\u2764\u2795\u2796\u2797\u27b0\u27bf]')

found = []
for root, dirs, files in os.walk(frontend_src):
    for file in files:
        if file.endswith(('.jsx', '.js', '.tsx', '.ts')):
            path = os.path.join(root, file)
            with open(path, 'r', encoding='utf-8', errors='ignore') as f:
                lines = f.readlines()
                for line_idx, line in enumerate(lines, 1):
                    matches = pattern.findall(line)
                    if matches:
                        found.append({
                            "file": os.path.relpath(path, frontend_src).replace('\\', '/'),
                            "line": line_idx,
                            "content": line.strip(),
                            "emojis": list(set(matches))
                        })

out_path = r"e:\Hackathons\Alibaba Ai hackathon ~Friday\backend\scratch\emojis_found.txt"
with open(out_path, 'w', encoding='utf-8') as out:
    for item in found:
        out.write(f"{item['file']}:{item['line']} -> {item['content']}  [EMOJIS: {item['emojis']}]\n")

print(f"Total emoji lines found: {len(found)}")
