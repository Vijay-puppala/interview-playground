// ---- p061_findMinMax
function p061_findMinMax(nums: number[]): [number, number] {
  let lo = nums[0];
  let hi = nums[0];
  for (const n of nums) {
    lo = Math.min(lo, n);
    hi = Math.max(hi, n);
  }
  return [lo, hi];
}

// ---- p062_secondLargest
function p062_secondLargest(nums: number[]): number | null {
  const uniq = [...new Set(nums)].sort((a, b) => a - b);
  return uniq.length > 1 ? uniq[uniq.length - 2] : null;
}

// ---- p063_kthLargest
function p063_kthLargest(nums: number[], k: number): number {
  return [...nums].sort((a, b) => b - a)[k - 1];
}

// ---- p064_sumAndAverage
function p064_sumAndAverage(nums: number[]): [number, number] {
  const total = nums.reduce((a, b) => a + b, 0);
  return [total, total / nums.length];
}

// ---- p065_reverseArray
function p065_reverseArray(nums: number[]): number[] {
  const a = [...nums];
  let i = 0;
  let j = a.length - 1;
  while (i < j) {
    [a[i], a[j]] = [a[j], a[i]];
    i++;
    j--;
  }
  return a;
}

// ---- p066_rotateLeft
function p066_rotateLeft(nums: number[], k: number): number[] {
  if (nums.length === 0) return [];
  k %= nums.length;
  return [...nums.slice(k), ...nums.slice(0, k)];
}

// ---- p067_rotateRight
function p067_rotateRight(nums: number[], k: number): number[] {
  if (nums.length === 0) return [];
  k %= nums.length;
  return k ? [...nums.slice(-k), ...nums.slice(0, -k)] : [...nums];
}

// ---- p068_removeDuplicatesSorted
function p068_removeDuplicatesSorted(nums: number[]): number[] {
  if (nums.length === 0) return [];
  const a = [...nums];
  let w = 1;
  for (let r = 1; r < a.length; r++) {
    if (a[r] !== a[w - 1]) a[w++] = a[r];
  }
  return a.slice(0, w);
}

// ---- p069_findDuplicates
function p069_findDuplicates(nums: number[]): number[] {
  const counts = new Map<number, number>();
  for (const n of nums) counts.set(n, (counts.get(n) ?? 0) + 1);
  return [...counts].filter(([, c]) => c > 1).map(([n]) => n).sort((a, b) => a - b);
}

// ---- p070_missingNumber
function p070_missingNumber(nums: number[]): number {
  const n = nums.length;
  return (n * (n + 1)) / 2 - nums.reduce((a, b) => a + b, 0);
}

// ---- p071_twoSum
function p071_twoSum(nums: number[], target: number): number[] {
  const seen = new Map<number, number>();
  for (let i = 0; i < nums.length; i++) {
    const j = seen.get(target - nums[i]);
    if (j !== undefined) return [j, i];
    seen.set(nums[i], i);
  }
  return [];
}

// ---- p072_threeSum
function p072_threeSum(nums: number[]): number[][] {
  const a = [...nums].sort((x, y) => x - y);
  const res: number[][] = [];
  for (let i = 0; i < a.length; i++) {
    if (i > 0 && a[i] === a[i - 1]) continue;
    let lo = i + 1;
    let hi = a.length - 1;
    while (lo < hi) {
      const s = a[i] + a[lo] + a[hi];
      if (s < 0) lo++;
      else if (s > 0) hi--;
      else {
        res.push([a[i], a[lo], a[hi]]);
        lo++;
        while (lo < hi && a[lo] === a[lo - 1]) lo++;
      }
    }
  }
  return res;
}

// ---- p073_maxSubarraySum
function p073_maxSubarraySum(nums: number[]): number {
  let best = nums[0];
  let cur = nums[0];
  for (const n of nums.slice(1)) {
    cur = Math.max(n, cur + n);
    best = Math.max(best, cur);
  }
  return best;
}

// ---- p074_moveZerosToEnd
function p074_moveZerosToEnd(nums: number[]): number[] {
  const nonZero = nums.filter((n) => n !== 0);
  return [...nonZero, ...new Array(nums.length - nonZero.length).fill(0)];
}

// ---- p075_mergeSortedArrays
function p075_mergeSortedArrays(a: number[], b: number[]): number[] {
  const out: number[] = [];
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) out.push(a[i] <= b[j] ? a[i++] : b[j++]);
  return [...out, ...a.slice(i), ...b.slice(j)];
}

// ---- p076_intersection
function p076_intersection(a: number[], b: number[]): number[] {
  const sb = new Set(b);
  return [...new Set(a)].filter((x) => sb.has(x)).sort((x, y) => x - y);
}

