/* Starter programs for the free-form Playground. The first sample of each language is the default. */
window.SAMPLES = {
  py: [
    { name: "Hello, Vijay!", code: `# Python: your first program
name = "Vijay"
print(f"Hello, {name}!")

# variables, a loop and a function
def greet(person, times=3):
    for i in range(1, times + 1):
        print(f"{i}. Welcome to the QA playground, {person}")

greet(name)
` },
    { name: "FizzBuzz", code: `for i in range(1, 21):
    print("FizzBuzz" if i % 15 == 0 else "Fizz" if i % 3 == 0 else "Buzz" if i % 5 == 0 else i)
` },
    { name: "Parse a log (regex + Counter)", code: `import re
from collections import Counter

log = """2024-05-01 10:00:00 [INFO] service started
2024-05-01 10:00:05 [ERROR] login failed for alice
2024-05-01 10:00:09 [INFO] retrying
2024-05-01 10:00:12 [ERROR] timeout calling /orders"""

levels = Counter(re.findall(r"\\[(\\w+)\\]", log))
print(levels)
print([m for m in re.findall(r"\\[ERROR\\] (.*)", log)])
` },
    { name: "Read input()", code: `# Put some text in the "Input" box below the editor, then press Run.
name = input("name? ")
print("Hello,", name or "Vijay")
` },
    { name: "pandas (loads on first run)", code: `import pandas as pd

df = pd.DataFrame({"team": ["qa", "dev", "qa"], "bugs": [3, 1, 5]})
print(df.groupby("team")["bugs"].sum())
` },
    { name: "pytest-style assertions", code: `def add(a, b):
    return a + b

def test_add():
    assert add(2, 3) == 5

def test_add_negative():
    assert add(-1, 1) == 0

for t in (test_add, test_add_negative):
    t()
    print("PASS", t.__name__)
` },
  ],
  js: [
    { name: "Hello, Vijay!", code: `// JavaScript: your first program
const name = "Vijay";
console.log(\`Hello, \${name}!\`);

// variables, a loop and a function
function greet(person, times = 3) {
  for (let i = 1; i <= times; i++) {
    console.log(\`\${i}. Welcome to the QA playground, \${person}\`);
  }
}

greet(name);
` },
    { name: "FizzBuzz", code: `for (let i = 1; i <= 20; i++) {
  console.log(i % 15 === 0 ? "FizzBuzz" : i % 3 === 0 ? "Fizz" : i % 5 === 0 ? "Buzz" : i);
}
` },
    { name: "Array methods", code: `const bugs = [{ team: "qa", n: 3 }, { team: "dev", n: 1 }, { team: "qa", n: 5 }];
const byTeam = bugs.reduce((acc, b) => ({ ...acc, [b.team]: (acc[b.team] ?? 0) + b.n }), {});
console.log(byTeam);
console.log(bugs.filter((b) => b.n > 2).map((b) => b.team));
` },
    { name: "async / await (retry)", code: `const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let calls = 0;
async function flaky() {
  await sleep(50);
  if (++calls < 3) throw new Error("transient failure " + calls);
  return "ok";
}
async function retry(fn, times = 3) {
  for (let i = 1; ; i++) {
    try { return await fn(); } catch (e) { console.log("attempt", i, "failed:", e.message); if (i >= times) throw e; }
  }
}
console.log(await retry(flaky));
` },
  ],
  ts: [
    { name: "Hello, Vijay!", code: `// TypeScript: your first program
const name: string = "Vijay";
console.log(\`Hello, \${name}!\`);

// typed function with a default parameter
function greet(person: string, times: number = 3): void {
  for (let i = 1; i <= times; i++) {
    console.log(\`\${i}. Welcome to the QA playground, \${person}\`);
  }
}

greet(name);
` },
    { name: "Interfaces & generics", code: `interface TestResult {
  name: string;
  status: "pass" | "fail" | "skip";
  ms: number;
}

function groupBy<T, K extends string>(items: T[], key: (t: T) => K): Record<K, T[]> {
  const out = {} as Record<K, T[]>;
  for (const it of items) (out[key(it)] ??= []).push(it);
  return out;
}

const results: TestResult[] = [
  { name: "login", status: "pass", ms: 120 },
  { name: "checkout", status: "fail", ms: 340 },
  { name: "search", status: "pass", ms: 90 },
];
const grouped = groupBy(results, (r) => r.status);
console.log(Object.entries(grouped).map(([s, rs]) => s + ": " + rs.length).join(", "));
` },
    { name: "FizzBuzz", code: `for (let i: number = 1; i <= 20; i++) {
  console.log(i % 15 === 0 ? "FizzBuzz" : i % 3 === 0 ? "Fizz" : i % 5 === 0 ? "Buzz" : i);
}
` },
  ],
};
