"""Fill the "=>" expected-output lines of every @py and @js block in a cheat-sheet text file by really running the code.

    python3 .claude/skills/add-cheatsheet-topic/fill_pyjs.py content/cheatsheet/NN_topic.txt

Runs @py with python3 and @js with node, replaces the block's "=>" lines with the real output, keeps "! notes".
Review the diff afterwards: the output must be what you intend to document (the file is the spec, the run is the proof).
@sql blocks are filled by:  node tools/check_sql.mjs --fill-cheatsheet
"""
import os
import subprocess
import sys
import tempfile

path = sys.argv[1]
lines = open(path).read().split("\n")
out, i, filled = [], 0, 0


def run(lang, code):
    f = tempfile.NamedTemporaryFile("w", suffix=".py" if lang == "py" else ".mjs", delete=False)
    f.write(code)
    f.close()
    r = subprocess.run(["python3" if lang == "py" else "node", f.name], capture_output=True, text=True)
    os.unlink(f.name)
    if r.returncode:
        sys.exit(f"{lang} block failed:\n{code}\n{r.stderr}")
    return r.stdout.rstrip("\n").split("\n")


while i < len(lines):
    if lines[i] in ("@py", "@js"):
        lang = lines[i][1:]
        out.append(lines[i])
        i += 1
        start = i
        while i < len(lines) and not lines[i].startswith("@"):
            i += 1
        body = [l for l in lines[start:i] if not l.startswith("=>")]
        last = len(body) - 1
        while last >= 0 and (body[last].strip() == "" or body[last].startswith("! ")):
            last -= 1
        code_lines = body[: last + 1]
        result = run(lang, "\n".join(l for l in code_lines if not l.startswith("! ")))
        out += code_lines + ["=> " + l for l in result] + body[last + 1:]
        filled += 1
    else:
        out.append(lines[i])
        i += 1
open(path, "w").write("\n".join(out))
print(f"filled {filled} @py/@js blocks in {path}")
