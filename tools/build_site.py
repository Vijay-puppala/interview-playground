"""Build web/data/problems.js and web/data/bundles.js from the Python + TypeScript sources.

Single source of truth:
  playground/*.py        Python solutions, explanations (docstrings) and @case examples
  pytest_scenarios/*.py  pytest scenarios (displayed, not executed in the browser)
  content/ts/*.ts        TypeScript solutions (JavaScript is generated from them)
  content/demos.py       runnable demos for classes / decorators

Run:  python tools/build_site.py
"""
from __future__ import annotations

import ast
import json
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(ROOT / "content"))

from demos import DEMOS  # noqa: E402
from playground._registry import discover  # noqa: E402
from tools.cheatsheet import load as load_cheatsheet  # noqa: E402
from tools.export_cases import export as export_cases  # noqa: E402
from tools.sqlcontent import SQL_DIR, load_patterns, load_schema  # noqa: E402

PREFIX = re.compile(r"\bp\d{3}_")
PROG = re.compile(r"\bp\d{3}_\w+")
CATEGORY_META = {
    "strings": "Strings",
    "arrays": "Arrays",
    "numbers": "Numbers & Math",
    "algorithms": "DSA",
    "sdet": "SDET / Automation",
    "data": "Data (pandas & PySpark)",
    "pytest": "pytest Scenarios",
}
LANG_NOTE = {
    "data": "pandas and PySpark are Python libraries, so this problem is Python-only.",
    "pytest": "pytest is a Python framework, so this scenario is Python-only.",
}
CATEGORY_ORDER = ["strings", "arrays", "numbers", "algorithms", "sdet", "data"]
SCENARIO_FILES = sorted((ROOT / "pytest_scenarios").glob("test_*.py"))


def strip_prefix(text: str) -> str:
    return PREFIX.sub("", text)


def snake_to_title(name: str) -> str:
    return name


# ------------------------------------------------------------------ python ---
class PyModule:
    def __init__(self, path: Path):
        self.path = path
        self.text = path.read_text()
        self.lines = self.text.splitlines()
        self.tree = ast.parse(self.text)
        self.defs = {}      # name -> node (functions / classes / assignments)
        self.helpers = {}   # underscore names
        self.imports = []   # (node)
        for node in self.tree.body:
            name = None
            if isinstance(node, (ast.FunctionDef, ast.ClassDef)):
                name = node.name
            elif isinstance(node, ast.Assign) and isinstance(node.targets[0], ast.Name):
                name = node.targets[0].id
            elif isinstance(node, (ast.Import, ast.ImportFrom)):
                self.imports.append(node)
            if name:
                self.defs[name] = node
                if name.startswith("_") and not name.startswith("__"):
                    self.helpers[name] = node

    def node_start(self, node, with_decorators=False):
        start = node.lineno
        if with_decorators and getattr(node, "decorator_list", None):
            start = min(d.lineno for d in node.decorator_list)
        return start

    def code(self, node, with_decorators=False, keep_docstring=False):
        start = self.node_start(node, with_decorators)
        lines = self.lines[start - 1:node.end_lineno]
        if not keep_docstring and isinstance(node, (ast.FunctionDef, ast.ClassDef)):
            body = node.body
            if body and isinstance(body[0], ast.Expr) and isinstance(getattr(body[0], "value", None), ast.Constant) \
                    and isinstance(body[0].value.value, str):
                a, b = body[0].lineno - start, body[0].end_lineno - start
                lines = lines[:a] + lines[b + 1:]
        return "\n".join(lines)

    def import_lines(self, code: str):
        out = []
        for node in self.imports:
            if isinstance(node, ast.ImportFrom):
                if node.module is None or node.level:   # from ._registry import ...
                    continue
                used = [a for a in node.names if re.search(rf"\b{re.escape(a.asname or a.name)}\b", code)]
                if used:
                    names = ", ".join(a.name + (f" as {a.asname}" if a.asname else "") for a in used)
                    out.append(f"from {node.module} import {names}")
            else:
                for a in node.names:
                    if re.search(rf"\b{re.escape(a.asname or a.name.split('.')[0])}\b", code):
                        out.append(f"import {a.name}" + (f" as {a.asname}" if a.asname else ""))
        return out


