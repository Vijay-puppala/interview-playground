// Runs every exported Python example against the TypeScript solutions (transpiled on the fly).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cases = JSON.parse(fs.readFileSync(path.join(root, "build/cases.json"), "utf8"));
const only = process.argv.slice(2);

const canon = (v) => {
  if (v === undefined) return null;
  if (Array.isArray(v)) return v.map(canon);
  if (v && typeof v === "object") return Object.fromEntries(Object.keys(v).sort().map((k) => [k, canon(v[k])]));
  return v;
};
const same = (a, b) => {
  a = canon(a); b = canon(b);
  if (typeof a === "number" && typeof b === "number") return Math.abs(a - b) < 1e-9;
  return JSON.stringify(a) === JSON.stringify(b);
};

let pass = 0, fail = 0, missing = 0;
for (const file of fs.readdirSync(path.join(root, "content/ts")).filter((f) => f.endsWith(".ts"))) {
  const cat = file.replace(".ts", "");
  if (only.length && !only.includes(cat)) continue;
  const src = fs.readFileSync(path.join(root, "content/ts", file), "utf8");
  const js = ts.transpileModule(src, { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText;
  const names = [...src.matchAll(/^(?:function|class) (p\d{3}_\w+)/gm)].map((m) => m[1]);
  const mod = new Function(js + "\nreturn {" + names.join(",") + "};")();
  const byNum = Object.fromEntries(Object.entries(cases).map(([k, v]) => [k.slice(0, 4), v]));
  for (const name of names) {
    const covered = (byNum[name.slice(0, 4)] ?? []);
    for (const [i, c] of covered.entries()) {
      try {
        const got = mod[name](...structuredClone(c.args));
        if (c.raises) { fail++; console.log(`FAIL ${name}[${i}] expected a throw, got`, got); continue; }
        if (same(got, c.expect)) pass++;
        else { fail++; console.log(`FAIL ${name}[${i}] args=${JSON.stringify(c.args)} got=${JSON.stringify(got)} want=${JSON.stringify(c.expect)}`); }
      } catch (e) {
        if (c.raises) pass++;
        else { fail++; console.log(`FAIL ${name}[${i}] threw ${e}`); }
      }
    }
  }
}
console.log(`pass=${pass} fail=${fail}`);
process.exit(fail ? 1 : 0);
