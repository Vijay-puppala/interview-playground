"""SDET / QA automation programs (p201-p250). Docstring = title, blank line, explanation."""
import csv
import hashlib
import io
import math
import random
import re
import string as _string
import time
from collections import Counter, deque
from datetime import date, datetime, timedelta
from functools import wraps
from itertools import product
from urllib.parse import parse_qs, urlencode

from ._registry import case

_LOG = re.compile(r"^(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}) \[(\w+)\] (.*)$")


@case("2024-05-01 12:30:45 [ERROR] Login failed for user=alice",
      expect={"timestamp": "2024-05-01 12:30:45", "level": "ERROR", "message": "Login failed for user=alice"})
@case("garbage line", expect=None)
def p201_parse_log_line(line):
    """Parse a log line with a regex

    Named pieces (timestamp, level, message) via capture groups; return None
    for lines that do not match. Log triage is a daily SDET task.
    """
    m = _LOG.match(line)
    return dict(zip(("timestamp", "level", "message"), m.groups())) if m else None


@case(["2024-05-01 10:00:00 [INFO] a", "2024-05-01 10:00:01 [ERROR] b",
       "2024-05-01 10:00:02 [INFO] c", "garbage"], expect={"INFO": 2, "ERROR": 1})
def p202_count_log_levels(lines):
    """Count log lines per level

    Parse every line, skip the malformed ones, count levels with Counter.
    """
    return dict(Counter(r["level"] for r in map(p201_parse_log_line, lines) if r))


@case(["2024-05-01 10:00:00 [INFO] ok", "2024-05-01 10:00:01 [ERROR] boom"], "ERROR", expect=["boom"])
def p203_filter_logs_by_level(lines, level):
    """Extract messages of one log level

    Handy for pulling only ERROR lines out of a big test-run log.
    """
    return [r["message"] for r in map(p201_parse_log_line, lines) if r and r["level"] == level]


@case({"a": {"b": 1, "c": {"d": 2}}, "e": 3, "f": [10, 20]},
      expect={"a.b": 1, "a.c.d": 2, "e": 3, "f.0": 10, "f.1": 20})
def p204_flatten_dict(d, prefix=""):
    """Flatten a nested JSON/dict into dotted keys

    Recurse into dicts and lists, joining keys with '.'. Makes API response
    comparison and CSV export trivial.
    """
    out = {}
    items = d.items() if isinstance(d, dict) else enumerate(d)
    for k, v in items:
        key = f"{prefix}.{k}" if prefix else str(k)
        if isinstance(v, (dict, list)):
            out.update(p204_flatten_dict(v, key))
        else:
            out[key] = v
    return out


@case({"a.b": 1, "a.c.d": 2, "e": 3}, expect={"a": {"b": 1, "c": {"d": 2}}, "e": 3})
def p205_unflatten_dict(flat):
    """Unflatten dotted keys back into a nested dict

    Split each key on '.' and create intermediate dicts with setdefault.
    """
    out = {}
    for key, v in flat.items():
        node = out
        *parents, last = key.split(".")
        for p in parents:
            node = node.setdefault(p, {})
        node[last] = v
    return out


@case({"a": 1, "b": 2}, {"b": 3, "c": 4},
      expect={"added": {"c": 4}, "removed": {"a": 1}, "changed": {"b": (2, 3)}})
def p206_diff_dicts(expected, actual):
    """Diff two dicts (expected vs actual API response)

    Reports added, removed and changed keys, the heart of any response
    validation helper. Flatten first to diff nested JSON.
    """
    added = {k: actual[k] for k in actual.keys() - expected.keys()}
    removed = {k: expected[k] for k in expected.keys() - actual.keys()}
    changed = {k: (expected[k], actual[k]) for k in expected.keys() & actual.keys() if expected[k] != actual[k]}
    return {"added": added, "removed": removed, "changed": changed}


@case({"a": {"b": [{"id": 7}, {"x": {"id": 9}}]}, "id": 1}, "id", expect=[1, 7, 9])
def p207_find_key_recursive(data, key):
    """Find every value of a key in nested JSON

    Walk dicts and lists recursively. Useful when an API wraps ids at
    varying depths.
    """
    found = []
    if isinstance(data, dict):
        for k, v in data.items():
            if k == key:
                found.append(v)
            found += p207_find_key_recursive(v, key)
    elif isinstance(data, list):
        for item in data:
            found += p207_find_key_recursive(item, key)
    return sorted(found)


