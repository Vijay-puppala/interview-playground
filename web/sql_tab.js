/* SQL tab: 50 patterns x 10 questions, run on PostgreSQL (PGlite) in the browser.
 * Loaded before app.js, which calls window.SqlTab(deps) once its helpers exist.
 *   data/sql_index.js      pattern list + schema (loaded up front)
 *   data/sql/pNN.js        one pattern (theory, pitfalls, questions), loaded when the page opens
 *   data/sql_setup.js      schema + seed script, loaded before the first query runs
 */
window.SqlTab = function (deps) {
  const { $, $$, esc, store, createEditor, closeMenu } = deps;
  const IDX = window.SQL_INDEX;
  const BY_SLUG = Object.fromEntries(IDX.patterns.map((p) => [p.slug, p]));
  const allQuestionIds = IDX.patterns.flatMap((p) => p.questions.map((q) => q.id));
  const done = new Set(store.get("qa.sql.done", []));
  const S = { query: "", slug: null, token: 0 };
  const two = (n) => String(n).padStart(2, "0");

  /* ------------------------------------------------------------ helpers */
  const scripts = {};
  function loadScript(src) {
    if (!scripts[src]) {
      scripts[src] = new Promise((resolve, reject) => {
        const el = document.createElement("script");
        el.src = src; el.onload = resolve; el.onerror = () => { delete scripts[src]; reject(new Error("Could not load " + src)); };
        document.head.appendChild(el);
      });
    }
    return scripts[src];
  }
  const ensureSetup = () => (window.SQL_SETUP ? Promise.resolve() : loadScript("data/sql_setup.js"));
  async function loadPattern(num) {
    if (!(window.SQL_PATTERNS && window.SQL_PATTERNS[num])) await loadScript(`data/sql/p${two(num)}.js`);
    return window.SQL_PATTERNS[num];
  }
  // light inline formatting used in the authored text: *emphasis* and `code`
  const rich = (s) => esc(s).replace(/`([^`]+)`/g, "<code>$1</code>").replace(/\*([^*\n]+)\*/g, "<em>$1</em>");
  const paras = (s) => String(s || "").split(/\n{2,}/).filter(Boolean).map((t) => `<p>${rich(t)}</p>`).join("");
  const substitute = (sql, params) => Object.entries(params || {}).reduce((out, [k, v]) => out.replace(new RegExp("(?<![:\\w]):" + k + "\\b", "g"), v), sql);

  /** Same text format as sql_engine.resultToText (used for documented output in the cheat sheet). */
  function resultText(res) {
    if (!res.ok) return "ERROR: " + res.error;
    if (!res.hasResultSet) return res.statements > 1 ? `OK (${res.statements} statements)` : `OK (${res.affected} rows affected)`;
    return [res.columns.join(" | "), ...res.rows.map((r) => r.map((c) => (c === null ? "NULL" : c)).join(" | "))].join("\n");
  }

  function resultHtml(res) {
    if (!res.ok) return `<div class="sql-err" role="alert"><b>${res.timeout ? "Timed out" : "Error"}</b> ${esc(res.error)}</div>`;
    const meta = `<div class="sql-meta">${res.hasResultSet ? `${res.rowCount} row${res.rowCount === 1 ? "" : "s"}` : ""}${res.truncated ? ` (showing the first ${res.rows.length})` : ""} · ${Math.round(res.ms)} ms</div>`;
    if (!res.hasResultSet) return `<div class="sql-ok">${res.statements > 1 ? `OK — ${res.statements} statements ran` : `OK — ${res.affected} row${res.affected === 1 ? "" : "s"} affected`}</div>${meta}`;
    const head = res.columns.map((c, i) => `<th${res.numeric[i] ? ' class="num"' : ""}>${esc(c)}</th>`).join("");
    const body = res.rows.map((r) => `<tr>${r.map((c, i) => c === null ? `<td class="null${res.numeric[i] ? " num" : ""}">NULL</td>` : `<td${res.numeric[i] ? ' class="num"' : ""}>${esc(c)}</td>`).join("")}</tr>`).join("");
    return `<div class="sql-scroll"><table class="sql-table"><thead><tr>${head}</tr></thead><tbody>${body || `<tr><td class="empty" colspan="${res.columns.length}">No rows</td></tr>`}</tbody></table></div>${meta}`;
  }

  async function execute(sql, host, statusEl, button) {
    if (button) button.disabled = true;
    host.hidden = false;
    host.innerHTML = `<div class="sql-meta">Running…</div>`;
    deps.Runner.setStatusHandler((t) => { statusEl.textContent = t; });
    try { await ensureSetup(); } catch (e) { host.innerHTML = resultHtml({ ok: false, error: e.message }); if (button) button.disabled = false; return null; }
    const res = await deps.Runner.sql(sql, 20000);
    statusEl.textContent = "";
    if (button) button.disabled = false;
    host.innerHTML = resultHtml(res);
    return res;
  }

  /* ------------------------------------------------------------ sidebar */
  const doneIn = (p) => p.questions.filter((q) => done.has(q.id)).length;
  function updateProgress() {
    const n = allQuestionIds.filter((id) => done.has(id)).length;
    $("#sqlBar").style.width = (100 * n / allQuestionIds.length) + "%";
    $("#sqlProgText").textContent = `${n}/${allQuestionIds.length} done`;
  }
  function renderSide() {
    const q = S.query.trim().toLowerCase();
    const match = (p) => !q || `${p.title} ${p.concept} ${p.category} ${p.tagline}`.toLowerCase().includes(q);
    let html = `<li><button data-go="schema" ${S.slug === "schema" ? 'aria-current="true"' : ""}><span class="t">Tables &amp; try-it box</span></button></li>`;
    for (const cat of IDX.categories) {
      const items = IDX.patterns.filter((p) => p.category === cat && match(p));
      if (!items.length) continue;
      html += `<li class="grp">${esc(cat)}</li>`;
      for (const p of items) {
        const n = doneIn(p);
        html += `<li><button data-go="${p.slug}" class="${n === p.questions.length ? "" : "unsolved"}" ${p.slug === S.slug ? 'aria-current="true"' : ""}>
          <span class="num">${two(p.num)}</span><span class="t">${esc(p.title)}</span><span class="count">${n}/${p.questions.length}</span></button></li>`;
      }
    }
    $("#sqlList").innerHTML = html;
    updateProgress();
  }
  $("#sqlSearch").addEventListener("input", (e) => { S.query = e.target.value; renderSide(); });
  $("#sqlList").addEventListener("click", (e) => {
    const b = e.target.closest("button[data-go]");
    if (!b) return;
    location.hash = "sql/" + b.dataset.go;
    closeMenu();
  });

  /* ------------------------------------------------------------ run box (editor + Run + results) */
  function runBox(host, { value, draftKey, onRun, paramsEl }) {
    host.innerHTML = `<div class="sq-editor"></div>
      <div class="toolbar" style="margin-top:10px"><button class="btn primary run">▶ Run <kbd>Ctrl Enter</kbd></button><button class="btn reset">Reset</button><span class="status"></span></div>
      <div class="sql-result" hidden aria-live="polite"></div>`;
    const status = $(".status", host), result = $(".sql-result", host), btn = $(".run", host);
    const saved = draftKey ? store.get(draftKey, null) : null;
    const editor = createEditor($(".sq-editor", host), { value: saved !== null ? saved : value, lang: "sql", tall: false, onChange: (v) => draftKey && store.set(draftKey, v === value ? null : v), onRun: () => run() });
    const run = () => execute(substitute(editor.value, paramsEl ? paramsEl() : null), result, status, btn);
    btn.addEventListener("click", run);
    $(".reset", host).addEventListener("click", () => { editor.set(value); result.hidden = true; });
    return { editor, run, result, status };
  }

  /* ------------------------------------------------------------ pages */
  function pageOverview(el) {
    const n = allQuestionIds.filter((id) => done.has(id)).length;
    document.title = "SQL · QA Interview Playground";
    el.innerHTML = `
      <div class="hero"><h1>SQL practice</h1>
        <p>${IDX.patterns.length} patterns, ${allQuestionIds.length} questions. Every query runs on a real PostgreSQL database inside your browser, so you can try an answer before you look at ours.</p>
        <div class="toolbar"><a class="btn primary" href="#sql/${IDX.patterns[0].slug}">Start with pattern 1</a><a class="btn" href="#sql/schema">See the tables</a></div></div>
      <div class="stats"><div class="stat"><b>${IDX.patterns.length}</b><span>patterns</span></div><div class="stat"><b>${allQuestionIds.length}</b><span>questions</span></div><div class="stat"><b>${n}</b><span>done</span></div></div>
      ${IDX.categories.map((cat) => `<h2 class="home-h">${esc(cat)}</h2><div class="sql-grid">${IDX.patterns.filter((p) => p.category === cat).map((p) => `
        <a class="sql-card" href="#sql/${p.slug}"><span class="num">${two(p.num)}</span><b>${esc(p.title)}</b><span class="muted">${esc(p.concept)}</span><span class="badge ${doneIn(p) === p.questions.length ? "ok" : ""}">${doneIn(p)}/${p.questions.length} done</span></a>`).join("")}</div>`).join("")}`;
  }

  function pageSchema(el) {
    document.title = "Tables · SQL · QA Interview Playground";
    el.innerHTML = `
      <div class="eyebrow"><span class="badge">SQL</span></div>
      <h1 class="title">Tables &amp; try-it box</h1>
      <p class="muted">Every question uses these tables. Try anything below; changes are rolled back after each run, so the data is always the same.</p>
      <div class="card"><div class="card-head">Try a query</div><div class="card-body" id="tryHost"></div></div>
      <div class="sql-tables">${IDX.tables.map((t) => `<div class="card" id="t-${esc(t.name)}"><div class="card-head"><code>${esc(t.name)}</code><span class="muted" style="font-weight:400">${esc(t.purpose)}</span></div>
        <div class="card-body"><ul class="cols">${t.columns.map((c) => `<li>${esc(c)}</li>`).join("")}</ul>
        <button class="btn peek" data-t="${esc(t.name)}">Peek at 5 rows</button></div></div>`).join("")}</div>
      <div class="note">${esc(IDX.dialectNote)}</div>`;
    const box = runBox($("#tryHost"), { value: "SELECT * FROM employees LIMIT 10;", draftKey: "qa.sql.try" });
    el.addEventListener("click", (e) => {
      const b = e.target.closest(".peek");
      if (!b) return;
      box.editor.set(`SELECT * FROM ${b.dataset.t} LIMIT 5;`);
      box.run();
      $("#tryHost").scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
  }

  function questionCard(p, q, i) {
    const params = q.params || null;
    const key = `qa.sql.code.${q.id}`;
    const card = document.createElement("article");
    card.className = "card sq";
    card.id = "q-" + q.id;
    card.innerHTML = `
      <div class="card-head"><span class="badge diff-${q.difficulty}">${q.difficulty}</span> Question ${i + 1}
        <span class="status"><label class="check" style="margin:0"><input type="checkbox" class="qdone" ${done.has(q.id) ? "checked" : ""}> Done</label></span></div>
      <div class="card-body">
        <p class="sq-prompt">${rich(q.prompt)}</p>
        <p class="muted sq-tables">Tables: ${q.tables.map((t) => `<a href="#sql/schema"><code>${esc(t)}</code></a>`).join(" ")}</p>
        ${q.think ? `<div class="sq-think"><b>Think first.</b> ${rich(q.think)}</div>` : ""}
        ${params ? `<div class="sq-params">Bind values: ${Object.entries(params).map(([k, v]) => `<label>:${esc(k)} <input data-p="${esc(k)}" value="${esc(v)}" size="8" aria-label="Value for :${esc(k)}"></label>`).join(" ")}</div>` : ""}
        <div class="runhost"></div>
        <div class="sq-reveal"><button class="btn rv">Show hint</button> <button class="btn rv-hide" hidden>Hide answer</button></div>
        <div class="sq-answer"></div>
      </div>`;
    const getParams = () => (params ? Object.fromEntries($$("input[data-p]", card).map((el) => [el.dataset.p, el.value])) : null);
    const box = runBox($(".runhost", card), { value: "-- Write your query here\n", draftKey: key, paramsEl: getParams });
    $(".qdone", card).addEventListener("change", (e) => {
      if (e.target.checked) done.add(q.id); else done.delete(q.id);
      store.set("qa.sql.done", [...done]);
      renderSide();
    });

    let stage = 0;
    const answer = $(".sq-answer", card), rv = $(".rv", card), rvHide = $(".rv-hide", card);
    const labels = ["Show hint", "Show approach", "Show solution & explanation"];
    function paint() {
      let html = "";
      if (stage >= 1) html += `<div class="sq-stage"><h4>Hint</h4>${paras(q.hint)}</div>`;
      if (stage >= 2) html += `<div class="sq-stage"><h4>Approach</h4><ol>${String(q.approach || "").split("\n").filter(Boolean).map((l) => `<li>${rich(l)}</li>`).join("")}</ol></div>`;
      if (stage >= 3) {
        html += `<div class="sq-stage"><h4>Solution</h4><pre class="code">${highlight(q.solution, "sql")}</pre>
          <div class="toolbar"><button class="btn run-sol" ${q.runnable === false ? "hidden" : ""}>▶ Run solution</button><button class="btn use">Use as my query</button><button class="btn copy">Copy</button><span class="status sol-status"></span></div>
          <div class="sql-result sol-result" hidden></div>
          <h4>Explanation</h4>${paras(q.explanation)}
          ${q.runnable === false ? `<div class="note">This solution uses syntax that PostgreSQL (the engine in your browser) does not have, so it can be read but not run here.</div>` : ""}
          ${q.dialect ? `<div class="note"><b>Other databases.</b> ${rich(q.dialect)}</div>` : ""}</div>`;
      }
      answer.innerHTML = html;
      rv.hidden = stage >= 3;
      rv.textContent = labels[stage] || "";
      rvHide.hidden = stage === 0;
    }
    rv.addEventListener("click", () => { stage++; paint(); });
    rvHide.addEventListener("click", () => { stage = 0; paint(); });
    answer.addEventListener("click", async (e) => {
      const b = e.target.closest("button");
      if (!b) return;
      if (b.classList.contains("run-sol")) execute(substitute(q.solution, getParams()), $(".sol-result", answer), $(".sol-status", answer), b);
      else if (b.classList.contains("use")) { box.editor.set(q.solution); box.editor.ta.focus(); }
      else if (b.classList.contains("copy")) {
        try { await navigator.clipboard.writeText(q.solution); b.textContent = "Copied"; } catch (err) { b.textContent = "Copy failed"; }
        setTimeout(() => { b.textContent = "Copy"; }, 1500);
      }
    });
    paint();
    return card;
  }

  async function pagePattern(el, meta) {
    const token = ++S.token;
    el.innerHTML = `<p class="muted">Loading…</p>`;
    let p;
    try { p = await loadPattern(meta.num); } catch (e) { el.innerHTML = `<div class="sql-err">${esc(e.message)}</div>`; return; }
    if (token !== S.token) return;
    store.set("qa.sql.last", p.slug);
    document.title = `${p.title} · SQL · QA Interview Playground`;
    const prev = IDX.patterns[meta.num - 2], next = IDX.patterns[meta.num];
    el.innerHTML = `
      <div class="eyebrow"><span class="code-inline">#${two(p.num)}</span><span class="badge">${esc(p.category)}</span><span class="badge">${esc(p.concept)}</span><span>Pattern ${p.num} of ${IDX.patterns.length}</span></div>
      <h1 class="title">${esc(p.title)}</h1>
      <p class="tagline">${rich(p.tagline)}</p>
      <div class="card"><div class="card-head">The idea</div><div class="card-body explain">${paras(p.theory)}</div></div>
      <div class="card"><div class="card-head">Common pitfalls</div><div class="card-body"><ul class="pitfalls">${p.pitfalls.map((t) => `<li>${rich(t)}</li>`).join("")}</ul></div></div>
      <h2 class="home-h">Questions</h2><div class="qlist"></div>
      <div class="nav-row">
        ${prev ? `<a class="btn" href="#sql/${prev.slug}">← ${esc(prev.title.slice(0, 32))}</a>` : "<span></span>"}
        ${next ? `<a class="btn" href="#sql/${next.slug}">${esc(next.title.slice(0, 32))} →</a>` : ""}
      </div>`;
    const list = $(".qlist", el);
    p.questions.forEach((q, i) => list.appendChild(questionCard(p, q, i)));
  }

  /* ------------------------------------------------------------ entry points */
  function render(el, tail) {
    S.token++;
    S.slug = tail || null;
    renderSide();
    if (!tail) return pageOverview(el);
    if (tail === "schema") return pageSchema(el);
    if (BY_SLUG[tail]) return pagePattern(el, BY_SLUG[tail]);
    S.slug = null;
    return pageOverview(el);
  }

  return { render, renderSide, resultHtml, resultText, execute, ensureSetup, BY_SLUG, IDX };
};
