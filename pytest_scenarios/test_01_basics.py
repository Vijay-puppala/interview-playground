"""Scenarios 251-258: assertions, exceptions, approx, warnings."""
import warnings
from collections import Counter

import pytest

from pytest_scenarios.sut import BankAccount, Calculator, InsufficientFunds, legacy_sum


def test_s251_simple_assert():
    """Plain assert statements

    pytest rewrites `assert` so failures show both sides of the comparison:
    no assertEqual / assertTrue family needed.
    """
    assert Calculator().add(2, 3) == 5


def test_s252_assert_dict_and_list_contents():
    """Assert on dict and list contents

    Compare whole structures; on failure pytest prints a readable diff of
    exactly which keys or items differ.
    """
    response = {"id": 1, "name": "alice", "roles": ["qa", "dev"]}
    assert response == {"id": 1, "name": "alice", "roles": ["qa", "dev"]}
    assert response["roles"] == ["qa", "dev"]
    assert {"id", "name"} <= response.keys()


def test_s253_expect_an_exception():
    """pytest.raises: expect an exception

    The test passes only if the block raises the given exception type.
    """
    with pytest.raises(ZeroDivisionError):
        Calculator().divide(1, 0)


def test_s254_raises_with_match_and_excinfo():
    """pytest.raises with match= and excinfo

    `match` is a regex searched in str(exception); `excinfo.value` gives
    access to the exception object for further asserts.
    """
    acct = BankAccount("bob", 10)
    with pytest.raises(InsufficientFunds, match=r"balance 10 < 50") as excinfo:
        acct.withdraw(50)
    assert isinstance(excinfo.value, Exception)


def test_s255_approx_for_floats():
    """pytest.approx for floating point

    0.1 + 0.2 != 0.3 in binary floating point; approx compares within a
    tolerance (also works for lists and dicts).
    """
    assert 0.1 + 0.2 == pytest.approx(0.3)
    assert [0.1 + 0.2, 1.0] == pytest.approx([0.3, 1.0])
    assert 100.5 == pytest.approx(100, rel=0.01)


def test_s256_membership_with_message():
    """Membership assert with a custom failure message

    Add a message after the comma so a CI failure explains itself.
    """
    page_title = "Dashboard - My App"
    assert "Dashboard" in page_title, f"unexpected title: {page_title!r}"


def test_s257_compare_unordered_collections():
    """Compare collections ignoring order

    APIs rarely guarantee order; compare with sorted(), set or Counter.
    """
    actual, expected = [3, 1, 2, 2], [2, 1, 3, 2]
    assert sorted(actual) == sorted(expected)
    assert Counter(actual) == Counter(expected)


def test_s258_expect_a_warning():
    """pytest.warns: expect a warning

    Verifies deprecated code still warns (and tells users what to use).
    """
    with pytest.warns(DeprecationWarning, match="deprecated"):
        assert legacy_sum([1, 2, 3]) == 6
    with warnings.catch_warnings():
        warnings.simplefilter("error")
        assert sum([1, 2, 3]) == 6