def py_explanation(obj):
    import inspect
    doc = inspect.getdoc(obj) or ""
    head, _, rest = doc.partition("\n\n")
    paras = [" ".join(p.split()) for p in rest.split("\n\n") if p.strip()]
    return head.strip(), "\n\n".join(paras)


def py_stub(node):
    if isinstance(node, ast.ClassDef):
        return f"class {strip_prefix(node.name)}:\n    # your code here\n    pass\n"
    return f"def {strip_prefix(node.name)}({ast.unparse(node.args)}):\n    # your code here\n    pass\n"


def collect_deps(start_names, defs_code, helpers_code):
    """Transitively gather helper + sibling-program names referenced by the selected code."""
    selected, queue = list(start_names), list(start_names)
    while queue:
        cur = queue.pop()
        code = defs_code.get(cur) or helpers_code.get(cur, "")
        for ref in sorted(set(PROG.findall(code)) | {h for h in helpers_code if re.search(rf"\b{h}\b", code)}):
            if ref != cur and ref not in selected and (ref in defs_code or ref in helpers_code):
                selected.append(ref)
                queue.append(ref)
    return selected


def py_solution(mod: PyModule, name: str) -> str:
    defs_code = {n: mod.code(nd) for n, nd in mod.defs.items() if PROG.match(n)}
    helpers_code = {n: mod.code(nd, keep_docstring=True) for n, nd in mod.helpers.items()}
    names = collect_deps([name], defs_code, helpers_code)
    order = sorted(names, key=lambda n: (0 if n.startswith("_") else 1 if n != name else 2,
                                         mod.defs[n].lineno))
    body = "\n\n\n".join((helpers_code if n.startswith("_") else defs_code)[n] for n in order)
    imports = mod.import_lines(body)
    text = ("\n".join(imports) + "\n\n\n" if imports else "") + body
    return strip_prefix(text) + "\n"


# --------------------------------------------------------------- typescript ---
def load_ts_blocks(path: Path):
    blocks, order, cur = {}, [], None
    for line in path.read_text().splitlines():
        m = re.match(r"^// ---- (\S+)$", line)
        if m:
            cur = m.group(1)
            blocks[cur] = []
            order.append(cur)
        elif cur:
            blocks[cur].append(line)
    return {k: "\n".join(v).strip() + "\n" for k, v in blocks.items()}, order


def ts_solution(blocks, name):
    helpers = {n: c for n, c in blocks.items() if n.startswith("_")}
    progs = {n: c for n, c in blocks.items() if not n.startswith("_")}
    names = collect_deps([name], progs, helpers)
    order = sorted(names, key=lambda n: (0 if n.startswith("_") else 1 if n != name else 2, list(blocks).index(n)))
    return "\n".join((helpers if n.startswith("_") else progs)[n] for n in order)


def ts_stub(code: str, name: str) -> str:
    bare = strip_prefix(name)
    first = next(l for l in code.splitlines() if re.match(rf"^(async )?(function|class) {re.escape(name)}\b", l))
    if "class " in first:
        return f"class {bare} {{\n  // your code here\n}}\n"
    m = re.match(r"^(async )?function \w+(.*?)\s*\{$", first)
    sig = m.group(2) if m else "()"
    return f"{m.group(1) or '' if m else ''}function {bare}{sig} {{\n  // your code here\n}}\n"


def transpile(snippets: dict) -> dict:
    res = subprocess.run(["node", str(ROOT / "tools/ts_transpile.mjs")], input=json.dumps(snippets),
                         capture_output=True, text=True, check=True)
    return json.loads(res.stdout)


