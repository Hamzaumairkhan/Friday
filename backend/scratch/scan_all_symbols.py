import os
import re

frontend_src = r"e:\Hackathons\Alibaba Ai hackathon ~Friday\frontend\src"

# Match any non-ASCII characters that are not standard punctuation or letters
# (keep standard quotes, dashes if needed, but detect emojis, symbols, dingbats)
found = []
for root, dirs, files in os.walk(frontend_src):
    for file in files:
        if file.endswith(('.jsx', '.js', '.tsx', '.ts')):
            path = os.path.join(root, file)
            with open(path, 'r', encoding='utf-8', errors='ignore') as f:
                lines = f.readlines()
                for line_idx, line in enumerate(lines, 1):
                    # Check for chars > 127
                    non_ascii = [c for c in line if ord(c) > 127 and c not in ('’', '‘', '“', '”', '—', '–', '•', '…', '®', '©', '°')]
                    if non_ascii:
                        found.append({
                            "file": os.path.relpath(path, frontend_src).replace('\\', '/'),
                            "line": line_idx,
                            "content": line.strip(),
                            "chars": list(set(non_ascii))
                        })

out_path = r"e:\Hackathons\Alibaba Ai hackathon ~Friday\backend\scratch\all_non_ascii_symbols.txt"
with open(out_path, 'w', encoding='utf-8') as out:
    for item in found:
        out.write(f"{item['file']}:{item['line']} -> {item['content']}  [CHARS: {item['chars']}]\n")

print(f"Total non-standard symbol lines: {len(found)}")
