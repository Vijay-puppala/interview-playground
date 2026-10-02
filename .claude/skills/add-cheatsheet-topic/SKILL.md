---
name: add-cheatsheet-topic
description: Add a new topic (for example "Redis", "Ansible", "OAuth", "GraphQL", "Selenium") to the SDET Interview Playground as cheat-sheet sections, with brand icons, tests, README update, a feature branch, a PR and a merge on green CI. Use when the user says "add <topic>", "add <topic> topics/cheat sheet", or asks for new concepts, commands or examples to be added to the site.
---

# Add a topic to the SDET Interview Playground

The playground's content is plain text in `content/cheatsheet/*.txt`; a build step turns it into `web/data/cheatsheet.js`. A topic is one or more **sections**, each a list of **entries**. Paths are relative to the repo root. To run or screenshot the site, use the `run-interview-playground` skill.

## 1. Choose the shape of each entry

| Block | Use for | Runs in the browser? | Needs `=>` output? |
|---|---|---|---|
| `@txt` | concepts, definitions, checklists, regulations | no (badge "concept") | no |
| `@cli` | shell, YAML, HCL, JSON, Jenkinsfile, Mongo shell: anything needing a real tool | no (badge "copy & run locally") | no |
| `@sql` | SQL on the sample database (tables in `content/sql/schema.sql`) | yes, PostgreSQL in the browser | yes (generated) |
| `@py` + `@js` (+ optional `@ts`) | language recipes that run with the standard library | yes, Pyodide / native JS | yes (generated) |
| `@sql!`, `@py!`, `@js!` | shown but never run (needs roles, network, etc.) | no | no |

`@txt`, `@cli` and `@sql` entries are shown for every language; every other entry needs both `@py` and `@js`. Pick **runnable** blocks wherever they can honestly run (SQL and code recipes), `@cli` for tool commands, `@txt` for theory. A good topic mixes them: a concepts section, a commands section, a testing / troubleshooting section, and (where it fits) runnable examples.

## 2. Write the content

Create `content/cheatsheet/NN_<topic>.txt` (next free number; files merge by section title):

```
@@ Redis                       <- section title (the sidebar and heading text)
@@@ Strings and expiry         <- entry title (unique across the whole cheat sheet)
One or two sentences describing it.
@cli
SET session:42 "abc" EX 3600
TTL session:42
! A highlighted gotcha note (a line starting with "! ").
```

Rules learned the hard way:

- **Entry titles must be unique across all files** (a test enforces it). Prefix when generic ("MongoDB indexes and explain", not "Indexes").
- Section title decides the **icon** (step 4) and appears in the sidebar; keep it short (`Data governance · Concepts` style works; long names are truncated with an ellipsis).
- Lines starting with `! ` are notes, `=>` lines are expected output, and any other line starting with `@` inside a block ends it (a `@Library(...)` line inside a `@cli` block is fine; inside `@sql` / `@py` / `@js` it would end the block).
- Non-runnable blocks (`@cli`, `@txt`, `@x!`) must not have `=>` lines (the parser raises).
- Content for tools you cannot run here (Docker, AWS, Kafka, Jenkins...) is written from knowledge: keep commands conventional and accurate, and **say so in the PR**.
- Never include real credentials, real phone numbers or private data. Test card / SSN values must be the well-known fake ones.

## 3. Generate and review expected output (runnable blocks only)

```bash
node tools/check_sql.mjs --fill-cheatsheet                                  # @sql blocks, run on PostgreSQL
python3 .claude/skills/add-cheatsheet-topic/fill_pyjs.py content/cheatsheet/NN_<topic>.txt   # @py / @js blocks
git diff content/cheatsheet/NN_<topic>.txt                                   # READ the outputs: do they make sense?
```

Both are idempotent (re-running on a filled file changes nothing). If a query returns nothing interesting on the sample data, change the query, not the data.

## 4. Register the topic in the UI

