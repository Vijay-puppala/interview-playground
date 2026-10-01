"""Runnable demos for programs that are classes/decorators (no simple input -> output example).

The demo runs *after* the user's (or reference) code in the same scope, so it may use the bare names.
`expected` is compared with whatever the demo prints.
"""
DEMOS = {
    "p165": {
        "py": {"code": "s = MinStack()\nfor x in (5, 3, 7):\n    s.push(x)\nprint(s.get_min())\ns.pop(); s.pop()\nprint(s.get_min(), s.top())",
               "expected": "3\n5 5"},
        "js": {"code": "const s = new MinStack();\n[5, 3, 7].forEach((x) => s.push(x));\nconsole.log(s.getMin());\ns.pop(); s.pop();\nconsole.log(s.getMin(), s.top());",
               "expected": "3\n5 5"},
    },
    "p166": {
        "py": {"code": "q = QueueUsingStacks()\nq.push(1); q.push(2)\nprint(q.peek(), q.pop())\nq.push(3)\nprint(q.pop(), q.pop(), q.empty())",
               "expected": "1 1\n2 3 True"},
        "js": {"code": "const q = new QueueUsingStacks();\nq.push(1); q.push(2);\nconsole.log(q.peek(), q.pop());\nq.push(3);\nconsole.log(q.pop(), q.pop(), q.empty());",
               "expected": "1 1\n2 3 true"},
    },
    "p167": {
        "py": {"code": "c = LRUCache(2)\nc.put(1, 1); c.put(2, 2)\nprint(c.get(1))\nc.put(3, 3)\nprint(c.get(2))\nc.put(4, 4)\nprint(c.get(1), c.get(3), c.get(4))",
               "expected": "1\n-1\n-1 3 4"},
        "js": {"code": "const c = new LRUCache(2);\nc.put(1, 1); c.put(2, 2);\nconsole.log(c.get(1));\nc.put(3, 3);\nconsole.log(c.get(2));\nc.put(4, 4);\nconsole.log(c.get(1), c.get(3), c.get(4));",
               "expected": "1\n-1\n-1 3 4"},
    },
    "p197": {
        "py": {"code": "t = Trie()\nt.insert('apple')\nprint(t.search('apple'), t.search('app'), t.starts_with('app'))\nt.insert('app')\nprint(t.search('app'))",
               "expected": "True False True\nTrue"},
        "js": {"code": "const t = new Trie();\nt.insert('apple');\nconsole.log(t.search('apple'), t.search('app'), t.startsWith('app'));\nt.insert('app');\nconsole.log(t.search('app'));",
               "expected": "true false true\ntrue"},
    },
    "p213": {
        "py": {"code": "calls = {'n': 0}\n\n@retry(times=3)\ndef flaky():\n    calls['n'] += 1\n    if calls['n'] < 3:\n        raise ConnectionError('boom')\n    return 'ok'\n\nprint(flaky(), calls['n'])",
               "expected": "ok 3"},
        "js": {"code": "const calls = { n: 0 };\nconst flaky = retry(async () => {\n  if (++calls.n < 3) throw new Error('boom');\n  return 'ok';\n}, 3);\nconsole.log(await flaky(), calls.n);",
               "expected": "ok 3"},
    },
    "p214": {
        "py": {"code": "@timed\ndef work():\n    return 42\n\nprint(work(), work.last_duration >= 0)",
               "expected": "42 True"},
        "js": {"code": "const work = timed(() => 42);\nconsole.log(work(), work.lastDuration >= 0);",
               "expected": "42 true"},
    },
    "p215": {
        "py": {"code": "ticks = iter([False, False, True])\nprint(wait_until(lambda: next(ticks), timeout=1, interval=0))\ntry:\n    wait_until(lambda: False, timeout=0.05, interval=0.01)\nexcept TimeoutError:\n    print('timeout')",
               "expected": "True\ntimeout"},
        "js": {"code": "const ticks = [false, false, true];\nlet i = 0;\nconsole.log(await waitUntil(() => ticks[i++], 1000, 0));\ntry {\n  await waitUntil(() => false, 50, 10);\n} catch (e) {\n  console.log('timeout');\n}",
               "expected": "true\ntimeout"},
    },
    "p224": {
        "py": {"code": "a = random_string(8, seed=1)\nb = random_string(8, seed=1)\nprint(len(a), a == b)",
               "expected": "8 True"},
        "js": {"code": "const a = randomString(8, 1);\nconst b = randomString(8, 1);\nconsole.log(a.length, a === b);",
               "expected": "8 true"},
    },
    "p226": {
        "py": {"code": "u = generate_users(3, seed=7)\nprint(len(u), u == generate_users(3, seed=7), ','.join(sorted(u[0])))",
               "expected": "3 True age,id,name"},
        "js": {"code": "const u = generateUsers(3, 7);\nconsole.log(u.length, JSON.stringify(u) === JSON.stringify(generateUsers(3, 7)), Object.keys(u[0]).sort().join(','));",
               "expected": "3 true age,id,name"},
    },
}
