// Drives the static site in headless Chromium: serve web/, open a route, optionally interact, screenshot / print text.
//
//   node .claude/skills/run-interview-playground/driver.mjs <route> <out.png> [options]
//
//   <route>            hash route without '#': home, problems, p001, cheatsheet, cheatsheet/group-by, sql, sql/schema, playground, about
//   --dark / --light   colour scheme (the site follows the system setting)         default: dark
//   --w 1280 --h 900   viewport size                                               (390 x 800 = phone)
//   --click SEL        click a selector (repeatable, runs in order)
//   --fill SEL=TEXT    fill an input / textarea (repeatable)
//   --wait SEL         wait for a selector before the screenshot (default 60 s; Python / SQL runs download a runtime first)
//   --scroll SEL       scroll that element into view before the screenshot
//   --text SEL         print the text of the first match (after the interactions)
//   --count SEL        print how many elements match
//   --full             full-page screenshot of #main instead of the viewport
//
// Pyodide, TypeScript and PGlite are served from node_modules, so no CDN or internet is needed.
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require("playwright")); } catch { ({ chromium } = require("/opt/node-tools/node_modules/playwright")); }

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const web = path.join(root, "web");
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".json": "application/json", ".wasm": "application/wasm", ".woff2": "font/woff2", ".zip": "application/zip", ".py": "text/plain", ".data": "application/octet-stream" };

const args = process.argv.slice(2);
const route = args[0], out = args[1];
if (!route || !out) { console.error("usage: driver.mjs <route> <out.png> [--dark|--light] [--w N] [--h N] [--click SEL] [--fill SEL=TEXT] [--wait SEL] [--scroll SEL] [--text SEL] [--count SEL] [--full]"); process.exit(2); }
const opt = (name) => { const v = []; for (let i = 2; i < args.length; i++) if (args[i] === name) v.push(args[i + 1]); return v; };
const flag = (name) => args.includes(name);
const one = (name, d) => opt(name)[0] ?? d;

const resolveFile = (url) => {
  const u = url.split("?")[0];
  if (u === "/__ts.js") return path.join(root, "node_modules/typescript/lib/typescript.js");
  if (u.startsWith("/__pglite/")) return path.join(root, "node_modules/@electric-sql/pglite/dist", u.slice("/__pglite/".length));
  if (u.startsWith("/__pyodide/")) return path.join(root, "node_modules/pyodide", u.slice("/__pyodide/".length));
  return path.join(web, u === "/" ? "index.html" : u);
};
const server = http.createServer((req, res) => {
  const p = resolveFile(req.url);
  if (!fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { "content-type": MIME[path.extname(p)] || "application/octet-stream" });
  fs.createReadStream(p).pipe(res);
});
await new Promise((r) => server.listen(0, r));
const base = `http://localhost:${server.address().port}/`;

const chrome = process.env.CHROME || fs.readdirSync("/opt/pw-browsers").filter((d) => /^chromium-\d+$/.test(d)).map((d) => `/opt/pw-browsers/${d}/chrome-linux/chrome`).find((p) => fs.existsSync(p));
const browser = await chromium.launch({ executablePath: chrome });
const ctx = await browser.newContext({ viewport: { width: +one("--w", 1280), height: +one("--h", 900) }, colorScheme: flag("--light") ? "light" : "dark" });
await ctx.addInitScript((b) => { window.RUNNER_URLS = { pyodide: b + "__pyodide/", typescript: b + "__ts.js", pglite: b + "__pglite/index.js" }; }, base);
const page = await ctx.newPage();
const problems = [];
page.on("pageerror", (e) => problems.push("pageerror: " + e.message));
page.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource/.test(m.text())) problems.push("console: " + m.text()); });

let code = 0;
try {
  await page.goto(base + "#" + route);
  await page.waitForSelector(".main, #main", { timeout: 30000 });
  await page.waitForTimeout(300);
  for (const f of opt("--fill")) { const i = f.indexOf("="); await page.fill(f.slice(0, i), f.slice(i + 1)); }
  for (const sel of opt("--click")) { await page.click(sel); await page.waitForTimeout(150); }
  for (const sel of opt("--wait")) await page.waitForSelector(sel, { timeout: 60000 });
  const scroll = one("--scroll");
  if (scroll) await page.locator(scroll).first().scrollIntoViewIfNeeded();
  for (const sel of opt("--text")) console.log((await page.locator(sel).first().textContent()).trim());
  for (const sel of opt("--count")) console.log(sel, "->", await page.locator(sel).count());
  await page.screenshot({ path: out, fullPage: false });
  console.log("screenshot:", out);
} catch (e) {
  console.error("FAILED:", String(e.message).split("\n")[0]);
  try { await page.screenshot({ path: out }); console.error("failure screenshot:", out); } catch {}
  code = 1;
}
if (problems.length) { console.error("page problems:\n  " + problems.join("\n  ")); code = code || 1; }
await browser.close();
server.close();
process.exit(code);
