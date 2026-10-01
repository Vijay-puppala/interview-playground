"""Tests for programs that are classes/decorators and so can't use @case examples."""
import pytest

from playground.algorithms import p165_MinStack, p166_QueueUsingStacks, p167_LRUCache, p197_Trie
from playground.sdet import (p213_retry, p214_timed, p215_wait_until, p224_random_string,
                             p226_generate_users)


def test_min_stack():
    s = p165_MinStack()
    for x in (5, 3, 7, 3):
        s.push(x)
    assert s.get_min() == 3
    s.pop(); s.pop()
    assert (s.top(), s.get_min()) == (3, 3)
    s.pop()
    assert s.get_min() == 5


def test_queue_using_stacks():
    q = p166_QueueUsingStacks()
    q.push(1); q.push(2)
    assert q.peek() == 1
    assert q.pop() == 1
    q.push(3)
    assert [q.pop(), q.pop()] == [2, 3]
    assert q.empty()


def test_lru_cache():
    c = p167_LRUCache(2)
    c.put(1, 1); c.put(2, 2)
    assert c.get(1) == 1
    c.put(3, 3)            # evicts key 2
    assert c.get(2) == -1
    c.put(4, 4)            # evicts key 1
    assert (c.get(1), c.get(3), c.get(4)) == (-1, 3, 4)


def test_trie():
    t = p197_Trie()
    t.insert("apple")
    assert t.search("apple") and not t.search("app")
    assert t.starts_with("app")
    t.insert("app")
    assert t.search("app")


def test_retry_succeeds_after_failures():
    calls = {"n": 0}

    @p213_retry(times=3)
    def flaky():
        calls["n"] += 1
        if calls["n"] < 3:
            raise ConnectionError("boom")
        return "ok"

    assert flaky() == "ok" and calls["n"] == 3


def test_retry_gives_up():
    @p213_retry(times=2, exceptions=(ValueError,))
    def always():
        raise ValueError("nope")

    with pytest.raises(ValueError):
        always()


def test_timed_records_duration():
    @p214_timed
    def work():
        return 42

    assert work() == 42 and work.last_duration >= 0


def test_wait_until():
    state = iter([False, False, True])
    assert p215_wait_until(lambda: next(state), timeout=1, interval=0)
    with pytest.raises(TimeoutError):
        p215_wait_until(lambda: False, timeout=0.05, interval=0.01)


def test_seeded_random_data_is_reproducible():
    assert p224_random_string(8, seed=1) == p224_random_string(8, seed=1)
    assert len(p224_random_string(12)) == 12
    assert p226_generate_users(3, seed=7) == p226_generate_users(3, seed=7)
    assert all({"id", "name", "age"} <= u.keys() for u in p226_generate_users(2))
