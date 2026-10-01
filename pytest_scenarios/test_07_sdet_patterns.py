"""Scenarios 295-300: realistic SDET patterns (UI page object, API, DB, retries)."""
import json
import sqlite3

import pytest

from playground.sdet import (p208_validate_schema, p213_retry, p215_wait_until,
                             p217_http_status_category)


class FakeElement:
    def __init__(self, text=""):
        self.text, self.typed, self.clicked = text, "", False

    def send_keys(self, value):
        self.typed += value

    def click(self):
        self.clicked = True


class FakeDriver:
    """Stand-in for a Selenium/Playwright driver so the pattern runs anywhere."""

    def __init__(self):
        self.elements = {"user": FakeElement(), "pass": FakeElement(), "submit": FakeElement(),
                         "banner": FakeElement("Welcome, alice")}

    def find(self, name):
        return self.elements[name]


class LoginPage:
    """Page Object: hides locators; tests read like user actions."""

    def __init__(self, driver):
        self.driver = driver

    def login(self, user, password):
        self.driver.find("user").send_keys(user)
        self.driver.find("pass").send_keys(password)
        self.driver.find("submit").click()
        return self

    @property
    def banner(self):
        return self.driver.find("banner").text


def test_s295_page_object_pattern():
    """Page Object Model

    Wrap locators and actions in a class so UI changes are fixed in one
    place. The fake driver keeps this runnable without a browser; swap in
    Selenium or Playwright in real projects.
    """
    driver = FakeDriver()
    page = LoginPage(driver).login("alice", "secret")
    assert driver.find("user").typed == "alice"
    assert driver.find("submit").clicked
    assert page.banner == "Welcome, alice"


def test_s296_api_response_contract():
    """API contract check: status class + schema

    Assert the status category and validate required fields and types with a
    reusable helper that returns all violations at once.
    """
    status, body = 200, {"id": 1, "name": "alice", "email": "a@x.com"}
    assert p217_http_status_category(status) == "Success"
    assert p208_validate_schema(body, {"id": int, "name": str, "email": str}) == []


def test_s297_soft_assertions_collect_all_failures():
    """Soft assertions

    Collect every failed check and report them together at the end, so one
    test run shows all UI problems instead of stopping at the first.
    """
    page = {"title": "Home", "cta": "Sign up", "footer": "(c) 2024"}
    errors = []
    for field, expected in {"title": "Home", "cta": "Sign up", "footer": "(c) 2024"}.items():
        if page[field] != expected:
            errors.append(f"{field}: {page[field]!r} != {expected!r}")
    assert not errors, "\n".join(errors)


def test_s298_data_file_driven(tmp_path):
    """Test data loaded from a JSON file

    Keep data outside the code: write/read a JSON fixture in tmp_path and
    iterate over its records.
    """
    f = tmp_path / "users.json"
    f.write_text(json.dumps([{"name": "a", "age": 20}, {"name": "b", "age": 30}]))
    users = json.loads(f.read_text())
    assert [u["name"] for u in users] == ["a", "b"]
    assert all(u["age"] >= 18 for u in users)


@pytest.fixture
def db():
    conn = sqlite3.connect(":memory:")
    conn.execute("CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT UNIQUE)")
    conn.executemany("INSERT INTO users (name) VALUES (?)", [("alice",), ("bob",)])
    conn.commit()
    yield conn
    conn.close()


def test_s299_database_fixture_and_constraints(db):
    """In-memory database fixture

    SQLite :memory: gives a fast, isolated database per test; verify data
    and constraints (here a UNIQUE name).
    """
    assert db.execute("SELECT COUNT(*) FROM users").fetchone()[0] == 2
    with pytest.raises(sqlite3.IntegrityError):
        db.execute("INSERT INTO users (name) VALUES ('alice')")


def test_s300_retry_and_explicit_wait():
    """Handle flakiness: retry + explicit wait

    A retry decorator absorbs transient failures, and wait_until polls for an
    async condition instead of sleeping. Use both sparingly, and fix the root
    cause of flaky tests.
    """
    attempts = {"n": 0}

    @p213_retry(times=3)
    def flaky_call():
        attempts["n"] += 1
        if attempts["n"] < 3:
            raise ConnectionError("transient")
        return "up"

    assert flaky_call() == "up"
    ticks = iter([0, 0, 1])
    assert p215_wait_until(lambda: next(ticks), timeout=1, interval=0)
