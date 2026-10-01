// Linked lists and trees are passed as plain arrays (trees in level-order, null for gaps).

// ---- _ListNode
class _ListNode {
  constructor(public val: number, public next: _ListNode | null = null) {}
}

// ---- _toList
function _toList(values: number[]): _ListNode | null {
  let head: _ListNode | null = null;
  let tail: _ListNode | null = null;
  for (const v of values) {
    const node = new _ListNode(v);
    if (tail) tail.next = node;
    else head = node;
    tail = node;
  }
  return head;
}

// ---- _fromList
function _fromList(head: _ListNode | null): number[] {
  const out: number[] = [];
  for (let n = head; n; n = n.next) out.push(n.val);
  return out;
}

// ---- _TreeNode
class _TreeNode {
  left: _TreeNode | null = null;
  right: _TreeNode | null = null;
  constructor(public val: number) {}
}

// ---- _buildTree
function _buildTree(vals: (number | null)[]): _TreeNode | null {
  if (vals.length === 0 || vals[0] === null) return null;
  const root = new _TreeNode(vals[0]);
  const queue: _TreeNode[] = [root];
  let i = 1;
  while (queue.length && i < vals.length) {
    const node = queue.shift()!;
    if (i < vals.length && vals[i] !== null) {
      node.left = new _TreeNode(vals[i] as number);
      queue.push(node.left);
    }
    i++;
    if (i < vals.length && vals[i] !== null) {
      node.right = new _TreeNode(vals[i] as number);
      queue.push(node.right);
    }
    i++;
  }
  return root;
}

// ---- p161_reverseLinkedList
function p161_reverseLinkedList(values: number[]): number[] {
  let prev: _ListNode | null = null;
  let cur = _toList(values);
  while (cur) {
    const next: _ListNode | null = cur.next;
    cur.next = prev;
    prev = cur;
    cur = next;
  }
  return _fromList(prev);
}

// ---- p162_middleOfLinkedList
function p162_middleOfLinkedList(values: number[]): number {
  let slow = _toList(values)!;
  let fast: _ListNode | null = slow;
  while (fast && fast.next) {
    slow = slow.next!;
    fast = fast.next.next;
  }
  return slow.val;
}

// ---- p163_hasCycle
function p163_hasCycle(values: number[], pos: number): boolean {
  const head = _toList(values);
  if (pos >= 0) {
    const nodes: _ListNode[] = [];
    for (let n = head; n; n = n.next) nodes.push(n);
    nodes[nodes.length - 1].next = nodes[pos];
  }
  let slow = head;
  let fast = head;
  while (fast && fast.next) {
    slow = slow!.next;
    fast = fast.next.next;
    if (slow === fast) return true;
  }
  return false;
}

// ---- p164_mergeTwoSortedLists
function p164_mergeTwoSortedLists(a: number[], b: number[]): number[] {
  let x = _toList(a);
  let y = _toList(b);
  const dummy = new _ListNode(0);
  let tail = dummy;
  while (x && y) {
    if (x.val <= y.val) {
      tail.next = x;
      x = x.next;
    } else {
      tail.next = y;
      y = y.next;
    }
    tail = tail.next!;
  }
  tail.next = x ?? y;
  return _fromList(dummy.next);
}

// ---- p165_MinStack
class p165_MinStack {
  private stack: number[] = [];
  private mins: number[] = [];

  push(x: number): void {
    this.stack.push(x);
    this.mins.push(this.mins.length ? Math.min(x, this.mins[this.mins.length - 1]) : x);
  }

  pop(): number {
    this.mins.pop();
    return this.stack.pop()!;
  }

  top(): number {
    return this.stack[this.stack.length - 1];
  }

  getMin(): number {
    return this.mins[this.mins.length - 1];
  }
}

// ---- p166_QueueUsingStacks
class p166_QueueUsingStacks {
  private inbox: number[] = [];
  private outbox: number[] = [];

  push(x: number): void {
    this.inbox.push(x);
  }

  private shift(): void {
    if (!this.outbox.length) while (this.inbox.length) this.outbox.push(this.inbox.pop()!);
  }

  pop(): number {
    this.shift();
    return this.outbox.pop()!;
  }

  peek(): number {
    this.shift();
    return this.outbox[this.outbox.length - 1];
  }

  empty(): boolean {
    return !this.inbox.length && !this.outbox.length;
  }
}

// ---- p167_LRUCache
class p167_LRUCache {
  private map = new Map<number, number>();

  constructor(private capacity: number) {}