// ---- p077_union
function p077_union(a: number[], b: number[]): number[] {
  return [...new Set([...a, ...b])].sort((x, y) => x - y);
}

// ---- p078_isSorted
function p078_isSorted(nums: number[]): boolean {
  return nums.every((n, i) => i === 0 || nums[i - 1] <= n);
}

// ---- p079_binarySearch
function p079_binarySearch(nums: number[], target: number): number {
  let lo = 0;
  let hi = nums.length - 1;
  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2);
    if (nums[mid] === target) return mid;
    if (nums[mid] < target) lo = mid + 1;
    else hi = mid - 1;
  }
  return -1;
}

// ---- p080_linearSearch
function p080_linearSearch(nums: number[], target: number): number {
  for (let i = 0; i < nums.length; i++) if (nums[i] === target) return i;
  return -1;
}

// ---- p081_bubbleSort
function p081_bubbleSort(nums: number[]): number[] {
  const a = [...nums];
  for (let end = a.length - 1; end > 0; end--) {
    let swapped = false;
    for (let i = 0; i < end; i++) {
      if (a[i] > a[i + 1]) {
        [a[i], a[i + 1]] = [a[i + 1], a[i]];
        swapped = true;
      }
    }
    if (!swapped) break;
  }
  return a;
}

// ---- p082_selectionSort
function p082_selectionSort(nums: number[]): number[] {
  const a = [...nums];
  for (let i = 0; i < a.length; i++) {
    let m = i;
    for (let j = i + 1; j < a.length; j++) if (a[j] < a[m]) m = j;
    [a[i], a[m]] = [a[m], a[i]];
  }
  return a;
}

// ---- p083_insertionSort
function p083_insertionSort(nums: number[]): number[] {
  const a = [...nums];
  for (let i = 1; i < a.length; i++) {
    const key = a[i];
    let j = i - 1;
    while (j >= 0 && a[j] > key) {
      a[j + 1] = a[j];
      j--;
    }
    a[j + 1] = key;
  }
  return a;
}

// ---- p084_mergeSort
function p084_mergeSort(nums: number[]): number[] {
  if (nums.length <= 1) return [...nums];
  const mid = Math.floor(nums.length / 2);
  const left = p084_mergeSort(nums.slice(0, mid));
  const right = p084_mergeSort(nums.slice(mid));
  const out: number[] = [];
  let i = 0;
  let j = 0;
  while (i < left.length && j < right.length) out.push(left[i] <= right[j] ? left[i++] : right[j++]);
  return [...out, ...left.slice(i), ...right.slice(j)];
}

// ---- p085_quickSort
function p085_quickSort(nums: number[]): number[] {
  if (nums.length <= 1) return [...nums];
  const pivot = nums[Math.floor(nums.length / 2)];
  return [
    ...p085_quickSort(nums.filter((n) => n < pivot)),
    ...nums.filter((n) => n === pivot),
    ...p085_quickSort(nums.filter((n) => n > pivot)),
  ];
}

// ---- p086_countFrequency
function p086_countFrequency(nums: number[]): Record<number, number> {
  const freq: Record<number, number> = {};
  for (const n of nums) freq[n] = (freq[n] ?? 0) + 1;
  return freq;
}

// ---- p087_majorityElement
function p087_majorityElement(nums: number[]): number | null {
  let cand: number | null = null;
  let votes = 0;
  for (const n of nums) {
    if (votes === 0) cand = n;
    votes += n === cand ? 1 : -1;
  }
  return nums.filter((n) => n === cand).length > nums.length / 2 ? cand : null;
}

// ---- p088_leadersInArray
function p088_leadersInArray(nums: number[]): number[] {
  const out: number[] = [];
  let max = -Infinity;
  for (let i = nums.length - 1; i >= 0; i--) {
    if (nums[i] > max) {
      out.push(nums[i]);
      max = nums[i];
    }
  }
  return out.reverse();
}

// ---- p089_equilibriumIndex
function p089_equilibriumIndex(nums: number[]): number {
  const total = nums.reduce((a, b) => a + b, 0);
  let left = 0;
  for (let i = 0; i < nums.length; i++) {
    if (left === total - left - nums[i]) return i;
    left += nums[i];
  }
  return -1;
}

// ---- p090_prefixSums
function p090_prefixSums(nums: number[]): number[] {
  let running = 0;
  return nums.map((n) => (running += n));
}

// ---- p091_productExceptSelf
function p091_productExceptSelf(nums: number[]): number[] {
  const out = new Array<number>(nums.length).fill(1);
  let acc = 1;
  for (let i = 0; i < nums.length; i++) {
    out[i] = acc;
    acc *= nums[i];
  }
  acc = 1;
  for (let i = nums.length - 1; i >= 0; i--) {
    out[i] *= acc;
    acc *= nums[i];
  }
  return out;
}

