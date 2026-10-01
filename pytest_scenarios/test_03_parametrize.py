"""Scenarios 269-276: data-driven testing with parametrize."""
import csv
import io
import json

import pytest

from playground.sdet import p227_boundary_values
from pytest_scenarios.sut import Calculator


@pytest.mark.parametrize("a,b,expected", [(1, 2, 3), (0, 0, 0), (-1, 1, 0)])
def test_s269_basic_parametrize(a, b, expected):
    """Basic @pytest.mark.parametrize

    One test function, many data rows; each row is reported as its own test.
    """
    assert Calculator().add(a, b) == expected


@pytest.mark.parametrize(
    "text,expected",
    [("racecar", True), ("hello", False), ("", True)],
    ids=["palindrome", "not-palindrome", "empty"],
)
def test_s270_readable_ids(text, expected):
    """Readable test ids

    `ids=` replaces test_x[racecar-True] with a meaningful name, which makes
    CI reports and `-k` filtering much nicer.
    """
    assert (text == text[::-1]) is expected


@pytest.mark.parametrize("browser", ["chrome", "firefox"])
@pytest.mark.parametrize("os_name", ["windows", "mac", "linux"])
def test_s271_stacked_parametrize_matrix(browser, os_name):
    """Stacked parametrize = cartesian product

    Two decorators give 2 x 3 = 6 combinations: a cheap cross-platform matrix.
    """
    assert f"{browser}-{os_name}"


@pytest.mark.parametrize(
    "a,b,expected",
    [
        (4, 2, 2),
        pytest.param(1, 0, None, marks=pytest.mark.xfail(raises=ZeroDivisionError, reason="div by zero")),
        pytest.param(9, 3, 3, marks=pytest.mark.smoke),
    ],
)
def test_s272_pytest_param_with_marks(a, b, expected):
    """pytest.param: per-row marks

    Mark individual rows as xfail/skip/smoke without splitting the test.
    """
    assert Calculator().divide(a, b) == expected


@pytest.mark.parametrize(
    "a,b,exc",
    [(1, 0, ZeroDivisionError)],
)
def test_s273_parametrize_expected_exceptions(a, b, exc):
    """Parametrize the expected exception

    Pass exception classes as data to cover several failure modes in one test.
    """
    with pytest.raises(exc):
        Calculator().divide(a, b)


JSON_CASES = json.loads('[{"q": "a", "n": 1}, {"q": "bb", "n": 2}, {"q": "ccc", "n": 3}]')


@pytest.mark.parametrize("row", JSON_CASES, ids=lambda r: r["q"])
def test_s274_data_from_json(row):
    """Data-driven tests from JSON

    Load rows from a JSON file (here inline) and use `ids=` with a function
    to name each case.
    """
    assert len(row["q"]) == row["n"]


CSV = "user,password,ok\nalice,secret1,true\nbob,,false\n"
ROWS = [(r["user"], r["password"], r["ok"] == "true") for r in csv.DictReader(io.StringIO(CSV))]


@pytest.mark.parametrize("user,password,ok", ROWS)
def test_s275_data_from_csv(user, password, ok):
    """Data-driven tests from CSV

    Typical login matrix: valid and invalid credentials stored in a spreadsheet
    export. A valid login needs a non-empty password in this toy rule.
    """
    assert bool(password) is ok


@pytest.mark.parametrize("age", p227_boundary_values(18, 65))
def test_s276_boundary_value_analysis(age):
    """Boundary value analysis driven by a helper

    Generate boundary inputs with code, then assert the rule 18 <= age <= 65.
    """
    eligible = 18 <= age <= 65
    assert eligible == (age in range(18, 66))