  get(key: number): number {
    if (!this.map.has(key)) return -1;
    const value = this.map.get(key)!;
    this.map.delete(key);
    this.map.set(key, value); // re-insert = most recently used
    return value;
  }

  put(key: number, value: number): void {
    this.map.delete(key);
    this.map.set(key, value);
    if (this.map.size > this.capacity) this.map.delete(this.map.keys().next().value as number);
  }
}

// ---- p168_inorderTraversal
function p168_inorderTraversal(vals: (number | null)[]): number[] {
  const out: number[] = [];
  const stack: _TreeNode[] = [];
  let node = _buildTree(vals);
  while (stack.length || node) {
    while (node) {
      stack.push(node);
      node = node.left;
    }
    node = stack.pop()!;
    out.push(node.val);
    node = node.right;
  }
  return out;
}

// ---- p169_treeHeight
function p169_treeHeight(vals: (number | null)[]): number {
  const h = (n: _TreeNode | null): number => (n === null ? 0 : 1 + Math.max(h(n.left), h(n.right)));
  return h(_buildTree(vals));
}

// ---- p170_levelOrder
function p170_levelOrder(vals: (number | null)[]): number[][] {
  const root = _buildTree(vals);
  const out: number[][] = [];
  let level: _TreeNode[] = root ? [root] : [];
  while (level.length) {
    out.push(level.map((n) => n.val));
    level = level.flatMap((n) => [n.left, n.right]).filter((c): c is _TreeNode => c !== null);
  }
  return out;
}

// ---- p171_isValidBst
function p171_isValidBst(vals: (number | null)[]): boolean {
  const ok = (n: _TreeNode | null, lo: number, hi: number): boolean =>
    n === null || (lo < n.val && n.val < hi && ok(n.left, lo, n.val) && ok(n.right, n.val, hi));
  return ok(_buildTree(vals), -Infinity, Infinity);
}

// ---- p172_transposeMatrix
function p172_transposeMatrix(m: number[][]): number[][] {
  return m[0].map((_, c) => m.map((row) => row[c]));
}

// ---- p173_rotateMatrix90
function p173_rotateMatrix90(m: number[][]): number[][] {
  return m[0].map((_, c) => m.map((row) => row[c]).reverse());
}

// ---- p174_spiralOrder
function p174_spiralOrder(matrix: number[][]): number[] {
  let m = matrix.map((r) => [...r]);
  const res: number[] = [];
  while (m.length) {
    res.push(...m.shift()!);
    m = m.length ? m[0].map((_, c) => m.map((row) => row[c])).reverse() : [];
  }
  return res;
}

// ---- p175_searchRowColSortedMatrix
function p175_searchRowColSortedMatrix(matrix: number[][], target: number): boolean {
  let r = 0;
  let c = matrix[0].length - 1;
  while (r < matrix.length && c >= 0) {
    const v = matrix[r][c];
    if (v === target) return true;
    if (v > target) c--;
    else r++;
  }
  return false;
}

// ---- p176_climbingStairs
function p176_climbingStairs(n: number): number {
  let a = 1;
  let b = 1;
  for (let i = 1; i < n; i++) [a, b] = [b, a + b];
  return b;
}

// ---- p177_coinChange
function p177_coinChange(coins: number[], amount: number): number {
  const dp = [0, ...new Array<number>(amount).fill(Infinity)];
  for (let a = 1; a <= amount; a++) {
    for (const c of coins) if (c <= a) dp[a] = Math.min(dp[a], dp[a - c] + 1);
  }
  return dp[amount] === Infinity ? -1 : dp[amount];
}

// ---- p178_lcsLength
function p178_lcsLength(a: string, b: string): number {
  let prev = new Array<number>(b.length + 1).fill(0);
  for (const ca of a) {
    const cur = [0];
    for (let j = 1; j <= b.length; j++) {
      cur.push(ca === b[j - 1] ? prev[j - 1] + 1 : Math.max(prev[j], cur[j - 1]));
    }
    prev = cur;
  }
  return prev[b.length];
}

// ---- p179_knapsack01
function p179_knapsack01(weights: number[], values: number[], capacity: number): number {
  const dp = new Array<number>(capacity + 1).fill(0);
  weights.forEach((wt, i) => {
    for (let w = capacity; w >= wt; w--) dp[w] = Math.max(dp[w], dp[w - wt] + values[i]);
  });
  return dp[capacity];
}

// ---- p180_longestIncreasingSubsequence
function p180_longestIncreasingSubsequence(nums: number[]): number {
  const tails: number[] = [];
  for (const n of nums) {
    let lo = 0;
    let hi = tails.length;
    while (lo < hi) {
      const mid = Math.floor((lo + hi) / 2);
      if (tails[mid] < n) lo = mid + 1;
      else hi = mid;
    }
    tails[lo] = n;
  }
  return tails.length;
}

