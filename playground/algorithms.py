"""Data structures & algorithms (p161-p200). Docstring = title, blank line, explanation.

Linked lists and trees are passed as plain Python lists (trees in level-order with
None for gaps, LeetCode style) so every example is easy to run and test.
"""
import heapq
from collections import Counter, OrderedDict, deque

from ._registry import case


# --- helpers ---------------------------------------------------------------
class _Node:
    def __init__(self, val, nxt=None):
        self.val, self.next = val, nxt


def _to_list(values):
    head = tail = None
    for v in values:
        node = _Node(v)
        if tail:
            tail.next = node
        else:
            head = node
        tail = node
    return head


def _from_list(head):
    out = []
    while head:
        out.append(head.val)
        head = head.next
    return out


class _Tree:
    def __init__(self, val):
        self.val, self.left, self.right = val, None, None


def _build_tree(vals):
    if not vals or vals[0] is None:
        return None
    root = _Tree(vals[0])
    q, i = deque([root]), 1
    while q and i < len(vals):
        node = q.popleft()
        if i < len(vals) and vals[i] is not None:
            node.left = _Tree(vals[i])
            q.append(node.left)
        i += 1
        if i < len(vals) and vals[i] is not None:
            node.right = _Tree(vals[i])
            q.append(node.right)
        i += 1
    return root


# --- linked lists ----------------------------------------------------------
@case([1, 2, 3], expect=[3, 2, 1])
def p161_reverse_linked_list(values):
    """Reverse a linked list

    Walk the list re-pointing each node's next to the previous node.
    O(n) time, O(1) space.
    """
    prev, cur = None, _to_list(values)
    while cur:
        cur.next, prev, cur = prev, cur, cur.next
    return _from_list(prev)


@case([1, 2, 3, 4, 5], expect=3)
@case([1, 2, 3, 4], expect=3)
def p162_middle_of_linked_list(values):
    """Middle of a linked list

    Slow/fast pointers: when fast reaches the end, slow is in the middle.
    For even length it returns the second middle.
    """
    slow = fast = _to_list(values)
    while fast and fast.next:
        slow, fast = slow.next, fast.next.next
    return slow.val


@case([3, 2, 0, -4], 1, expect=True)
@case([1, 2], -1, expect=False)
def p163_has_cycle(values, pos):
    """Detect a cycle in a linked list (Floyd)

    `pos` is the index the tail links back to (-1 for none). A fast pointer
    laps a slow pointer if and only if there is a cycle. O(n), O(1).
    """
    head = _to_list(values)
    if pos >= 0:
        nodes, n = [], head
        while n:
            nodes.append(n)
            n = n.next
        nodes[-1].next = nodes[pos]
    slow = fast = head
    while fast and fast.next:
        slow, fast = slow.next, fast.next.next
        if slow is fast:
            return True
    return False


@case([1, 2, 4], [1, 3, 4], expect=[1, 1, 2, 3, 4, 4])
def p164_merge_two_sorted_lists(a, b):
    """Merge two sorted linked lists

    A dummy head plus a tail pointer; always attach the smaller node. O(n+m).
    """
    x, y = _to_list(a), _to_list(b)
    dummy = tail = _Node(0)
    while x and y:
        if x.val <= y.val:
            tail.next, x = x, x.next
        else:
            tail.next, y = y, y.next
        tail = tail.next
    tail.next = x or y
    return _from_list(dummy.next)


# --- stacks / queues / caches (custom tests live in tests/test_structures.py) --
class p165_MinStack:
    """Min Stack - push, pop, top and get_min in O(1)

    Keep a second stack of running minimums so the current minimum is always
    on top of it.
    """

    def __init__(self):
        self._stack, self._mins = [], []

    def push(self, x):
        self._stack.append(x)
        self._mins.append(x if not self._mins else min(x, self._mins[-1]))

    def pop(self):
        self._mins.pop()
        return self._stack.pop()

    def top(self):
        return self._stack[-1]

    def get_min(self):
        return self._mins[-1]


class p166_QueueUsingStacks:
    """Queue using two stacks

    Push onto `inbox`; when `outbox` is empty, pour inbox into it (reversing
    order). Amortised O(1) per operation.
    """

    def __init__(self):
        self._in, self._out = [], []

    def push(self, x):
        self._in.append(x)

    def _shift(self):
        if not self._out:
            while self._in:
                self._out.append(self._in.pop())

    def pop(self):
        self._shift()
        return self._out.pop()

    def peek(self):
        self._shift()
        return self._out[-1]

    def empty(self):
        return not self._in and not self._out