@case({"id": "1"}, {"id": int, "name": str}, expect=["id: expected int, got str", "name: missing"])
@case({"id": 1, "name": "a"}, {"id": int, "name": str}, expect=[])
def p208_validate_schema(data, schema):
    """Validate response fields against a simple schema

    Check each required key exists and has the right type; collect all errors
    instead of stopping at the first. (Real projects use jsonschema/pydantic.)
    """
    errors = []
    for key, typ in schema.items():
        if key not in data:
            errors.append(f"{key}: missing")
        elif not isinstance(data[key], typ):
            errors.append(f"{key}: expected {typ.__name__}, got {type(data[key]).__name__}")
    return errors


@case("name,age\nalice,30\nbob,25", expect=[{"name": "alice", "age": "30"}, {"name": "bob", "age": "25"}])
def p209_parse_csv_text(text):
    """Parse CSV text into a list of dicts

    csv.DictReader maps each row to the header names. Data-driven tests
    often load test data this way.
    """
    return list(csv.DictReader(io.StringIO(text)))


@case([{"a": 1, "b": 2}, {"a": 3, "b": 4}], expect="a,b\n1,2\n3,4\n")
def p210_to_csv_text(rows):
    """Write a list of dicts as CSV text

    csv.DictWriter with the keys of the first row as headers.
    """
    buf = io.StringIO()
    w = csv.DictWriter(buf, fieldnames=list(rows[0]), lineterminator="\n")
    w.writeheader()
    w.writerows(rows)
    return buf.getvalue()


@case("item,price\na,10\nb,5.5", "price", expect=15.5)
def p211_csv_column_sum(text, column):
    """Sum a numeric CSV column

    Read with DictReader and add float(row[column]).
    """
    return sum(float(r[column]) for r in csv.DictReader(io.StringIO(text)))


@case([1, 2, 3], [2, 3, 4], expect={"missing": [1], "unexpected": [4]})
def p212_compare_lists(expected, actual):
    """Compare expected and actual lists

    Report what is missing and what is unexpected, using set differences.
    """
    return {"missing": sorted(set(expected) - set(actual)), "unexpected": sorted(set(actual) - set(expected))}


def p213_retry(times=3, delay=0.0, exceptions=(Exception,)):
    """Retry decorator

    Re-run a flaky call up to `times` attempts, sleeping `delay` seconds in
    between, and re-raise the last error. Use sparingly: retries can hide
    real bugs.
    """
    def deco(fn):
        @wraps(fn)
        def wrapper(*a, **kw):
            for attempt in range(1, times + 1):
                try:
                    return fn(*a, **kw)
                except exceptions:
                    if attempt == times:
                        raise
                    time.sleep(delay)
        return wrapper
    return deco


def p214_timed(fn):
    """Timing decorator

    Measures how long a call takes and stores it on `wrapper.last_duration`.
    Good for simple performance assertions.
    """
    @wraps(fn)
    def wrapper(*a, **kw):
        start = time.perf_counter()
        try:
            return fn(*a, **kw)
        finally:
            wrapper.last_duration = time.perf_counter() - start
    wrapper.last_duration = 0.0
    return wrapper


def p215_wait_until(condition, timeout=5.0, interval=0.1):
    """Explicit wait: poll until a condition is true

    The core of Selenium/Playwright waits. Poll `condition()` every
    `interval` seconds and raise TimeoutError after `timeout`. Prefer this to
    fixed time.sleep().
    """
    deadline = time.monotonic() + timeout
    while True:
        value = condition()
        if value:
            return value
        if time.monotonic() >= deadline:
            raise TimeoutError(f"condition not met within {timeout}s")
        time.sleep(interval)


@case(5, expect=[1, 2, 4, 8, 10], base=1, factor=2, cap=10)
def p216_backoff_delays(attempts, base=1, factor=2, cap=60):
    """Exponential backoff delays

    delay = base * factor^attempt, capped. Used when retrying rate-limited
    APIs (add jitter in production).
    """
    return [min(base * factor ** i, cap) for i in range(attempts)]


