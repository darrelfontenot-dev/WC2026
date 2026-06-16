import pdfplumber

with pdfplumber.open('Round of 32 Combinations.pdf') as pdf:
    page = pdf.pages[0]
    # Check the lines/rects - maybe dashes are drawn as lines
    for line in page.lines:
        top = float(line['top'])
        if 355 < top < 370 and 325 < float(line['x0']) < 345:
            print(f"Line in 1G row1: {line}")
    
    for rect in page.rects:
        top = float(rect['top'])
        if 355 < top < 370 and 325 < float(rect['x0']) < 350:
            print(f"Rect in 1G row1: {rect}")
    
    # Let's check: how many total 3rd-place teams are there?
    # 12 groups, 8 best 3rds qualify. So 8 teams need placement.
    # 8 group winners face 3rd-place teams. So all 8 slots MUST be filled.
    # Unless some combinations only qualify 7 3rds? No, it's always 8.
    
    # Let me check if the PDF has 9 columns (Option + 8) or more
    # Maybe there's a hidden 1F column or something
    print("\n=== Checking if there are more columns ===")
    # Get all unique x-positions of words in header row
    words = page.extract_words()
    headers = [w for w in words if 339 < float(w['top']) < 346]
    for h in sorted(headers, key=lambda w: float(w['x0'])):
        print(f"  x={h['x0']:.1f} '{h['text']}'")
    
    # Check row 5 (which has 8 values) to see all x positions
    print("\n=== Row 5 (full row) ===")
    row5 = [w for w in words if 421 < float(w['top']) < 428]
    for w in sorted(row5, key=lambda w: float(w['x0'])):
        print(f"  x={w['x0']:.1f} '{w['text']}'")
    
    # Check row 1 again
    print("\n=== Row 1 (missing 1G) ===")
    row1 = [w for w in words if 355 < float(w['top']) < 365]
    for w in sorted(row1, key=lambda w: float(w['x0'])):
        print(f"  x={w['x0']:.1f} '{w['text']}'")