# ----------------------------------------------------------------- scenarios ---
def scenario_solution(mod: PyModule, conftest: PyModule, test_node, container=None) -> str:
    """Test source plus the fixtures/helpers/constants it needs (from the module and conftest.py)."""
    pool = {}
    for m in (conftest, mod):
        for n, nd in m.defs.items():
            if not n.startswith("test_") and not n.startswith("Test"):
                pool[n] = (m, nd)
    target_node = container or test_node
    owner_code = mod.code(target_node, with_decorators=True)
    need, queue, seen = [], [owner_code], set()
    while queue:
        code = queue.pop()
        for n, (m, nd) in pool.items():
            if n not in seen and re.search(rf"\b{re.escape(n)}\b", code) and not n.startswith("__"):
                seen.add(n)
                need.append((m, nd))
                queue.append(m.code(nd, with_decorators=True, keep_docstring=True))
    need.sort(key=lambda t: (t[0] is mod, t[1].lineno))
    parts = [m.code(nd, with_decorators=True, keep_docstring=True) for m, nd in need]
    parts.append(owner_code)
    body = "\n\n\n".join(parts)
    imports = mod.import_lines(body) + [i for i in conftest.import_lines(body) if i not in mod.import_lines(body)]
    imports = list(dict.fromkeys(imports))
    own = re.findall(r"^from (pytest_scenarios\.\w+) import ([\w, ]+)$", mod.text, flags=re.M)
    for modname, names in own:
        used = [n.strip() for n in names.split(",") if re.search(rf"\b{n.strip()}\b", body)]
        if used:
            imports.append(f"from {modname} import {', '.join(used)}")
    for m_ in re.finditer(r"^from playground\.sdet import \(([^)]*)\)", mod.text, flags=re.M | re.S):
        used = [n.strip() for n in m_.group(1).replace("\n", " ").split(",") if n.strip() and re.search(rf"\b{n.strip()}\b", body)]
        if used:
            imports.append(f"from playground.sdet import {', '.join(used)}")
    for m_ in re.finditer(r"^from playground\.sdet import ([\w, ]+)$", mod.text, flags=re.M):
        used = [n.strip() for n in m_.group(1).split(",") if re.search(rf"\b{n.strip()}\b", body)]
        if used:
            imports.append(f"from playground.sdet import {', '.join(used)}")
    imports = list(dict.fromkeys(imports))
    return ("\n".join(imports) + "\n\n\n" if imports else "") + body + "\n"


def write_index(problems):
    docs = ROOT / "docs"
    docs.mkdir(exist_ok=True)
    lines = ["# Problem index", "", "Generated by `python tools/build_site.py`. Do not edit by hand.", ""]
    for cat, label in CATEGORY_META.items():
        items = [p for p in problems if p["category"] == cat]
        lines += [f"## {label} ({len(items)})", "", "| # | Title | Python | JS / TS | Examples |", "|---|---|---|---|---|"]
        for p in items:
            js = f"`{p['fn']['js']}`" if "js" in p["fn"] else "n/a"
            ex = len(p["cases"]) or ("demo" if p["demo"] else "-")
            lines.append(f"| {p['num']:03d} | {p['title']} | `{p['fn']['py']}` | {js} | {ex} |")
        lines.append("")
    (docs / "INDEX.md").write_text("\n".join(lines))