class p167_LRUCache:
    """LRU Cache with O(1) get and put

    OrderedDict remembers usage order: move a key to the end on access and
    evict from the front when capacity is exceeded. (Interviewers also like
    the dict + doubly-linked-list version.)
    """

    def __init__(self, capacity):
        self.capacity, self._d = capacity, OrderedDict()

    def get(self, key):
        if key not in self._d:
            return -1
        self._d.move_to_end(key)
        return self._d[key]

    def put(self, key, value):
        self._d[key] = value
        self._d.move_to_end(key)
        if len(self._d) > self.capacity:
            self._d.popitem(last=False)


# --- trees -----------------------------------------------------------------
@case([1, None, 2, 3], expect=[1, 3, 2])
def p168_inorder_traversal(vals):
    """Binary tree inorder traversal

    Left, node, right. Iterative version uses an explicit stack. For a BST the
    output is sorted.
    """
    out, stack, node = [], [], _build_tree(vals)
    while stack or node:
        while node:
            stack.append(node)
            node = node.left
        node = stack.pop()
        out.append(node.val)
        node = node.right
    return out


@case([3, 9, 20, None, None, 15, 7], expect=3)
@case([], expect=0)
def p169_tree_height(vals):
    """Height (max depth) of a binary tree

    1 + max(height(left), height(right)). O(n).
    """
    def h(n):
        return 0 if n is None else 1 + max(h(n.left), h(n.right))

    return h(_build_tree(vals))


@case([3, 9, 20, None, None, 15, 7], expect=[[3], [9, 20], [15, 7]])
def p170_level_order(vals):
    """Level-order (BFS) traversal of a tree

    Process the queue one level at a time. O(n).
    """
    root = _build_tree(vals)
    out, q = [], deque([root] if root else [])
    while q:
        level = []
        for _ in range(len(q)):
            n = q.popleft()
            level.append(n.val)
            q.extend(c for c in (n.left, n.right) if c)
        out.append(level)
    return out


@case([2, 1, 3], expect=True)
@case([5, 1, 4, None, None, 3, 6], expect=False)
def p171_is_valid_bst(vals):
    """Validate a binary search tree

    Pass down the allowed (low, high) range for each node; checking only the
    parent is a classic mistake. O(n).
    """
    def ok(n, lo, hi):
        return n is None or (lo < n.val < hi and ok(n.left, lo, n.val) and ok(n.right, n.val, hi))

    return ok(_build_tree(vals), float("-inf"), float("inf"))


# --- matrices --------------------------------------------------------------
@case([[1, 2, 3], [4, 5, 6]], expect=[[1, 4], [2, 5], [3, 6]])
def p172_transpose_matrix(m):
    """Transpose a matrix

    zip(*m) groups the i-th element of each row.
    """
    return [list(r) for r in zip(*m)]


@case([[1, 2], [3, 4]], expect=[[3, 1], [4, 2]])
def p173_rotate_matrix_90(m):
    """Rotate a matrix 90 degrees clockwise

    Reverse the rows, then transpose.
    """
    return [list(r) for r in zip(*m[::-1])]


@case([[1, 2, 3], [4, 5, 6], [7, 8, 9]], expect=[1, 2, 3, 6, 9, 8, 7, 4, 5])
def p174_spiral_order(matrix):
    """Spiral order of a matrix

    Take the first row, rotate the rest counter-clockwise, repeat. O(n*m).
    """
    m, res = [list(r) for r in matrix], []
    while m:
        res += m.pop(0)
        m = [list(r) for r in zip(*m)][::-1]
    return res


@case([[1, 3, 5], [7, 9, 11]], 9, expect=True)
@case([[1, 3, 5], [7, 9, 11]], 4, expect=False)
def p175_search_row_col_sorted_matrix(matrix, target):
    """Search a matrix with sorted rows and columns

    Start at the top-right: move left if too big, down if too small.
    O(rows + cols).
    """
    r, c = 0, len(matrix[0]) - 1
    while r < len(matrix) and c >= 0:
        v = matrix[r][c]
        if v == target:
            return True
        if v > target:
            c -= 1
        else:
            r += 1
    return False


