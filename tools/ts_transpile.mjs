// stdin: JSON {key: tsCode}  ->  stdout: JSON {key: jsCode}  (types stripped, 2-space indent)
import fs from "node:fs";
import ts from "typescript";

const input = JSON.parse(fs.readFileSync(0, "utf8"));
const out = {};
for (const [key, code] of Object.entries(input)) {
  const js = ts.transpileModule(code, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, useDefineForClassFields: true, removeComments: false },
  }).outputText;
  out[key] = js.replace(/^( {4})+/gm, (m) => "  ".repeat(m.length / 4)).trimEnd() + "\n";
}
process.stdout.write(JSON.stringify(out));