# --------------------------------------------------------------------- main ---
def write_sql(out: Path) -> None:
    """SQL tab data: a small index (loaded up front), one file per pattern (loaded on demand) and the
    schema + seed script the in-browser Postgres starts from."""
    patterns = load_patterns()
    schema = load_schema()
    sql_dir = out / "sql"
    sql_dir.mkdir(exist_ok=True)
    for f in sql_dir.glob("p*.js"):
        f.unlink()
    index = {
        "categories": schema["categoryOrder"],
        "tables": schema["tables"],
        "dialectNote": schema["dialectNote"],
        "patterns": [{k: p[k] for k in ("num", "slug", "title", "concept", "category", "tagline")}
                     | {"questions": [{"id": q["id"], "difficulty": q["difficulty"]} for q in p["questions"]]}
                     for p in patterns],
    }
    (out / "sql_index.js").write_text("window.SQL_INDEX = " + json.dumps(index, separators=(",", ":")) + ";\n")
    setup = (SQL_DIR / "schema.sql").read_text() + "\n" + (SQL_DIR / "seed.sql").read_text()
    (out / "sql_setup.js").write_text("window.SQL_SETUP = " + json.dumps(setup) + ";\n")
    for p in patterns:
        (sql_dir / f"p{p['num']:02d}.js").write_text(
            f"(window.SQL_PATTERNS = window.SQL_PATTERNS || {{}})[{p['num']}] = " + json.dumps(p, separators=(",", ":")) + ";\n")