// ---- p092_maxProductSubarray
function p092_maxProductSubarray(nums: number[]): number {
  let best = nums[0];
  let hi = nums[0];
  let lo = nums[0];
  for (const n of nums.slice(1)) {
    const cands = [n, hi * n, lo * n];
    hi = Math.max(...cands);
    lo = Math.min(...cands);
    best = Math.max(best, hi);
  }
  return best;
}

// ---- p093_subarraySumEqualsK
function p093_subarraySumEqualsK(nums: number[], k: number): number {
  const seen = new Map<number, number>([[0, 1]]);
  let total = 0;
  let count = 0;
  for (const n of nums) {
    total += n;
    count += seen.get(total - k) ?? 0;
    seen.set(total, (seen.get(total) ?? 0) + 1);
  }
  return count;
}

// ---- p094_longestConsecutiveSequence
function p094_longestConsecutiveSequence(nums: number[]): number {
  const s = new Set(nums);
  let best = 0;
  for (const n of s) {
    if (!s.has(n - 1)) {
      let m = n;
      while (s.has(m + 1)) m++;
      best = Math.max(best, m - n + 1);
    }
  }
  return best;
}

// ---- p095_containsDuplicate
function p095_containsDuplicate(nums: number[]): boolean {
  return new Set(nums).size !== nums.length;
}

// ---- p096_pairWithDifference
function p096_pairWithDifference(nums: number[], diff: number): boolean {
  const seen = new Set<number>();
  for (const n of nums) {
    if (seen.has(n - diff) || seen.has(n + diff)) return true;
    seen.add(n);
  }
  return false;
}

// ---- p097_sortZerosOnesTwos
function p097_sortZerosOnesTwos(nums: number[]): number[] {
  const a = [...nums];
  let lo = 0;
  let mid = 0;
  let hi = a.length - 1;
  while (mid <= hi) {
    if (a[mid] === 0) [a[lo++], a[mid++]] = [a[mid], a[lo]];
    else if (a[mid] === 1) mid++;
    else [a[mid], a[hi--]] = [a[hi], a[mid]];
  }
  return a;
}

// ---- p098_flattenNestedList
function p098_flattenNestedList(items: unknown[]): unknown[] {
  const out: unknown[] = [];
  for (const it of items) {
    if (Array.isArray(it)) out.push(...p098_flattenNestedList(it));
    else out.push(it);
  }
  return out;
}

// ---- p099_chunkList
function p099_chunkList<T>(nums: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < nums.length; i += size) out.push(nums.slice(i, i + size));
  return out;
}

// ---- p100_findAllPairsWithSum
function p100_findAllPairsWithSum(nums: number[], target: number): [number, number][] {
  const seen = new Set<number>();
  const pairs = new Map<string, [number, number]>();
  for (const n of nums) {
    if (seen.has(target - n)) {
      const pair: [number, number] = n < target - n ? [n, target - n] : [target - n, n];
      pairs.set(pair.join(), pair);
    }
    seen.add(n);
  }
  return [...pairs.values()].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
}

// ---- p101_maxProfit
function p101_maxProfit(prices: number[]): number {
  let low = Infinity;
  let best = 0;
  for (const p of prices) {
    low = Math.min(low, p);
    best = Math.max(best, p - low);
  }
  return best;
}

// ---- p102_containerWithMostWater
function p102_containerWithMostWater(heights: number[]): number {
  let lo = 0;
  let hi = heights.length - 1;
  let best = 0;
  while (lo < hi) {
    best = Math.max(best, (hi - lo) * Math.min(heights[lo], heights[hi]));
    if (heights[lo] < heights[hi]) lo++;
    else hi--;
  }
  return best;
}

// ---- p103_trappingRainWater
function p103_trappingRainWater(heights: number[]): number {
  let lo = 0;
  let hi = heights.length - 1;
  let lmax = 0;
  let rmax = 0;
  let water = 0;
  while (lo < hi) {
    if (heights[lo] < heights[hi]) {
      lmax = Math.max(lmax, heights[lo]);
      water += lmax - heights[lo++];
    } else {
      rmax = Math.max(rmax, heights[hi]);
      water += rmax - heights[hi--];
    }
  }
  return water;
}

// ---- p104_nextGreaterElement
function p104_nextGreaterElement(nums: number[]): number[] {
  const res = new Array<number>(nums.length).fill(-1);
  const stack: number[] = [];
  nums.forEach((n, i) => {
    while (stack.length && nums[stack[stack.length - 1]] < n) res[stack.pop()!] = n;
    stack.push(i);
  });
  return res;
}