- **Icon**: add the section prefix to `SEC_ICON` in `web/app.js` (`["Redis", "redis"]`, matched with `startsWith`). Add the brand to `tools/build_icons.mjs` (a simple-icons slug with its brand colour; AWS, Azure, C#, LinkedIn and SQL Server are not in simple-icons, use the `@mdi/js` list), then regenerate:

```bash
rm -rf /tmp/ic && mkdir -p /tmp/ic && cd /tmp/ic && npm pack simple-icons @mdi/js && for f in *.tgz; do mkdir -p ${f%.tgz} && tar xzf $f -C ${f%.tgz}; done
cd - && node tools/build_icons.mjs /tmp/ic
```

- **Highlighting**: `@cli` is coloured by `web/hl.js` (`CLI_TOOLS` = command names, `CLI_KW` = config keywords). Add the topic's CLI names there so they get the function colour.
- **Counts**: update the hard-coded entry total in `tools/e2e.mjs` (two places: `.count()` and `.length ===`) and in `README.md` (the Cheat sheet row). Get the number from `python3 tools/cheatsheet.py`.

## 5. Add tests

- In `tests/test_cheatsheet.py` add a test that the new section(s) exist with a sensible number of entries (copy `test_mongodb_kafka_jenkins_sections_exist`).
- In `tools/e2e.mjs` add a check next to the existing "cheat sheet: MongoDB, Kafka and Jenkins sections" one: open `#cheatsheet`, click `#csChips [data-sec="<slug>"]`, assert the entries render, there is no Run button for `@cli` / `@txt`, highlighting exists, and (for runnable entries) that Run shows "Output matches".

## 6. Verify

```bash
python3 tools/cheatsheet.py                       # parses; prints the new totals
python3 tools/build_site.py                       # regenerate web/data
for s in 3 11; do PYTHONHASHSEED=$s python3 tools/build_site.py >/dev/null; done; git status --short web/data   # must show only your intended changes (determinism)
python3 -m pytest -q
python3 tools/cheatsheet.py --json >/dev/null && node tools/check_cheatsheet.mjs
python3 tools/sqlcontent.py --json >/dev/null && node tools/check_sql.mjs
CHROME=/opt/pw-browsers/chromium-1194/chrome-linux/chrome node tools/e2e.mjs
```

Then **look at the result**: screenshot the new section (and one runnable entry) with the driver from `run-interview-playground`, e.g. `node .claude/skills/run-interview-playground/driver.mjs cheatsheet build/topic.png --click '#csChips [data-sec="<slug>"]' --wait ".cs-entry"` and open the PNG.

## 7. Ship it

Repo conventions from the user (follow them):

- Work on a **feature branch** off the latest `main`: `git fetch -q origin +refs/heads/main:refs/remotes/o/main && git checkout -q -B feature/<topic> o/main`.
- Commit as the configured user (Vijayanand Puppala / `Vijay-puppala`); **no Claude co-author or session trailers, no model names** in commits or PR text.
- `git push -u origin feature/<topic>`. **Do not open a PR until asked**; when the user says yes, create it with the GitHub MCP tool (`mcp__github__create_pull_request`, base `main`): a summary of the entries, the new block types if any, the note that tool commands were not run against real services, and a test plan with the real numbers.
- If asked to watch / merge: subscribe with `mcp__claude-code-remote__subscribe_pr_activity`, **merge only when the `test` check is green** (`mcp__github__pull_request_read` with `get_check_runs`), then `mcp__github__merge_pull_request` (merge commit). If CI fails, fix and push; never skip a test.
- The proxy blocks deleting remote branches (HTTP 403): after merging, tell the user the merged branch can be deleted on GitHub.
- Keep the final report short and honest: what was added, counts, what was verified, what was not (commands not run against real services).

## Beyond cheat sheets

Other kinds of content have their own recipes in `README.md` ("Adding a problem", "SQL content"): new interview problems go in `playground/*.py` plus `content/ts/*.ts`; new SQL practice patterns go in `content/sql/patterns/pNN.txt`. Ask the user which kind they want if "topic" is ambiguous; the default for "add <technology> topics" is cheat-sheet sections.