# --- dynamic programming / recursion ---------------------------------------
@case(5, expect=8)
@case(1, expect=1)
@case(2, expect=2)
def p176_climbing_stairs(n):
    """Climbing stairs (1 or 2 steps)

    ways(n) = ways(n-1) + ways(n-2), i.e. Fibonacci. O(n), O(1).
    """
    a, b = 1, 1
    for _ in range(n - 1):
        a, b = b, a + b
    return b


@case([1, 2, 5], 11, expect=3)
@case([2], 3, expect=-1)
@case([1], 0, expect=0)
def p177_coin_change(coins, amount):
    """Minimum coins to make an amount

    dp[a] = 1 + min(dp[a - coin]) over all coins. O(amount * coins).
    """
    dp = [0] + [float("inf")] * amount
    for a in range(1, amount + 1):
        for c in coins:
            if c <= a:
                dp[a] = min(dp[a], dp[a - c] + 1)
    return -1 if dp[amount] == float("inf") else dp[amount]


@case("abcde", "ace", expect=3)
def p178_lcs_length(a, b):
    """Longest common subsequence length

    dp[i][j] = match ? 1 + dp[i-1][j-1] : max(dp[i-1][j], dp[i][j-1]).
    O(n*m).
    """
    prev = [0] * (len(b) + 1)
    for ca in a:
        cur = [0]
        for j, cb in enumerate(b, 1):
            cur.append(prev[j - 1] + 1 if ca == cb else max(prev[j], cur[j - 1]))
        prev = cur
    return prev[-1]


@case([1, 3, 4, 5], [1, 4, 5, 7], 7, expect=9)
def p179_knapsack_01(weights, values, capacity):
    """0/1 knapsack

    dp[w] = best value with capacity w; iterate capacities downwards so each
    item is used at most once. O(n * W).
    """
    dp = [0] * (capacity + 1)
    for wt, val in zip(weights, values):
        for w in range(capacity, wt - 1, -1):
            dp[w] = max(dp[w], dp[w - wt] + val)
    return dp[capacity]


@case([10, 9, 2, 5, 3, 7, 101, 18], expect=4)
def p180_longest_increasing_subsequence(nums):
    """Longest increasing subsequence

    Patience sorting with binary search: `tails[i]` is the smallest tail of an
    increasing subsequence of length i+1. O(n log n).
    """
    from bisect import bisect_left
    tails = []
    for n in nums:
        i = bisect_left(tails, n)
        if i == len(tails):
            tails.append(n)
        else:
            tails[i] = n
    return len(tails)


@case([2, 7, 9, 3, 1], expect=12)
def p181_house_robber(nums):
    """House robber (no two adjacent)

    Keep best-with and best-without the previous house. O(n), O(1).
    """
    take, skip = 0, 0
    for n in nums:
        take, skip = skip + n, max(take, skip)
    return max(take, skip)


@case([1, 2, 3], expect=[[], [1], [1, 2], [1, 2, 3], [1, 3], [2], [2, 3], [3]])
def p182_subsets(nums):
    """All subsets (power set)

    Backtracking: for each element choose to include it or not. 2^n results.
    """
    res = []

    def go(i, cur):
        if i == len(nums):
            res.append(cur[:])
            return
        go(i + 1, cur)
        cur.append(nums[i])
        go(i + 1, cur)
        cur.pop()

    go(0, [])
    return sorted(res)


@case([1, 2, 3], expect=[[1, 2, 3], [1, 3, 2], [2, 1, 3], [2, 3, 1], [3, 1, 2], [3, 2, 1]])
def p183_permutations(nums):
    """All permutations

    Backtracking: pick any unused element for the next position. n! results.
    """
    res = []

    def go(cur, rest):
        if not rest:
            res.append(cur)
        for i in range(len(rest)):
            go(cur + [rest[i]], rest[:i] + rest[i + 1:])

    go([], list(nums))
    return sorted(res)


@case(2, expect=[("A", "B"), ("A", "C"), ("B", "C")])
def p184_tower_of_hanoi(n, src="A", aux="B", dst="C"):
    """Tower of Hanoi moves

    Move n-1 discs to the spare peg, move the biggest, move n-1 back on top.
    Takes 2^n - 1 moves.
    """
    if n == 0:
        return []
    return (p184_tower_of_hanoi(n - 1, src, dst, aux) + [(src, dst)]
            + p184_tower_of_hanoi(n - 1, aux, src, dst))


