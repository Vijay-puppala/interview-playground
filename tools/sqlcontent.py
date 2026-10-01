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
KV = re.compile(r"^(title|concept|category|tagline|tables): (.*)$")
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
            target[key] = [t.strip() for t in value.split(",")] if key == "tables" else value
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
