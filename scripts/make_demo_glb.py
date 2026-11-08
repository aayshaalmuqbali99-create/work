#!/usr/bin/env python3
"""
Generate the ORIGINAL LabSouq demonstration GLB: a simple bench instrument made of named parts.
It is a teaching/test asset, not a model of any inventory product.
Output: public/demo-models/labsouq-demo-instrument.glb
"""
import json, pathlib, struct

ROOT = pathlib.Path(__file__).resolve().parent.parent

def box(w, h, d):
    x, y, z = w / 2, h / 2, d / 2
    faces = [((1,0,0),[(x,-y,-z),(x,y,-z),(x,y,z),(x,-y,z)]), ((-1,0,0),[(-x,-y,z),(-x,y,z),(-x,y,-z),(-x,-y,-z)]),
             ((0,1,0),[(-x,y,-z),(-x,y,z),(x,y,z),(x,y,-z)]), ((0,-1,0),[(-x,-y,z),(-x,-y,-z),(x,-y,-z),(x,-y,z)]),
             ((0,0,1),[(-x,-y,z),(x,-y,z),(x,y,z),(-x,y,z)]), ((0,0,-1),[(x,-y,-z),(-x,-y,-z),(-x,y,-z),(x,y,-z)])]
    pos, nor, idx = [], [], []
    for n, quad in faces:
        b = len(pos)
        pos += quad; nor += [n] * 4
        idx += [b, b + 1, b + 2, b, b + 2, b + 3]
    return pos, nor, idx

# name, size, position, colour (linear RGB)
PARTS = [
    ("Chassis", (3.0, 0.08, 2.2), (0, -0.6, 0), (0.45, 0.5, 0.55)),
    ("Cover", (3.0, 0.08, 2.2), (0, 0.62, 0), (0.75, 0.78, 0.8)),
    ("FrontPanel", (3.0, 1.2, 0.08), (0, 0, 1.12), (0.9, 0.92, 0.92)),
    ("Display", (1.1, 0.45, 0.06), (-0.7, 0.2, 1.19), (0.02, 0.12, 0.14)),
    ("Transformer", (0.7, 0.6, 0.6), (-0.8, -0.26, -0.4), (0.55, 0.3, 0.12)),
    ("MainBoard", (1.4, 0.04, 1.4), (0.6, -0.5, -0.1), (0.07, 0.35, 0.22)),
    ("Heatsink", (1.0, 0.8, 0.12), (0.6, 0, -1.15), (0.6, 0.62, 0.65)),
]

bin_parts, buffer_views, accessors, meshes, nodes, materials = [], [], [], [], [], []
offset = 0
def add(data: bytes, target):
    global offset
    pad = (-len(data)) % 4
    bin_parts.append(data + b"\0" * pad)
    buffer_views.append({"buffer": 0, "byteOffset": offset, "byteLength": len(data), "target": target})
    offset += len(data) + pad
    return len(buffer_views) - 1

for i, (name, size, pos, col) in enumerate(PARTS):
    p, n, idx = box(*size)
    vp = add(b"".join(struct.pack("<3f", *v) for v in p), 34962)
    vn = add(b"".join(struct.pack("<3f", *v) for v in n), 34962)
    vi = add(b"".join(struct.pack("<H", v) for v in idx), 34963)
    xs, ys, zs = zip(*p)
    accessors += [
        {"bufferView": vp, "componentType": 5126, "count": len(p), "type": "VEC3", "min": [min(xs), min(ys), min(zs)], "max": [max(xs), max(ys), max(zs)]},
        {"bufferView": vn, "componentType": 5126, "count": len(n), "type": "VEC3"},
        {"bufferView": vi, "componentType": 5123, "count": len(idx), "type": "SCALAR"},
    ]
    materials.append({"name": name, "pbrMetallicRoughness": {"baseColorFactor": [*col, 1], "metallicFactor": 0.2, "roughnessFactor": 0.6}})
    meshes.append({"name": name, "primitives": [{"attributes": {"POSITION": 3 * i, "NORMAL": 3 * i + 1}, "indices": 3 * i + 2, "material": i}]})
    nodes.append({"name": name, "mesh": i, "translation": list(pos)})

nodes.append({"name": "LabSouqDemoInstrument", "children": list(range(len(PARTS)))})
gltf = {
    "asset": {"version": "2.0", "generator": "LabSouq demo generator", "copyright": "LabSouq — original demonstration model"},
    "scene": 0, "scenes": [{"nodes": [len(nodes) - 1]}], "nodes": nodes, "meshes": meshes, "materials": materials,
    "accessors": accessors, "bufferViews": buffer_views, "buffers": [{"byteLength": offset}],
}
js = json.dumps(gltf, separators=(",", ":")).encode()
js += b" " * ((-len(js)) % 4)
binary = b"".join(bin_parts)
glb = struct.pack("<III", 0x46546C67, 2, 12 + 8 + len(js) + 8 + len(binary)) + struct.pack("<II", len(js), 0x4E4F534A) + js + struct.pack("<II", len(binary), 0x004E4942) + binary
out = ROOT / "public/demo-models/labsouq-demo-instrument.glb"
out.write_bytes(glb)
print(out, len(glb), "bytes")