// ---- p181_houseRobber
function p181_houseRobber(nums: number[]): number {
  let take = 0;
  let skip = 0;
  for (const n of nums) [take, skip] = [skip + n, Math.max(take, skip)];
  return Math.max(take, skip);
}

// ---- p182_subsets
function p182_subsets(nums: number[]): number[][] {
  const res: number[][] = [];
  const go = (i: number, cur: number[]): void => {
    if (i === nums.length) {
      res.push([...cur]);
      return;
    }
    go(i + 1, cur);
    cur.push(nums[i]);
    go(i + 1, cur);
    cur.pop();
  };
  go(0, []);
  const cmp = (a: number[], b: number[]): number => {
    for (let i = 0; i < Math.min(a.length, b.length); i++) if (a[i] !== b[i]) return a[i] - b[i];
    return a.length - b.length;
  };
  return res.sort(cmp);
}

// ---- p183_permutations
function p183_permutations(nums: number[]): number[][] {
  const res: number[][] = [];
  const go = (cur: number[], rest: number[]): void => {
    if (!rest.length) res.push(cur);
    rest.forEach((x, i) => go([...cur, x], [...rest.slice(0, i), ...rest.slice(i + 1)]));
  };
  go([], nums);
  return res.sort((a, b) => {
    for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return a[i] - b[i];
    return 0;
  });
}

// ---- p184_towerOfHanoi
function p184_towerOfHanoi(n: number, src = "A", aux = "B", dst = "C"): [string, string][] {
  if (n === 0) return [];
  return [...p184_towerOfHanoi(n - 1, src, dst, aux), [src, dst], ...p184_towerOfHanoi(n - 1, aux, src, dst)];
}

// ---- p185_nQueensCount
function p185_nQueensCount(n: number): number {
  const cols = new Set<number>();
  const d1 = new Set<number>();
  const d2 = new Set<number>();
  const go = (r: number): number => {
    if (r === n) return 1;
    let total = 0;
    for (let c = 0; c < n; c++) {
      if (cols.has(c) || d1.has(r - c) || d2.has(r + c)) continue;
      cols.add(c); d1.add(r - c); d2.add(r + c);
      total += go(r + 1);
      cols.delete(c); d1.delete(r - c); d2.delete(r + c);
    }
    return total;
  };
  return go(0);
}

// ---- p186_graphBfs
function p186_graphBfs(graph: Record<string, string[]>, start: string): string[] {
  const seen = new Set([start]);
  const order: string[] = [];
  const queue = [start];
  while (queue.length) {
    const n = queue.shift()!;
    order.push(n);
    for (const nb of graph[n]) {
      if (!seen.has(nb)) {
        seen.add(nb);
        queue.push(nb);
      }
    }
  }
  return order;
}

// ---- p187_graphDfs
function p187_graphDfs(graph: Record<string, string[]>, start: string): string[] {
  const seen = new Set<string>();
  const order: string[] = [];
  const go = (n: string): void => {
    seen.add(n);
    order.push(n);
    for (const nb of graph[n]) if (!seen.has(nb)) go(nb);
  };
  go(start);
  return order;
}

// ---- p188_numberOfIslands
function p188_numberOfIslands(grid: number[][]): number {
  const g = grid.map((r) => [...r]);
  let count = 0;
  for (let r = 0; r < g.length; r++) {
    for (let c = 0; c < g[0].length; c++) {
      if (g[r][c] !== 1) continue;
      count++;
      const stack: [number, number][] = [[r, c]];
      while (stack.length) {
        const [i, j] = stack.pop()!;
        if (i >= 0 && i < g.length && j >= 0 && j < g[0].length && g[i][j] === 1) {
          g[i][j] = 0;
          stack.push([i + 1, j], [i - 1, j], [i, j + 1], [i, j - 1]);
        }
      }
    }
  }
  return count;
}

// ---- p189_shortestPathGrid
function p189_shortestPathGrid(grid: number[][], start: number[], end: number[]): number {
  const key = (r: number, c: number): string => `${r},${c}`;
  const queue: [number, number, number][] = [[start[0], start[1], 0]];
  const seen = new Set([key(start[0], start[1])]);
  while (queue.length) {
    const [r, c, d] = queue.shift()!;
    if (r === end[0] && c === end[1]) return d;
    for (const [nr, nc] of [[r + 1, c], [r - 1, c], [r, c + 1], [r, c - 1]]) {
      if (nr >= 0 && nr < grid.length && nc >= 0 && nc < grid[0].length && grid[nr][nc] === 0 && !seen.has(key(nr, nc))) {
        seen.add(key(nr, nc));
        queue.push([nr, nc, d + 1]);
      }
    }
  }
  return -1;
}

