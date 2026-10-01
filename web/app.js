/* QA Interview Playground: UI logic (no framework, no build step). */
(function () {
  "use strict";
  const $ = (sel, el = document) => el.querySelector(sel);
  const $$ = (sel, el = document) => [...el.querySelectorAll(sel)];
  const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const pad3 = (n) => String(n).padStart(3, "0");

  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* storage unavailable */ } },
  };

  const LANGS = { py: "Python", js: "JavaScript", ts: "TypeScript" };
  const ext = LANGS;
  const PROBLEMS = window.PROBLEMS;
  const BY_ID = Object.fromEntries(PROBLEMS.map((p) => [p.id, p]));
  const CATS = window.CATEGORIES;
  const CAT_LABEL = Object.fromEntries(CATS.map((c) => [c.id, c.label]));

  const state = {
    lang: LANGS[store.get("qa.lang", "py")] ? store.get("qa.lang", "py") : "py",
    view: "home",
    current: null,
    category: "all",
    query: "",
    hideSolved: false,
    solved: new Set(store.get("qa.solved", [])),
    revealed: false,
    token: 0,
  };

  let sqlTab = null;   // created once the helpers below exist
  const view = { home: $("#viewHome"), problems: $("#viewProblems"), cheatsheet: $("#viewCheatsheet"), sql: $("#viewSql"), playground: $("#viewPlayground") };

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

  function persistSolved() { store.set("qa.solved", [...state.solved]); }
  function markSolved(id) {
    if (state.solved.has(id)) return;
    state.solved.add(id);
    persistSolved();
    store.set("qa.recent", [id, ...store.get("qa.recent", []).filter((x) => x !== id)].slice(0, 8));
    renderList();
    updateProgress();
  }

  /* ------------------------------------------------- mode + colour theme */
  const PALETTES = [
    { id: "aubergine", name: "Aubergine", top: "#350d36", side: "#3f0e40", btn: "#007a5a" },
    { id: "ochin", name: "Ochin", top: "#263341", side: "#303e4d", btn: "#2f6da3" },
    { id: "monument", name: "Monument", top: "#085b5f", side: "#0b6f73", btn: "#f79f66" },
    { id: "hoth", name: "Hoth", top: "#ececf1", side: "#f8f8fa", btn: "#1264a3" },
    { id: "choco-mint", name: "Choco Mint", top: "#43372c", side: "#544538", btn: "#5db09b" },
    { id: "sweet-treat", name: "Sweet Treat", top: "#5b1f47", side: "#6e2a58", btn: "#f4c24a" },
  ];
  const mql = window.matchMedia ? window.matchMedia("(prefers-color-scheme: dark)") : { matches: false };
  const root = document.documentElement;
  const getMode = () => { const m = store.get("qa.theme", "system"); return m === "light" || m === "dark" ? m : "system"; };
  const getPalette = () => (PALETTES.some((p) => p.id === store.get("qa.palette")) ? store.get("qa.palette") : "aubergine");
  const resolveMode = (m) => (m === "system" ? (mql.matches ? "dark" : "light") : m);

  function applyMode(m) {
    store.set("qa.theme", m);
    root.setAttribute("data-theme", resolveMode(m));
    syncPalettePanel();
  }
  function applyPalette(id) {
    store.set("qa.palette", id);
    root.setAttribute("data-palette", id);
    syncPalettePanel();
  }
  if (mql.addEventListener) mql.addEventListener("change", () => { if (getMode() === "system") applyMode("system"); });
  $("#themeBtn").addEventListener("click", () => applyMode(root.getAttribute("data-theme") === "dark" ? "light" : "dark"));

  const palette = $("#palette");
  palette.innerHTML = `
    <h3>Mode</h3>
    <div class="mode" role="radiogroup" aria-label="Mode">
      ${["light", "dark", "system"].map((m) => `<button role="radio" data-mode="${m}">${m[0].toUpperCase() + m.slice(1)}</button>`).join("")}
    </div>
    <h3>Colour theme</h3>
    <div class="pal-grid" role="radiogroup" aria-label="Colour theme">
      ${PALETTES.map((p) => `<button class="pal" role="radio" data-palette="${p.id}" style="--p-top:${p.top};--p-side:${p.side};--p-btn:${p.btn}">
        <span class="sw"><i></i><i></i><i></i></span>${esc(p.name)}</button>`).join("")}
    </div>`;
  function syncPalettePanel() {
    $$("[data-mode]", palette).forEach((b) => b.setAttribute("aria-checked", String(b.dataset.mode === getMode())));
    $$("[data-palette]", palette).forEach((b) => b.setAttribute("aria-checked", String(b.dataset.palette === getPalette())));
  }
  palette.addEventListener("click", (e) => {
    const m = e.target.closest("[data-mode]");
    const p = e.target.closest("[data-palette]");
    if (m) applyMode(m.dataset.mode);
    if (p) applyPalette(p.dataset.palette);
  });
  const paletteBtn = $("#paletteBtn");
  function setPalette(open) {
    palette.hidden = !open;
    paletteBtn.setAttribute("aria-expanded", String(open));
    if (open) syncPalettePanel();
  }
  paletteBtn.addEventListener("click", (e) => { e.stopPropagation(); setPalette(palette.hidden); });
  document.addEventListener("click", (e) => { if (!palette.hidden && !e.target.closest(".pop-wrap")) setPalette(false); });
  syncPalettePanel();

  /* ------------------------------------------------------------- language */
  function syncLangUi() {
    $$("#langSeg button").forEach((b) => b.setAttribute("aria-checked", String(b.dataset.lang === state.lang)));
  }
  function setLang(l) {
    if (l === state.lang) return;
    state.lang = l;
    store.set("qa.lang", l);
    render();
  }
  $("#langSeg").addEventListener("click", (e) => {
    const b = e.target.closest("button[data-lang]");
    if (b) setLang(b.dataset.lang);
  });

  /* -------------------------------------------------- sidebar: problems */
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
    const grouped = state.category === "all" && !state.query;
    let html = "";
    let last = null;
    for (const p of items) {
      if (grouped && p.category !== last) { last = p.category; html += `<li class="grp">${esc(CAT_LABEL[p.category])}</li>`; }
      const solved = state.solved.has(p.id);
      html += `<li><button data-id="${p.id}" class="${solved ? "" : "unsolved"}" ${p.id === state.current ? 'aria-current="true"' : ""}>
        <span class="num">${pad3(p.num)}</span><span class="t">${esc(p.title)}</span>
        <span class="done" aria-label="${solved ? "solved" : ""}">${solved ? "✓" : ""}</span></button></li>`;
    }
    $("#plist").innerHTML = html || `<li class="empty">No problems match.</li>`;
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

  /* ------------------------------------------------------------ home view */
  const ICONS = {
    book: '<svg viewBox="0 0 24 24" width="22" height="22"><path d="M6 3h12a1 1 0 011 1v17l-7-4-7 4V4a1 1 0 011-1z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>',
    term: '<svg viewBox="0 0 24 24" width="22" height="22"><rect x="3" y="4" width="18" height="16" rx="2.5" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M7 10l3 2.5L7 15M12.5 15H17" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    table: '<svg viewBox="0 0 24 24" width="22" height="22"><rect x="3" y="4" width="18" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M3 10h18M9 10v10" stroke="currentColor" stroke-width="1.8"/></svg>',
    flask: '<svg viewBox="0 0 24 24" width="22" height="22"><path d="M9 3h6M10 3v6L4.5 19a1.5 1.5 0 001.3 2.2h12.4a1.5 1.5 0 001.3-2.2L14 9V3" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>',
  };

  function firstOf(catId) {
    const all = PROBLEMS.filter((p) => p.category === catId);
    return all.find((p) => !state.solved.has(p.id)) || all[0];
  }

  function renderHome() {
    const total = PROBLEMS.length;
    const solvedN = PROBLEMS.filter((p) => state.solved.has(p.id)).length;
    const last = BY_ID[store.get("qa.last", null)];
    const csEntries = (window.CHEATSHEET || []).reduce((n, s) => n + s.entries.length, 0);
    const recent = store.get("qa.recent", []).filter((id) => BY_ID[id]).slice(0, 5);
    const rows = CATS.map((c) => {
      const all = PROBLEMS.filter((p) => p.category === c.id);
      return { c, n: all.length, s: all.filter((p) => state.solved.has(p.id)).length };
    });
    view.home.innerHTML = `
      <section class="hero">
        <h1>Welcome back</h1>
        <p>${total} interview problems, a ${csEntries}-entry cheat sheet and an in-browser playground for SDET and QA engineers,
        in Python, JavaScript and TypeScript. Pick up where you left off, or jump straight to anything with <kbd>Ctrl</kbd> <kbd>K</kbd>.</p>
        <div class="toolbar">
          ${last ? `<a class="btn primary" href="#${last.id}">Continue: ${esc(last.title)}</a>` : `<a class="btn primary" href="#p001">Start with problem 1</a>`}
          <a class="btn" href="#cheatsheet">Cheat sheet</a>
          <a class="btn" href="#playground">Playground</a>
        </div>
      </section>

      <div class="stats">
        <div class="stat"><b>${solvedN}<small class="muted" style="font-size:16px;font-weight:700"> / ${total}</small></b><span>Problems solved</span></div>
        <div class="stat"><b>${Math.round((100 * solvedN) / total)}%</b><span>Complete</span></div>
        <div class="stat"><b>${csEntries}</b><span>Cheat-sheet entries</span></div>
        <div class="stat"><b>3</b><span>Languages: Python, JavaScript, TypeScript</span></div>
      </div>

      <div class="h2row"><h2>Progress by topic</h2><span class="muted">Click a topic to continue it</span></div>
      <div>${rows.map(({ c, n, s }) => `<button class="cat-row" data-cat="${c.id}"><span><b>${esc(c.label)}</b></span>
        <span class="bar"><i style="width:${(100 * s) / n}%"></i></span><span class="n">${s} / ${n}</span></button>`).join("")}</div>

      <div class="h2row"><h2>Jump in</h2></div>
      <div class="quick">
        <a class="qcard" href="#cheatsheet"><span class="ic">${ICONS.book}</span><div><b>Cheat sheet</b><span>${csEntries} concepts and methods with runnable examples</span></div></a>
        <a class="qcard" href="#playground"><span class="ic">${ICONS.term}</span><div><b>Playground</b><span>Run any Python, JavaScript or TypeScript program</span></div></a>
        <a class="qcard" href="#${firstOf("data").id}"><span class="ic">${ICONS.table}</span><div><b>pandas &amp; PySpark</b><span>Data-validation problems for SDETs</span></div></a>
        <a class="qcard" href="#${firstOf("pytest").id}"><span class="ic">${ICONS.flask}</span><div><b>pytest scenarios</b><span>Fixtures, parametrize, mocking, page objects</span></div></a>
      </div>

      ${recent.length ? `<div class="h2row"><h2>Recently solved</h2></div><div class="recent">${recent.map((id) => {
        const p = BY_ID[id];
        return `<a href="#${p.id}"><span class="num">${pad3(p.num)}</span><span>${esc(p.title)}</span><span class="ok">✓</span></a>`;
      }).join("")}</div>` : ""}`;

    $$(".cat-row", view.home).forEach((b) => b.addEventListener("click", () => {
      state.category = b.dataset.cat;
      renderChips();
      location.hash = firstOf(b.dataset.cat).id;
    }));
  }

  /* ------------------------------------------------------- problems view */
  function renderProblem(p) {
    store.set("qa.last", p.id);
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
      <div class="eyebrow"><span class="code-inline">#${pad3(p.num)}</span>
        <span class="badge">${esc(CAT_LABEL[p.category])}</span>
        <span class="badge ${state.solved.has(p.id) ? "ok" : ""}" id="solvedBadge">${state.solved.has(p.id) ? "✓ Solved" : "Not solved"}</span>
        <span>Problem ${idx + 1} of ${PROBLEMS.length}</span></div>
      <h1 class="title">${esc(p.title)}</h1>
      <div class="fn-hint">${p.kind === "scenario" ? "Write a pytest test named" : "Implement"} <code>${esc(p.fn[lang])}</code> in ${ext[lang]}.</div>
      ${fallback ? `<div class="note">${esc(p.note || "This problem is Python-only.")} Showing the Python version.</div>` : ""}
      <div class="card"><div class="card-head">Examples</div><div class="card-body">${examples}</div></div>

      <div class="card"><div class="card-head">Your solution <span class="badge">${ext[lang]}</span>
        <span class="status" id="status"></span></div>
        <div class="card-body">
          <div id="editorHost"></div>
          <div class="toolbar" style="margin-top:10px">
            ${canRun ? `<button class="btn primary" id="runBtn">▶ Run <kbd>Ctrl Enter</kbd></button>` : ""}
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
        ${prev ? `<a class="btn" href="#${prev.id}">← ${esc(prev.title.slice(0, 32))}</a>` : "<span></span>"}
        ${next ? `<a class="btn" href="#${next.id}">${esc(next.title.slice(0, 32))} →</a>` : ""}
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
  let pgEditor = null;
  function renderPlayground() {
    const lang = state.lang;
    const samples = window.SAMPLES[lang];
    const key = `qa.play.${lang}`;
    const savedCode = store.get(key, null);
    view.playground.innerHTML = `
      <h1 class="title">Playground</h1>
      <p class="muted" style="margin-top:0">Write and run any ${ext[lang]} program right in your browser. The language follows the selector at the top right; starter programs are in the list on the left.</p>
      <div class="card"><div class="card-head">${ext[lang]}<span class="status" id="pgStatus"></span></div>
        <div class="card-body">
          <div id="pgEditor"></div>
          ${lang === "py" ? `<details class="stdin"><summary>Input for <code>input()</code> (one line per call)</summary><textarea id="stdin" placeholder="Vijay"></textarea></details>` : ""}
          <div class="toolbar" style="margin-top:10px">
            <button class="btn primary" id="pgRun">▶ Run <kbd>Ctrl Enter</kbd></button>
            <button class="btn danger" id="pgStop" disabled>■ Stop</button>
            <button class="btn" id="pgClear">Clear output</button>
            <button class="btn" id="pgReset">Reset to sample</button>
          </div>
        </div></div>
      <div class="card"><div class="card-head">Output</div><div class="card-body"><pre class="console" id="pgOut" aria-live="polite"><span class="meta">Press Run to see the output here.</span></pre></div></div>`;

    const editor = pgEditor = createEditor($("#pgEditor"), {
      value: savedCode !== null ? savedCode : samples[0].code, lang, tall: true,
      onChange: (v) => store.set(key, v), onRun: run,
    });
    $("#sampleList").innerHTML = samples.map((s, i) => `<li><button data-i="${i}"><span class="t">${esc(s.name)}</span></button></li>`).join("");
    $("#pgReset").addEventListener("click", () => editor.set(samples[0].code));
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
  $("#sampleList").addEventListener("click", (e) => {
    const b = e.target.closest("button[data-i]");
    if (!b || !pgEditor) return;
    pgEditor.set(window.SAMPLES[state.lang][Number(b.dataset.i)].code);
    closeMenu();
  });

  /* ------------------------------------------------------------ cheat sheet */
  const CS = { section: store.get("qa.csSection", "all"), query: "" };
  const CS_DATA = window.CHEATSHEET || [];

  /** The code block to show for the current language; TypeScript falls back to the JavaScript block. */
  function csBlock(entry, lang) {
    if (entry.code.sql) return { block: entry.code.sql, lang: "sql", fallback: false };   // SQL entries are shown for every language
    if (entry.code[lang]) return { block: entry.code[lang], lang, fallback: false };
    return { block: entry.code.js, lang: "ts", fallback: true };   // JavaScript is valid TypeScript
  }
  const slug = (t) => t.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

  function csMatches(entry, lang) {
    if (!CS.query) return true;
    const { block } = csBlock(entry, lang);
    return (entry.title + " " + entry.desc + " " + entry.notes.join(" ") + " " + block.code).toLowerCase().includes(CS.query);
  }

  function renderCheatSide() {
    const lang = state.lang;
    const total = CS_DATA.reduce((n, s) => n + s.entries.length, 0);
    const counts = CS_DATA.map((s) => s.entries.filter((e) => csMatches(e, lang)).length);
    const shown = counts.reduce((a, b) => a + b, 0);
    $("#csChips").innerHTML = `<li><button data-sec="all" ${CS.section === "all" ? 'aria-current="true"' : ""}><span class="t">All sections</span><span class="count">${shown}</span></button></li>`
      + CS_DATA.map((s, i) => `<li><button data-sec="${slug(s.title)}" ${CS.section === slug(s.title) ? 'aria-current="true"' : ""}><span class="t">${esc(s.title)}</span><span class="count">${counts[i]}</span></button></li>`).join("");
    $("#sideSub").textContent = CS.query ? `${shown} of ${total}` : `${total} entries`;
  }

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
      <div class="muted" id="csCount">${shown} of ${total} entries</div>
      <div id="csBody">${sections.length ? sections.map(({ sec, entries }) => `
        <h2 class="cs-section" id="sec-${slug(sec.title)}">${esc(sec.title)}</h2>
        ${entries.map((e) => csCard(e, lang)).join("")}`).join("") : `<div class="card"><div class="card-body muted">Nothing matches “${esc(CS.query)}”.</div></div>`}
      </div>`;
    view.cheatsheet.onclick = csClick;
    renderCheatSide();
  }

  function csCard(entry, lang) {
    const { block, lang: codeLang, fallback } = csBlock(entry, lang);
    const key = slug(entry.title);
    const hl = highlight(block.code, codeLang === "py" ? "py" : codeLang === "sql" ? "sql" : "js");
    return `<article class="card cs-entry" data-key="${key}" data-lang="${codeLang}" id="cs-${key}">
      <div class="card-head"><h3>${esc(entry.title)}</h3>
        <span class="status">${codeLang === "sql" ? '<span class="badge" title="Runs on PostgreSQL in your browser">PostgreSQL</span> ' : ""}${fallback ? '<span class="badge" title="No TypeScript-specific version: the JavaScript code is valid TypeScript">same as JavaScript</span> ' : ""}${block.run ? "" : '<span class="badge" title="${codeLang === "sql" ? "Needs a statement the sandbox cannot run (or output that depends on the data size)" : "Needs Node.js, a network, or a real browser"}, so it cannot run on this page">view only</span>'}</span></div>
      <div class="card-body">
        ${entry.desc ? `<p style="margin-top:0">${esc(entry.desc)}</p>` : ""}
        <pre class="code">${hl}</pre>
        ${block.out.length ? `<div class="cs-out-label">Output</div><pre class="code cs-expected">${esc(block.out.join("\n"))}</pre>` : ""}
        ${entry.notes.map((n) => `<div class="note">${esc(n)}</div>`).join("")}
        <div class="toolbar" style="margin-top:10px">
          ${block.run ? `<button class="btn primary" data-act="run">▶ Run</button>` : ""}
          <button class="btn" data-act="copy">Copy</button>
          ${block.run ? `<button class="btn" data-act="play">${codeLang === "sql" ? "Try it in the SQL tab" : "Open in Playground"}</button>` : ""}
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
      if (lang === "sql") { store.set("qa.sql.try", block.code); location.hash = "sql/schema"; return; }
      store.set(`qa.play.${state.lang}`, block.code);
      location.hash = "playground";
    } else if (btn.dataset.act === "run") {
      const box = $(".cs-result", card);
      btn.disabled = true;
      box.hidden = false;
      box.innerHTML = '<pre class="console"><span class="meta">Running…</span></pre>';
      Runner.setStatusHandler((t) => { box.innerHTML = `<pre class="console"><span class="meta">${esc(t)}</span></pre>`; });
      if (lang === "sql") {
        try { await sqlTab.ensureSetup(); } catch (e) { /* reported by the run below */ }
        const sres = await Runner.sql(block.code, 20000);
        btn.disabled = false;
        const ok = sres.ok && sqlTab.resultText(sres) === block.out.join("\n");
        const verdict = !sres.ok ? '<div class="summary bad">✗ Error</div>' : block.out.length
          ? (ok ? '<div class="summary ok">✓ Output matches</div>' : '<div class="summary bad">✗ Output differs from the documented output</div>') : "";
        box.innerHTML = verdict + sqlTab.resultHtml(sres);
        return;
      }
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

  $("#csSearch").addEventListener("input", (e) => {
    CS.query = e.target.value.trim().toLowerCase();
    if (state.view === "cheatsheet") renderCheatsheet();
  });
  $("#csChips").addEventListener("click", (e) => {
    const b = e.target.closest("[data-sec]");
    if (!b) return;
    CS.section = b.dataset.sec;
    store.set("qa.csSection", CS.section);
    renderCheatsheet();
    closeMenu();
    $("#main").scrollTop = 0;
  });

  /* --------------------------------------------------------- quick switcher */
  const QS = { items: [], sel: 0, index: null };
  const qs = $("#qs"), qsInput = $("#qsInput"), qsList = $("#qsList");

  function qsIndex() {
    if (QS.index) return QS.index;
    const pages = [
      { kind: "Page", title: "Home", sub: "Dashboard and progress", go: "#home" },
      { kind: "Page", title: "Cheat sheet", sub: "Concepts and methods with examples", go: "#cheatsheet" },
      { kind: "Page", title: "SQL practice", sub: "50 patterns on a real Postgres in your browser", go: "#sql" },
      { kind: "Page", title: "Playground", sub: "Run any program in your browser", go: "#playground" },
    ];
    const commands = [
      { kind: "Command", title: "Toggle dark mode", sub: "Switch between light and dark", run: () => applyMode(root.getAttribute("data-theme") === "dark" ? "light" : "dark") },
      { kind: "Command", title: "Choose a colour theme", sub: "Aubergine, Ochin, Monument, Hoth…", run: () => setPalette(true) },
      ...Object.entries(LANGS).map(([k, v]) => ({ kind: "Command", title: `Use ${v}`, sub: "Switch the language", run: () => setLang(k) })),
    ];
    const problems = PROBLEMS.map((p) => ({ kind: "Problem", title: p.title, sub: `#${pad3(p.num)} · ${CAT_LABEL[p.category]}`, go: `#${p.id}`, hay: `${p.title} ${p.fn.py} ${pad3(p.num)} ${CAT_LABEL[p.category]}` }));
    const sqls = window.SQL_INDEX.patterns.map((p) => ({ kind: "SQL", title: p.title, sub: `SQL #${pad3(p.num).slice(1)} · ${p.category}`, go: `#sql/${p.slug}`, hay: `sql ${p.title} ${p.concept} ${p.category} ${p.tagline}` }));
    const cheats = CS_DATA.flatMap((s) => s.entries.map((e) => ({ kind: "Cheat", title: e.title, sub: `Cheat sheet · ${s.title}`, go: `#cheatsheet/${slug(e.title)}`, hay: `${e.title} ${s.title} ${e.desc}` })));
    QS.index = [...pages, ...commands, ...problems, ...sqls, ...cheats].map((it) => ({ ...it, hay: (it.hay || it.title + " " + it.sub).toLowerCase() }));
    return QS.index;
  }
  function qsSearch(q) {
    const all = qsIndex();
    const tokens = q.toLowerCase().split(/\s+/).filter(Boolean);
    if (!tokens.length) return all.filter((i) => i.kind === "Page" || i.kind === "Command").slice(0, 9);
    const out = [];
    for (const it of all) {
      if (!tokens.every((t) => it.hay.includes(t))) continue;
      const title = it.title.toLowerCase();
      const score = tokens.reduce((s, t) => s + (title.startsWith(t) ? 0 : title.includes(t) ? 1 : 2), 0) + (it.kind === "Problem" ? 0.2 : 0);
      out.push({ it, score });
    }
    return out.sort((a, b) => a.score - b.score || a.it.title.length - b.it.title.length).slice(0, 12).map((x) => x.it);
  }
  function qsRender() {
    QS.items = qsSearch(qsInput.value);
    QS.sel = 0;
    qsList.innerHTML = QS.items.length
      ? QS.items.map((it, i) => `<li class="qs-item" id="qs-${i}" role="option" data-i="${i}" aria-selected="${i === 0}"><span class="kind">${esc(it.kind)}</span><span><span class="t">${esc(it.title)}</span><span class="s">${esc(it.sub)}</span></span></li>`).join("")
      : `<li class="qs-empty">Nothing found. Try “sort”, “regex” or a problem number.</li>`;
  }
  function qsMove(d) {
    if (!QS.items.length) return;
    QS.sel = (QS.sel + d + QS.items.length) % QS.items.length;
    $$(".qs-item", qsList).forEach((el, i) => el.setAttribute("aria-selected", String(i === QS.sel)));
    const el = $(`#qs-${QS.sel}`);
    if (el) { el.scrollIntoView({ block: "nearest" }); qsInput.setAttribute("aria-activedescendant", el.id); }
  }
  function qsOpen() { setPalette(false); qs.hidden = false; qsInput.value = ""; qsRender(); qsInput.focus(); }
  function qsClose() { qs.hidden = true; }
  function qsGo(it) {
    if (!it) return;
    qsClose();
    if (it.run) it.run(); else location.hash = it.go;
  }
  $("#quickBtn").addEventListener("click", qsOpen);
  qsInput.addEventListener("input", qsRender);
  qsInput.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown") { e.preventDefault(); qsMove(1); }
    else if (e.key === "ArrowUp") { e.preventDefault(); qsMove(-1); }
    else if (e.key === "Enter") { e.preventDefault(); qsGo(QS.items[QS.sel]); }
  });
  qsList.addEventListener("click", (e) => { const li = e.target.closest(".qs-item"); if (li) qsGo(QS.items[Number(li.dataset.i)]); });
  qsList.addEventListener("mousemove", (e) => {
    const li = e.target.closest(".qs-item");
    if (li && Number(li.dataset.i) !== QS.sel) { QS.sel = Number(li.dataset.i); $$(".qs-item", qsList).forEach((el, i) => el.setAttribute("aria-selected", String(i === QS.sel))); }
  });
  qs.addEventListener("mousedown", (e) => { if (e.target === qs) qsClose(); });
  document.addEventListener("keydown", (e) => {
    const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName);
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); qs.hidden ? qsOpen() : qsClose(); }
    else if (e.key === "/" && !typing && qs.hidden) { e.preventDefault(); qsOpen(); }
    else if (e.key === "Escape") { if (!qs.hidden) qsClose(); else if (!palette.hidden) setPalette(false); }
  });

  /* ---------------------------------------------------------------- router */
  const SIDE = { home: ["Problems", "Problems"], problems: ["Problems", "Problems"], cheatsheet: ["Cheat", "Cheat sheet"], sql: ["Sql", "SQL practice"], playground: ["Play", "Playground"] };
  const TAB_FOR = { home: "home", problems: "problems", cheatsheet: "cheatsheet", sql: "sql", playground: "playground" };

  function render() {
    syncLangUi();
    document.body.dataset.view = state.view;
    $$(".tab").forEach((t) => {
      const on = t.dataset.view === TAB_FOR[state.view];
      t.setAttribute("aria-selected", String(on));
      if (on) t.setAttribute("aria-current", "page"); else t.removeAttribute("aria-current");
    });
    Object.entries(view).forEach(([k, el]) => { el.hidden = k !== state.view; });
    const [ctx, title] = SIDE[state.view];
    ["Problems", "Cheat", "Sql", "Play"].forEach((c) => { $("#ctx" + c).hidden = c !== ctx; });
    $("#sideTitle").textContent = title;
    state.revealed = false;

    if (state.view === "playground") {
      document.title = "Playground · QA Interview Playground";
      $("#sideSub").textContent = ext[state.lang];
      renderPlayground();
    } else if (state.view === "sql") {
      $("#sideSub").textContent = `${sqlTab.IDX.patterns.length} patterns`;
      sqlTab.render(view.sql, state.sqlTail);
    } else if (state.view === "cheatsheet") {
      document.title = "Cheat sheet · QA Interview Playground";
      renderCheatsheet();
    } else if (state.view === "problems" && state.current && BY_ID[state.current]) {
      const p = BY_ID[state.current];
      document.title = `${p.title} · QA Interview Playground`;
      $("#sideSub").textContent = `${PROBLEMS.length} problems`;
      renderProblem(p);
    } else {
      document.title = "QA Interview Playground";
      $("#sideSub").textContent = `${PROBLEMS.length} problems`;
      renderHome();
    }
    renderList();
    $("#main").scrollTop = 0;
  }

  function route() {
    const [head, tail] = location.hash.replace(/^#/, "").split("/");
    if (head === "playground") state.view = "playground";
    else if (head === "cheatsheet") state.view = "cheatsheet";
    else if (head === "sql") { state.view = "sql"; state.sqlTail = tail || null; }
    else if (BY_ID[head]) { state.view = "problems"; state.current = head; }
    else { state.view = "home"; state.current = null; }
    state.token++;
    closeMenu();
    if (state.view === "cheatsheet" && tail) { CS.section = "all"; CS.query = ""; $("#csSearch").value = ""; }
    render();
    if (state.view === "cheatsheet" && tail) {
      const card = $(`#cs-${tail}`);
      if (card) { card.scrollIntoView({ block: "start" }); card.classList.add("flash"); }
    }
  }

  $$(".tab").forEach((t) => t.addEventListener("click", () => {
    const v = t.dataset.view;
    location.hash = v === "problems" ? (state.current || store.get("qa.last", "p001")) : v;
  }));
  $("#brand").addEventListener("click", (e) => { e.preventDefault(); location.hash = "home"; if (state.view === "home") route(); });
  window.addEventListener("hashchange", route);

  sqlTab = window.SqlTab({ $, $$, esc, store, createEditor, closeMenu, Runner });
  renderChips();
  updateProgress();
  route();
})();
