#!/usr/bin/env python3
"""
Build the public equipment catalogue from the original workbook.

Inputs (never modified):
  data/inventory.xlsx               original workbook (sheets "Houd" and "All Photos")
  data/photo-mapping.json           reviewed photo -> item mapping (CLEAR / NEEDS_REVIEW / NO_PHOTO)
  content/equipment-details.json    bilingual educational content for each listed device

Outputs:
  src/data/equipment.json           catalogue consumed by the website
  public/equipment/<slug>.jpg       device photo extracted from the workbook

Only CLEAR items that have an entry in equipment-details.json are published.
Run:  python3 scripts/build_catalog.py
"""
import io, json, pathlib, sys
import openpyxl
from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parent.parent
wb = openpyxl.load_workbook(ROOT / "data/inventory.xlsx")

# --- inventory rows (validate headers instead of assuming positions) ---
ws = wb["Houd"]
header = [c.value for c in ws[1]]
col = {name: header.index(name) for name in (
    "Item No.", "Description", "Quantity", "Indicative New Replacement Unit Price (OMR)")}
rows = {}
notes = []
for r in ws.iter_rows(min_row=2, values_only=True):
    no = r[col["Item No."]]
    if isinstance(no, int):
        rows[no] = dict(description=r[col["Description"]], quantity=r[col["Quantity"]],
                        unitPrice=r[col["Indicative New Replacement Unit Price (OMR)"]])
    elif isinstance(r[0], str) and len(r[0]) > 80:
        notes.append(r[0])

# --- photos by their "Photo N" label cell; the one off-grid image is Photo 53 ---
ps = wb["All Photos"]
labels = {(c.column - 1, c.row - 1): c.value for row in ps.iter_rows() for c in row if c.value}
photos = {}
for im in ps._images:
    a = im.anchor._from
    label = labels.get((a.col, a.row))
    n = int(label.split()[1]) if label else 53
    photos[n] = im._data()

mapping = {m["itemNo"]: m for m in json.load(open(ROOT / "data/photo-mapping.json"))["items"]}
details = json.load(open(ROOT / "content/equipment-details.json"))["devices"]

out_img = ROOT / "public/equipment"
out_img.mkdir(parents=True, exist_ok=True)
catalogue = []
for d in details:
    items = d["items"]
    for n in items:
        if mapping[n]["status"] != "CLEAR":
            sys.exit(f"Item {n} is not CLEAR in photo-mapping.json — refusing to publish")
    first = mapping[items[0]]
    prices = {rows[n]["unitPrice"] for n in items}
    if len(prices) != 1:
        sys.exit(f"Merged items {items} have different prices {prices}")
    img = Image.open(io.BytesIO(photos[first["photo"]])).convert("RGB")
    img.save(out_img / f"{d['slug']}.jpg", quality=90)
    catalogue.append({
        **{k: v for k, v in d.items() if k != "items"},
        "itemNos": items,
        "nameEn": rows[items[0]]["description"].replace("Training Systems", "Training System"),
        "quantity": sum(rows[n]["quantity"] for n in items),
        "condition": "unverified",
        "indicativeNewUnitPriceOMR": prices.pop(),
        "photo": {"src": f"/equipment/{d['slug']}.jpg", "width": img.width, "height": img.height,
                  "sourcePhoto": first["photo"]},
    })

catalogue.sort(key=lambda x: x["itemNos"][0])
(ROOT / "src/data").mkdir(parents=True, exist_ok=True)
json.dump({"source": "data/inventory.xlsx", "pricingNotes": notes, "devices": catalogue},
          open(ROOT / "src/data/equipment.json", "w"), ensure_ascii=False, indent=2)
print(f"{len(catalogue)} devices, {sum(c['quantity'] for c in catalogue)} units, "
      f"{len(notes)} pricing notes preserved")
