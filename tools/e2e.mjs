// End-to-end browser test. Serves web/ locally and drives it with Playwright (Chromium).
// The CDN requests (Pyodide, TypeScript) are answered from the pinned copies in node_modules,
// so the test needs no internet access. pandas/numpy wheels are the only thing it cannot load offline.
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require("playwright")); } catch { ({ chromium } = require("/opt/node-tools/node_modules/playwright")); }

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const web = path.join(root, "web");
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".json": "application/json", ".wasm": "application/wasm", ".zip": "application/zip" };
// The site loads Pyodide and TypeScript from a CDN. In the test they are served from the pinned npm copies instead.
const resolveFile = (url) => {
  const u = url.split("?")[0];
  if (u === "/__ts.js") return path.join(root, "node_modules/typescript/lib/typescript.js");
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

const browser = await chromium.launch({ executablePath: process.env.CHROME || undefined });
const page = await (await browser.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
const errors = [];
page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
page.on("console", (m) => { if (m.type() === "error") errors.push("console: " + m.text()); });

await page.addInitScript((b) => { window.RUNNER_URLS = { pyodide: b + "__pyodide/", typescript: b + "__ts.js" }; }, base);

let passed = 0, failed = 0;
const check = async (name, fn) => {
  try { await fn(); passed++; console.log("  ok  ", name); }
  catch (e) { failed++; console.log("  FAIL", name, "\n      ", String(e.message).split("\n")[0]); }
};
const eq = (a, b, msg) => { if (a !== b) throw new Error(`${msg || "assert"}: got ${JSON.stringify(a)} want ${JSON.stringify(b)}`); };
const setCode = async (sel, code) => { await page.fill(sel, code); };

await page.goto(base);

await check("loads with 330 problems and no console errors", async () => {
  await page.waitForSelector("#plist button");
  eq(await page.locator("#plist button").count(), 330, "list size");
  eq(errors.length, 0, errors.join(" | "));
});

await check("dark / light toggle", async () => {
  const before = await page.getAttribute("html", "data-theme");
  await page.click("#themeBtn");
  const after = await page.getAttribute("html", "data-theme");
  if (before === after) throw new Error("theme did not change");
  await page.click("#themeBtn");
  eq(await page.getAttribute("html", "data-theme"), before, "restored");
});

await check("search and category filter", async () => {
  await page.fill("#search", "palindrome");
  const n = await page.locator("#plist button").count();
  if (n < 2 || n > 10) throw new Error("unexpected result count " + n);
  await page.fill("#search", "");
  await page.click('[data-cat="pytest"]');
  eq(await page.locator("#plist button").count(), 50, "pytest scenarios");
  await page.click('[data-cat="all"]');
});

await check("solution is hidden until revealed", async () => {
  await page.goto(base + "#p001");
  await page.waitForSelector("#revealBtn");
  eq(await page.locator("#solCode").count(), 0, "solution not in DOM");
  eq(await page.locator("#solutionBody").isHidden(), true, "body hidden");
  await page.click("#revealBtn");
  await page.waitForSelector("#solCode");
  const txt = await page.textContent("#solCode");
  if (!txt.includes("reverse_string")) throw new Error("python solution not shown");
  await page.click("#hideBtn");
  eq(await page.locator("#solCode").count(), 0, "hidden again");
});

await check("Python: wrong answer fails, right answer passes and marks solved", async () => {
  await page.waitForSelector("#runBtn");
  await setCode("#editorHost textarea", "def reverse_string(s):\n    return s\n");
  await page.click("#runBtn");
  await page.waitForSelector("#results .summary", { timeout: 90000 });
  if (!(await page.textContent("#results .summary")).includes("✗")) throw new Error("expected failure");
  await setCode("#editorHost textarea", "def reverse_string(s):\n    return s[::-1]\n");
  await page.click("#runBtn");
  await page.waitForFunction(() => document.querySelector("#results .summary")?.textContent.includes("2/2"), null, { timeout: 30000 });
  eq((await page.textContent("#solvedBadge")).includes("Solved"), true, "solved badge");
});

for (const [lang, label, code] of [
  ["js", "JavaScript", "function reverseString(s) { return [...s].reverse().join(''); }"],
  ["ts", "TypeScript", "function reverseString(s: string): string { return [...s].reverse().join(''); }"],
]) {
  await check(`${label}: starter shown, solution passes`, async () => {
    await page.click(`#langSeg [data-lang="${lang}"]`);
    await page.waitForSelector("#editorHost textarea");
    if (!(await page.inputValue("#editorHost textarea")).includes("reverseString")) throw new Error("starter missing");
    await setCode("#editorHost textarea", code);
    await page.click("#runBtn");
    await page.waitForFunction(() => document.querySelector("#results .summary")?.textContent.includes("2/2"), null, { timeout: 60000 });
  });
}

await check("TypeScript syntax error is reported", async () => {
  await setCode("#editorHost textarea", "function reverseString(s: string { return s }");
  await page.click("#runBtn");
  await page.waitForFunction(() => /Error/.test(document.querySelector("#results .summary")?.textContent || ""), null, { timeout: 30000 });
});

await check("reveal shows JS solution + explanation; reference solution runs", async () => {
  await page.click("#revealBtn");
  await page.waitForSelector("#solCode");
  eq(await page.textContent("#solCode").then((t) => t.includes("reverseString")), true, "js code");
  eq((await page.textContent(".explain")).includes("Time O(n)"), true, "explanation");
  await page.click("#runRefBtn");
  await page.waitForFunction(() => document.querySelector("#results .summary")?.textContent.includes("2/2"), null, { timeout: 30000 });
});

await check("class problem demo (MinStack) passes with reference in py / js / ts", async () => {
  for (const lang of ["py", "js", "ts"]) {
    await page.goto(base + "#p165");
    await page.click(`#langSeg [data-lang="${lang}"]`);
    await page.waitForSelector("#revealBtn");
    await page.click("#revealBtn");
    await page.waitForSelector("#runRefBtn");
    await page.click("#runRefBtn");
    await page.waitForFunction(() => /matches/.test(document.querySelector("#results .summary")?.textContent || ""), null, { timeout: 90000 });
  }
});

await check("data / pytest problems are Python-only with a note in JS", async () => {
  await page.click('#langSeg [data-lang="js"]');
  await page.goto(base + "#p261");
  await page.waitForSelector(".note");
  if (!(await page.textContent(".note")).includes("Python-only")) throw new Error("note missing");
  eq(await page.locator("#runBtn").count(), 0, "no run button for pytest scenario");
  await page.click("#revealBtn");
  if (!(await page.textContent("#solCode")).includes("yield")) throw new Error("fixture code missing");
});

await check("Playground default is 'Hello, Vijay!' (python)", async () => {
  await page.click('#langSeg [data-lang="py"]');
  await page.goto(base + "#playground");
  await page.waitForSelector("#pgRun");
  if (!(await page.inputValue("#pgEditor textarea")).includes('"Vijay"')) throw new Error("hello Vijay sample missing");
  eq(await page.locator("#sampleSel option").first().textContent(), "Hello, Vijay!", "first sample");
  await page.click("#pgRun");
  await page.waitForFunction(() => document.querySelector("#pgOut")?.textContent.includes("Hello, Vijay!"), null, { timeout: 90000 });
  if (!(await page.textContent("#pgOut")).includes("3. Welcome to the QA playground, Vijay")) throw new Error("loop output missing");
});

await check("Playground: python input() and error traceback", async () => {
  await page.selectOption("#sampleSel", { label: "Read input()" });
  await page.click("#pgReset", { timeout: 1000 }).catch(() => {});
  await page.selectOption("#sampleSel", { label: "Read input()" });
  await page.fill("details.stdin textarea", "Tester").catch(async () => { await page.click("details.stdin summary"); await page.fill("details.stdin textarea", "Tester"); });
  await page.click("#pgRun");
  await page.waitForFunction(() => document.querySelector("#pgOut")?.textContent.includes("Hello, Tester"), null, { timeout: 30000 });
  await setCode("#pgEditor textarea", "print(1/0)");
  await page.click("#pgRun");
  await page.waitForFunction(() => document.querySelector("#pgOut")?.textContent.includes("ZeroDivisionError"), null, { timeout: 30000 });
});

for (const [lang, label] of [["js", "JavaScript"], ["ts", "TypeScript"]]) {
  await check(`Playground: ${label} Hello, Vijay! and async sample`, async () => {
    await page.click(`#langSeg [data-lang="${lang}"]`);
    await page.waitForSelector("#pgRun");
    await page.click("#pgRun");
    await page.waitForFunction(() => document.querySelector("#pgOut")?.textContent.includes("Hello, Vijay!"), null, { timeout: 60000 });
  });
}

await check("Playground: Stop terminates an infinite loop", async () => {
  await page.click('#langSeg [data-lang="js"]');
  await page.waitForSelector("#pgRun");
  await setCode("#pgEditor textarea", "while (true) {}");
  await page.click("#pgRun");
  await page.waitForTimeout(500);
  await page.click("#pgStop");
  await page.waitForFunction(() => /finished|failed|Time limit/.test(document.querySelector("#pgOut")?.textContent || "") || document.querySelector("#pgStatus")?.textContent === "Stopped", null, { timeout: 30000 });
  await page.waitForTimeout(300);
  await setCode("#pgEditor textarea", "console.log('alive')");
  await page.click("#pgRun");
  await page.waitForFunction(() => document.querySelector("#pgOut")?.textContent.includes("alive"), null, { timeout: 15000 });
});

await check("mobile layout: menu opens the problem list", async () => {
  await page.setViewportSize({ width: 390, height: 800 });
  await page.goto(base + "#p002");
  await page.click("#menuBtn");
  eq(await page.locator("#sidebar.open").count(), 1, "sidebar open");
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  eq(overflow, false, "horizontal overflow");
});

await check("no uncaught page errors during the run", async () => {
  eq(errors.filter((e) => !/net::ERR|Failed to load resource/.test(e)).length, 0, errors.join(" | "));
});

await page.screenshot({ path: path.join(root, "build", "shot-mobile.png") });
await page.setViewportSize({ width: 1280, height: 900 });
await page.goto(base + "#p017");
await page.waitForSelector("#runBtn");
await page.screenshot({ path: path.join(root, "build", "shot-problem-light.png") });
await page.click("#themeBtn");
await page.screenshot({ path: path.join(root, "build", "shot-problem-dark.png") });

await browser.close();
server.close();
console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
