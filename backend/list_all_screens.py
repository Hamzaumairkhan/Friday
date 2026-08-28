import json

with open("C:/Users/HP 450 G9/.gemini/antigravity-ide/brain/aa01e862-c0b0-4853-91cc-41ec39a5b9c0/.system_generated/steps/1120/output.txt", "r", encoding="utf-8") as f:
    data = json.load(f)

screens = data.get("screens", [])
print(f"Total Stitch Screens in Project: {len(screens)}")
for idx, s in enumerate(screens):
    title = s.get("title", "")
    screen_id = s.get("name", "").split("/")[-1]
    w = s.get("width", "")
    h = s.get("height", "")
    device = s.get("deviceType", "")
    print(f"{idx+1}. {title} (ID: {screen_id}) [{device} {w}x{h}]")
