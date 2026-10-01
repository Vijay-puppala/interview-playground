// Runs every runnable cheat-sheet example and compares its output with the documented output:
//   JavaScript / TypeScript -> Node (same console formatting as the site's worker)
//   Python                  -> Pyodide, the exact runtime the website uses
// Usage: node tools/check_cheatsheet.mjs [py] [js] [ts]
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sections = JSON.parse(fs.readFileSync(path.join(root, "build/cheatsheet.json"), "utf8"));
const only = process.argv.slice(2);
const want = (l) => !only.length || only.includes(l);

const fmt = (v) => {
  if (typeof v === "string") return v;
  try { return typeof v === "object" && v !== null ? JSON.stringify(v) : String(v); } catch { return String(v); }
};
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
async function runJs(code, lang) {
  const js = lang === "ts" ? ts.transpileModule(code, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText : code;
  const out = [];
  const realLog = console.log;
  const shim = { log: (...a) => out.push(a.map(fmt).join(" ")) };
  // run with the same global `console` shim as the website's worker
  await new AsyncFunction("console", js)(shim);
  console.log = realLog;
  return out.join("\n");
}

let pyodide = null;
async function runPy(code) {
  if (!pyodide) {
    const { loadPyodide } = await import("pyodide");
    pyodide = await loadPyodide();
    pyodide.runPython(fs.readFileSync(path.join(root, "web/py_harness.py"), "utf8"));   // same harness as the website
  }
  pyodide.globals.set("_code", code);
  pyodide.globals.set("_demo", "");
  const res = JSON.parse(await pyodide.runPythonAsync("await run_script_async(_code, _demo)"));
  if (res.error) throw new Error(res.error);
  return res.logs;
}

let pass = 0, fail = 0, skipped = 0;
for (const sec of sections) {
  for (const e of sec.entries) {
    for (const [lang, b] of Object.entries(e.code)) {
      if (lang === "sql" || !want(lang)) continue;   // SQL examples are checked by tools/check_sql.mjs
      if (!b.run) { skipped++; continue; }
      const label = `${sec.title} / ${e.title} [${lang}]`;
      try {
        const got = (lang === "py" ? await runPy(b.code) : await runJs(b.code, lang)).replace(/\n+$/, "");
        const want_ = b.out.join("\n");
        if (got === want_) pass++;
        else { fail++; console.log(`FAIL ${label}\n  want: ${JSON.stringify(want_)}\n  got : ${JSON.stringify(got)}`); }
      } catch (err) {
        fail++; console.log(`FAIL ${label}\n  threw: ${String(err.message || err).split("\n").slice(-2).join(" | ")}`);
      }
    }
  }
}
console.log(`cheat sheet: ${pass} passed, ${fail} failed, ${skipped} not-run (shown only)`);
process.exit(fail ? 1 : 0);
