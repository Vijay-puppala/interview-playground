"""Shared fixtures: anything here is visible to every test in this folder."""
import pytest

from pytest_scenarios.sut import BankAccount, Cart


@pytest.fixture
def account():
    """Fresh account with a balance of 100 for every test."""
    return BankAccount("alice", 100)


@pytest.fixture
def cart():
    c = Cart()
    c.add("book", 10.0, 2)
    c.add("pen", 1.5, 4)
    return c


@pytest.fixture(scope="session")
def base_url():
    return "https://api.example.com"
