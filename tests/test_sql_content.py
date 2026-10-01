"""Structure rules for the SQL pattern catalogue (ported from sql-expert's validator) plus format checks."""
import re
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "tools"))
import sqlcontent  # noqa: E402

PATTERNS = sqlcontent.load_patterns()
SCHEMA = sqlcontent.load_schema()
QUESTIONS = [q for p in PATTERNS for q in p["questions"]]


def test_catalogue_size():
    assert [p["num"] for p in PATTERNS] == list(range(1, 51))
    assert len(QUESTIONS) == 500
    assert len({p["slug"] for p in PATTERNS}) == 50


def test_categories_and_difficulties_are_known():
    assert {p["category"] for p in PATTERNS} <= set(SCHEMA["categoryOrder"])
    assert {q["difficulty"] for q in QUESTIONS} == {"easy", "medium", "hard"}


@pytest.mark.parametrize("p", PATTERNS, ids=lambda p: f"p{p['num']:02d}")
def test_pattern_shape(p):
    assert len(p["questions"]) == 10
    assert len(p["pitfalls"]) >= 3
    for i, q in enumerate(p["questions"], 1):
        assert q["id"] == f"p{p['num']:02d}-q{i}"
        for field in ("prompt", "think", "hint", "approach", "solution", "explanation"):
            assert q[field].strip(), f"{q['id']}: empty {field}"
        assert q["tables"], f"{q['id']}: no tables"
        assert len(q["approach"].split("\n")) >= 3, f"{q['id']}: approach needs several steps"


def test_bind_parameters_are_declared():
    """Every :name placeholder in executable SQL has a declared default, and every declared parameter is used."""
    pat = re.compile(r"(?<![:\w]):([a-z_]\w*)\b")
    for q in QUESTIONS:
        code = "\n".join(line for line in q["solution"].split("\n") if not line.lstrip().startswith("--"))
        used = set(pat.findall(code))
        assert used == set(q.get("params", {})), f"{q['id']}: params {sorted(used)} vs declared {sorted(q.get('params', {}))}"


def test_only_documented_questions_are_not_runnable():
    assert [q["id"] for q in QUESTIONS if q.get("runnable") is False] == ["p20-q7"]


def test_files_are_in_canonical_form():
    for f in sorted((sqlcontent.SQL_DIR / "patterns").glob("p*.txt")):
        text = f.read_text()
        p = sqlcontent._strip_final_newline(sqlcontent.parse_pattern(text, f.name))
        assert sqlcontent.dump_pattern(p) == text, f"{f.name} is not in canonical form (use sqlcontent.dump_pattern)"
