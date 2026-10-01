"""Runs every @case example attached to every program."""
import pytest

from playground._registry import MISSING, discover, matches

PROGRAMS = discover()
PARAMS = [pytest.param(p, c, id=f"{p.name}[{i}]") for p in PROGRAMS for i, c in enumerate(p.cases)]


@pytest.mark.parametrize("prog,case", PARAMS)
def test_example(prog, case):
    if case.raises:
        with pytest.raises(case.raises):
            prog.obj(*case.args, **case.kwargs)
    else:
        assert case.expect is not MISSING
        assert matches(prog.obj(*case.args, **case.kwargs), case.expect)


def test_numbers_are_unique_and_documented():
    nums = [p.number for p in PROGRAMS]
    assert len(nums) == len(set(nums))
    assert all(p.obj.__doc__ for p in PROGRAMS)
