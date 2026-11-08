#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
ORBITAL — téléchargement reproductible des textures.

Usage :
    python3 download_textures.py

Dépendances : Python 3.9+ et Pillow (pip install Pillow).
Le script est idempotent : relancer ne casse rien.

Il télécharge les textures Solar System Scope (CC BY 4.0) vérifiées,
convertit les TIF en PNG, réduit les cartes 8K Terre/Voie lactée à 4K
(pour la mémoire GPU), puis affiche un résumé OK / ÉCHEC par fichier.

Les URL distantes ci-dessous ont été testées (HTTP 200, image, > 20 Ko).
Le fichier d'anneau de Saturne fait 12 Ko : c'est une bande radiale
2048x125 valide, attestée par la source, donc l'exception est explicite.
"""

from __future__ import annotations

import io
import os
import sys
import tempfile
import urllib.error
import urllib.request
from dataclasses import dataclass

try:
    from PIL import Image
except ImportError:  # pragma: no cover
    Image = None

UA = ("Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/122 Safari/537.36")
BASE = "https://www.solarsystemscope.com/textures/download/"
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "textures")

# (nom final, [URL candidates], taille minimale en octets, largeur 4K ?)
FILES = [
    ("sun.jpg",                 [BASE + "8k_sun.jpg"], 200_000, False),
    ("mercury.jpg",             [BASE + "2k_mercury.jpg"], 20_000, False),
    ("venus_surface.jpg",       [BASE + "2k_venus_surface.jpg"], 20_000, False),
    ("venus_atmosphere.jpg",    [BASE + "2k_venus_atmosphere.jpg"], 20_000, False),
    ("earth_day.jpg",           [BASE + "8k_earth_daymap.jpg",
                                 "https://cdn.jsdelivr.net/gh/mrdoob/three.js@r160/examples/textures/planets/earth_atmos_4096.jpg"], 200_000, True),
    ("earth_night.jpg",         [BASE + "8k_earth_nightmap.jpg",
                                 "https://cdn.jsdelivr.net/gh/mrdoob/three.js@r160/examples/textures/planets/earth_lights_2048.png"], 100_000, True),
    ("earth_clouds.jpg",        [BASE + "2k_earth_clouds.jpg",
                                 "https://cdn.jsdelivr.net/gh/mrdoob/three.js@r160/examples/textures/planets/earth_clouds_2048.png"], 20_000, False),
    ("earth_normal.png",        [BASE + "2k_earth_normal_map.tif",
                                 "https://cdn.jsdelivr.net/gh/mrdoob/three.js@r160/examples/textures/planets/earth_normal_2048.jpg"], 20_000, False),
    ("earth_specular.png",      [BASE + "2k_earth_specular_map.tif",
                                 "https://cdn.jsdelivr.net/gh/mrdoob/three.js@r160/examples/textures/planets/earth_specular_2048.jpg"], 20_000, False),
    ("moon.jpg",                [BASE + "2k_moon.jpg",
                                 "https://cdn.jsdelivr.net/gh/Daniel-Geo/solar-system@main/textures/2k_moon.jpg"], 20_000, False),
    ("mars.jpg",                [BASE + "2k_mars.jpg"], 20_000, False),
    ("jupiter.jpg",             [BASE + "2k_jupiter.jpg"], 20_000, False),
    ("saturn.jpg",              [BASE + "2k_saturn.jpg"], 20_000, False),
    ("saturn_ring.png",         [BASE + "2k_saturn_ring_alpha.png"], 10_000, False),
    ("uranus.jpg",              [BASE + "2k_uranus.jpg"], 20_000, False),
    ("neptune.jpg",             [BASE + "2k_neptune.jpg"], 20_000, False),
    ("stars_milkyway.jpg",      [BASE + "8k_stars_milky_way.jpg"], 100_000, True),
    ("stars.jpg",               [BASE + "2k_stars.jpg"], 20_000, False),
]


@dataclass
class Result:
    name: str
    ok: bool
    detail: str


def fetch(url: str) -> bytes:
    req = urllib.request.Request(url, headers={
        "User-Agent": UA,
        "Accept": "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
        "Referer": "https://www.solarsystemscope.com/textures/",
    })
    with urllib.request.urlopen(req, timeout=60) as resp:
        if resp.status != 200:
            raise RuntimeError(f"HTTP {resp.status}")
        ctype = (resp.headers.get("Content-Type") or "").lower()
        if "image" not in ctype and not url.lower().endswith((".jpg", ".jpeg", ".png", ".tif", ".tiff")):
            raise RuntimeError(f"type non image : {ctype}")
        data = resp.read()
    return data


def normalize_image(name: str, data: bytes, four_k: bool) -> bytes:
    """Convertit TIF -> PNG, réduit à 4K, ré-encode les JPEG. Retourne les octets."""
    ext = os.path.splitext(name)[1].lower()
    if Image is None:
        if ext in (".tif", ".tiff"):
            raise RuntimeError("Pillow requis pour convertir le TIF")
        return data
    with Image.open(io.BytesIO(data)) as im:
        im.load()
        if four_k and im.width > 4096:
            im = im.resize((4096, round(im.height * 4096 / im.width)), Image.LANCZOS)
        if ext == ".png":
            if im.mode not in ("RGB", "RGBA", "L"):
                im = im.convert("RGBA" if "A" in im.getbands() else "RGB")
            buf = io.BytesIO()
            im.save(buf, format="PNG", optimize=True)
            return buf.getvalue()
        if ext in (".jpg", ".jpeg"):
            if im.mode != "RGB":
                im = im.convert("RGB")
            buf = io.BytesIO()
            im.save(buf, format="JPEG", quality=90, optimize=True, progressive=True)
            return buf.getvalue()
        if ext in (".tif", ".tiff"):
            if im.mode not in ("RGB", "RGBA", "L"):
                im = im.convert("RGB")
            buf = io.BytesIO()
            im.save(buf, format="PNG", optimize=True)
            return buf.getvalue()
    return data


def process(name: str, urls: list[str], min_bytes: int, four_k: bool) -> Result:
    os.makedirs(OUT, exist_ok=True)
    dest = os.path.join(OUT, name)
    errors = []
    data = None
    used = None
    for url in urls:
        try:
            data = fetch(url)
            if len(data) < min_bytes:
                raise RuntimeError(f"trop petit ({len(data)} octets < {min_bytes})")
            used = url
            break
        except Exception as exc:  # noqa: BLE001
            errors.append(f"{url} -> {exc}")
            data = None
    if data is None:
        return Result(name, False, " | ".join(errors))

    try:
        data = normalize_image(name, data, four_k)
        if Image is not None:
            with Image.open(io.BytesIO(data)) as im:
                w, h = im.size
                if w < 16 or h < 8:
                    raise RuntimeError(f"dimensions invalides {w}x{h}")
    except Exception as exc:  # noqa: BLE001
        return Result(name, False, f"conversion : {exc}")

    fd, tmp = tempfile.mkstemp(dir=OUT, prefix=".tmp_", suffix=os.path.splitext(name)[1])
    try:
        with os.fdopen(fd, "wb") as fh:
            fh.write(data)
        os.replace(tmp, dest)
    finally:
        if os.path.exists(tmp):
            os.unlink(tmp)
    return Result(name, True, f"{len(data) // 1024} Ko — {used}")


def main() -> int:
    print("ORBITAL — téléchargement des textures")
    print("Dossier :", OUT)
    if Image is None:
        print("⚠ Pillow absent : les TIF ne seront pas convertis. Installez-le avec : pip install Pillow")
    results = []
    for name, urls, min_bytes, four_k in FILES:
        print(f"  → {name} …", end=" ", flush=True)
        res = process(name, urls, min_bytes, four_k)
        results.append(res)
        print(("OK  " if res.ok else "ÉCHEC ") + res.detail)

    ok = sum(1 for r in results if r.ok)
    print()
    print(f"Résumé : {ok}/{len(results)} fichiers OK")
    for r in results:
        if not r.ok:
            print(f"  ÉCHEC {r.name} : {r.detail}")
    print("Pluton : texture procédurale dans index.html (aucune texture officielle redistribuée).")
    print("Anneaux d'Uranus : procéduraux.")
    return 0 if ok == len(results) else 1


if __name__ == "__main__":
    sys.exit(main())
