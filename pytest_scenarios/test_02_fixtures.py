"""Scenarios 259-268: fixtures, scopes, factories, parametrized fixtures."""
import pytest

from pytest_scenarios.sut import BankAccount, Cart

CALLS = {"module_setup": 0}
LOG = []


def test_s259_use_a_fixture(account):
    """Use a fixture from conftest.py

    Name the fixture as an argument; pytest builds it and injects it. Each
    test gets a fresh instance (function scope is the default).
    """
    account.deposit(50)
    assert account.balance == 150


def test_s260_fixture_is_isolated(account):
    """Fixtures give every test isolated state

    The deposit in the previous test did not leak: the balance is back to 100.
    """
    assert account.balance == 100


@pytest.fixture
def temp_resource():
    LOG.append("setup")
    yield {"connected": True}
    LOG.append("teardown")


def test_s261_fixture_with_yield_teardown(temp_resource):
    """Setup and teardown with yield

    Code before `yield` is setup, code after is teardown; it runs even if the
    test fails (use it for closing browsers, DB connections, temp data).
    """
    assert temp_resource["connected"]
    assert LOG[-1] == "setup"


def test_s262_teardown_already_ran():
    """Verify teardown ran after the previous test

    Not something you normally assert, but it proves the yield-fixture
    lifecycle: 'teardown' was logged before this test's own autouse entry.
    """
    assert LOG[-3:] == ["setup", "teardown", "auto"]


def test_s263_fixture_depending_on_fixture(cart):
    """Fixtures can depend on other fixtures

    `cart` (conftest) builds a Cart; build bigger fixtures from smaller ones.
    """
    assert cart.total() == 26.0
    assert cart.total(discount_pct=10) == 23.4


@pytest.fixture
def make_account():
    created = []

    def _make(owner="x", balance=0):
        acct = BankAccount(owner, balance)
        created.append(acct)
        return acct

    yield _make
    assert all(a.balance >= 0 for a in created)   # shared cleanup / sanity check


def test_s264_factory_fixture(make_account):
    """Factory fixture

    Return a function so the test can create several customised objects while
    the fixture still owns cleanup.
    """
    a, b = make_account("a", 10), make_account("b", 20)
    assert a.balance + b.balance == 30


@pytest.fixture(scope="module")
def expensive_setup():
    CALLS["module_setup"] += 1
    return "ready"


def test_s265_module_scoped_fixture_once(expensive_setup):
    """Module-scoped fixture is built once per file

    Use wider scopes (module, session) for costly setup like logging in or
    starting a server; keep mutable state out of them.
    """
    assert expensive_setup == "ready"


def test_s266_module_scope_not_rebuilt(expensive_setup):
    """Second test reuses the module fixture

    The counter is still 1 although two tests requested the fixture.
    """
    assert CALLS["module_setup"] == 1


@pytest.fixture(autouse=True)
def _auto_marker():
    LOG.append("auto")
    yield


def test_s267_autouse_fixture_runs_without_request():
    """autouse fixtures run for every test automatically

    Useful for cross-cutting needs: logging, resetting state, screenshots on
    failure. This test never asked for the fixture, yet it ran.
    """
    assert LOG[-1] == "auto"


@pytest.fixture(params=["chrome", "firefox", "webkit"])
def browser_name(request):
    return request.param


def test_s268_parametrized_fixture(browser_name):
    """Parametrized fixture

    Every test that uses the fixture runs once per param, a neat way to run
    the same test on several browsers or environments.
    """
    assert browser_name in {"chrome", "firefox", "webkit"}
