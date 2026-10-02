/* Tiny dependency-free syntax highlighter for Python / JavaScript / TypeScript / SQL. */
(function () {
  const PY_KW = "False None True and as assert async await break class continue def del elif else except finally for from global if import in is lambda nonlocal not or pass raise return try while with yield self";
  const JS_KW = "async await break case catch class const continue debugger default delete do else export extends finally for function if import in instanceof let new of return static super switch this throw try typeof var void while with yield null undefined true false";
  const TS_KW = JS_KW + " interface type enum implements private public protected readonly abstract declare namespace keyof as is unknown never any string number boolean void";
  const KEYWORDS = { py: new Set(PY_KW.split(" ")), js: new Set(JS_KW.split(" ")), ts: new Set(TS_KW.split(" ")) };

  const COMMON = {
    py: /(#[^\n]*)|("""[\s\S]*?"""|'''[\s\S]*?''')|((?:[rbfRBF]{1,2})?"(?:\\.|[^"\\\n])*"|(?:[rbfRBF]{1,2})?'(?:\\.|[^'\\\n])*')|(@[A-Za-z_][\w.]*)|(\b\d[\d_]*\.?\d*(?:e[+-]?\d+)?\b)|([A-Za-z_]\w*)/g,
    js: /(\/\/[^\n]*|\/\*[\s\S]*?\*\/)|(`(?:\\.|[^`\\])*`)|("(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*')|()(\b\d[\d_]*\.?\d*(?:e[+-]?\d+)?n?\b)|([A-Za-z_$][\w$]*)/g,
  };

  const SQL_KW = "SELECT FROM WHERE GROUP BY ORDER HAVING LIMIT OFFSET FETCH FIRST ROWS ONLY AS DISTINCT ON JOIN INNER LEFT RIGHT FULL OUTER CROSS NATURAL USING UNION INTERSECT EXCEPT ALL ANY SOME EXISTS IN NOT AND OR IS NULL BETWEEN LIKE ILIKE CASE WHEN THEN ELSE END WITH RECURSIVE OVER PARTITION RANGE UNBOUNDED PRECEDING FOLLOWING CURRENT ROW LATERAL INSERT INTO VALUES UPDATE SET DELETE RETURNING CREATE TABLE VIEW INDEX DROP ALTER ADD COLUMN CONSTRAINT PRIMARY KEY FOREIGN REFERENCES UNIQUE CHECK DEFAULT BEGIN COMMIT ROLLBACK EXPLAIN ANALYZE ASC DESC NULLS TRUE FALSE FILTER WITHIN INTERVAL CAST CONFLICT DO NOTHING TRUNCATE MATERIALIZED TEMP TEMPORARY IF";
  const SQL_RE = /(--[^\n]*|\/\*[\s\S]*?\*\/)|('(?:''|[^'])*')|(\b\d[\d_]*\.?\d*\b)|([A-Za-z_][\w$]*)/g;
  const SQL_SET = new Set(SQL_KW.split(" "));

  function highlightSql(code) {
    let out = "", last = 0, m;
    SQL_RE.lastIndex = 0;
    while ((m = SQL_RE.exec(code))) {
      out += esc(code.slice(last, m.index));
      last = m.index + m[0].length;
      let cls = null;
      if (m[1]) cls = "c";
      else if (m[2]) cls = "s";
      else if (m[3]) cls = "n";
      else if (m[4]) cls = SQL_SET.has(m[4].toUpperCase()) ? "k" : (code[last] === "(" ? "f" : null);
      out += cls ? `<span class="tok-${cls}">${esc(m[0])}</span>` : esc(m[0]);
    }
    return out + esc(code.slice(last));
  }

  // shell / YAML / HCL / JSON used by the DevOps cheat sheets (Docker, Kubernetes, AWS, Azure, Terraform, Git)
  const CLI_TOOLS = new Set("docker kubectl helm aws az terraform git gh curl jq sudo npm pip pytest export echo cd cat ls mkdir chmod".split(" "));
  const CLI_KW = new Set("resource variable output provider module data locals terraform backend required_providers required_version lifecycle import for_each count depends_on dynamic FROM RUN CMD COPY ADD ENV ARG WORKDIR EXPOSE USER VOLUME ENTRYPOINT HEALTHCHECK AS true false null".split(" "));
  const CLI_RE = /(^[ \t]*\/\/[^\n]*|(?:^|[ \t])#[^\n]*)|("(?:\\.|[^"\\\n])*"|'[^'\n]*')|(\$\{[^}\n]*\}|\$[A-Za-z_]\w*)|((?<=[ \t])--?[A-Za-z][\w-]*)|(\b\d[\w.]*\b)|([A-Za-z_][\w./@-]*)(:(?=\s|$))?/gm;

  function highlightCli(code) {
    let out = "", last = 0, m;
    CLI_RE.lastIndex = 0;
    while ((m = CLI_RE.exec(code))) {
      out += esc(code.slice(last, m.index));
      last = m.index + m[0].length;
      let cls = null;
      if (m[1]) cls = "c";
      else if (m[2]) cls = "s";
      else if (m[3]) cls = "d";
      else if (m[4]) cls = "t";
      else if (m[5]) cls = "n";
      else if (m[6]) cls = m[7] ? "t" : CLI_KW.has(m[6]) ? "k" : CLI_TOOLS.has(m[6]) ? "f" : null;
      out += cls ? `<span class="tok-${cls}">${esc(m[0])}</span>` : esc(m[0]);
    }
    return out + esc(code.slice(last));
  }

  const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  function highlight(code, lang) {
    if (lang === "sql") return highlightSql(code);
    if (lang === "cli") return highlightCli(code);
    if (lang === "txt") return esc(code);
    const re = new RegExp((lang === "py" ? COMMON.py : COMMON.js).source, "g");
    const kw = KEYWORDS[lang] || KEYWORDS.js;
    let out = "";
    let last = 0;
    let m;
    while ((m = re.exec(code))) {
      out += esc(code.slice(last, m.index));
      last = m.index + m[0].length;
      const [txt, comment, triple, str, deco, num, word] = lang === "py" ? m : [m[0], m[1], m[2], m[3], m[4], m[5], m[6]];
      let cls = null;
      if (comment) cls = "c";
      else if (lang === "py" ? triple : triple) cls = lang === "py" ? "c" : "s";
      else if (str) cls = "s";
      else if (deco) cls = "d";
      else if (num) cls = "n";
      else if (word) {
        const prev = code.slice(Math.max(0, m.index - 6), m.index);
        if (kw.has(word)) cls = "k";
        else if (/(def|class|function)\s+$/.test(prev) || /(def|class|function)\s+$/.test(code.slice(Math.max(0, m.index - 12), m.index))) cls = "f";
        else if (code[last] === "(" ) cls = "f";
        else if (/^[A-Z][A-Za-z0-9]+$/.test(word)) cls = "t";
      }
      out += cls ? `<span class="tok-${cls}">${esc(txt)}</span>` : esc(txt);
    }
    return out + esc(code.slice(last));
  }

  window.highlight = highlight;
})();
