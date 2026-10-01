"""Scenarios 289-294: unittest.mock with pytest."""
from unittest.mock import MagicMock, call, patch

import pytest

from pytest_scenarios import sut
from pytest_scenarios.sut import UserApi, UserNotFound


def _response(status, body=None):
    resp = MagicMock()
    resp.status_code = status
    resp.json.return_value = body or {}
    resp.raise_for_status.side_effect = None if status < 400 else RuntimeError(f"HTTP {status}")
    return resp


def test_s289_magicmock_return_value():
    """MagicMock with return_value

    Replace a real dependency with a mock that returns canned data, so the
    test needs no network or database.
    """
    session = MagicMock()
    session.get.return_value = _response(200, {"id": 7, "name": "alice"})
    assert UserApi(session).get_user(7) == {"id": 7, "name": "alice"}


def test_s290_assert_called_with():
    """Assert how a mock was called

    Check the URL and arguments your code sent, not just what it returned.
    """
    session = MagicMock()
    session.get.return_value = _response(200, {"id": 7})
    UserApi(session, "http://x").get_user(7)
    session.get.assert_called_once_with("http://x/users/7")


def test_s291_side_effect_sequence():
    """side_effect with a list of results

    First call fails, second succeeds: ideal for testing retry logic.
    """
    session = MagicMock()
    session.get.side_effect = [ConnectionError("down"), _response(200, {"id": 1})]
    api = UserApi(session)
    with pytest.raises(ConnectionError):
        api.get_user(1)
    assert api.get_user(1) == {"id": 1}
    assert session.get.call_count == 2


def test_s292_not_found_maps_to_domain_error():
    """HTTP 404 becomes a domain exception

    Test error handling by feeding the client an error response.
    """
    session = MagicMock()
    session.get.return_value = _response(404)
    with pytest.raises(UserNotFound):
        UserApi(session).get_user(99)


def test_s293_patch_context_manager():
    """unittest.mock.patch as a context manager

    patch() swaps an attribute for a mock inside the `with` block and
    restores it afterwards. Patch where the name is looked up, not defined.
    """
    with patch.object(sut, "get_env_name", return_value="prod") as fake:
        assert sut.get_env_name() == "prod"
    fake.assert_called_once()
    assert sut.get_env_name() in ("dev", "staging", "prod")


def test_s294_verify_multiple_calls_in_order():
    """Verify a sequence of calls

    `mock_calls` / assert_has_calls prove the interaction order, for example
    create then fetch.
    """
    session = MagicMock()
    session.post.return_value = _response(201, {"id": 5})
    session.get.return_value = _response(200, {"id": 5})
    api = UserApi(session, "http://x")
    status, body = api.create_user({"name": "bob"})
    api.get_user(body["id"])
    assert status == 201
    session.post.assert_has_calls([call("http://x/users", json={"name": "bob"})])
    session.get.assert_called_with("http://x/users/5")
