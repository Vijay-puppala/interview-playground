"""Parse content/cheatsheet/*.txt into a list of sections.

File format (plain text, so code needs no escaping):

    @@ Section title
    @@@ Entry title
    One or more description lines.
    ! A gotcha / warning line (rendered highlighted)
    @py            code block for Python   (also @js, @ts)
    print("hi")
    => hi          one expected output line per "=>" line ("=>" alone = empty line)
    @sql           SQL block (runs on the in-browser PostgreSQL; shown for every language)
                   expected output = header line "a | b" then one "x | y" line per row, NULL for null
    @cli           shell / YAML / HCL / JSON for DevOps tools (Docker, Kubernetes, AWS, Azure, Terraform, Git).
                   Always view-only (needs real tools and credentials), shown for every language.
    @js!           trailing "!" = shown but never executed (needs Node, network, a browser...)

A @ts block is optional; when missing the site shows the JavaScript code for TypeScript too.
"""
from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BLOCK = re.compile(r"^@(py|js|ts|sql|cli)(!?)$")


def parse_text(text: str, source: str = "") -> list[dict]:
    sections: list[dict] = []
    section = entry = block = None
    for n, line in enumerate(text.splitlines(), 1):
        if line.startswith("@@@ "):
            entry = {"title": line[4:].strip(), "desc": [], "notes": [], "code": {}, "source": f"{source}:{n}"}
            section["entries"].append(entry)
            block = None
        elif line.startswith("@@ "):
            section = {"title": line[3:].strip(), "entries": []}
            sections.append(section)
            entry = block = None
        elif line.startswith("! ") and entry is not None:      # gotcha notes are allowed anywhere in an entry
            entry["notes"].append(line[2:].strip())
        elif (m := BLOCK.match(line)) and entry is not None:
            block = {"code": [], "out": [], "run": not m.group(2) and m.group(1) != "cli"}
            entry["code"][m.group(1)] = block
        elif block is not None:
            if line.startswith("=>"):
                block["out"].append(line[2:].removeprefix(" "))
            else:
                block["code"].append(line)
        elif entry is not None:
            if line.strip():
                entry["desc"].append(line.strip())
    for s in sections:
        for e in s["entries"]:
            e["desc"] = " ".join(e["desc"])
            for lang, b in e["code"].items():
                b["code"] = "\n".join(b["code"]).strip("\n")
                if not b["run"] and b["out"]:
                    raise ValueError(f"{e['source']}: a non-runnable {lang} block must not have expected output")
            if not e["code"]:
                raise ValueError(f"{e['source']}: entry '{e['title']}' has no code blocks")
    return sections


def load() -> list[dict]:
    merged: dict[str, dict] = {}
    for f in sorted((ROOT / "content" / "cheatsheet").glob("*.txt")):
        for s in parse_text(f.read_text(), f.name):
            merged.setdefault(s["title"], {"title": s["title"], "entries": []})["entries"].extend(s["entries"])
    return list(merged.values())


def flat() -> list[tuple[str, str, str, dict]]:
    """(section, entry title, language, block) for every code block."""
    return [(s["title"], e["title"], lang, b) for s in load() for e in s["entries"] for lang, b in e["code"].items()]


if __name__ == "__main__":
    import json
    import sys

    secs = load()
    print(len(secs), "sections,", sum(len(s["entries"]) for s in secs), "entries,", len(flat()), "code blocks")
    if "--json" in sys.argv:
        dest = ROOT / "build" / "cheatsheet.json"
        dest.parent.mkdir(exist_ok=True)
        dest.write_text(json.dumps(secs))
