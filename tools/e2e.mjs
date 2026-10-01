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
  eq(await page.locator(".cs-entry").count(), 111, "entries");
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
  await page.waitForFunction(() => document.querySelectorAll(".cs-entry").length === 111);
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

await check("home dashboard: hero, stats and progress by topic", async () => {
  await page.setViewportSize({ width: 1360, height: 860 });
  await page.goto(base + "#home");
  await page.waitForSelector(".hero");
  if (!(await page.textContent(".hero")).includes("Welcome back")) throw new Error("hero text missing");
  eq(await page.locator(".stat").count(), 4, "stat tiles");
  eq(await page.locator(".cat-row").count(), 7, "topic rows");
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

await check("colour themes: picker switches palette and mode, and both persist", async () => {
  await page.goto(base + "#home");
  await page.waitForSelector(".hero");
  await page.click("#paletteBtn");
  await page.waitForSelector("#palette:not([hidden])");
  await page.click('#palette [data-palette="ochin"]');
  eq(await page.getAttribute("html", "data-palette"), "ochin", "palette");
  await page.click('#palette [data-mode="dark"]');
  eq(await page.getAttribute("html", "data-theme"), "dark", "mode");
  await page.keyboard.press("Escape");
  eq(await page.locator("#palette").isHidden(), true, "Escape closes the picker");
  await page.reload();
  await page.waitForSelector(".hero");
  eq(await page.getAttribute("html", "data-palette"), "ochin", "palette persisted");
  eq(await page.getAttribute("html", "data-theme"), "dark", "mode persisted");
  await page.click("#paletteBtn");
  await page.click('#palette [data-palette="aubergine"]');
  await page.click('#palette [data-mode="light"]');
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
    for (const pal of ["aubergine", "ochin", "monument", "hoth", "choco-mint", "sweet-treat"]) {
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
    root.setAttribute("data-palette", "aubergine"); root.setAttribute("data-theme", "light");
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
