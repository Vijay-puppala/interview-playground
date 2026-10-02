---
name: run-interview-playground
description: Run, start, build, test, screenshot or drive the SDET Interview Playground (static site in web/ with Python, JavaScript, TypeScript and SQL runners that execute in the browser). Use when asked to run the app, see how a page looks, take a screenshot, check a change in the real UI, run the tests, or click through a flow (cheat sheet, SQL tab, problems, playground, About).
---

# Run and drive the SDET Interview Playground

A static, no-build-step site served from `web/` (vanilla JS). Python runs in Pyodide, TypeScript is transpiled in the browser, SQL runs on PGlite (PostgreSQL in WebAssembly), all inside Web Workers. **All paths are relative to the repo root.**

The agent path is a headless-Chromium driver that serves `web/` itself, answers the Pyodide / TypeScript / PGlite CDN requests from `node_modules`, so it needs **no internet**.

## Prerequisites

Node 22 with Playwright's Chromium (preinstalled in this container at `/opt/pw-browsers`, Playwright at `/opt/node-tools`), Python 3.

```bash
npm ci
```

## Run (agent path): the driver

```bash
node .claude/skills/run-interview-playground/driver.mjs <route> <out.png> [options]
```

`<route>` is the hash route without `#`: `home`, `problems`, `p001`, `cheatsheet`, `cheatsheet/group-by`, `sql`, `sql/schema`, `sql/<pattern-slug>`, `playground`, `about`.

Options: `--dark` (default) / `--light`, `--w 1280 --h 900` (phone: `--w 390 --h 800`), `--click SEL` and `--fill SEL=TEXT` (repeatable, in order), `--wait SEL`, `--scroll SEL`, `--text SEL` (print text), `--count SEL` (print match count). Screenshots land where you say (use `build/`, which is git-ignored). Exit code is 1 on failure or on any page / console error, and a failure screenshot is saved.

Examples that were run and work:

```bash
# home page: count the option cards, print the title
node .claude/skills/run-interview-playground/driver.mjs home build/home.png --count ".quick .qcard" --text ".hero h1"

# run a SQL cheat-sheet example on the in-browser Postgres and read the verdict
node .claude/skills/run-interview-playground/driver.mjs cheatsheet/group-by build/group-by.png \
  --wait ".cs-entry" --click '.cs-entry[data-key="group-by"] [data-act="run"]' \
  --wait '.cs-entry[data-key="group-by"] .summary.ok' --text '.cs-entry[data-key="group-by"] .summary'

# run a Python cheat-sheet example (first entry of the Basics section)
node .claude/skills/run-interview-playground/driver.mjs cheatsheet build/py.png --wait ".cs-entry" \
  --click '#csChips [data-sec="basics"]' --click '.cs-entry:first-of-type [data-act="run"]' \
  --wait '.cs-entry:first-of-type .summary' --text '.cs-entry:first-of-type .summary'

# phone layout, light mode
node .claude/skills/run-interview-playground/driver.mjs p001 build/phone.png --w 390 --h 800 --light --wait "#editorHost textarea"
```

**Always open the screenshot** (Read tool) and look at it. A blank page or error text means it did not work.

Useful selectors: `#csChips [data-sec="<section-slug>"]` (cheat-sheet section), `.cs-entry[data-key="<entry-title-slug>"]` with `[data-act="run"]`, `#sqlList button[data-go="<slug>"]`, `#q-p01-q1 .run` (SQL question run), `#runBtn` (problem run), `.tab[data-view="home|problems|cheatsheet|sql|playground|about"]` (left rail), `#langSeg [data-lang="py|js|ts"]`, `#paletteBtn`.

## Build

There is no bundler. Only the generated data needs rebuilding after content changes:

```bash
python3 tools/build_site.py
```

It writes `web/data/*` (problems, bundles, cheat sheet, SQL data) and must be deterministic: commit the result, CI checks `git diff --exit-code web/data`.

## Test

```bash
python3 -m pytest -q                                   # Python programs, pytest scenarios, SQL content, cheat-sheet format
npm run typecheck                                      # TypeScript solutions
python3 tools/export_cases.py && npm run test:ts       # TypeScript answers equal the Python ones
npm run test:cheatsheet                                # runnable Python / JS / TS cheat-sheet examples (Pyodide + Node)
npm run test:sql                                       # all SQL solutions + SQL cheat-sheet examples on PostgreSQL
CHROME=/opt/pw-browsers/chromium-1194/chrome-linux/chrome node tools/e2e.mjs   # full browser test, about 3 minutes
```

CI (`.github/workflows/ci.yml`) runs the same steps plus the generated-data check.

## Run (human path)

```bash
npm start
```

Serves `web/` on http://localhost:8000. Useless headless, and the Pyodide / PGlite runtimes then load from a CDN, so Python and SQL runs need internet. Use the driver instead.

## Gotchas

- **The runtimes are not served by the page.** The driver injects `window.RUNNER_URLS` (Pyodide, TypeScript, PGlite from `node_modules`). Without that, Python / SQL / TypeScript runs wait on a CDN and time out in this container. `tools/e2e.mjs` does the same.
- **First Python or SQL run is slow** (downloading and starting Pyodide / PGlite): use `--wait` with a result selector, not a fixed sleep. The default `--wait` timeout is 60 seconds.
- **Light / dark follows the operating system only** (no toggle). Use `--dark` / `--light`, which set the browser colour scheme.
- **Home and About have no left sidebar** by design; Problems, Cheats, SQL and Play do. `#sidebar` is hidden on Home.
- **The Pyodide and PGlite versions are pinned** (`0.26.4`, `0.5.8`) in `web/runner.js` and `package.json`; keep them in sync.
- **Remote branches cannot be deleted from this session** (the proxy returns 403); ask the user to delete merged branches on GitHub.
- Commit as the repo's configured user (Vijayanand Puppala / `Vijay-puppala`) and **do not add Claude co-author or session trailers**. Do not open a PR unless asked.

## Troubleshooting

- `page.waitForSelector: Timeout 60000ms exceeded` with a failure screenshot: open the screenshot. Usually a wrong selector, a route that does not exist (the site falls back to Home), or a section slug typo (`slug("Git & GitHub")` is `git-github`).
- e2e `FAIL` on an entry count after adding cheat-sheet entries: the totals are hard-coded in `tools/e2e.mjs` (twice) and `README.md`; update them.