@case(4, expect=2)
@case(6, expect=4)
@case(1, expect=1)
def p185_n_queens_count(n):
    """N-Queens: count solutions

    Place one queen per row, tracking used columns and both diagonals in
    sets (backtracking).
    """
    cols, d1, d2 = set(), set(), set()

    def go(r):
        if r == n:
            return 1
        total = 0
        for c in range(n):
            if c in cols or r - c in d1 or r + c in d2:
                continue
            cols.add(c), d1.add(r - c), d2.add(r + c)
            total += go(r + 1)
            cols.remove(c), d1.remove(r - c), d2.remove(r + c)
        return total

    return go(0)


# --- graphs ----------------------------------------------------------------
_G = {"A": ["B", "C"], "B": ["D"], "C": ["D"], "D": []}


@case(_G, "A", expect=["A", "B", "C", "D"])
def p186_graph_bfs(graph, start):
    """Breadth-first search

    A queue visits nodes level by level; a visited set avoids revisiting.
    Finds shortest paths in unweighted graphs. O(V+E).
    """
    seen, order, q = {start}, [], deque([start])
    while q:
        n = q.popleft()
        order.append(n)
        for nb in graph[n]:
            if nb not in seen:
                seen.add(nb)
                q.append(nb)
    return order


@case(_G, "A", expect=["A", "B", "D", "C"])
def p187_graph_dfs(graph, start):
    """Depth-first search

    Go as deep as possible before backtracking (recursion or an explicit
    stack). O(V+E).
    """
    seen, order = set(), []

    def go(n):
        seen.add(n)
        order.append(n)
        for nb in graph[n]:
            if nb not in seen:
                go(nb)

    go(start)
    return order


@case([[1, 1, 0], [0, 1, 0], [1, 0, 1]], expect=3)
def p188_number_of_islands(grid):
    """Number of islands

    Flood-fill every unvisited land cell (DFS/BFS) and count the fills.
    """
    g = [row[:] for row in grid]
    count = 0
    for r in range(len(g)):
        for c in range(len(g[0])):
            if g[r][c] == 1:
                count += 1
                stack = [(r, c)]
                while stack:
                    i, j = stack.pop()
                    if 0 <= i < len(g) and 0 <= j < len(g[0]) and g[i][j] == 1:
                        g[i][j] = 0
                        stack += [(i + 1, j), (i - 1, j), (i, j + 1), (i, j - 1)]
    return count


@case([[0, 0, 0], [1, 1, 0], [0, 0, 0]], (0, 0), (2, 2), expect=4)
@case([[0, 1], [1, 0]], (0, 0), (1, 1), expect=-1)
def p189_shortest_path_grid(grid, start, end):
    """Shortest path in a grid (0 = open, 1 = wall)

    BFS from the start; the first time we reach the target is the shortest
    number of steps. O(rows*cols).
    """
    start, end = tuple(start), tuple(end)
    q, seen = deque([(start, 0)]), {start}
    while q:
        (r, c), d = q.popleft()
        if (r, c) == end:
            return d
        for nr, nc in ((r + 1, c), (r - 1, c), (r, c + 1), (r, c - 1)):
            if 0 <= nr < len(grid) and 0 <= nc < len(grid[0]) and grid[nr][nc] == 0 and (nr, nc) not in seen:
                seen.add((nr, nc))
                q.append(((nr, nc), d + 1))
    return -1


@case(3, expect=["((()))", "(()())", "(())()", "()(())", "()()()"])
def p190_generate_parentheses(n):
    """Generate all valid parentheses combinations

    Backtracking: add '(' while opens < n, add ')' while closes < opens.
    """
    res = []

    def go(cur, o, c):
        if len(cur) == 2 * n:
            res.append(cur)
            return
        if o < n:
            go(cur + "(", o + 1, c)
        if c < o:
            go(cur + ")", o, c + 1)

    go("", 0, 0)
    return res


@case("leetcode", ["leet", "code"], expect=True)
@case("catsandog", ["cats", "dog", "sand", "and", "cat"], expect=False)
def p191_word_break(s, words):
    """Word break

    dp[i] is True if s[:i] can be built from dictionary words. O(n^2).
    """
    ws = set(words)
    dp = [True] + [False] * len(s)
    for i in range(1, len(s) + 1):
        dp[i] = any(dp[j] and s[j:i] in ws for j in range(i))
    return dp[-1]


