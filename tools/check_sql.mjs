// Runs the SQL content on PostgreSQL (PGlite, the engine the website uses) through the same sql_engine.js module.
//   node tools/check_sql.mjs                        every solution of the 50 patterns must run; the SQL cheat-sheet
//                                                   examples must print exactly their documented output
//   node tools/check_sql.mjs --fill-cheatsheet      rewrite the "=>" output lines of content/cheatsheet/07_sql.txt
//                                                   from a real run (then review the diff)
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createRequire } from "node:module";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
const { PGlite } = await import(pathToFileURL(require.resolve("@electric-sql/pglite")).href);
const { createEngine, resultToText } = await import(pathToFileURL(path.join(root, "web/sql_engine.js")).href);

const sqlDir = path.join(root, "content/sql");
const setup = fs.readFileSync(path.join(sqlDir, "schema.sql"), "utf8") + "\n" + fs.readFileSync(path.join(sqlDir, "seed.sql"), "utf8");
const engine = await createEngine(PGlite, setup);
const substitute = (sql, params) => Object.entries(params || {}).reduce((s, [k, v]) => s.replace(new RegExp("(?<![:\\w]):" + k + "\\b", "g"), v), sql);
const cheatFile = path.join(root, "content/cheatsheet/07_sql.txt");

if (process.argv.includes("--fill-cheatsheet")) {
  const lines = fs.readFileSync(cheatFile, "utf8").split("\n");
  const out = [];
  let i = 0, filled = 0;
  while (i < lines.length) {
    if (lines[i] !== "@sql") { out.push(lines[i++]); continue; }
    out.push(lines[i++]);
    const start = i;
    while (i < lines.length && !/^@@/.test(lines[i])) i++;
    const body = lines.slice(start, i).filter((l) => !l.startsWith("=>"));
    let last = body.length - 1;
    while (last >= 0 && (body[last].trim() === "" || body[last].startsWith("! "))) last--;
    // a "! note" can sit in the middle of the block text; the code ends at the last non-note, non-blank line
    const codeEnd = last + 1;
    const code = body.slice(0, codeEnd).filter((l) => !l.startsWith("! ")).join("\n");
    const res = await engine.run(code, { maxRows: 1000 });
    if (!res.ok) throw new Error("cheat sheet SQL failed: " + res.error + "\n" + code);
    const text = resultToText(res).split("\n").map((l) => "=> " + l);
    out.push(...body.slice(0, codeEnd), ...text, ...body.slice(codeEnd));
    filled++;
  }
  fs.writeFileSync(cheatFile, out.join("\n"));
  console.log(`filled expected output for ${filled} SQL cheat-sheet examples`);
  await engine.close();
  process.exit(0);
}

let pass = 0, fail = 0, skipped = 0, empty = 0;
const patterns = JSON.parse(fs.readFileSync(path.join(root, "build/sql_patterns.json"), "utf8"));
for (const p of patterns) {
  for (const q of p.questions) {
    if (q.runnable === false) { skipped++; continue; }
    const res = await engine.run(substitute(q.solution, q.params), { maxRows: 5 });
    if (res.ok) { pass++; if (res.hasResultSet && res.rowCount === 0) empty++; }
    else { fail++; console.log(`FAIL ${q.id}: ${res.error}`); }
  }
}
console.log(`solutions: ${pass} ran, ${skipped} view-only (vendor syntax), ${fail} failed; ${empty} return no rows on the sample data`);

const sections = JSON.parse(fs.readFileSync(path.join(root, "build/cheatsheet.json"), "utf8"));
let cpass = 0, cfail = 0, cview = 0;
for (const sec of sections) {
  for (const e of sec.entries) {
    const b = e.code.sql;
    if (!b) continue;
    if (!b.run) { cview++; continue; }
    const res = await engine.run(b.code, { maxRows: 1000 });
    const got = resultToText(res), want = b.out.join("\n");
    if (got === want) cpass++;
    else { cfail++; console.log(`FAIL cheat sheet / ${e.title}\n  want: ${JSON.stringify(want)}\n  got : ${JSON.stringify(got)}`); }
  }
}
console.log(`cheat sheet: ${cpass} SQL examples match, ${cview} view-only, ${cfail} differ`);
await engine.close();
process.exit(fail || cfail ? 1 : 0);
