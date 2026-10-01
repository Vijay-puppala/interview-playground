"""Tiny 'system under test' used by the pytest scenarios (no network needed)."""
import json
import logging
import os

log = logging.getLogger("sut")


class Calculator:
    def add(self, a, b):
        return a + b

    def divide(self, a, b):
        if b == 0:
            raise ZeroDivisionError("cannot divide by zero")
        return a / b


class InsufficientFunds(Exception):
    pass


class BankAccount:
    def __init__(self, owner, balance=0):
        self.owner, self.balance = owner, balance

    def deposit(self, amount):
        if amount <= 0:
            raise ValueError("amount must be positive")
        self.balance += amount

    def withdraw(self, amount):
        if amount > self.balance:
            raise InsufficientFunds(f"balance {self.balance} < {amount}")
        self.balance -= amount


class Cart:
    def __init__(self):
        self.items = {}

    def add(self, name, price, qty=1):
        _, old = self.items.get(name, (price, 0))
        self.items[name] = (price, old + qty)

    def remove(self, name):
        del self.items[name]

    def total(self, discount_pct=0):
        gross = sum(p * q for p, q in self.items.values())
        return round(gross * (1 - discount_pct / 100), 2)


class UserNotFound(Exception):
    pass


class UserApi:
    """Thin API client; `session` is anything with .get/.post (requests.Session in prod)."""

    def __init__(self, session, base_url="https://api.example.com"):
        self.session, self.base_url = session, base_url

    def get_user(self, user_id):
        resp = self.session.get(f"{self.base_url}/users/{user_id}")
        if resp.status_code == 404:
            raise UserNotFound(user_id)
        resp.raise_for_status()
        return resp.json()

    def create_user(self, payload):
        resp = self.session.post(f"{self.base_url}/users", json=payload)
        return resp.status_code, resp.json()


def get_env_name():
    return os.environ.get("APP_ENV", "dev")


def read_config(path):
    with open(path) as fh:
        return json.load(fh)


def greet(name):
    print(f"Hello, {name}!")


def process_order(order_id, amount):
    if amount > 1000:
        log.warning("large order %s: %s", order_id, amount)
    return {"id": order_id, "status": "ok"}


def is_weekend(day):
    return day in ("Sat", "Sun")


def legacy_sum(values):
    import warnings
    warnings.warn("legacy_sum is deprecated, use sum()", DeprecationWarning, stacklevel=2)
    return sum(values)
