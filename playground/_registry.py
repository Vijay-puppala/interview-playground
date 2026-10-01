"""Tiny registry that attaches runnable examples to each interview program.

Every program is a function/class named ``pNNN_<name>``. Examples are declared
right above it with ``@case(*args, expect=...)`` (or ``raises=SomeError``) and are
reused by the test-suite (``tests/test_programs.py``), the CLI and the notebook.
"""
from __future__ import annotations

import importlib
import inspect
import math
import re
from dataclasses import dataclass, field
from typing import Any, Callable

CATEGORIES = ["strings", "arrays", "numbers", "algorithms", "sdet", "data"]
_NAME = re.compile(r"^p(\d{3})_")
MISSING = object()


@dataclass
class Case:
    args: tuple
    kwargs: dict
    expect: Any = MISSING
    raises: type | None = None

    def label(self) -> str:
        parts = [repr(a) for a in self.args] + [f"{k}={v!r}" for k, v in self.kwargs.items()]
        shown = ", ".join(parts)
        return shown if len(shown) < 60 else shown[:57] + "..."


def case(*args, expect: Any = MISSING, raises: type | None = None, **kwargs):
    """Attach an example (inputs + expected output, or expected exception)."""

    def deco(obj):
        if "cases" not in obj.__dict__:
            obj.cases = []
        obj.cases.insert(0, Case(args, kwargs, expect, raises))
        return obj

    return deco


def matches(actual: Any, expected: Any) -> bool:
    if isinstance(expected, float) and isinstance(actual, (int, float)):
        return math.isclose(actual, expected, rel_tol=1e-9, abs_tol=1e-9)
    return actual == expected


@dataclass
class Program:
    number: int
    name: str
    category: str
    obj: Callable
    cases: list[Case] = field(default_factory=list)

    @property
    def title(self) -> str:
        doc = inspect.getdoc(self.obj) or ""
        return doc.splitlines()[0] if doc else self.name

    @property
    def source(self) -> str:
        return inspect.getsource(self.obj)


def discover(categories: list[str] | None = None) -> list[Program]:
    programs: list[Program] = []
    for cat in categories or CATEGORIES:
        module = importlib.import_module(f"playground.{cat}")
        for name, obj in vars(module).items():
            m = _NAME.match(name)
            if m and (inspect.isfunction(obj) or inspect.isclass(obj)):
                programs.append(Program(int(m.group(1)), name, cat, obj, obj.__dict__.get("cases", [])))
    return sorted(programs, key=lambda p: p.number)
