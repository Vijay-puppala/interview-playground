/* QA Interview Playground: UI logic (no framework, no build step). */
(function () {
  "use strict";
  const $ = (sel, el = document) => el.querySelector(sel);
  const $$ = (sel, el = document) => [...el.querySelectorAll(sel)];
  const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* storage unavailable */ } },
  };

  const LANGS = { py: "Python", js: "JavaScript", ts: "TypeScript" };
  const PROBLEMS = window.PROBLEMS;
  const BY_ID = Object.fromEntries(PROBLEMS.map((p) => [p.id, p]));
  const CATS = window.CATEGORIES;
  const CAT_LABEL = Object.fromEntries(CATS.map((c) => [c.id, c.label]));

  const state = {
    lang: LANGS[store.get("qa.lang", "py")] ? store.get("qa.lang", "py") : "py",
    view: "problems",
    current: null,
    category: "all",
    query: "",
    hideSolved: false,
    solved: new Set(store.get("qa.solved", [])),
    revealed: false,
    token: 0,
  };

  /* ------------------------------------------------------------- helpers */
  function pyRepr(v) {
    if (v === null) return "None";
    if (v === true) return "True";
    if (v === false) return "False";
    if (typeof v === "string") return JSON.stringify(v);
    if (Array.isArray(v)) return "[" + v.map(pyRepr).join(", ") + "]";
    if (typeof v === "object") return "{" + Object.entries(v).map(([k, x]) => JSON.stringify(k) + ": " + pyRepr(x)).join(", ") + "}";
    return String(v);
  }
  const repr = (v, lang) => (lang === "py" ? pyRepr(v) : JSON.stringify(v));
  const callText = (p, c, lang) => `${p.fn[lang] || p.fn.py}(${c.args.map((a) => repr(a, lang)).join(", ")})`;
  const effLang = (p) => (p.starter[state.lang] ? state.lang : "py");
  const ext = { py: "Python", js: "JavaScript", ts: "TypeScript" };

  function persistSolved() { store.set("qa.solved", [...state.solved]); }
  function markSolved(id) {
    if (state.solved.has(id)) return;
    state.solved.add(id);
    persistSolved();
    renderList();
    updateProgress();
  }

  /* ---------------------------------------------------------------- theme */
  function applyTheme(t) {
    document.documentElement.setAttribute("data-theme", t);
    store.set("qa.theme", t);
  }
  $("#themeBtn").addEventListener("click", () => {
    applyTheme(document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark");
  });

  /* ------------------------------------------------------------- language */
  function syncLangUi() {
    $$("#langSeg button").forEach((b) => b.setAttribute("aria-checked", String(b.dataset.lang === state.lang)));
  }
  $("#langSeg").addEventListener("click", (e) => {
    const b = e.target.closest("button[data-lang]");
    if (!b || b.dataset.lang === state.lang) return;
    state.lang = b.dataset.lang;
    store.set("qa.lang", state.lang);
    syncLangUi();
    render();
  });

  /* -------------------------------------------------------------- sidebar */
  function renderChips() {
    const all = [{ id: "all", label: "All", count: PROBLEMS.length }, ...CATS];
    $("#chips").innerHTML = all.map((c) =>
      `<button class="chip" data-cat="${c.id}" aria-pressed="${state.category === c.id}">${esc(c.label)} <span>${c.count}</span></button>`).join("");
  }
  $("#chips").addEventListener("click", (e) => {
    const b = e.target.closest("[data-cat]");
    if (!b) return;
    state.category = b.dataset.cat;
    renderChips();
    renderList();
  });
  $("#search").addEventListener("input", (e) => { state.query = e.target.value.trim().toLowerCase(); renderList(); });
  $("#hideSolved").addEventListener("change", (e) => { state.hideSolved = e.target.checked; renderList(); });

  function filtered() {
    return PROBLEMS.filter((p) => {
      if (state.category !== "all" && p.category !== state.category) return false;
      if (state.hideSolved && state.solved.has(p.id)) return false;
      if (!state.query) return true;
      return (p.title + " " + p.fn.py + " " + p.id + " " + (CAT_LABEL[p.category] || "")).toLowerCase().includes(state.query);
    });
  }
  function renderList() {
    const items = filtered();
    $("#plist").innerHTML = items.length
      ? items.map((p) => `<li><button data-id="${p.id}" ${p.id === state.current ? 'aria-current="true"' : ""}>
          <span class="num">${String(p.num).padStart(3, "0")}</span><span class="t">${esc(p.title)}</span>
          <span class="done" aria-label="${state.solved.has(p.id) ? "solved" : ""}">${state.solved.has(p.id) ? "✓" : ""}</span></button></li>`).join("")
      : `<li class="empty">No problems match.</li>`;
  }
  $("#plist").addEventListener("click", (e) => {
    const b = e.target.closest("button[data-id]");
    if (!b) return;
    location.hash = b.dataset.id;
    closeMenu();
  });
  function updateProgress() {
    const n = PROBLEMS.filter((p) => state.solved.has(p.id)).length;
    $("#progressBar").style.width = (100 * n / PROBLEMS.length) + "%";
    $("#progressText").textContent = `${n}/${PROBLEMS.length} solved`;
  }

  const menuBtn = $("#menuBtn");
  function closeMenu() { $("#sidebar").classList.remove("open"); $("#scrim").hidden = true; menuBtn.setAttribute("aria-expanded", "false"); }
  menuBtn.addEventListener("click", () => {
    const open = !$("#sidebar").classList.contains("open");
    $("#sidebar").classList.toggle("open", open);
    $("#scrim").hidden = !open;
    menuBtn.setAttribute("aria-expanded", String(open));
  });
  $("#scrim").addEventListener("click", closeMenu);

  /* --------------------------------------------------------------- editor */
  function createEditor(host, { value, lang, tall, onChange, onRun }) {
    host.innerHTML = `<div class="editor ${tall ? "tall" : ""}"><pre class="gutter" aria-hidden="true">1</pre>
      <textarea spellcheck="false" autocapitalize="off" autocomplete="off" aria-label="Code editor"></textarea></div>`;
    const ta = $("textarea", host);
    const gutter = $(".gutter", host);
    const indent = lang === "py" ? "    " : "  ";
    ta.value = value;
    const refresh = () => {
      const n = ta.value.split("\n").length;
      gutter.textContent = Array.from({ length: n }, (_, i) => i + 1).join("\n");
    };
    ta.addEventListener("scroll", () => { gutter.scrollTop = ta.scrollTop; });
    ta.addEventListener("input", () => { refresh(); onChange && onChange(ta.value); });
    ta.addEventListener("keydown", (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") { e.preventDefault(); onRun && onRun(); return; }
      const { selectionStart: s, selectionEnd: en, value: v } = ta;
      if (e.key === "Tab") {
        e.preventDefault();
        const lineStart = v.lastIndexOf("\n", s - 1) + 1;
        if (s !== en || e.shiftKey) {
          const block = v.slice(lineStart, en);
          const out = e.shiftKey ? block.replace(new RegExp("^( {1," + indent.length + "}|\\t)", "gm"), "") : block.replace(/^/gm, indent);
          ta.setRangeText(out, lineStart, en, "select");
        } else {
          ta.setRangeText(indent, s, en, "end");
        }
        ta.dispatchEvent(new Event("input"));
      } else if (e.key === "Enter" && s === en) {
        e.preventDefault();
        const line = v.slice(v.lastIndexOf("\n", s - 1) + 1, s);
        let pad = line.match(/^\s*/)[0];
        if (/[:{(\[]\s*$/.test(line)) pad += indent;
        ta.setRangeText("\n" + pad, s, en, "end");
        ta.dispatchEvent(new Event("input"));
      }
    });
    refresh();
    return { ta, get value() { return ta.value; }, set(v) { ta.value = v; refresh(); onChange && onChange(v); } };
  }

  /* ------------------------------------------------------- problems view */
  const view = { problems: $("#viewProblems"), cheatsheet: $("#viewCheatsheet"), playground: $("#viewPlayground") };

  function renderWelcome() {
    const done = PROBLEMS.filter((p) => state.solved.has(p.id)).length;
    view.problems.innerHTML = `
      <h1 class="title">QA Interview Playground</h1>
      <p class="muted">${PROBLEMS.length} interview problems for SDET and QA automation roles: strings, arrays, numbers, data structures,
      automation utilities, pandas / PySpark data checks and 50 pytest scenarios.</p>
      <div class="card"><div class="card-body">
        <ol>
          <li>Pick a problem on the left (or search by name).</li>
          <li>Choose <b>Python</b>, <b>JavaScript</b> or <b>TypeScript</b> at the top right.</li>
          <li>Write your solution and press <b>Run</b>: it is checked against the examples in your browser.</li>
          <li>Stuck? Press <b>Reveal solution</b> for the reference code and an explanation. It stays hidden until you ask.</li>
        </ol>
        <p>Want to experiment freely? Open the <a href="#playground">Playground</a> and run any program.</p>
        <div class="toolbar"><a class="btn primary" href="#p001" style="text-decoration:none">Start with problem 1</a>
        <span class="muted">${done} of ${PROBLEMS.length} solved so far</span></div>
      </div></div>`;
  }

  function renderProblem(p) {
    const lang = effLang(p);
    const fallback = lang !== state.lang;
    const idx = PROBLEMS.indexOf(p);
    const prev = PROBLEMS[idx - 1], next = PROBLEMS[idx + 1];
    const canRun = p.runnable[lang];
    const draftKey = `qa.code.${p.id}.${lang}`;
    const saved = store.get(draftKey, null);
    const examples = p.cases.length
      ? `<table class="examples"><thead><tr><th>Call</th><th>Expected</th></tr></thead><tbody>${p.cases.map((c) =>
        `<tr><td>${esc(callText(p, c, lang))}</td><td>${c.raises ? "raises an error" : esc(repr(c.expect, lang))}</td></tr>`).join("")}</tbody></table>`
      : p.demo[lang]
        ? `<p class="muted" style="margin-top:0">This one is a class / decorator, so it is checked with a short demo. Your code must make the demo print the expected output.</p>
           <pre class="code">${highlight(p.demo[lang].code, lang === "py" ? "py" : "js")}</pre>
           <p style="margin-bottom:0"><b>Expected output</b></p><pre class="code">${esc(p.demo[lang].expected)}</pre>`
        : `<p class="muted" style="margin:0">${p.kind === "scenario" ? "Write the pytest test (and any fixtures it needs) described in the title, then reveal the solution to compare." : "No automatic checker for this one. Write it, then compare with the reference solution."}</p>`;

    view.problems.innerHTML = `
      <div class="eyebrow"><span class="code-inline">#${String(p.num).padStart(3, "0")}</span>
        <span class="badge">${esc(CAT_LABEL[p.category])}</span>
        <span class="badge ${state.solved.has(p.id) ? "ok" : ""}" id="solvedBadge">${state.solved.has(p.id) ? "✓ Solved" : "Not solved"}</span></div>
      <h1 class="title">${esc(p.title)}</h1>
      <div class="fn-hint">${p.kind === "scenario" ? "Write a pytest test named" : p.kind === "class" ? "Implement" : "Implement"} <code>${esc(p.fn[lang])}</code> in ${ext[lang]}.</div>
      ${fallback ? `<div class="note">${esc(p.note || "This problem is Python-only.")} Showing the Python version.</div>` : ""}
      <div class="card"><div class="card-head">Examples</div><div class="card-body">${examples}</div></div>

      <div class="card"><div class="card-head">Your solution <span class="badge">${ext[lang]}</span>
        <span class="status" id="status"></span></div>
        <div class="card-body">
          <div id="editorHost"></div>
          <div class="toolbar" style="margin-top:10px">
            ${canRun ? `<button class="btn primary" id="runBtn">▶ Run <span class="muted" style="color:inherit;opacity:.75;font-size:12px">Ctrl+Enter</span></button>` : ""}
            <button class="btn" id="resetBtn">Reset</button>
            ${!canRun ? `<span class="muted">${p.kind === "scenario" ? `Run locally with <code>pytest -k s${String(p.num)}</code>` : "This one needs a Spark session, so run it locally with <code>pytest tests/test_data.py</code>"}.</span>` : ""}
            <label class="check" style="margin:0 0 0 auto"><input type="checkbox" id="manualSolved" ${state.solved.has(p.id) ? "checked" : ""}> Mark solved</label>
          </div>
        </div></div>

      <div class="card" id="resultCard" hidden><div class="card-head">Results</div><div class="card-body" id="results" aria-live="polite"></div></div>

      <div class="card" id="solutionCard">
        <div class="reveal" id="revealBox">
          <p>Give it a real attempt first. The reference solution and its explanation stay hidden until you ask.</p>
          <button class="btn primary" id="revealBtn">Reveal solution &amp; explanation</button>
        </div>
        <div id="solutionBody" hidden></div>
      </div>

      <div class="nav-row">
        ${prev ? `<a class="btn" href="#${prev.id}" style="text-decoration:none">← ${esc(prev.title.slice(0, 32))}</a>` : "<span></span>"}
        ${next ? `<a class="btn" href="#${next.id}" style="text-decoration:none">${esc(next.title.slice(0, 32))} →</a>` : ""}
      </div>`;

    const status = $("#status");
    Runner.setStatusHandler((t) => { status.textContent = t; });
    const editor = createEditor($("#editorHost"), {
      value: saved !== null ? saved : p.starter[lang], lang, tall: false,
      onChange: (v) => store.set(draftKey, v), onRun: () => canRun && run(),
    });
    $("#resetBtn").addEventListener("click", () => { store.set(draftKey, null); editor.set(p.starter[lang]); store.set(draftKey, null); });
    $("#manualSolved").addEventListener("change", (e) => {
      if (e.target.checked) markSolved(p.id); else { state.solved.delete(p.id); persistSolved(); renderList(); updateProgress(); }
      $("#solvedBadge").textContent = state.solved.has(p.id) ? "✓ Solved" : "Not solved";
      $("#solvedBadge").classList.toggle("ok", state.solved.has(p.id));
    });
    if (canRun) $("#runBtn").addEventListener("click", run);
    $("#revealBtn").addEventListener("click", () => revealSolution(p, lang));

    async function run() {
      const token = ++state.token;
      const btn = $("#runBtn");
      btn.disabled = true;
      status.textContent = "Starting…";
      const res = await Runner.run(jobFor(p, lang, editor.value, false), 10000);
      btn.disabled = false;
      status.textContent = "";
      if (token !== state.token) return;
      showResults(p, lang, res, "Your code", true);
    }
  }

  function jobFor(p, lang, code, reference) {
    const job = { lang, code };
    if (reference) {
      if (lang === "py") job.code = window.BUNDLES.py[p.bundle];
      else { job.lang = "js"; job.code = window.BUNDLES.js[p.jsBundle]; }
    }
    if (p.cases.length) {
      job.mode = "cases";
      job.fnName = reference ? p.ref[lang] : p.fn[lang];
      job.cases = p.cases;
    } else {
      job.mode = "demo";
      job.demo = p.demo[lang].code;
      if (reference) job.code += (lang === "py" ? `\n${p.fn.py} = ${p.ref.py}\n` : `\nconst ${p.fn.js} = ${p.ref.js};\n`);
    }
    return job;
  }

  function showResults(p, lang, res, label, countsAsAttempt) {
    const card = $("#resultCard");
    if (!card) return;
    card.hidden = false;
    $(".card-head", card).textContent = `Results · ${label}`;
    const box = $("#results");
    let html = "";
    let allOk = false;
    if (!res.ok || res.error) {
      html += `<div class="summary bad">${res.timeout ? "⏱ Time limit exceeded" : "✗ Error"}</div><pre class="console"><span class="err">${esc(res.error || "Unknown error")}</span></pre>`;
    } else if (res.results) {
      const passed = res.results.filter((r) => r.ok).length;
      allOk = passed === res.results.length;
      html += `<div class="summary ${allOk ? "ok" : "bad"}">${allOk ? "✓" : "✗"} ${passed}/${res.results.length} examples passed${res.ms ? ` <span class="muted" style="font-weight:400">· ${Math.round(res.ms)} ms</span>` : ""}</div>`;
      html += res.results.map((r, i) => {
        const c = p.cases[i];
        let detail = "";
        if (!r.ok) {
          detail = r.error ? `<div class="detail">${esc(r.error)}</div>` : `<div class="detail">expected ${esc(c.raises ? "an error" : repr(c.expect, lang))} · got ${esc(r.got === undefined ? "undefined" : lang === "py" ? pyRepr(JSON.parse(r.got)) : r.got)}</div>`;
        }
        return `<div class="case ${r.ok ? "ok" : "bad"}"><span class="mark">${r.ok ? "✓" : "✗"}</span><div>${esc(callText(p, c, lang))}${detail}</div></div>`;
      }).join("");
    } else {
      const expected = p.demo[lang] ? p.demo[lang].expected.trim() : null;
      const actual = (res.logs || "").trim();
      allOk = expected !== null && actual === expected;
      html += `<div class="summary ${allOk ? "ok" : "bad"}">${allOk ? "✓ Output matches the expected output" : "✗ Output differs from the expected output"}</div>`;
      if (!allOk && expected !== null) html += `<p class="muted">Expected:</p><pre class="console">${esc(expected)}</pre>`;
    }
    if (res.logs && res.logs.trim()) html += `<p class="muted" style="margin-bottom:4px">Console output</p><pre class="console">${esc(res.logs)}</pre>`;
    box.innerHTML = html;
    if (allOk && countsAsAttempt) {
      markSolved(p.id);
      const b = $("#solvedBadge");
      if (b) { b.textContent = "✓ Solved"; b.classList.add("ok"); }
      const m = $("#manualSolved");
      if (m) m.checked = true;
    }
  }

  function revealSolution(p, lang) {
    const body = $("#solutionBody");
    state.revealed = true;
    $("#revealBox").hidden = true;
    body.hidden = false;
    const code = p.solution[lang] || p.solution.py;
    const shownLang = p.solution[lang] ? lang : "py";
    const paragraphs = (p.explanation || "").split("\n\n").filter(Boolean);
    const canRunRef = p.runnable[shownLang] && (p.cases.length || p.demo[shownLang]);
    body.innerHTML = `
      <div class="card-head" style="border-radius:var(--radius) var(--radius) 0 0">Solution <span class="badge">${ext[shownLang]}</span>
        <span class="status"><button class="btn" id="copyBtn">Copy</button> <button class="btn" id="hideBtn">Hide</button></span></div>
      <div class="card-body">
        <pre class="code" id="solCode">${highlight(code, shownLang === "py" ? "py" : "js")}</pre>
        ${canRunRef ? `<div class="toolbar" style="margin-top:10px"><button class="btn" id="runRefBtn">▶ Run this solution</button></div>` : ""}
        <div class="explain">
          <h3>Explanation</h3>
          ${paragraphs.map((t) => `<p>${esc(t)}</p>`).join("") || "<p>See the code comments.</p>"}
          ${shownLang !== "py" ? `<p class="muted">The explanation is written against the Python reference; the ${ext[shownLang]} version follows the same approach.</p>` : ""}
        </div>
      </div>`;
    $("#hideBtn").addEventListener("click", () => { body.hidden = true; body.innerHTML = ""; $("#revealBox").hidden = false; state.revealed = false; });
    $("#copyBtn").addEventListener("click", async (e) => {
      try { await navigator.clipboard.writeText(code); e.target.textContent = "Copied"; } catch (err) { e.target.textContent = "Copy failed"; }
      setTimeout(() => { e.target.textContent = "Copy"; }, 1500);
    });
    const runRef = $("#runRefBtn");
    if (runRef) runRef.addEventListener("click", async () => {
      runRef.disabled = true;
      Runner.setStatusHandler((t) => { runRef.textContent = t; });
      const res = await Runner.run(jobFor(p, shownLang, "", true), 15000);
      runRef.disabled = false;
      runRef.textContent = "▶ Run this solution";
      showResults(p, shownLang, res, "Reference solution", false);
      $("#resultCard").scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
  }

  /* ---------------------------------------------------------- playground */
  function renderPlayground() {
    const lang = state.lang;
    const samples = window.SAMPLES[lang];
    const key = `qa.play.${lang}`;
    const savedCode = store.get(key, null);
    view.playground.innerHTML = `
      <h1 class="title">Playground</h1>
      <p class="muted" style="margin-top:0">Write and run any ${ext[lang]} program right in your browser. The language follows the selector at the top right.</p>
      <div class="card"><div class="card-head">${ext[lang]}
        <select id="sampleSel" aria-label="Load a sample">${samples.map((s, i) => `<option value="${i}">${esc(s.name)}</option>`).join("")}</select>
        <span class="status" id="pgStatus"></span></div>
        <div class="card-body">
          <div id="pgEditor"></div>
          ${lang === "py" ? `<details class="stdin"><summary>Input for <code>input()</code> (one line per call)</summary><textarea id="stdin" placeholder="Vijay"></textarea></details>` : ""}
          <div class="toolbar" style="margin-top:10px">
            <button class="btn primary" id="pgRun">▶ Run <span style="opacity:.75;font-size:12px">Ctrl+Enter</span></button>
            <button class="btn danger" id="pgStop" disabled>■ Stop</button>
            <button class="btn" id="pgClear">Clear output</button>
            <button class="btn" id="pgReset">Reset to sample</button>
          </div>
        </div></div>
      <div class="card"><div class="card-head">Output</div><div class="card-body"><pre class="console" id="pgOut" aria-live="polite"><span class="meta">Press Run to see the output here.</span></pre></div></div>`;

    const editor = createEditor($("#pgEditor"), {
      value: savedCode !== null ? savedCode : samples[0].code, lang, tall: true,
      onChange: (v) => store.set(key, v), onRun: run,
    });
    $("#sampleSel").addEventListener("change", (e) => editor.set(samples[Number(e.target.value)].code));
    $("#pgReset").addEventListener("click", () => { $("#sampleSel").value = "0"; editor.set(samples[0].code); });
    $("#pgClear").addEventListener("click", () => { $("#pgOut").innerHTML = ""; });
    const runBtn = $("#pgRun"), stopBtn = $("#pgStop"), status = $("#pgStatus"), out = $("#pgOut");
    runBtn.addEventListener("click", run);
    stopBtn.addEventListener("click", () => { Runner.stop(lang); status.textContent = "Stopped"; });
    Runner.setStatusHandler((t) => { status.textContent = t; });

    async function run() {
      if (runBtn.disabled) return;
      runBtn.disabled = true; stopBtn.disabled = false;
      out.innerHTML = "";
      const t0 = performance.now();
      const res = await Runner.run({ lang, mode: "free", code: editor.value, stdin: $("#stdin") ? $("#stdin").value : "" }, 20000);
      runBtn.disabled = false; stopBtn.disabled = true;
      status.textContent = "";
      let html = res.logs ? esc(res.logs) : "";
      if (res.logs && !res.logs.endsWith("\n")) html += "\n";
      if (res.error) html += `<span class="err">${esc(res.error)}</span>\n`;
      html += `<span class="meta">── ${res.error ? "failed" : "finished"} in ${Math.round(res.ms || performance.now() - t0)} ms</span>`;
      out.innerHTML = html;
    }
  }

  /* --------------------------------------------------------- cheat sheet */
  const CS = { section: store.get("qa.csSection", "all"), query: "" };
  const CS_DATA = window.CHEATSHEET || [];

  /** The code block to show for the current language; TypeScript falls back to the JavaScript block. */
  function csBlock(entry, lang) {
    if (entry.code[lang]) return { block: entry.code[lang], lang, fallback: false };
    return { block: entry.code.js, lang: "ts", fallback: true };   // JavaScript is valid TypeScript
  }
  const slug = (t) => t.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

  function renderCheatsheet() {
    const lang = state.lang;
    const sections = CS_DATA.map((sec) => ({ sec, entries: sec.entries.filter((e) => csMatches(e, lang)) }))
      .filter((x) => x.entries.length && (CS.section === "all" || slug(x.sec.title) === CS.section));
    const total = CS_DATA.reduce((n, s) => n + s.entries.length, 0);
    const shown = sections.reduce((n, x) => n + x.entries.length, 0);

    view.cheatsheet.innerHTML = `
      <h1 class="title">Cheat sheet <span class="badge">${ext[lang]}</span></h1>
      <p class="muted" style="margin-top:0">Concepts and methods with working examples, side by side for ${ext[lang]}.
        Switch the language at the top right. Press <b>Run</b> to execute an example in your browser.</p>
      <div class="cs-bar">
        <input id="csSearch" type="search" placeholder="Search ${total} entries… (try “sort”, “regex”, “async”)" aria-label="Search the cheat sheet" value="${esc(CS.query)}" autocomplete="off">
        <div class="chips" id="csChips" role="group" aria-label="Sections">
          <button class="chip" data-sec="all" aria-pressed="${CS.section === "all"}">All <span>${total}</span></button>
          ${CS_DATA.map((s) => `<button class="chip" data-sec="${slug(s.title)}" aria-pressed="${CS.section === slug(s.title)}">${esc(s.title)} <span>${s.entries.length}</span></button>`).join("")}
        </div>
      </div>
      <div class="muted" id="csCount" style="margin:10px 0 0">${shown} of ${total} entries</div>
      <div id="csBody">${sections.length ? sections.map(({ sec, entries }) => `
        <h2 class="cs-section" id="sec-${slug(sec.title)}">${esc(sec.title)}</h2>
        ${entries.map((e) => csCard(e, lang)).join("")}`).join("") : `<div class="card"><div class="card-body muted">Nothing matches “${esc(CS.query)}”.</div></div>`}
      </div>`;

    $("#csSearch").addEventListener("input", (e) => {
      CS.query = e.target.value.trim().toLowerCase();
      const pos = e.target.selectionStart;
      renderCheatsheet();
      const box = $("#csSearch");
      box.focus();
      box.setSelectionRange(pos, pos);
    });
    $("#csChips").addEventListener("click", (e) => {
      const b = e.target.closest("[data-sec]");
      if (!b) return;
      CS.section = b.dataset.sec;
      store.set("qa.csSection", CS.section);
      renderCheatsheet();
    });
    view.cheatsheet.onclick = csClick;
  }

  function csMatches(entry, lang) {
    if (!CS.query) return true;
    const { block } = csBlock(entry, lang);
    return (entry.title + " " + entry.desc + " " + entry.notes.join(" ") + " " + block.code).toLowerCase().includes(CS.query);
  }

  function csCard(entry, lang) {
    const { block, lang: codeLang, fallback } = csBlock(entry, lang);
    const key = slug(entry.title);
    const hl = highlight(block.code, codeLang === "py" ? "py" : "js");
    return `<article class="card cs-entry" data-key="${key}" data-lang="${codeLang}">
      <div class="card-head"><h3>${esc(entry.title)}</h3>
        <span class="status">${fallback ? '<span class="badge" title="No TypeScript-specific version: the JavaScript code is valid TypeScript">same as JavaScript</span> ' : ""}${block.run ? "" : '<span class="badge" title="Needs Node.js, a network, or a real browser, so it cannot run on this page">view only</span>'}</span></div>
      <div class="card-body">
        ${entry.desc ? `<p style="margin-top:0">${esc(entry.desc)}</p>` : ""}
        <pre class="code">${hl}</pre>
        ${block.out.length ? `<div class="cs-out-label muted">Output</div><pre class="code cs-expected">${esc(block.out.join("\n"))}</pre>` : ""}
        ${entry.notes.map((n) => `<div class="note">${esc(n)}</div>`).join("")}
        <div class="toolbar" style="margin-top:10px">
          ${block.run ? `<button class="btn primary" data-act="run">▶ Run</button>` : ""}
          <button class="btn" data-act="copy">Copy</button>
          ${block.run ? `<button class="btn" data-act="play">Open in Playground</button>` : ""}
        </div>
        <div class="cs-result" hidden></div>
      </div>
    </article>`;
  }

  function csFind(card) {
    const entry = CS_DATA.flatMap((s) => s.entries).find((e) => slug(e.title) === card.dataset.key);
    const { block } = csBlock(entry, state.lang);
    return { block, lang: card.dataset.lang };
  }

  async function csClick(ev) {
    const btn = ev.target.closest("[data-act]");
    if (!btn) return;
    const card = btn.closest(".cs-entry");
    const { block, lang } = csFind(card);
    if (btn.dataset.act === "copy") {
      try { await navigator.clipboard.writeText(block.code); btn.textContent = "Copied"; } catch (e) { btn.textContent = "Copy failed"; }
      setTimeout(() => { btn.textContent = "Copy"; }, 1500);
    } else if (btn.dataset.act === "play") {
      store.set(`qa.play.${state.lang}`, block.code);
      location.hash = "playground";
    } else if (btn.dataset.act === "run") {
      const box = $(".cs-result", card);
      btn.disabled = true;
      box.hidden = false;
      box.innerHTML = '<pre class="console"><span class="meta">Running…</span></pre>';
      Runner.setStatusHandler((t) => { box.innerHTML = `<pre class="console"><span class="meta">${esc(t)}</span></pre>`; });
      const res = await Runner.run({ lang, mode: "free", code: block.code }, 15000);
      btn.disabled = false;
      const actual = (res.logs || "").replace(/\n+$/, "");
      const expected = block.out.join("\n");
      let verdict = "";
      if (res.error) verdict = `<div class="summary bad">${res.timeout ? "⏱ Time limit exceeded" : "✗ Error"}</div>`;
      else if (block.out.length) verdict = actual === expected
        ? '<div class="summary ok">✓ Output matches</div>'
        : '<div class="summary bad">✗ Output differs from the documented output</div>';
      box.innerHTML = `${verdict}<pre class="console">${esc(actual)}${res.error ? `<span class="err">${actual ? "\n" : ""}${esc(res.error)}</span>` : ""}</pre>`;
    }
  }

  /* ---------------------------------------------------------------- router */
  function render() {
    syncLangUi();
    $$(".tab").forEach((t) => t.setAttribute("aria-selected", String(t.dataset.view === state.view)));
    view.problems.hidden = state.view !== "problems";
    view.cheatsheet.hidden = state.view !== "cheatsheet";
    view.playground.hidden = state.view !== "playground";
    $(".layout").classList.toggle("no-side", state.view !== "problems");
    document.body.dataset.view = state.view;
    state.revealed = false;
    if (state.view === "playground") {
      document.title = "Playground · QA Interview Playground";
      renderPlayground();
    } else if (state.view === "cheatsheet") {
      document.title = "Cheat sheet · QA Interview Playground";
      renderCheatsheet();
    } else if (state.current && BY_ID[state.current]) {
      const p = BY_ID[state.current];
      document.title = `${p.title} · QA Interview Playground`;
      renderProblem(p);
    } else {
      document.title = "QA Interview Playground";
      renderWelcome();
    }
    renderList();
    $("#main").scrollTop = 0;
  }
  function route() {
    const h = location.hash.replace(/^#/, "");
    if (h === "playground") { state.view = "playground"; }
    else if (h === "cheatsheet") { state.view = "cheatsheet"; }
    else { state.view = "problems"; state.current = BY_ID[h] ? h : null; }
    state.token++;
    closeMenu();
    render();
  }
  $$(".tab").forEach((t) => t.addEventListener("click", () => {
    if (t.dataset.view === "playground" || t.dataset.view === "cheatsheet") location.hash = t.dataset.view;
    else location.hash = state.current || "";
    if (t.dataset.view === "problems" && !state.current) route();
  }));
  $("#brand").addEventListener("click", (e) => { e.preventDefault(); state.current = null; history.replaceState(null, "", location.pathname); route(); });
  window.addEventListener("hashchange", route);

  renderChips();
  updateProgress();
  route();
})();