def main():
    cases = export_cases()
    programs = discover()
    used = {p.category for p in programs}
    py_mods = {c: PyModule(ROOT / "playground" / f"{c}.py") for c in CATEGORY_ORDER if c in used}   # fixed order: sets are not deterministic
    ts_blocks, ts_order = {}, {}
    for f in sorted((ROOT / "content" / "ts").glob("*.ts")):
        ts_blocks[f.stem], ts_order[f.stem] = load_ts_blocks(f)
    ts_by_num = {}
    for cat, blocks in ts_blocks.items():
        for n in blocks:
            if not n.startswith("_"):
                ts_by_num[n[:4]] = (cat, n)

    # collect typescript snippets to transpile in one node call
    snippets, ts_data = {}, {}
    for p in programs:
        key = f"p{p.number:03d}"
        if key not in ts_by_num:
            continue
        cat, tname = ts_by_num[key]
        sol = ts_solution(ts_blocks[cat], tname)
        stub = ts_stub(ts_blocks[cat][tname], tname)
        ts_data[key] = (tname, sol, stub)
        snippets[f"{key}:sol"] = strip_prefix(sol)
        snippets[f"{key}:stub"] = stub
    js_out = transpile(snippets)

    problems = []
    for p in programs:
        key = f"p{p.number:03d}"
        mod = py_mods[p.category]
        node = mod.defs[p.name]
        title, explanation = py_explanation(p.obj)
        entry = {
            "id": key, "num": p.number, "category": p.category, "title": title, "explanation": explanation,
            "kind": "class" if isinstance(node, ast.ClassDef) else "function",
            "fn": {"py": strip_prefix(p.name)},
            "ref": {"py": p.name},
            "starter": {"py": py_stub(node)},
            "solution": {"py": py_solution(mod, p.name)},
            "cases": [], "demo": {}, "note": LANG_NOTE.get(p.category, ""),
            "runnable": {"py": p.category != "data" or key < "p321", "js": False, "ts": False},
        }
        if p.name in cases:
            entry["cases"] = cases[p.name]
        if key in DEMOS:
            entry["demo"] = dict(DEMOS[key], ts=DEMOS[key]["js"])   # demos are valid TypeScript too
        if key in ts_data:
            tname, sol, stub = ts_data[key]
            entry["fn"]["js"] = entry["fn"]["ts"] = strip_prefix(tname)
            entry["ref"]["js"] = entry["ref"]["ts"] = tname
            entry["starter"]["ts"] = stub
            js_stub = js_out[f"{key}:stub"]
            if "your code here" not in js_stub:
                js_stub = re.sub(r"\{\s*\}\s*$", "{\n  // your code here\n}\n", js_stub)
            entry["starter"]["js"] = js_stub
            entry["solution"]["ts"] = strip_prefix(sol)
            entry["solution"]["js"] = js_out[f"{key}:sol"]
            entry["runnable"]["js"] = entry["runnable"]["ts"] = True
        problems.append(entry)

    # pytest scenarios (Python only, display only)
    conftest = PyModule(ROOT / "pytest_scenarios" / "conftest.py")
    for f in SCENARIO_FILES:
        mod = PyModule(f)
        for node in ast.walk(mod.tree):
            if isinstance(node, ast.FunctionDef) and re.match(r"test_s(\d{3})_", node.name):
                num = int(re.match(r"test_s(\d{3})_", node.name).group(1))
                container = next((c for c in mod.tree.body if isinstance(c, ast.ClassDef)
                                  and node in c.body), None)
                import inspect  # noqa: F401
                doc = ast.get_docstring(node) or node.name
                head, _, rest = doc.partition("\n\n")
                paras = [" ".join(x.split()) for x in rest.split("\n\n") if x.strip()]
                args = ast.unparse(node.args)
                problems.append({
                    "id": f"p{num:03d}", "num": num, "category": "pytest", "title": head.strip(),
                    "explanation": "\n\n".join(paras), "kind": "scenario",
                    "fn": {"py": node.name}, "ref": {"py": node.name},
                    "starter": {"py": f"import pytest\n\n\ndef {node.name}({args.replace('self, ', '').replace('self', '')}):\n    # write your pytest test here\n    ...\n"},
                    "solution": {"py": scenario_solution(mod, conftest, node, container)},
                    "cases": [], "demo": {}, "note": LANG_NOTE["pytest"],
                    "runnable": {"py": False, "js": False, "ts": False},
                })
    problems.sort(key=lambda e: e["num"])

    # bundles for running reference solutions in the browser
    bundles = {"py": {}, "js": {}}
    stub_case = "def case(*a, **k):\n    return lambda f: f\n"
    for cat, mod in py_mods.items():
        src = re.sub(r"^from \._registry import case$", stub_case, mod.text, flags=re.M)
        bundles["py"][cat] = src
    js_src = {f"{cat}": "\n".join(blocks.values()) for cat, blocks in ts_blocks.items()}
    full = transpile({f"{c}": "\n".join(f"// {n}\n{b}" for n, b in blocks.items())
                      for c, blocks in ts_blocks.items()})
    bundles["js"] = full
    cat_of = {}
    for cat, blocks in ts_blocks.items():
        for n in blocks:
            if not n.startswith("_"):
                cat_of[n[:4]] = cat
    for e in problems:
        e["bundle"] = e["category"] if e["category"] != "pytest" else None
        e["jsBundle"] = cat_of.get(e["id"])

    out = ROOT / "web" / "data"
    out.mkdir(parents=True, exist_ok=True)
    meta = [{"id": k, "label": v, "count": sum(1 for e in problems if e["category"] == k)} for k, v in CATEGORY_META.items()]
    (out / "problems.js").write_text("window.CATEGORIES = " + json.dumps(meta) + ";\nwindow.PROBLEMS = "
                                     + json.dumps(problems, separators=(",", ":")) + ";\n")
    cheat = [{"title": sec["title"], "entries": [{k: e[k] for k in ("title", "desc", "notes", "code")} for e in sec["entries"]]}
             for sec in load_cheatsheet()]
    (out / "cheatsheet.js").write_text("window.CHEATSHEET = " + json.dumps(cheat, separators=(",", ":")) + ";\n")
    (out / "bundles.js").write_text("window.BUNDLES = " + json.dumps(bundles, separators=(",", ":")) + ";\n")
    write_sql(out)
    write_index(problems)
    counts = {m["label"]: m["count"] for m in meta}
    print(f"{len(problems)} problems:", counts)
    print("cheat sheet:", len(cheat), "sections,", sum(len(c["entries"]) for c in cheat), "entries")
    print("sizes:", {f.name: f"{f.stat().st_size // 1024} KB" for f in out.iterdir()})


if __name__ == "__main__":
    main()
