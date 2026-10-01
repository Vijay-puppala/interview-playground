/* Tiny dependency-free syntax highlighter for Python / JavaScript / TypeScript. */
(function () {
  const PY_KW = "False None True and as assert async await break class continue def del elif else except finally for from global if import in is lambda nonlocal not or pass raise return try while with yield self";
  const JS_KW = "async await break case catch class const continue debugger default delete do else export extends finally for function if import in instanceof let new of return static super switch this throw try typeof var void while with yield null undefined true false";
  const TS_KW = JS_KW + " interface type enum implements private public protected readonly abstract declare namespace keyof as is unknown never any string number boolean void";
  const KEYWORDS = { py: new Set(PY_KW.split(" ")), js: new Set(JS_KW.split(" ")), ts: new Set(TS_KW.split(" ")) };

  const COMMON = {
    py: /(#[^\n]*)|("""[\s\S]*?"""|'''[\s\S]*?''')|((?:[rbfRBF]{1,2})?"(?:\\.|[^"\\\n])*"|(?:[rbfRBF]{1,2})?'(?:\\.|[^'\\\n])*')|(@[A-Za-z_][\w.]*)|(\b\d[\d_]*\.?\d*(?:e[+-]?\d+)?\b)|([A-Za-z_]\w*)/g,
    js: /(\/\/[^\n]*|\/\*[\s\S]*?\*\/)|(`(?:\\.|[^`\\])*`)|("(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*')|()(\b\d[\d_]*\.?\d*(?:e[+-]?\d+)?n?\b)|([A-Za-z_$][\w$]*)/g,
  };

  const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  function highlight(code, lang) {
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
