/* Code runners. Everything executes in Web Workers so a runaway loop can be terminated.
 *   Python      -> Pyodide (CPython compiled to WebAssembly), loaded lazily from a CDN
 *   JavaScript  -> native, inside a worker
 *   TypeScript  -> transpiled with the TypeScript compiler (lazy CDN load), then run like JS
 * pandas / numpy are fetched on demand by Pyodide when the code imports them.
 */
(function () {
  const PYODIDE_VERSION = "0.26.4";
  const URLS = Object.assign({
    pyodide: `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`,
    typescript: "https://cdn.jsdelivr.net/npm/typescript@5.4.5/lib/typescript.js",
  }, window.RUNNER_URLS || {});

  /* ---------------------------------------------------------------- JS worker */
  const JS_WORKER = `
    let tsLib = null;  // not named ts: typescript.js declares its own global ts
    let out = [];
    const fmt = (v) => {
      if (typeof v === "string") return v;
      if (v instanceof Error) return v.stack || String(v);
      try { return typeof v === "object" && v !== null ? JSON.stringify(v) : String(v); } catch { return String(v); }
    };
    const push = (kind) => (...a) => out.push({ kind, text: a.map(fmt).join(" ") });
    self.console = { log: push("out"), info: push("out"), debug: push("out"), warn: push("err"), error: push("err") };

    const canon = (v) => {
      if (v === undefined) return null;
      if (Array.isArray(v)) return v.map(canon);
      if (v && typeof v === "object") return Object.fromEntries(Object.keys(v).sort().map((k) => [k, canon(v[k])]));
      return v;
    };
    const same = (a, b) => {
      a = canon(a); b = canon(b);
      if (typeof a === "number" && typeof b === "number") return Math.abs(a - b) < 1e-9 || a === b;
      return JSON.stringify(a) === JSON.stringify(b);
    };
    const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;

    function toJs(code, lang, tsUrl) {
      if (lang !== "ts") return code;
      if (!tsLib) { importScripts(tsUrl); tsLib = self.ts; }
      const res = tsLib.transpileModule(code, { reportDiagnostics: true,
        compilerOptions: { target: tsLib.ScriptTarget.ES2022, useDefineForClassFields: true } });
      const bad = (res.diagnostics || []).filter((d) => d.category === tsLib.DiagnosticCategory.Error);
      if (bad.length) {
        const d = bad[0];
        const pos = d.file && d.start !== undefined ? d.file.getLineAndCharacterOfPosition(d.start) : null;
        throw new SyntaxError((pos ? "line " + (pos.line + 1) + ": " : "") + tsLib.flattenDiagnosticMessageText(d.messageText, "\\n"));
      }
      return res.outputText;
    }

    self.onmessage = async (e) => {
      const m = e.data;
      out = [];
      const started = performance.now();
      try {
        if (m.mode === "free" || m.mode === "demo") {
          const js = toJs(m.mode === "demo" ? m.code + "\\n" + m.demo : m.code, m.lang, m.tsUrl);
          await new AsyncFunction(js)();
          self.postMessage({ id: m.id, ok: true, logs: out, ms: performance.now() - started });
        } else {
          const js = toJs(m.code, m.lang, m.tsUrl);
          const fn = new Function(js + "\\nreturn typeof " + m.fnName + " === 'undefined' ? undefined : " + m.fnName + ";")();
          if (typeof fn !== "function") {
            throw new ReferenceError("Define a function named \`" + m.fnName + "\`");
          }
          const results = [];
          for (const c of m.cases) {
            try {
              const got = await fn(...structuredClone(c.args));
              if (c.raises) results.push({ ok: false, got: JSON.stringify(canon(got)), error: "expected an error to be thrown" });
              else results.push({ ok: same(got, c.expect), got: JSON.stringify(canon(got)) });
            } catch (err) {
              results.push(c.raises ? { ok: true } : { ok: false, error: String(err && err.stack ? err.stack.split("\\n").slice(0, 3).join("\\n") : err) });
            }
          }
          self.postMessage({ id: m.id, ok: true, results, logs: out, ms: performance.now() - started });
        }
      } catch (err) {
        self.postMessage({ id: m.id, ok: false, error: String(err && err.message ? (err.name + ": " + err.message) : err), logs: out });
      }
    };
  `;

  /* ------------------------------------------------------------ Python worker */
  const PY_HARNESS = String.raw`
import sys, io, json, math, copy, traceback, contextlib, time

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

def run_script(code, demo=""):
    out = io.StringIO()
    started = time.perf_counter()
    with contextlib.redirect_stdout(out), contextlib.redirect_stderr(out):
        try:
            _load(code + ("\n" + demo if demo else ""), out)
        except BaseException as e:
            return json.dumps({"error": _short_tb(e), "logs": out.getvalue()})
    return json.dumps({"logs": out.getvalue(), "ms": (time.perf_counter() - started) * 1000})
`;

  const PY_WORKER = `
    let py = null;
    const PY_HARNESS = ${JSON.stringify(PY_HARNESS)};
    async function init(url) {
      importScripts(url + "pyodide.js");
      py = await loadPyodide({ indexURL: url });
      py.runPython(PY_HARNESS);
    }
    self.onmessage = async (e) => {
      const m = e.data;
      try {
        if (m.mode === "init") {
          await init(m.url);
          self.postMessage({ id: m.id, ok: true });
          return;
        }
        const needs = /(^|\\n)\\s*(import|from)\\s+(pandas|numpy)/.test(m.code);
        if (needs) {
          self.postMessage({ type: "status", text: "Loading pandas / numpy…" });
          await py.loadPackagesFromImports(m.code);
        }
        const lines = (m.stdin || "").split("\\n");
        py.setStdin({ stdin: () => (lines.length ? lines.shift() : undefined) });
        let raw;
        if (m.mode === "cases") raw = py.globals.get("run_cases")(m.code, m.fnName, JSON.stringify(m.cases));
        else raw = py.globals.get("run_script")(m.code, m.mode === "demo" ? m.demo : "");
        self.postMessage(Object.assign({ id: m.id, ok: true }, JSON.parse(raw)));
      } catch (err) {
        self.postMessage({ id: m.id, ok: false, error: String(err && err.message ? err.message : err) });
      }
    };
  `;

  /* ------------------------------------------------------------- main thread */
  const state = { py: null, js: null };
  let seq = 0;
  let onStatus = () => {};

  function spawn(src) {
    const url = URL.createObjectURL(new Blob([src], { type: "text/javascript" }));
    const w = new Worker(url);
    w.__url = url;
    return w;
  }
  function kill(kind) {
    if (state[kind]) {
      state[kind].worker.terminate();
      URL.revokeObjectURL(state[kind].worker.__url);
      state[kind] = null;
    }
  }
  function call(worker, msg, timeoutMs, kind) {
    return new Promise((resolve) => {
      const id = ++seq;
      let timer = null;
      const done = (res) => { clearTimeout(timer); worker.removeEventListener("message", onMsg); resolve(res); };
      const onMsg = (e) => {
        if (e.data.type === "status") return onStatus(e.data.text);
        if (e.data.id !== id) return;
        done(e.data);
      };
      worker.addEventListener("message", onMsg);
      worker.addEventListener("error", (e) => { done({ ok: false, error: e.message || "worker error" }); kill(kind); }, { once: true });
      if (timeoutMs) {
        timer = setTimeout(() => {
          kill(kind);
          done({ ok: false, timeout: true, error: "Time limit exceeded (" + timeoutMs / 1000 + "s). The run was stopped." });
        }, timeoutMs);
      }
      worker.postMessage(Object.assign({ id }, msg));
    });
  }

  async function ensurePython() {
    if (state.py) return state.py.ready;
    const worker = spawn(PY_WORKER);
    const entry = { worker };
    state.py = entry;
    onStatus("Loading Python runtime (first run only)…");
    entry.ready = call(worker, { mode: "init", url: URLS.pyodide }, 120000, "py").then((r) => {
      if (!r.ok) { kill("py"); throw new Error(r.error); }
      return r;
    });
    return entry.ready;
  }
  function ensureJs() {
    if (!state.js) state.js = { worker: spawn(JS_WORKER) };
    return state.js;
  }

  /**
   * job: { lang: "py"|"js"|"ts", mode: "cases"|"demo"|"free", code, fnName?, cases?, demo?, stdin? }
   * resolves { ok, results?, logs, error?, ms?, timeout? }; logs is a string (py) or [{kind,text}] (js)
   */
  async function run(job, timeoutMs = 10000) {
    try {
      if (job.lang === "py") {
        await ensurePython();
        onStatus("Running…");
        const res = await call(state.py ? state.py.worker : (await ensurePython(), state.py.worker), job, timeoutMs, "py");
        if (res.logs === undefined) res.logs = "";
        return res;
      }
      const entry = ensureJs();
      onStatus("Running…");
      const res = await call(entry.worker, Object.assign({ tsUrl: URLS.typescript }, job), timeoutMs, "js");
      res.logs = (res.logs || []).map((l) => l.text).join("\n");
      return res;
    } catch (err) {
      return { ok: false, error: String(err && err.message ? err.message : err), logs: "" };
    }
  }

  function stop(lang) { kill(lang === "py" ? "py" : "js"); }

  window.Runner = { run, stop, setStatusHandler: (fn) => { onStatus = fn; }, PYODIDE_VERSION };
})();
