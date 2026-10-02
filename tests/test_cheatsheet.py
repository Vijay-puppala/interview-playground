"""Every runnable Python cheat-sheet example must print exactly its documented output."""
import contextlib
import io
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "tools"))
import cheatsheet  # noqa: E402

BLOCKS = [(s, e, l, b) for s, e, l, b in cheatsheet.flat() if l == "py"]


def test_parser_rejects_output_on_non_runnable_block():
    with pytest.raises(ValueError):
        cheatsheet.parse_text("@@ S\n@@@ E\n@py!\nprint(1)\n=> 1\n")


def test_entry_titles_are_unique():
    titles = [e["title"].lower() for sec in cheatsheet.load() for e in sec["entries"]]
    assert len(titles) == len(set(titles))


def test_sql_blocks_are_sql_only_and_runnable_ones_have_output():
    for sec in cheatsheet.load():
        for e in sec["entries"]:
            if "sql" in e["code"]:
                assert set(e["code"]) == {"sql"}, e["title"]
                b = e["code"]["sql"]
                assert (not b["run"]) or b["out"] or e["title"] == "Orphan rows (broken foreign keys)", e["title"]


def test_cli_blocks_are_cli_only_and_never_runnable():
    n = 0
    for sec in cheatsheet.load():
        for e in sec["entries"]:
            if "cli" in e["code"]:
                n += 1
                assert set(e["code"]) == {"cli"}, e["title"]
                b = e["code"]["cli"]
                assert b["run"] is False and not b["out"], e["title"]
                assert b["code"].strip(), e["title"]
    assert n >= 60


def test_devops_sections_exist():
    titles = {s["title"] for s in cheatsheet.load()}
    assert {"Docker", "Kubernetes", "AWS", "Azure", "Terraform", "Git & GitHub"} <= titles


def test_every_entry_covers_python_and_javascript():
    for sec in cheatsheet.load():
        for e in sec["entries"]:
            if "sql" in e["code"] or "cli" in e["code"]:      # SQL and DevOps entries are language independent
                continue
            assert {"py", "js"} <= set(e["code"]), f"{sec['title']} / {e['title']} needs py and js"


@pytest.mark.parametrize("section,entry,lang,block", [b for b in BLOCKS if b[3]["run"]], ids=lambda v: v if isinstance(v, str) else "")
def test_python_example_output(section, entry, lang, block):
    out = io.StringIO()
    with contextlib.redirect_stdout(out):
        exec(compile(block["code"], f"<{entry}>", "exec"), {"__name__": "__main__"})
    assert out.getvalue().rstrip("\n").split("\n") == block["out"], f"{section} / {entry}"