// ---- p105_slidingWindowMaximum
function p105_slidingWindowMaximum(nums: number[], k: number): number[] {
  const dq: number[] = [];
  const out: number[] = [];
  nums.forEach((n, i) => {
    while (dq.length && nums[dq[dq.length - 1]] <= n) dq.pop();
    dq.push(i);
    if (dq[0] <= i - k) dq.shift();
    if (i >= k - 1) out.push(nums[dq[0]]);
  });
  return out;
}

// ---- p106_maxSumSubarrayOfSizeK
function p106_maxSumSubarrayOfSizeK(nums: number[], k: number): number {
  let cur = nums.slice(0, k).reduce((a, b) => a + b, 0);
  let best = cur;
  for (let i = k; i < nums.length; i++) {
    cur += nums[i] - nums[i - k];
    best = Math.max(best, cur);
  }
  return best;
}

// ---- p107_firstMissingPositive
function p107_firstMissingPositive(nums: number[]): number {
  const s = new Set(nums);
  let i = 1;
  while (s.has(i)) i++;
  return i;
}

// ---- p108_negativesFirst
function p108_negativesFirst(nums: number[]): number[] {
  return [...nums.filter((n) => n < 0), ...nums.filter((n) => n >= 0)];
}

// ---- p109_removeElement
function p109_removeElement(nums: number[], val: number): number[] {
  return nums.filter((n) => n !== val);
}

// ---- p110_findPeakElement
function p110_findPeakElement(nums: number[]): number {
  let lo = 0;
  let hi = nums.length - 1;
  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2);
    if (nums[mid] < nums[mid + 1]) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

// ---- p111_uniquePreserveOrder
function p111_uniquePreserveOrder(nums: number[]): number[] {
  return [...new Set(nums)];
}

// ---- p112_arrayDifference
function p112_arrayDifference(a: number[], b: number[]): number[] {
  const sb = new Set(b);
  return a.filter((x) => !sb.has(x));
}

// ---- p113_minInRotatedSorted
function p113_minInRotatedSorted(nums: number[]): number {
  let lo = 0;
  let hi = nums.length - 1;
  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2);
    if (nums[mid] > nums[hi]) lo = mid + 1;
    else hi = mid;
  }
  return nums[lo];
}

// ---- p114_searchRotated
function p114_searchRotated(nums: number[], target: number): number {
  let lo = 0;
  let hi = nums.length - 1;
  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2);
    if (nums[mid] === target) return mid;
    if (nums[lo] <= nums[mid]) {
      if (nums[lo] <= target && target < nums[mid]) hi = mid - 1;
      else lo = mid + 1;
    } else if (nums[mid] < target && target <= nums[hi]) lo = mid + 1;
    else hi = mid - 1;
  }
  return -1;
}

// ---- p115_firstLastPosition
function p115_firstLastPosition(nums: number[], target: number): [number, number] {
  const lowerBound = (x: number): number => {
    let lo = 0;
    let hi = nums.length;
    while (lo < hi) {
      const mid = Math.floor((lo + hi) / 2);
      if (nums[mid] < x) lo = mid + 1;
      else hi = mid;
    }
    return lo;
  };
  const first = lowerBound(target);
  if (first === nums.length || nums[first] !== target) return [-1, -1];
  return [first, lowerBound(target + 1) - 1];
}

// ---- p116_median
function p116_median(nums: number[]): number {
  const s = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

// ---- p117_mode
function p117_mode(nums: number[]): number[] {
  const counts = new Map<number, number>();
  for (const n of nums) counts.set(n, (counts.get(n) ?? 0) + 1);
  const top = Math.max(...counts.values());
  return [...counts].filter(([, c]) => c === top).map(([n]) => n).sort((a, b) => a - b);
}

// ---- p118_sortByFrequency
function p118_sortByFrequency(nums: number[]): number[] {
  const counts = new Map<number, number>();
  for (const n of nums) counts.set(n, (counts.get(n) ?? 0) + 1);
  return [...nums].sort((a, b) => counts.get(b)! - counts.get(a)! || a - b);
}

// ---- p119_countInversions
function p119_countInversions(nums: number[]): number {
  const sort = (a: number[]): [number[], number] => {
    if (a.length <= 1) return [a, 0];
    const mid = Math.floor(a.length / 2);
    const [l, lc] = sort(a.slice(0, mid));
    const [r, rc] = sort(a.slice(mid));
    const out: number[] = [];
    let i = 0;
    let j = 0;
    let inv = lc + rc;
    while (i < l.length && j < r.length) {
      if (l[i] <= r[j]) out.push(l[i++]);
      else {
        out.push(r[j++]);
        inv += l.length - i;
      }
    }
    return [[...out, ...l.slice(i), ...r.slice(j)], inv];
  };
  return sort([...nums])[1];
}

// ---- p120_isSubset
function p120_isSubset(a: number[], b: number[]): boolean {
  const sb = new Set(b);
  return a.every((x) => sb.has(x));
}
