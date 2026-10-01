"""Scenarios 277-282: skip, skipif, xfail, custom markers."""
import sys

import pytest

from pytest_scenarios.sut import is_weekend


@pytest.mark.skip(reason="feature flag disabled until release 2.0")
def test_s277_unconditional_skip():
    """@pytest.mark.skip

    Never runs; the reason shows up in the `-r s` summary so skips stay
    visible and do not rot silently.
    """
    raise AssertionError("should not run")


@pytest.mark.skipif(sys.platform == "win32", reason="POSIX-only behaviour")
def test_s278_conditional_skip():
    """@pytest.mark.skipif

    Skip based on platform, Python version, missing env var...
    """
    assert "/" in __file__


@pytest.mark.xfail(reason="known bug QA-123: Sunday not handled", strict=False)
def test_s279_xfail_known_bug():
    """@pytest.mark.xfail

    Documents a known failing test. It shows as xfail (not red); if it starts
    passing it shows XPASS so you notice the fix.
    """
    assert is_weekend("Fri")


@pytest.mark.xfail(raises=ZeroDivisionError, strict=True)
def test_s280_xfail_strict_with_raises():
    """xfail strict with a specific exception

    strict=True turns an unexpected pass into a failure, and raises= makes
    sure it fails for the expected reason only.
    """
    1 / 0


@pytest.mark.smoke
@pytest.mark.regression
def test_s281_custom_markers():
    """Custom markers (smoke / regression)

    Register markers in pytest.ini, then select with `pytest -m smoke` or
    `-m "regression and not slow"`.
    """
    assert is_weekend("Sat") and not is_weekend("Mon")


class TestCartRules:
    """Class-based grouping"""

    pytestmark = pytest.mark.regression

    def test_s282_class_level_marker(self, cart):
        """Marks on a test class

        `pytestmark` applies the marker to every test in the class; classes
        also give a namespace for related tests (no __init__ allowed).
        """
        assert len(cart.items) == 2