@case([[1, 2, 3], [4, 5, 6], [7, 8, 9]], expect=(15, 15))
def p192_diagonal_sums(m):
    """Sum of both diagonals

    Main diagonal m[i][i] and anti-diagonal m[i][n-1-i].
    """
    n = len(m)
    return sum(m[i][i] for i in range(n)), sum(m[i][n - 1 - i] for i in range(n))


@case([1, 1, 1, 2, 2, 3], 2, expect=[1, 2])
def p193_top_k_frequent(nums, k):
    """Top K frequent elements

    Counter.most_common(k) uses a heap internally: O(n log k).
    """
    return [n for n, _ in Counter(nums).most_common(k)]


@case([[1, 3], [2, 6], [8, 10], [15, 18]], expect=[[1, 6], [8, 10], [15, 18]])
def p194_merge_intervals(intervals):
    """Merge overlapping intervals

    Sort by start; extend the last interval whenever the next one overlaps.
    O(n log n).
    """
    out = []
    for s, e in sorted(intervals):
        if out and s <= out[-1][1]:
            out[-1][1] = max(out[-1][1], e)
        else:
            out.append([s, e])
    return out


@case([[0, 30], [5, 10], [15, 20]], expect=False)
@case([[7, 10], [2, 4]], expect=True)
def p195_can_attend_meetings(intervals):
    """Can a person attend all meetings?

    Sort by start and check no meeting starts before the previous one ends.
    """
    s = sorted(intervals)
    return all(a[1] <= b[0] for a, b in zip(s, s[1:]))


@case([7, 10, 4, 3, 20, 15], 3, expect=7)
def p196_kth_smallest(nums, k):
    """Kth smallest element

    heapq.nsmallest, O(n log k).
    """
    return heapq.nsmallest(k, nums)[-1]


class p197_Trie:
    """Trie (prefix tree)

    Each node maps a character to a child. insert/search/starts_with all cost
    O(length of word). Great for autocomplete.
    """

    def __init__(self):
        self.root = {}

    def insert(self, word):
        node = self.root
        for ch in word:
            node = node.setdefault(ch, {})
        node["$"] = True

    def _walk(self, s):
        node = self.root
        for ch in s:
            if ch not in node:
                return None
            node = node[ch]
        return node

    def search(self, word):
        node = self._walk(word)
        return bool(node and "$" in node)

    def starts_with(self, prefix):
        return self._walk(prefix) is not None


@case(["2", "1", "+", "3", "*"], expect=9)
@case(["4", "13", "5", "/", "+"], expect=6)
def p198_eval_rpn(tokens):
    """Evaluate Reverse Polish Notation

    Push numbers on a stack; an operator pops two and pushes the result.
    Division truncates toward zero.
    """
    st = []
    for t in tokens:
        if t in "+-*/" and len(t) == 1:
            b, a = st.pop(), st.pop()
            st.append(a + b if t == "+" else a - b if t == "-" else a * b if t == "*" else int(a / b))
        else:
            st.append(int(t))
    return st[0]


@case([73, 74, 75, 71, 69, 72, 76, 73], expect=[1, 1, 4, 2, 1, 1, 0, 0])
def p199_daily_temperatures(temps):
    """Daily temperatures (days until a warmer day)

    Monotonic stack of indices with unresolved temperatures. O(n).
    """
    res, st = [0] * len(temps), []
    for i, t in enumerate(temps):
        while st and temps[st[-1]] < t:
            j = st.pop()
            res[j] = i - j
        st.append(i)
    return res


@case("12", expect=2)
@case("226", expect=3)
@case("06", expect=0)
def p200_decode_ways(s):
    """Decode ways (A=1 ... Z=26)

    dp over positions: a single digit 1-9 and a valid two-digit 10-26 each
    contribute ways. O(n).
    """
    if not s or s[0] == "0":
        return 0
    prev, cur = 1, 1
    for i in range(1, len(s)):
        new = 0
        if s[i] != "0":
            new += cur
        if 10 <= int(s[i - 1:i + 1]) <= 26:
            new += prev
        prev, cur = cur, new
    return cur
