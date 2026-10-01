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

const browser = await chromium.launch({ executablePath: process.env.CHROME || undefined });
const page = await (await browser.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
const errors = [];
page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
page.on("console", (m) => { if (m.type() === "error") errors.push("console: " + m.text()); });

await page.addInitScript((b) => { window.RUNNER_URLS = { pyodide: b + "__pyodide/", typescript: b + "__ts.js", pglite: b + "__pglite/index.js" }; }, base);

let passed = 0, failed = 0;
const check = async (name, fn) => {
  try { await fn(); passed++; console.log("  ok  ", name); }
  catch (e) { failed++; console.log("  FAIL", name, "\n      ", String(e.message).split("\n")[0]); }
};
const eq = (a, b, msg) => { if (a !== b) throw new Error(`${msg || "assert"}: got ${JSON.stringify(a)} want ${JSON.stringify(b)}`); };
const setCode = async (sel, code) => { await page.fill(sel, code); };

await page.goto(base + "#problems");

await check("loads with 330 problems and no console errors", async () => {
  await page.waitForSelector("#plist button");
  eq(await page.locator("#plist button").count(), 330, "list size");
  eq(errors.length, 0, errors.join(" | "));
});

await check("light / dark follows the system setting (no manual toggle)", async () => {
  eq(await page.locator("#themeBtn").count(), 0, "no toggle button");
  await page.emulateMedia({ colorScheme: "dark" });
  await page.waitForFunction(() => document.documentElement.getAttribute("data-theme") === "dark");
  await page.emulateMedia({ colorScheme: "light" });
  await page.waitForFunction(() => document.documentElement.getAttribute("data-theme") === "light");
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
  eq((await page.locator("#sampleList button").first().textContent()).trim(), "Hello, Vijay!", "first sample");
  await page.click("#pgRun");
  await page.waitForFunction(() => document.querySelector("#pgOut")?.textContent.includes("Hello, Vijay!"), null, { timeout: 90000 });
  if (!(await page.textContent("#pgOut")).includes("3. Welcome to the QA playground, Vijay")) throw new Error("loop output missing");
});

await check("Playground: python input() and error traceback", async () => {
  await page.click('#sampleList button:has-text("Read input()")');
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

const setLang = async (l) => { await page.click(`#langSeg [data-lang="${l}"]`); };
const runCard = async (key, timeout = 60000) => {
  const card = page.locator(`.cs-entry[data-key="${key}"]`);
  await card.scrollIntoViewIfNeeded();
  await card.locator('[data-act="run"]').click();
  await page.waitForFunction((k) => /matches/.test(document.querySelector(`.cs-entry[data-key="${k}"] .cs-result`)?.textContent || ""), key, { timeout });
};

await check("cheat sheet: lists every entry and follows the language switch", async () => {
  await page.goto(base + "#cheatsheet");
  await setLang("py");
  await page.waitForSelector(".cs-entry");
  eq(await page.locator(".cs-entry").count(), 170, "entries");
  if (!(await page.textContent('.cs-entry[data-key="variables-and-types"] pre.code')).includes("type(name).__name__")) throw new Error("python code missing");
  await setLang("js");
  if (!(await page.textContent('.cs-entry[data-key="variables-and-types"] pre.code')).includes("typeof")) throw new Error("javascript code missing");
});

await check("cheat sheet: search and section filter", async () => {
  await setLang("py");
  await page.fill("#csSearch", "asyncio");
  await page.waitForFunction(() => document.querySelectorAll(".cs-entry").length >= 3);
  await page.fill("#csSearch", "zzz-no-such-thing");
  await page.waitForFunction(() => /Nothing matches/.test(document.querySelector("#csBody")?.textContent || ""));
  await page.fill("#csSearch", "");
  await page.click('#csChips [data-sec="strings"]');
  await page.waitForFunction(() => document.querySelectorAll(".cs-entry").length === 8);
  eq(await page.locator(".cs-section").count(), 1, "one section heading");
  await page.click('#csChips [data-sec="all"]');
  await page.waitForFunction(() => document.querySelectorAll(".cs-entry").length === 170);
});

await check("cheat sheet: run a Python example", async () => {
  await runCard("variables-and-types");
});

await check("cheat sheet: asyncio.run() works in the browser runner", async () => {
  await runCard("timeouts");
});

await check("cheat sheet: JavaScript example with top-level await", async () => {
  await setLang("js");
  await page.waitForSelector('.cs-entry[data-key="timeouts"]');
  await runCard("timeouts");
});

await check("cheat sheet: TypeScript has its own version and a JS fallback badge", async () => {
  await setLang("ts");
  await page.waitForSelector('.cs-entry[data-key="generics"]');
  if (!(await page.textContent('.cs-entry[data-key="generics"] pre.code')).includes("<T>")) throw new Error("typed generics missing");
  eq(await page.locator('.cs-entry[data-key="generics"] .badge').count(), 0, "no fallback badge on a TS-specific entry");
  if (!(await page.textContent('.cs-entry[data-key="truthy-and-falsy-values"] .badge')).includes("same as JavaScript")) throw new Error("fallback badge missing");
  await runCard("generics");
  await runCard("truthy-and-falsy-values");
});

await check("cheat sheet: view-only entries cannot be run", async () => {
  await page.fill("#csSearch", "playwright");
  try {
    await page.waitForSelector('.cs-entry[data-key="browser-test-with-playwright"]');
    const card = page.locator('.cs-entry[data-key="browser-test-with-playwright"]');
    if (!(await card.textContent()).includes("view only")) throw new Error("view only badge missing");
    eq(await card.locator('[data-act="run"]').count(), 0, "run button");
    eq(await card.locator('[data-act="play"]').count(), 0, "open-in-playground button");
  } finally {
    await page.fill("#csSearch", "");   // never leave the filter on, or later tests cannot find their cards
  }
});

await check("cheat sheet: Open in Playground loads the example", async () => {
  await setLang("py");
  await page.waitForSelector('.cs-entry[data-key="variables-and-types"]');
  await page.locator('.cs-entry[data-key="variables-and-types"] [data-act="play"]').click();
  await page.waitForSelector("#pgRun");
  if (!(await page.inputValue("#pgEditor textarea")).includes("type(name).__name__")) throw new Error("example not loaded into the playground");
  await page.click("#pgRun");
  await page.waitForFunction(() => document.querySelector("#pgOut")?.textContent.includes("str int float bool"), null, { timeout: 30000 });
});

await check("Playground: python asyncio.run(main()) prints its output", async () => {
  await page.goto(base + "#playground");
  await page.waitForSelector("#pgRun");
  await setCode("#pgEditor textarea", "import asyncio\nasync def main():\n    await asyncio.sleep(0.01)\n    print('async done')\nasyncio.run(main())");
  await page.click("#pgRun");
  await page.waitForFunction(() => document.querySelector("#pgOut")?.textContent.includes("async done"), null, { timeout: 30000 });
  await setCode("#pgEditor textarea", "import asyncio\nasync def main():\n    return 1 / 0\nasyncio.run(main())");
  await page.click("#pgRun");
  await page.waitForFunction(() => document.querySelector("#pgOut")?.textContent.includes("ZeroDivisionError"), null, { timeout: 30000 });
});

await check("home: options first, then the author; no sidebar or progress on Home; progress lives under Problems", async () => {
  await page.setViewportSize({ width: 1360, height: 860 });
  await page.goto(base + "#home");
  await page.waitForSelector(".hero");
  if (!(await page.textContent(".hero")).includes("SDET Interview Playground")) throw new Error("hero text missing");
  const order = await page.evaluate(() => document.querySelector("#viewHome .quick").getBoundingClientRect().top < document.querySelector("#viewHome .author").getBoundingClientRect().top);
  eq(order, true, "options above the author section");
  eq(await page.locator("#sidebar").isVisible(), false, "no sidebar on Home");
  eq(await page.locator("#viewHome .stat, #viewHome .cat-row").count(), 0, "no progress widgets on Home");
  eq(await page.locator("#viewHome .author").getByText("Source", { exact: true }).count(), 0, "no Source link");
  await page.click('.tab[data-view="problems"]');
  await page.waitForSelector("#viewProblems .stat");
  eq(await page.locator("#sidebar").isVisible(), true, "sidebar on Problems");
  eq(await page.locator("#viewProblems .stat").count(), 3, "stat tiles");
  eq(await page.locator(".cat-row[data-cat]").count(), 7, "topic rows");
  await page.click('.cat-row[data-cat="strings"]');
  await page.waitForSelector("#viewProblems:not([hidden]) h1.title");
  if (!/^#p\d{3}$/.test(await page.evaluate(() => location.hash))) throw new Error("did not open a problem");
});

await check("sidebar shows the context of the current section", async () => {
  const visible = async (id) => (await page.locator(id).isVisible());
  await page.goto(base + "#cheatsheet");
  await page.waitForSelector(".cs-entry");
  eq([await visible("#ctxCheat"), await visible("#ctxProblems"), await visible("#ctxPlay")].join(), "true,false,false", "cheat sheet");
  await page.goto(base + "#playground");
  await page.waitForSelector("#pgRun");
  eq([await visible("#ctxCheat"), await visible("#ctxProblems"), await visible("#ctxPlay")].join(), "false,false,true", "playground");
  await page.goto(base + "#p001");
  await page.waitForSelector("#editorHost textarea");
  eq([await visible("#ctxCheat"), await visible("#ctxProblems"), await visible("#ctxPlay")].join(), "false,true,false", "problems");
  eq(await page.getAttribute('#plist button[data-id="p001"]', "aria-current"), "true", "current problem is highlighted");
});

await check("quick switcher: Ctrl+K opens, searches problems and cheat sheet, Enter navigates", async () => {
  await page.goto(base + "#home");
  await page.waitForSelector(".hero");
  await page.keyboard.press("Control+k");
  await page.waitForSelector("#qs:not([hidden])");
  await page.keyboard.type("palindrome");
  await page.waitForFunction(() => document.querySelectorAll(".qs-item").length >= 1);
  const first = await page.textContent(".qs-item .t");
  if (!/palindrome/i.test(first)) throw new Error("unexpected first result: " + first);
  await page.keyboard.press("Enter");
  await page.waitForSelector("#viewProblems:not([hidden]) h1.title");
  eq(await page.locator("#qs").isHidden(), true, "closed after Enter");
  // a cheat-sheet entry deep-links to its card
  await page.keyboard.press("/");
  await page.waitForSelector("#qs:not([hidden])");
  await page.keyboard.type("sorting");
  await page.waitForFunction(() => [...document.querySelectorAll(".qs-item .kind")].some((k) => k.textContent === "Cheat"));
  await page.click('.qs-item:has(.kind:text("Cheat"))');
  await page.waitForSelector(".cs-entry.flash, .cs-entry");
  if (!(await page.evaluate(() => location.hash)).startsWith("#cheatsheet/")) throw new Error("no deep link");
  await page.keyboard.press("Control+k");
  await page.waitForSelector("#qs:not([hidden])");
  await page.keyboard.press("Escape");
  eq(await page.locator("#qs").isHidden(), true, "Escape closes");
});

await check("cheat sheet deep link scrolls the entry into view", async () => {
  await page.goto(base + "#cheatsheet/sorting");
  await page.waitForSelector("#cs-sorting");
  const top = await page.evaluate(() => document.querySelector("#cs-sorting").getBoundingClientRect().top);
  if (top < 0 || top > 300) throw new Error("entry not scrolled into view, top=" + top);
});

await check("colour themes: picker switches the colour theme and it persists", async () => {
  await page.goto(base + "#home");
  await page.waitForSelector(".hero");
  await page.click("#paletteBtn");
  await page.waitForSelector("#palette:not([hidden])");
  await page.click('#palette [data-palette="ochin"]');
  eq(await page.getAttribute("html", "data-palette"), "ochin", "palette");
  eq(await page.locator("#palette [data-mode]").count(), 0, "no manual mode switch");
  await page.keyboard.press("Escape");
  eq(await page.locator("#palette").isHidden(), true, "Escape closes the picker");
  await page.reload();
  await page.waitForSelector(".hero");
  eq(await page.getAttribute("html", "data-palette"), "ochin", "palette persisted");
  await page.click("#paletteBtn");
  await page.click('#palette [data-palette="portfolio"]');
  await page.keyboard.press("Escape");
});

await check("colour themes: every palette is readable (WCAG AA) in light and dark", async () => {
  await page.goto(base + "#home");
  await page.waitForSelector(".hero");
  const failures = await page.evaluate(() => {
    const parse = (c) => { const m = c.trim().match(/^#([0-9a-f]{6})$/i); if (m) return { r: parseInt(m[1].slice(0, 2), 16), g: parseInt(m[1].slice(2, 4), 16), b: parseInt(m[1].slice(4, 6), 16), a: 1 };
      const v = c.match(/rgba?\(([^)]+)\)/)[1].split(",").map(Number); return { r: v[0], g: v[1], b: v[2], a: v[3] === undefined ? 1 : v[3] }; };
    const over = (fg, bg) => ({ r: fg.r * fg.a + bg.r * (1 - fg.a), g: fg.g * fg.a + bg.g * (1 - fg.a), b: fg.b * fg.a + bg.b * (1 - fg.a), a: 1 });
    const lum = ({ r, g, b }) => { const f = (x) => { x /= 255; return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
    const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
    const root = document.documentElement;
    const out = [];
    for (const pal of ["portfolio", "aubergine", "ochin", "monument", "hoth", "choco-mint", "sweet-treat"]) {
      for (const mode of ["light", "dark"]) {
        root.setAttribute("data-palette", pal); root.setAttribute("data-theme", mode);
        const v = (n) => parse(getComputedStyle(root).getPropertyValue(n));
        const bg = v("--bg"), topbg = v("--top-bg"), sidebg = v("--side-bg");
        const topField = over(v("--top-field"), topbg);
        const sideField = over(v("--side-field"), sidebg);
        const pairs = {
          "text on page": [v("--text"), bg, 4.5], "muted on page": [v("--muted"), bg, 4.5], "link on page": [v("--link"), bg, 4.5],
          "ok on ok-bg": [v("--ok"), v("--ok-bg"), 4.5], "bad on bad-bg": [v("--bad"), v("--bad-bg"), 4.5], "warn on warn-bg": [v("--warn"), v("--warn-bg"), 4.5],
          "primary button": [v("--on-btn"), v("--btn-bg"), 4.5], "primary button hover": [v("--on-btn"), v("--btn-hover"), 4.5],
          "sidebar text": [v("--side-text"), sidebg, 4.5], "sidebar muted": [over(v("--side-muted"), sidebg), sidebg, 4.5],
          "sidebar field": [over(v("--side-muted"), sideField), sideField, 4.5],
          "sidebar active": [v("--side-active-text"), v("--side-active-bg"), 4.5], "sidebar check mark": [v("--side-accent"), sidebg, 3],
          "top bar": [v("--top-text"), topbg, 4.5], "top search": [v("--top-text"), topField, 4.5],
          "language switch (selected)": [v("--seg-on-text"), v("--seg-on-bg"), 4.5],
          "quick switcher selection": [v("--sel-text"), v("--sel-bg"), 4.5],
        };
        for (const [name, [fg, b, min]] of Object.entries(pairs)) {
          const r = ratio(over(fg, b), b);
          if (r < min) out.push(`${pal}/${mode}: ${name} ${r.toFixed(2)} < ${min}`);
        }
      }
    }
    root.setAttribute("data-palette", "portfolio"); root.setAttribute("data-theme", "light");
    return out;
  });
  if (failures.length) throw new Error(failures.length + " contrast failures: " + failures.slice(0, 6).join(" | "));
});

await check("no horizontal overflow on any view from 320px to 412px", async () => {
  const bad = [];
  for (const w of [320, 360, 390, 412]) {
    await page.setViewportSize({ width: w, height: 800 });
    for (const hash of ["#home", "#p002", "#cheatsheet", "#playground"]) {
      await page.goto(base + hash);
      await page.waitForTimeout(250);
      const over = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      if (over > 0) bad.push(`${w}px ${hash} +${over}`);
    }
  }
  if (bad.length) throw new Error(bad.join(", "));
  await page.setViewportSize({ width: 1280, height: 900 });
});

await check("cheat sheet: SQL entry runs on Postgres, matches its documented output, shows for every language", async () => {
  await setLang("js");
  await page.goto(base + "#cheatsheet/group-by");
  const card = '.cs-entry[data-key="group-by"]';
  await page.waitForSelector(card);
  eq(await page.getAttribute(card, "data-lang"), "sql", "language of the block");
  await page.click(card + ' [data-act="run"]');
  await page.waitForSelector(card + " .summary.ok", { timeout: 120000 });
  await page.waitForSelector(card + " .sql-table");
  await page.click(card + ' [data-act="play"]');
  await page.waitForSelector("#tryHost textarea");
  if (!/GROUP BY status/.test(await page.inputValue("#tryHost textarea"))) throw new Error("example not loaded into the SQL try-it box");
  await page.goto(base + "#cheatsheet");
  await setLang("py");
});

await check("SQL: lists 50 patterns and opens one with 10 questions", async () => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(base + "#sql");
  await page.waitForSelector("#sqlList button");
  eq(await page.locator("#sqlList button[data-go]").count(), 51, "patterns + tables entry");
  eq(await page.isVisible("#langSeg"), false, "language switch hidden on the SQL tab");
  await page.click('#sqlList button[data-go="find-duplicate-rows"]');
  await page.waitForSelector("#q-p01-q10");
  eq(await page.locator("article.sq").count(), 10, "questions");
  eq(await page.locator("#q-p01-q1 .sq-answer pre").count(), 0, "solution hidden at first");
});

await check("SQL: a query runs on Postgres and shows a table; errors are reported", async () => {
  const q = "#q-p01-q1";
  await page.fill(q + " textarea", "SELECT 1 AS one, NULL AS nothing, 'x' AS txt");
  await page.click(q + " .run");
  await page.waitForSelector(q + " .sql-table", { timeout: 120000 });
  eq(await page.locator(q + " .sql-table th").allTextContents().then((a) => a.join(",")), "one,nothing,txt", "columns");
  eq(await page.locator(q + " .sql-table td.null").count(), 1, "NULL cell");
  await page.fill(q + " textarea", "SELEC 1");
  await page.click(q + " .run");
  await page.waitForSelector(q + " .sql-err");
  if (!/syntax error/i.test(await page.textContent(q + " .sql-err"))) throw new Error("no syntax error message");
});

await check("SQL: changes are rolled back (the data is the same on the next run)", async () => {
  const q = "#q-p01-q1";
  await page.fill(q + " textarea", "UPDATE employees SET salary = 1");
  await page.click(q + " .run");
  await page.waitForSelector(q + " .sql-ok");
  await page.fill(q + " textarea", "SELECT MIN(salary) AS lowest FROM employees");
  await page.click(q + " .run");
  await page.waitForSelector(q + " .sql-table");
  if ((await page.locator(q + " .sql-table td").first().textContent()).trim() === "1") throw new Error("UPDATE persisted");
});

await check("SQL: hint, approach and solution are revealed one step at a time; the solution runs", async () => {
  const q = "#q-p01-q1";
  await page.click(q + " .rv");
  await page.waitForSelector(q + " .sq-stage h4");
  eq(await page.locator(q + " .sq-answer pre").count(), 0, "no solution after the hint");
  await page.click(q + " .rv");
  eq(await page.locator(q + " .sq-answer pre").count(), 0, "no solution after the approach");
  await page.click(q + " .rv");
  await page.waitForSelector(q + " .sq-answer pre");
  await page.click(q + " .run-sol");
  await page.waitForSelector(q + " .sol-result .sql-table");
  await page.click(q + " .use");
  if (!/GROUP BY/.test(await page.inputValue(q + " textarea"))) throw new Error("Use as my query did not copy it");
});

await check("SQL: marking a question done updates the sidebar", async () => {
  await page.check("#q-p01-q1 .qdone");
  eq((await page.textContent('#sqlList button[data-go="find-duplicate-rows"] .count')).trim(), "1/10", "count");
  eq(await page.evaluate(() => JSON.parse(localStorage.getItem("qa.sql.done")).includes("p01-q1")), true, "persisted");
});

await check("SQL: bind-parameter questions show inputs and run with them", async () => {
  await page.goto(base + "#sql/" + (await page.evaluate(() => window.SQL_INDEX.patterns[4].slug)));
  await page.waitForSelector("article.sq input[data-p]");
  const q = "#q-p05-q8";
  await page.click(q + " .rv"); await page.click(q + " .rv"); await page.click(q + " .rv");
  await page.click(q + " .run-sol");
  await page.waitForSelector(q + " .sol-result .sql-table", { timeout: 60000 });
});

await check("SQL: tables page and quick search", async () => {
  await page.goto(base + "#sql/schema");
  await page.waitForSelector("#t-employees");
  await page.click('#t-employees .peek');
  await page.waitForSelector("#tryHost .sql-table");
  await page.keyboard.press("Control+k");
  await page.fill("#qsInput", "duplicate rows");
  if (!/Find Duplicate Rows/.test(await page.textContent("#qsList"))) throw new Error("SQL pattern not in quick search");
  await page.keyboard.press("Escape");
});

await check("editor: syntax highlighting overlay follows the text (SQL, Python) and stays aligned", async () => {
  await page.goto(base + "#sql/schema");
  await page.waitForSelector("#tryHost textarea");
  await page.fill("#tryHost textarea", "SELECT COUNT(*) -- note\nFROM employees WHERE name = 'x';");
  const kinds = await page.$$eval("#tryHost .ed-hl span", (els) => els.map((e) => e.className).join(" "));
  for (const k of ["tok-k", "tok-f", "tok-c", "tok-s"]) if (!kinds.includes(k)) throw new Error("missing " + k + " in " + kinds);
  const same = await page.evaluate(() => {
    const ta = document.querySelector("#tryHost textarea"), hl = document.querySelector("#tryHost .ed-hl");
    const a = ta.getBoundingClientRect(), b = hl.getBoundingClientRect();
    return Math.abs(a.left - b.left) < 1 && Math.abs(a.top - b.top) < 1 && Math.abs(a.width - b.width) < 1;
  });
  eq(same, true, "overlay aligned with the textarea");
  await page.goto(base + "#playground");
  await page.waitForSelector(".ed-hl [class^=tok-]", { state: "attached" });
});

await check("site title and author links (GitHub, LinkedIn)", async () => {
  await page.goto(base + "#home");
  await page.waitForSelector(".author");
  if (!/SDET Interview Playground/.test(await page.title())) throw new Error("title: " + await page.title());
  const hrefs = await page.$$eval(".author a", (a) => a.map((x) => x.href));
  if (!hrefs.includes("https://github.com/Vijay-puppala")) throw new Error("GitHub link missing");
  if (!hrefs.includes("https://www.linkedin.com/in/vijayanand-puppala/")) throw new Error("LinkedIn link missing");
  for (const u of ["https://vijayanand-puppala-data-portfolio.vercel.app/", "https://vijayanand-puppala-data-portfolio.lovable.app/"]) if (!hrefs.includes(u)) throw new Error("website missing " + u);
  if (!/Vijay-puppala/.test(await page.textContent(".author"))) throw new Error("author credit missing");
  if (!/Quality Engineering Manager/.test(await page.textContent(".author"))) throw new Error("author role missing");
});

await check("brand name top left, About pinned in the rail, About page", async () => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(base + "#p001");
  await page.waitForSelector("#brandName");
  eq((await page.textContent("#brandName .long")).trim(), "SDET Interview Playground", "brand text");
  const box = await page.locator("#brandName").boundingBox();
  if (box.x > 200 || box.y > 50) throw new Error("brand is not in the top-left corner " + JSON.stringify(box));
  eq(await page.locator("#sideCredit").count(), 0, "no author footer inside the sidebar any more");
  const rail = await page.locator(".rail-about").boundingBox();
  if (rail.y < 500) throw new Error("About is not pinned to the bottom of the rail: " + rail.y);
  await page.click(".rail-about");
  await page.waitForSelector("#viewAbout .author");
  if (!/Quality Engineering Manager/.test(await page.textContent("#viewAbout"))) throw new Error("About page content missing");
  await page.goto(base + "#cheatsheet");
  await page.click(".rail-about");
  await page.waitForSelector("#viewAbout .author");
});

await check("author section: brand logos and icons, no Source link", async () => {
  await page.goto(base + "#home");
  await page.waitForSelector("#viewHome .author .pillar");
  eq(await page.locator("#viewHome .author .pillar").count(), 9, "competency cards");
  eq(await page.locator("#viewHome .author .exp-card").count(), 0, "no detailed experience section");
  eq(await page.locator("#viewHome .author .job").count(), 3, "career entries");
  if (!/Hitachi Vantara India Pvt\. Ltd \(Pentaho\)/.test(await page.textContent("#viewHome .author .career")) || !/Jan 2022 – Present/.test(await page.textContent("#viewHome .author .career"))) throw new Error("career content missing");
  if (/Professional experience|Testing skills/i.test(await page.textContent("#viewHome .author"))) throw new Error("removed sections still shown");
  if (!/Titan Awards/.test(await page.textContent("#viewHome .author"))) throw new Error("awards missing");
  eq((await page.locator("#viewHome .author .tool svg path").count()) >= 18, true, "tool logos");
  if (/\bSource\b/.test(await page.textContent(".author"))) throw new Error("Source link still shown");
  await page.click('.quick a[href="#sql"]');
  await page.waitForSelector("#viewSql .hero, #viewSql .stats");
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
await page.emulateMedia({ colorScheme: "dark" });
await page.screenshot({ path: path.join(root, "build", "shot-problem-dark.png") });

await browser.close();
server.close();
console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