@case(200, expect="Success")
@case(301, expect="Redirection")
@case(404, expect="Client Error")
@case(503, expect="Server Error")
@case(100, expect="Informational")
@case(700, expect="Unknown")
def p217_http_status_category(code):
    """Classify an HTTP status code

    The first digit tells the class: 1xx info, 2xx success, 3xx redirect,
    4xx client error, 5xx server error.
    """
    return {1: "Informational", 2: "Success", 3: "Redirection", 4: "Client Error",
            5: "Server Error"}.get(code // 100, "Unknown")


@case({"q": "qa engineer", "page": 2}, expect="q=qa+engineer&page=2")
def p218_build_query_string(params):
    """Build a URL query string

    urllib.parse.urlencode handles escaping.
    """
    return urlencode(params)


@case("a=1&b=x&a=2", expect={"a": ["1", "2"], "b": ["x"]})
def p219_parse_query_string(qs):
    """Parse a URL query string

    parse_qs returns lists because keys can repeat.
    """
    return parse_qs(qs)


@case("Visit https://a.com/x?y=1 and http://b.org.", expect=["https://a.com/x?y=1", "http://b.org"])
def p220_extract_urls(text):
    """Extract URLs from text

    Match http(s):// up to whitespace, then trim trailing punctuation.
    """
    return [u.rstrip(".,);") for u in re.findall(r"https?://\S+", text)]


@case("Contact a@x.com, b.c@y.org!", expect=["a@x.com", "b.c@y.org"])
def p221_extract_emails(text):
    """Extract email addresses from text

    One regex with findall; non-capturing group for the domain parts.
    """
    return re.findall(r"[\w.+-]+@[\w-]+(?:\.[\w-]+)+", text)


@case("Call 555-123-4567 or (555) 987-6543", expect=["555-123-4567", "(555) 987-6543"])
def p222_extract_phone_numbers(text):
    """Extract US phone numbers

    Optional parentheses around the area code, separators '-', '.' or space.
    """
    return re.findall(r"\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}", text)


@case({"user": "a", "password": "x", "nested": {"token": "t"}},
      expect={"user": "a", "password": "***", "nested": {"token": "***"}})
def p223_mask_sensitive(data, keys=("password", "token", "secret", "api_key")):
    """Mask secrets in a dict before logging

    Recursively replace values of sensitive keys. Leaking tokens in CI logs
    is a real security problem.
    """
    if isinstance(data, dict):
        return {k: "***" if k.lower() in keys else p223_mask_sensitive(v, keys) for k, v in data.items()}
    if isinstance(data, list):
        return [p223_mask_sensitive(v, keys) for v in data]
    return data


def p224_random_string(length=8, seed=None, alphabet=_string.ascii_letters + _string.digits):
    """Random string for unique test data

    Pass a seed for reproducible data (flaky-test friendly) or none for
    truly random values.
    """
    rng = random.Random(seed)
    return "".join(rng.choice(alphabet) for _ in range(length))


@case("QA User", "test.com", "001", expect="qa.user+001@test.com")
def p225_generate_test_email(name, domain="example.com", suffix=""):
    """Generate a unique test email

    The '+suffix' trick makes unique addresses that still reach one inbox.
    """
    local = name.strip().lower().replace(" ", ".")
    return f"{local}+{suffix}@{domain}" if suffix else f"{local}@{domain}"


def p226_generate_users(count, seed=0):
    """Generate fake user records (seeded)

    Deterministic test data: the same seed always yields the same users.
    """
    rng = random.Random(seed)
    return [{"id": i + 1, "name": "user" + p224_random_string(5, rng.random()),
             "age": rng.randint(18, 80)} for i in range(count)]


@case(1, 100, expect=[0, 1, 2, 99, 100, 101])
def p227_boundary_values(low, high):
    """Boundary value analysis for a range

    Test just outside, on and just inside each boundary, where bugs live.
    """
    return [low - 1, low, low + 1, high - 1, high, high + 1]


@case({"browser": ["chrome", "firefox"], "os": ["win", "mac"]},
      expect=[{"browser": "chrome", "os": "win"}, {"browser": "chrome", "os": "mac"},
              {"browser": "firefox", "os": "win"}, {"browser": "firefox", "os": "mac"}])
def p228_test_matrix(options):
    """Build a cross-browser/OS test matrix

    itertools.product gives every combination; feed it to a parametrized
    test.
    """
    return [dict(zip(options, combo)) for combo in product(*options.values())]


@case("2024-02-29", expect=True)
@case("2023-02-29", expect=False)
@case("2024-13-01", expect=False)
@case("abc", expect=False)
def p229_is_valid_date(s, fmt="%Y-%m-%d"):
    """Validate a date string

    strptime raises ValueError for impossible dates (Feb 30, month 13).
    """
    try:
        datetime.strptime(s, fmt)
        return True
    except ValueError:
        return False


@case("2024-01-01", "2024-03-01", expect=60)
def p230_days_between(a, b):
    """Days between two dates

    Subtract two date objects to get a timedelta.
    """
    return (date.fromisoformat(b) - date.fromisoformat(a)).days


@case("2024-05-03", 3, expect="2024-05-08")
def p231_add_business_days(start, days):
    """Add business days (skip weekends)

    Step one day at a time; only weekdays (Mon-Fri) count.
    """
    d = date.fromisoformat(start)
    while days:
        d += timedelta(days=1)
        if d.weekday() < 5:
            days -= 1
    return d.isoformat()


@case("1h30m15s", expect=5415)
@case("45s", expect=45)
@case("2m", expect=120)
def p232_parse_duration(s):
    """Parse '1h30m15s' into seconds

    Regex finds number+unit pairs and multiplies by the unit size.
    """
    units = {"h": 3600, "m": 60, "s": 1}
    return sum(int(n) * units[u] for n, u in re.findall(r"(\d+)([hms])", s))


@case(5415, expect="1h 30m 15s")
@case(45, expect="45s")
@case(3600, expect="1h")
@case(0, expect="0s")
def p233_format_seconds(total):
    """Format seconds as '1h 30m 15s'

    divmod to split hours/minutes/seconds; skip zero parts.
    """
    h, rem = divmod(total, 3600)
    m, s = divmod(rem, 60)
    parts = [f"{v}{u}" for v, u in ((h, "h"), (m, "m"), (s, "s")) if v]
    return " ".join(parts) or "0s"


@case("1.2.10", "1.2.9", expect=1)
@case("1.0", "1.0.0", expect=0)
@case("1.2", "1.10", expect=-1)
def p234_compare_versions(a, b):
    """Compare version strings

    Compare numerically per segment, padding the shorter one with zeros
    ('1.10' > '1.2', which plain string comparison gets wrong).
    """
    x, y = [int(p) for p in a.split(".")], [int(p) for p in b.split(".")]
    n = max(len(x), len(y))
    x, y = x + [0] * (n - len(x)), y + [0] * (n - len(y))
    return (x > y) - (x < y)


@case(["1.10.0", "1.2.0", "1.9.5"], expect=["1.2.0", "1.9.5", "1.10.0"])
def p235_sort_versions(versions):
    """Sort semantic versions

    Use a tuple of ints as the sort key.
    """
    return sorted(versions, key=lambda v: tuple(int(p) for p in v.split(".")))


@case([{"n": "b", "a": 2}, {"n": "a", "a": 3}], "n", expect=[{"n": "a", "a": 3}, {"n": "b", "a": 2}])
def p236_sort_dicts(rows, key):
    """Sort a list of dicts by a key

    sorted() with key=lambda r: r[key]. Verifies API sort order.
    """
    return sorted(rows, key=lambda r: r[key])


@case([{"t": "x", "v": 1}, {"t": "y", "v": 2}, {"t": "x", "v": 3}], "t",
      expect={"x": [{"t": "x", "v": 1}, {"t": "x", "v": 3}], "y": [{"t": "y", "v": 2}]})
def p237_group_by(rows, key):
    """Group a list of dicts by a key

    setdefault(...).append builds the groups in one pass.
    """
    out = {}
    for r in rows:
        out.setdefault(r[key], []).append(r)
    return out


@case([{"id": 1, "v": "a"}, {"id": 2, "v": "b"}, {"id": 1, "v": "c"}], "id",
      expect=[{"id": 1, "v": "a"}, {"id": 2, "v": "b"}])
def p238_dedupe_dicts_by_key(rows, key):
    """Remove duplicate records by key (keep first)

    Track seen key values in a set.
    """
    seen, out = set(), []
    for r in rows:
        if r[key] not in seen:
            seen.add(r[key])
            out.append(r)
    return out


@case(["pass", "fail", "pass", "skip"],
      expect={"pass": 2, "fail": 1, "skip": 1, "total": 4, "pass_rate": 50.0})
def p239_summarize_results(results):
    """Summarise test results

    Count each status and compute the pass rate, like a CI report.
    """
    c = Counter(results)
    total = len(results)
    return {"pass": c["pass"], "fail": c["fail"], "skip": c["skip"], "total": total,
            "pass_rate": round(100 * c["pass"] / total, 2) if total else 0.0}


@case(3, 4, expect=75.0)
@case(0, 0, expect=0.0)
def p240_pass_percentage(passed, total):
    """Pass percentage

    Guard against division by zero when no tests ran.
    """
    return round(100 * passed / total, 2) if total else 0.0


@case({"t1": ["pass", "fail", "pass"], "t2": ["pass", "pass"], "t3": ["fail", "fail"]}, expect=["t1"])
def p241_find_flaky_tests(history):
    """Detect flaky tests from run history

    A test is flaky if it both passed and failed across runs on the same
    code; consistent failures are real bugs.
    """
    return sorted(t for t, runs in history.items() if {"pass", "fail"} <= set(runs))


@case("  Hello \n  World\t! ", expect="hello world !")
def p242_normalize_text(s):
    """Normalise UI text for comparison

    Lower-case and collapse whitespace so cosmetic differences do not fail
    assertions.
    """
    return " ".join(s.lower().split())


@case("hello", expect="2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824")
def p243_sha256_of(text):
    """SHA-256 checksum of text or a file

    Compare hashes to confirm two downloads or exports are identical.
    """
    return hashlib.sha256(text.encode()).hexdigest()


@case("A=1\n# comment\nB = two\n\nC=", expect={"A": "1", "B": "two", "C": ""})
def p244_parse_env_text(text):
    """Parse .env style KEY=VALUE lines

    Skip blanks and comments, split on the first '='.
    """
    out = {}
    for line in text.splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            k, v = line.split("=", 1)
            out[k.strip()] = v.strip()
    return out


@case({"a": {"b": 1, "c": 2}, "d": 1}, {"a": {"b": 9}, "e": 5}, expect={"a": {"b": 9, "c": 2}, "d": 1, "e": 5})
def p245_deep_merge(base, override):
    """Deep-merge two config dicts

    Recurse where both sides are dicts; otherwise the override wins. Used
    for layering default and per-environment config.
    """
    out = dict(base)
    for k, v in override.items():
        out[k] = p245_deep_merge(out[k], v) if isinstance(v, dict) and isinstance(out.get(k), dict) else v
    return out


@case({"a": 1, "b": 2}, expect={1: "a", 2: "b"})
def p246_invert_dict(d):
    """Invert a dict (swap keys and values)

    Values must be unique and hashable.
    """
    return {v: k for k, v in d.items()}


@case([100, 200, 300, 400, 500, 600, 700, 800, 900, 1000], 90, expect=900)
@case([100, 200, 300, 400, 500, 600, 700, 800, 900, 1000], 50, expect=500)
def p247_percentile(values, pct):
    """Percentile of response times (nearest rank)

    Sort, then take the ceil(pct/100 * n)-th value. Used for p90/p95 SLA
    assertions in performance tests.
    """
    s = sorted(values)
    return s[max(0, math.ceil(pct / 100 * len(s)) - 1)]


@case(["t1", "t2", "t3", "t4", "t5", "t6", "t7"], 3, expect=[["t1", "t4", "t7"], ["t2", "t5"], ["t3", "t6"]])
def p248_shard_tests(tests, workers):
    """Split tests across parallel workers (round-robin)

    Slice with a step of `workers` so each shard gets an even mix (what
    pytest-xdist / CI sharding does).
    """
    return [tests[i::workers] for i in range(workers)]


@case("a\nb\nc\nd", 2, expect=["c", "d"])
def p249_tail_lines(text, n):
    """Last n lines of a log (tail)

    A bounded deque keeps only the latest n lines, so huge files never sit
    fully in memory.
    """
    return list(deque(text.splitlines(), maxlen=n))


@case("Abcdef1!", expect=[])
@case("abc", expect=["too short (min 8)", "missing uppercase", "missing digit", "missing special character"])
def p250_validate_password(pw):
    """Validate password rules

    Return every violated rule so a test can assert on the exact messages.
    """
    errors = []
    if len(pw) < 8:
        errors.append("too short (min 8)")
    if not re.search(r"[A-Z]", pw):
        errors.append("missing uppercase")
    if not re.search(r"\d", pw):
        errors.append("missing digit")
    if not re.search(r"[^\w\s]", pw):
        errors.append("missing special character")
    return errors
