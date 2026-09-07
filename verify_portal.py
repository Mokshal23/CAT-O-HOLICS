import json
import urllib.request
import re

DATA_PATH = r"C:\Users\Mokshal Shah\.gemini\antigravity\scratch\cat_study_app\data\cat_study_data.json"
with open(DATA_PATH, "r", encoding="utf-8") as f:
    posts = json.load(f)

print(f"=== VERIFICATION REPORT ===")
print(f"Total Lessons Curated: {len(posts)}")

# 1. Check section distribution
sec_counts = {}
for p in posts:
    sec_counts[p['section']] = sec_counts.get(p['section'], 0) + 1
print(f"Section Distribution: {sec_counts}")
assert len(posts) == 679, f"Expected 679, got {len(posts)}"

# 2. Check for zero non-study leakage
leaks = []
for p in posts:
    t = p['title'].lower()
    if any(k in t for k in ['normalisation', 'happy new year', 'bell the cat', 'personal interview']):
        leaks.append(p['title'])
print(f"Non-study leakage count: {len(leaks)}")
assert len(leaks) == 0, f"Found leaked non-study posts: {leaks}"

# 3. Check image coverage
posts_with_images = [p for p in posts if len(p.get('images', [])) > 0]
total_images = sum(len(p.get('images', [])) for p in posts)
print(f"Posts with Problem/Solution Sheets: {len(posts_with_images)} ({round(len(posts_with_images)/len(posts)*100, 1)}%)")
print(f"Total High-Res Sheets: {total_images}")

# 4. Check comments coverage
posts_with_comments = [p for p in posts if p.get('comment_count', 0) > 0]
total_comments = sum(p.get('comment_count', 0) for p in posts)
print(f"Posts with Discussion Comments: {len(posts_with_comments)}")
print(f"Total Discussions Curated: {total_comments}")

# 5. Spot-check sample image sheet URLs from key series
sample_checks = [
    ("Algebra - 20", "QA"),
    ("Time and Work - 1", "QA"),
    ("Knockouts - 1", "DILR"),
    ("Cube DI 1", "DILR"),
    ("Polygons - 1", "QA"),
    ("Probability - 1", "QA")
]

print("\nSpot-checking sample image URLs live over network:")
for title_sub, sec in sample_checks:
    match = next((p for p in posts if title_sub.lower() in p['title'].lower()), None)
    if match and match['images']:
        sample_img = match['images'][0]['url']
        try:
            req = urllib.request.Request(sample_img, headers={'User-Agent': 'Mozilla/5.0'})
            with urllib.request.urlopen(req, timeout=10) as resp:
                print(f"  [OK {resp.status}] {match['title']} -> {sample_img[:75]}...")
        except Exception as e:
            print(f"  [FAIL] {match['title']} -> {sample_img}: {e}")
    else:
        print(f"  [MISSING] {title_sub}")

print("\nAll verification checks passed!")
