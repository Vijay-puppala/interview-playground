"""Scenarios 283-288: monkeypatch, tmp_path, capsys, caplog."""
import logging

from pytest_scenarios.sut import get_env_name, greet, process_order, read_config


def test_s283_monkeypatch_env_var(monkeypatch):
    """monkeypatch.setenv

    Change environment variables for one test only; pytest restores them
    afterwards, so tests cannot pollute each other.
    """
    monkeypatch.setenv("APP_ENV", "staging")
    assert get_env_name() == "staging"


def test_s284_monkeypatch_delenv_default(monkeypatch):
    """monkeypatch.delenv

    Remove a variable to test the default branch of your code.
    """
    monkeypatch.delenv("APP_ENV", raising=False)
    assert get_env_name() == "dev"


def test_s285_monkeypatch_setattr(monkeypatch):
    """monkeypatch.setattr to stub a function

    Replace time or random functions to make tests deterministic.
    """
    import time
    monkeypatch.setattr(time, "time", lambda: 1_700_000_000.0)
    assert time.time() == 1_700_000_000.0


def test_s286_tmp_path_for_files(tmp_path):
    """tmp_path: a unique temp directory per test

    Write files without touching the repo; pytest cleans old directories up.
    """
    cfg = tmp_path / "config.json"
    cfg.write_text('{"retries": 3}')
    assert read_config(cfg) == {"retries": 3}


def test_s287_capture_stdout_with_capsys(capsys):
    """capsys: capture print output

    Assert on what a function prints to stdout/stderr.
    """
    greet("QA")
    captured = capsys.readouterr()
    assert captured.out == "Hello, QA!\n"
    assert captured.err == ""


def test_s288_assert_log_messages_with_caplog(caplog):
    """caplog: assert on log records

    Verify that important events are logged at the right level.
    """
    with caplog.at_level(logging.WARNING, logger="sut"):
        process_order("A1", 5000)
    assert "large order A1" in caplog.text
    assert caplog.records[0].levelname == "WARNING"
    caplog.clear()
    process_order("A2", 10)
    assert not caplog.records

