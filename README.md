# QA Interview Playground

**330 interview programs for SDET / QA automation roles, in Python, JavaScript and TypeScript, with an in-browser playground.**
Strings, arrays, numbers, data structures, automation utilities, pandas / PySpark data checks and 50 pytest scenarios, each with a hidden
solution and an explanation you reveal only when you ask for it.

| | |
|---|---|
| Slack-style layout | Icon rail, a sidebar that follows the section you are in (problems, cheat-sheet sections, playground starters), and a top bar with search. On phones the rail becomes a bottom bar and the sidebar a drawer |
| Colour themes | Six Slack-inspired themes (Aubergine, Ochin, Monument, Hoth, Choco Mint, Sweet Treat), each in light and dark, plus *System* mode. Pick them from the palette button; all combinations are tested for WCAG AA contrast |
| Quick search | **Ctrl+K** (or `/`) jumps to any problem, cheat-sheet entry or page, and runs commands such as *Toggle dark mode* or *Use TypeScript* |
| Dashboard | A home page with your progress overall and by topic, a *Continue* button and your recently solved problems |
| Language switch | Python · JavaScript · TypeScript (header, top right) |
| Solve in the browser | Write code, press **Run**, get checked against the examples (Python via [Pyodide](https://pyodide.org), JS natively, TS transpiled in the browser) |
| Solution on demand | **Reveal solution & explanation** keeps the answer hidden until clicked; includes *Run this solution* |
| Cheat sheet | 111 concepts and methods with examples side by side in Python, JavaScript and TypeScript: strings, lists, dicts, functions, classes, errors, regex, dates, async, typing, testing and SDET automation. Search, copy, **Run** each example, or open it in the Playground |
| Playground | Run any program in any of the three languages; opens with a `Hello, Vijay!` starter; Python `input()` supported; **Stop** button for runaway loops |
| Progress | Solved problems are remembered in your browser (`localStorage`) |
| Static site | No backend: deploys to Vercel as plain files |

## What is inside

| Category | Problems | Where | Examples |
|---|---|---|---|
| Strings | 001-060 | `playground/strings.py` | palindrome, anagram, compression, atoi, Levenshtein |
| Arrays | 061-120 | `playground/arrays.py` | two sum, three sum, Kadane, sliding window, sorting algorithms |
| Numbers & Math | 121-160 | `playground/numbers.py` | primes, gcd, Armstrong, bit tricks, number to words |
| DSA | 161-200 | `playground/algorithms.py` | linked list, trees, graphs, DP, LRU cache, trie |
| SDET / Automation | 201-250 | `playground/sdet.py` | log parsing, JSON diff, retry / wait_until, test matrices, versions, sharding |
| Data (pandas & PySpark) | 301-330 | `playground/data.py` | null checks, dedupe, joins, window functions, DataFrame diff |
| pytest Scenarios | 251-300 | `pytest_scenarios/` | fixtures, parametrize, marks, monkeypatch, mocking, page objects |

Problems 301-330 are Python-only (pandas / PySpark), and the pytest scenarios are Python-only too. In the JS / TS tabs those show the Python version
with a note. The full list is in [`docs/INDEX.md`](docs/INDEX.md).

## Run it locally

```bash
# 1. the site (needs only Python or any static server)
npm start                    # serves web/ at http://localhost:8000
# or: python3 -m http.server 8000 --directory web
```

Running Python in the page downloads Pyodide (about 10 MB, cached afterwards) from the jsDelivr CDN on first use, and pandas / numpy
on the first run of code that imports them. TypeScript loads the compiler lazily the same way. Browsing problems and running JavaScript need no network at all.

### The Python programs and pytest scenarios

```bash
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt      # pytest, pandas, numpy, pyspark, requests, jsonschema, faker, selenium, playwright...
pytest -q                            # 250 programs (409 examples) + 50 scenarios + pandas + PySpark
```

PySpark needs a Java runtime (JDK 11+). If `pyspark` is not installed, `tests/test_data.py` is skipped.

Useful pytest commands for the scenarios:

```bash
pytest pytest_scenarios -v                 # all 50 scenarios
pytest -k s261                             # one scenario
pytest -m smoke                            # by marker (registered in pytest.ini)
pytest -m "regression and not slow"
pytest -n auto                             # parallel (pytest-xdist)
pytest --html=report.html --self-contained-html
pytest --cov=playground
```

### TypeScript and JavaScript

```bash
npm install
npm run typecheck      # strict type-check of content/ts/*.ts
npm run test:ts        # every Python example is run against the TypeScript solution (408 checks)
npm run test:cheatsheet  # runs every cheat-sheet example in Node, TypeScript and Pyodide and checks its output
npm run test:e2e       # drives the real site in headless Chromium (needs Playwright)
```

## How it is organised

```
playground/        Python solutions. One function per program: pNNN_name, with @case(...) examples and a docstring
                   (first line = title, the rest = the explanation shown on the site)
pytest_scenarios/  50 pytest scenarios (test_sNNN_...) plus a small system under test (sut.py) and conftest.py
content/ts/        TypeScript solutions. JavaScript is generated from these by stripping types at build time
content/demos.py   Short runnable demos for classes / decorators (MinStack, retry, ...)
content/cheatsheet/ The cheat sheet, as plain text (see "Adding a cheat-sheet entry")
tests/             Runs every @case example, plus tests for classes, decorators and PySpark
tools/             build_site.py (generates web/data), export_cases.py, check_ts.mjs, cheatsheet.py, check_cheatsheet.mjs, e2e.mjs
web/               The static site that Vercel serves (index.html, app.js, runner.js, styles.css, ...)
web/fonts/         Lato (SIL Open Font License, see LICENSE-Lato-OFL.txt), self-hosted so no font CDN is needed
web/data/          GENERATED: problems.js, bundles.js and cheatsheet.js. Commit these; Vercel does not run Python
```

One source of truth: the Python `@case` examples are exported to JSON, and the same examples check the Python, TypeScript and JavaScript solutions.

### Adding a problem

1. Add a function to the right `playground/*.py` module, named with the next free number, with `@case(...)` examples and a docstring.
2. Add the matching TypeScript function to `content/ts/<same category>.ts`, under a `// ---- pNNN_camelCaseName` marker.
3. Run:

```bash
pytest -q && npm run typecheck && python tools/export_cases.py && npm run test:ts
python tools/build_site.py        # regenerates web/data and docs/INDEX.md
```

### Adding a cheat-sheet entry

Entries live in `content/cheatsheet/*.txt` as plain text, so code needs no escaping:

```
@@ Strings                          <- section
@@@ Split, join and strip           <- entry title
Break text into pieces and glue it back together.     <- description
! A gotcha shown in a highlighted note.
@py                                 <- Python block (also @js, and optional @ts)
parts = [p.strip() for p in " a, b ".split(",")]
print(parts)
=> ['a', 'b']                       <- one expected output line per "=>" line
@js
console.log(JSON.stringify(" a, b ".split(",").map((p) => p.trim())));
=> ["a","b"]
@js!                                <- trailing "!" = shown but never run (needs Node, network, a browser)
```

Every entry needs a `@py` and a `@js` block; `@ts` is optional (the site falls back to the JavaScript code).
Runnable blocks must print exactly their `=>` output: `pytest` checks the Python ones in CPython and
`npm run test:cheatsheet` checks Python (in Pyodide, the browser runtime), JavaScript and TypeScript. Then run `python tools/build_site.py`.

## Deploy to Vercel

The site is plain static files, so there is nothing to build.

1. Push this repository to GitHub.
2. In Vercel choose **Add New... > Project**, import the repository.
3. Leave **Framework Preset** as *Other*. `vercel.json` already sets the output directory to `web` and skips install / build.
4. Click **Deploy**. Every push to `main` deploys to production, and every other branch gets a preview URL.

If you keep this project inside a larger repository, set **Root Directory** to the folder that contains `vercel.json`.

## Limits worth knowing

- **Pyodide runs Python in the browser**, so only the standard library plus Pyodide's bundled packages (pandas, numpy, ...) are available. `requests`,
  Selenium, Playwright and PySpark are not; the PySpark problems (321-330) show reference code and run locally with `pytest tests/test_data.py`.
- In the browser runner `asyncio.run(main())` is adapted so ordinary async scripts work (the browser cannot block); top-level `await` also works.
- Code runs in a Web Worker with a time limit (10 s for problems, 20 s in the Playground), and can be stopped.
- The explanations are written against the Python reference; the JS / TS versions follow the same approach.
- The `pyodide` and `typescript` versions are pinned (`0.26.4`, `5.4.5`) in `web/runner.js` and `package.json`; keep them in sync if you upgrade.
