"""Parse content/sql/patterns/*.txt (the SQL interview patterns) into dictionaries.

File format (plain text, so SQL needs no escaping):

    @@ pattern 7 running-total
    title: Running Total
    concept: SUM() OVER()
    category: Window Functions
    tagline: One line saying when an interviewer is really asking for this.
    @theory
    Paragraphs of the mental model...
    @pitfalls
    - one mistake per line
    @@@ q1 easy                      <- question 1, difficulty easy|medium|hard
    tables: sales, orders
    params: n=2                      <- optional: values for :named bind parameters in the SQL
    run: no                          <- optional: show the solution but never execute it
    @prompt / @think / @hint / @approach / @solution / @explanation / @dialect (optional)
    free text (the SQL for @solution) up to the next marker line

Marker lines must match exactly, so ordinary text such as "@n" or "@@" inside SQL is safe.
"""
from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SQL_DIR = ROOT / "content" / "sql"
HEADER = re.compile(r"^@@ pattern (\d+) (\S+)$")
QUESTION = re.compile(r"^@@@ q(\d+) (easy|medium|hard)$")
FIELD = re.compile(r"^@(theory|pitfalls|prompt|think|hint|approach|solution|explanation|dialect)$")
KV = re.compile(r"^(title|concept|category|tagline|tables|params|run): (.*)$")
QUESTION_FIELDS = ("prompt", "think", "hint", "approach", "solution", "explanation", "dialect")


def parse_pattern(text: str, source: str = "") -> dict:
    pattern: dict = {"questions": []}
    target: dict = pattern          # where key: value lines and @sections go
    field: str | None = None
    buf: list[str] = []

    def flush():
        nonlocal field, buf
        if field is None:
            return
        body = "\n".join(buf)
        if field == "pitfalls":
            target["pitfalls"] = [ln[2:] for ln in buf if ln.startswith("- ")]
        else:
            target[field] = body
        field, buf = None, []

    for n, line in enumerate(text.split("\n"), 1):
        if (m := HEADER.match(line)):
            pattern["num"], pattern["slug"] = int(m.group(1)), m.group(2)
        elif (m := QUESTION.match(line)):
            flush()
            q = {"id": f"p{pattern['num']:02d}-q{m.group(1)}", "difficulty": m.group(2)}
            pattern["questions"].append(q)
            target = q
        elif (m := FIELD.match(line)):
            flush()
            field = m.group(1)
        elif field is not None:
            buf.append(line)
        elif (m := KV.match(line)):
            key, value = m.groups()
            if key == "tables":
                target[key] = [t.strip() for t in value.split(",")]
            elif key == "params":      # bind parameters used by the solution, e.g. "n=2, region='West'"
                target[key] = dict(part.strip().split("=", 1) for part in value.split(","))
            elif key == "run":         # "no" = shown, but never executed (vendor-specific syntax)
                target["runnable"] = value.strip().lower() != "no"
            else:
                target[key] = value
        elif line.strip():
            raise ValueError(f"{source}:{n}: unexpected line outside a section: {line[:60]!r}")
    flush()
    return pattern


def _strip_final_newline(pattern: dict) -> dict:
    """The file ends with one newline that is not part of the last field."""
    q = pattern["questions"][-1]
    key = "dialect" if "dialect" in q else "explanation"
    if q[key].endswith("\n"):
        q[key] = q[key][:-1]
    return pattern


def dump_pattern(p: dict) -> str:
    """Inverse of parse_pattern: the canonical text for a pattern (used to apply content fixes safely)."""
    out = [f"@@ pattern {p['num']} {p['slug']}", f"title: {p['title']}", f"concept: {p['concept']}",
           f"category: {p['category']}", f"tagline: {p['tagline']}", "@theory", p["theory"], "@pitfalls"]
    out += [f"- {x}" for x in p["pitfalls"]]
    for i, q in enumerate(p["questions"], 1):
        out += [f"@@@ q{i} {q['difficulty']}", f"tables: {', '.join(q['tables'])}"]
        if q.get("params"):
            out.append("params: " + ", ".join(f"{k}={v}" for k, v in q["params"].items()))
        if q.get("runnable") is False:
            out.append("run: no")
        for field in QUESTION_FIELDS:
            if field in q:
                out += [f"@{field}", q[field]]
    return "\n".join(out) + "\n"


def load_patterns() -> list[dict]:
    out = []
    for f in sorted((SQL_DIR / "patterns").glob("p*.txt")):
        out.append(_strip_final_newline(parse_pattern(f.read_text(), f.name)))
    return out


def load_schema() -> dict:
    return json.loads((SQL_DIR / "schema.json").read_text())


if __name__ == "__main__":
    pats = load_patterns()
    print(len(pats), "patterns,", sum(len(p["questions"]) for p in pats), "questions")