// ---- p190_generateParentheses
function p190_generateParentheses(n: number): string[] {
  const res: string[] = [];
  const go = (cur: string, o: number, c: number): void => {
    if (cur.length === 2 * n) {
      res.push(cur);
      return;
    }
    if (o < n) go(cur + "(", o + 1, c);
    if (c < o) go(cur + ")", o, c + 1);
  };
  go("", 0, 0);
  return res;
}

// ---- p191_wordBreak
function p191_wordBreak(s: string, words: string[]): boolean {
  const ws = new Set(words);
  const dp = [true, ...new Array<boolean>(s.length).fill(false)];
  for (let i = 1; i <= s.length; i++) {
    for (let j = 0; j < i; j++) {
      if (dp[j] && ws.has(s.slice(j, i))) {
        dp[i] = true;
        break;
      }
    }
  }
  return dp[s.length];
}

// ---- p192_diagonalSums
function p192_diagonalSums(m: number[][]): [number, number] {
  const n = m.length;
  let a = 0;
  let b = 0;
  for (let i = 0; i < n; i++) {
    a += m[i][i];
    b += m[i][n - 1 - i];
  }
  return [a, b];
}

// ---- p193_topKFrequent
function p193_topKFrequent(nums: number[], k: number): number[] {
  const counts = new Map<number, number>();
  for (const n of nums) counts.set(n, (counts.get(n) ?? 0) + 1);
  return [...counts].sort((a, b) => b[1] - a[1]).slice(0, k).map(([n]) => n);
}

// ---- p194_mergeIntervals
function p194_mergeIntervals(intervals: number[][]): number[][] {
  const out: number[][] = [];
  for (const [s, e] of [...intervals].sort((a, b) => a[0] - b[0])) {
    if (out.length && s <= out[out.length - 1][1]) out[out.length - 1][1] = Math.max(out[out.length - 1][1], e);
    else out.push([s, e]);
  }
  return out;
}

// ---- p195_canAttendMeetings
function p195_canAttendMeetings(intervals: number[][]): boolean {
  const s = [...intervals].sort((a, b) => a[0] - b[0]);
  return s.every((cur, i) => i === 0 || s[i - 1][1] <= cur[0]);
}

// ---- p196_kthSmallest
function p196_kthSmallest(nums: number[], k: number): number {
  return [...nums].sort((a, b) => a - b)[k - 1];
}

// ---- p197_Trie
class p197_Trie {
  private root: Record<string, any> = {};

  insert(word: string): void {
    let node = this.root;
    for (const ch of word) node = node[ch] ??= {};
    node["$"] = true;
  }

  private walk(s: string): Record<string, any> | null {
    let node = this.root;
    for (const ch of s) {
      if (!(ch in node)) return null;
      node = node[ch];
    }
    return node;
  }

  search(word: string): boolean {
    const node = this.walk(word);
    return !!node && "$" in node;
  }

  startsWith(prefix: string): boolean {
    return this.walk(prefix) !== null;
  }
}

// ---- p198_evalRpn
function p198_evalRpn(tokens: string[]): number {
  const st: number[] = [];
  for (const t of tokens) {
    if (["+", "-", "*", "/"].includes(t)) {
      const b = st.pop()!;
      const a = st.pop()!;
      st.push(t === "+" ? a + b : t === "-" ? a - b : t === "*" ? a * b : Math.trunc(a / b));
    } else {
      st.push(Number(t));
    }
  }
  return st[0];
}

// ---- p199_dailyTemperatures
function p199_dailyTemperatures(temps: number[]): number[] {
  const res = new Array<number>(temps.length).fill(0);
  const st: number[] = [];
  temps.forEach((t, i) => {
    while (st.length && temps[st[st.length - 1]] < t) {
      const j = st.pop()!;
      res[j] = i - j;
    }
    st.push(i);
  });
  return res;
}

// ---- p200_decodeWays
function p200_decodeWays(s: string): number {
  if (!s || s[0] === "0") return 0;
  let prev = 1;
  let cur = 1;
  for (let i = 1; i < s.length; i++) {
    let next = 0;
    if (s[i] !== "0") next += cur;
    const two = Number(s.slice(i - 1, i + 1));
    if (two >= 10 && two <= 26) next += prev;
    [prev, cur] = [cur, next];
  }
  return cur;
}
