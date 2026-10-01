"""Runs inside Pyodide (the in-browser Python). Shared by the website worker and tools/check_cheatsheet.mjs."""
import sys, io, json, math, copy, traceback, contextlib, time, asyncio

def _eq(a, b):
    if isinstance(a, bool) or isinstance(b, bool):
        return type(a) is type(b) and a == b
    if isinstance(a, (int, float)) and isinstance(b, (int, float)):
        return math.isclose(a, b, rel_tol=1e-9, abs_tol=1e-9)
    if isinstance(a, list) and isinstance(b, list):
        return len(a) == len(b) and all(_eq(x, y) for x, y in zip(a, b))
    if isinstance(a, dict) and isinstance(b, dict):
        return a.keys() == b.keys() and all(_eq(a[k], b[k]) for k in a)
    return a == b

def _plain(v):
    return json.loads(json.dumps(v, default=str))

def _short_tb(e):
    tb = e.__traceback__
    while tb is not None and tb.tb_frame.f_code.co_filename != "<your code>" and tb.tb_next is not None:
        tb = tb.tb_next
    return "".join(traceback.format_exception(type(e), e, tb)).strip()

def _load(code, out):
    ns = {"__name__": "__main__"}
    exec(compile(code, "<your code>", "exec"), ns)
    return ns

def run_cases(code, fn_name, cases_json):
    cases, out, results = json.loads(cases_json), io.StringIO(), []
    started = time.perf_counter()
    with contextlib.redirect_stdout(out), contextlib.redirect_stderr(out):
        try:
            ns = _load(code, out)
        except BaseException as e:
            return json.dumps({"error": _short_tb(e), "logs": out.getvalue()})
        fn = ns.get(fn_name)
        if not callable(fn):
            return json.dumps({"error": "NameError: define a function named " + fn_name, "logs": out.getvalue()})
        for c in cases:
            try:
                got = _plain(fn(*copy.deepcopy(c["args"])))
                if c.get("raises"):
                    results.append({"ok": False, "got": json.dumps(got), "error": "expected an error to be raised"})
                else:
                    results.append({"ok": _eq(got, c["expect"]), "got": json.dumps(got)})
            except BaseException as e:
                results.append({"ok": True} if c.get("raises") else {"ok": False, "error": _short_tb(e)})
    return json.dumps({"results": results, "logs": out.getvalue(), "ms": (time.perf_counter() - started) * 1000})

_pending = []

def _browser_asyncio_run(coro, *, debug=None):
    """asyncio.run() cannot block inside the browser's already-running event loop, so schedule the
    coroutine and let run_script_async wait for it before it returns the captured output."""
    _pending.append(asyncio.ensure_future(coro))

async def run_script_async(code, demo=""):
    import asyncio
    from pyodide.code import eval_code_async
    out = io.StringIO()
    started = time.perf_counter()
    real_run = asyncio.run
    asyncio.run = _browser_asyncio_run
    try:
        with contextlib.redirect_stdout(out), contextlib.redirect_stderr(out):
            try:
                await eval_code_async(code + ("\n" + demo if demo else ""), {"__name__": "__main__"}, filename="<your code>")
                if _pending:
                    await asyncio.gather(*_pending)
            except BaseException as e:
                return json.dumps({"error": _short_tb(e), "logs": out.getvalue()})
            finally:
                _pending.clear()
    finally:
        asyncio.run = real_run
    return json.dumps({"logs": out.getvalue(), "ms": (time.perf_counter() - started) * 1000})
