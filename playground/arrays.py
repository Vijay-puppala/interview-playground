"""Array / list programs (p061-p120). Docstring = title, blank line, explanation."""
import heapq
from bisect import bisect_left, bisect_right
from collections import Counter, deque

from ._registry import case


@case([3, 1, 4, 1, 5, 9, 2, 6], expect=(1, 9))
def p061_find_min_max(nums):
    """Find the minimum and maximum

    Single pass keeping both; avoids sorting (O(n log n)). O(n).
    """
    lo = hi = nums[0]
    for n in nums[1:]:
        lo, hi = min(lo, n), max(hi, n)
    return lo, hi


@case([10, 5, 20, 8], expect=10)
@case([5, 5], expect=None)
def p062_second_largest(nums):
    """Second largest distinct element

    Deduplicate with a set, then take the second from the top. O(n log n);
    a two-variable single pass gives O(n).
    """
    uniq = sorted(set(nums))
    return uniq[-2] if len(uniq) > 1 else None


@case([3, 2, 1, 5, 6, 4], 2, expect=5)
def p063_kth_largest(nums, k):
    """Kth largest element

    heapq.nlargest keeps a heap of size k: O(n log k).
    """
    return heapq.nlargest(k, nums)[-1]


@case([1, 2, 3, 4], expect=(10, 2.5))
def p064_sum_and_average(nums):
    """Sum and average of numbers

    Basic warm-up; guard against empty input in real code.
    """
    total = sum(nums)
    return total, total / len(nums)


@case([1, 2, 3], expect=[3, 2, 1])
def p065_reverse_array(nums):
    """Reverse an array in place (two pointers)

    Swap the ends and move towards the middle. O(n) time, O(1) space.
    """
    nums = list(nums)
    i, j = 0, len(nums) - 1
    while i < j:
        nums[i], nums[j] = nums[j], nums[i]
        i, j = i + 1, j - 1
    return nums


@case([1, 2, 3, 4, 5], 2, expect=[3, 4, 5, 1, 2])
@case([], 3, expect=[])
def p066_rotate_left(nums, k):
    """Rotate an array left by k

    Slice at k % n and swap the two halves. O(n).
    """
    if not nums:
        return []
    k %= len(nums)
    return nums[k:] + nums[:k]


@case([1, 2, 3, 4, 5], 2, expect=[4, 5, 1, 2, 3])
@case([1, 2, 3], 7, expect=[3, 1, 2])
def p067_rotate_right(nums, k):
    """Rotate an array right by k

    Take the last k % n items and put them in front. O(n).
    """
    if not nums:
        return []
    k %= len(nums)
    return nums[-k:] + nums[:-k] if k else list(nums)


@case([1, 1, 2, 2, 3], expect=[1, 2, 3])
def p068_remove_duplicates_sorted(nums):
    """Remove duplicates from a sorted array

    Two pointers: write index only advances when a new value appears.
    O(n), O(1) extra space.
    """
    nums = list(nums)
    if not nums:
        return []
    w = 1
    for r in range(1, len(nums)):
        if nums[r] != nums[w - 1]:
            nums[w] = nums[r]
            w += 1
    return nums[:w]


@case([1, 2, 3, 2, 4, 3, 3], expect=[2, 3])
def p069_find_duplicates(nums):
    """Find all duplicate values

    Count with Counter and keep values seen more than once.
    """
    return sorted(n for n, c in Counter(nums).items() if c > 1)


@case([3, 0, 1], expect=2)
@case([0, 1], expect=2)
def p070_missing_number(nums):
    """Missing number in 0..n

    Expected sum n(n+1)/2 minus the actual sum. O(n), O(1) space.
    """
    n = len(nums)
    return n * (n + 1) // 2 - sum(nums)


@case([2, 7, 11, 15], 9, expect=[0, 1])
@case([3, 2, 4], 6, expect=[1, 2])
@case([1, 2], 10, expect=[])
def p071_two_sum(nums, target):
    """Two Sum - indices of two numbers adding to target

    Store value -> index in a dict; for each number look up its complement.
    O(n) time, the classic interview opener.
    """
    seen = {}
    for i, n in enumerate(nums):
        if target - n in seen:
            return [seen[target - n], i]
        seen[n] = i
    return []


@case([-1, 0, 1, 2, -1, -4], expect=[[-1, -1, 2], [-1, 0, 1]])
@case([0, 0, 0], expect=[[0, 0, 0]])
def p072_three_sum(nums):
    """Three Sum - unique triplets summing to zero

    Sort, fix one number, then use two pointers on the rest while skipping
    duplicates. O(n^2).
    """
    nums = sorted(nums)
    res = []
    for i, a in enumerate(nums):
        if i and a == nums[i - 1]:
            continue
        lo, hi = i + 1, len(nums) - 1
        while lo < hi:
            s = a + nums[lo] + nums[hi]
            if s < 0:
                lo += 1
            elif s > 0:
                hi -= 1
            else:
                res.append([a, nums[lo], nums[hi]])
                lo += 1
                while lo < hi and nums[lo] == nums[lo - 1]:
                    lo += 1
    return res


@case([-2, 1, -3, 4, -1, 2, 1, -5, 4], expect=6)
@case([-3, -1], expect=-1)
def p073_max_subarray_sum(nums):
    """Maximum subarray sum (Kadane's algorithm)

    At each element decide: extend the current subarray or start fresh.
    O(n), O(1).
    """
    best = cur = nums[0]
    for n in nums[1:]:
        cur = max(n, cur + n)
        best = max(best, cur)
    return best


@case([0, 1, 0, 3, 12], expect=[1, 3, 12, 0, 0])
def p074_move_zeros_to_end(nums):
    """Move zeros to the end keeping order

    Stable partition: non-zeros first, then pad with zeros. O(n).
    """
    nz = [n for n in nums if n != 0]
    return nz + [0] * (len(nums) - len(nz))


@case([1, 3, 5], [2, 4, 6], expect=[1, 2, 3, 4, 5, 6])
def p075_merge_sorted_arrays(a, b):
    """Merge two sorted arrays

    Two pointers pick the smaller head each step. O(n + m).
    """
    i = j = 0
    out = []
    while i < len(a) and j < len(b):
        if a[i] <= b[j]:
            out.append(a[i])
            i += 1
        else:
            out.append(b[j])
            j += 1
    return out + a[i:] + b[j:]


@case([1, 2, 2, 1], [2, 2], expect=[2])
def p076_intersection(a, b):
    """Intersection of two arrays (unique values)

    Set intersection, O(n + m).
    """
    return sorted(set(a) & set(b))


@case([1, 2, 3], [3, 4], expect=[1, 2, 3, 4])
def p077_union(a, b):
    """Union of two arrays

    Set union, sorted for a stable result.
    """
    return sorted(set(a) | set(b))


@case([1, 2, 2, 3], expect=True)
@case([3, 1], expect=False)
def p078_is_sorted(nums):
    """Check if an array is sorted ascending

    Every adjacent pair must be in order. O(n).
    """
    return all(a <= b for a, b in zip(nums, nums[1:]))


@case([1, 3, 5, 7, 9], 7, expect=3)
@case([1, 3, 5, 7, 9], 4, expect=-1)
def p079_binary_search(nums, target):
    """Binary search

    Halve the search range each step on a sorted array. O(log n).
    """
    lo, hi = 0, len(nums) - 1
    while lo <= hi:
        mid = (lo + hi) // 2
        if nums[mid] == target:
            return mid
        if nums[mid] < target:
            lo = mid + 1
        else:
            hi = mid - 1
    return -1


@case([4, 2, 7], 7, expect=2)
@case([4, 2, 7], 9, expect=-1)
def p080_linear_search(nums, target):
    """Linear search

    Scan until found. O(n); works on unsorted data.
    """
    for i, n in enumerate(nums):
        if n == target:
            return i
    return -1


@case([5, 1, 4, 2, 8], expect=[1, 2, 4, 5, 8])
def p081_bubble_sort(nums):
    """Bubble sort

    Repeatedly swap adjacent out-of-order items; stop early when a pass makes
    no swaps. O(n^2) worst, O(n) best.
    """
    a = list(nums)
    for end in range(len(a) - 1, 0, -1):
        swapped = False
        for i in range(end):
            if a[i] > a[i + 1]:
                a[i], a[i + 1] = a[i + 1], a[i]
                swapped = True
        if not swapped:
            break
    return a


@case([64, 25, 12, 22, 11], expect=[11, 12, 22, 25, 64])
def p082_selection_sort(nums):
    """Selection sort

    Pick the minimum of the unsorted part and swap it to the front. O(n^2).
    """
    a = list(nums)
    for i in range(len(a)):
        m = min(range(i, len(a)), key=a.__getitem__)
        a[i], a[m] = a[m], a[i]
    return a


@case([12, 11, 13, 5, 6], expect=[5, 6, 11, 12, 13])
def p083_insertion_sort(nums):
    """Insertion sort

    Insert each item into the already sorted prefix. O(n^2), great for
    nearly-sorted data.
    """
    a = list(nums)
    for i in range(1, len(a)):
        key, j = a[i], i - 1
        while j >= 0 and a[j] > key:
            a[j + 1] = a[j]
            j -= 1
        a[j + 1] = key
    return a


@case([38, 27, 43, 3, 9, 82, 10], expect=[3, 9, 10, 27, 38, 43, 82])
def p084_merge_sort(nums):
    """Merge sort

    Divide in halves, sort recursively, merge. Stable, O(n log n) always.
    """
    if len(nums) <= 1:
        return list(nums)
    mid = len(nums) // 2
    left, right = p084_merge_sort(nums[:mid]), p084_merge_sort(nums[mid:])
    out, i, j = [], 0, 0
    while i < len(left) and j < len(right):
        if left[i] <= right[j]:
            out.append(left[i])
            i += 1
        else:
            out.append(right[j])
            j += 1
    return out + left[i:] + right[j:]


@case([10, 7, 8, 9, 1, 5], expect=[1, 5, 7, 8, 9, 10])
def p085_quick_sort(nums):
    """Quick sort

    Partition around a pivot into smaller / equal / larger and recurse.
    Average O(n log n), worst O(n^2).
    """
    if len(nums) <= 1:
        return list(nums)
    pivot = nums[len(nums) // 2]
    return (p085_quick_sort([n for n in nums if n < pivot])
            + [n for n in nums if n == pivot]
            + p085_quick_sort([n for n in nums if n > pivot]))


@case([1, 2, 2, 3, 3, 3], expect={1: 1, 2: 2, 3: 3})
def p086_count_frequency(nums):
    """Frequency of each element

    Counter does it in one pass. O(n).
    """
    return dict(Counter(nums))


@case([2, 2, 1, 1, 1, 2, 2], expect=2)
@case([1, 2, 3], expect=None)
def p087_majority_element(nums):
    """Majority element (appears more than n/2 times)

    Boyer-Moore voting finds a candidate in O(1) space; a second pass
    verifies it really is a majority.
    """
    cand, votes = None, 0
    for n in nums:
        if votes == 0:
            cand = n
        votes += 1 if n == cand else -1
    return cand if nums.count(cand) > len(nums) // 2 else None


@case([16, 17, 4, 3, 5, 2], expect=[17, 5, 2])
def p088_leaders_in_array(nums):
    """Leaders: elements greater than everything to their right

    Scan from the right tracking the maximum so far. O(n).
    """
    out, mx = [], float("-inf")
    for n in reversed(nums):
        if n > mx:
            out.append(n)
            mx = n
    return out[::-1]


@case([-7, 1, 5, 2, -4, 3, 0], expect=3)
@case([1, 2, 3], expect=-1)
def p089_equilibrium_index(nums):
    """Equilibrium index (left sum equals right sum)

    Keep a running left sum; right sum = total - left - current. O(n).
    """
    total, left = sum(nums), 0
    for i, n in enumerate(nums):
        if left == total - left - n:
            return i
        left += n
    return -1


@case([1, 2, 3, 4], expect=[1, 3, 6, 10])
def p090_prefix_sums(nums):
    """Prefix (running) sums

    itertools.accumulate; prefix sums let you answer range-sum queries in O(1).
    """
    from itertools import accumulate
    return list(accumulate(nums))


@case([1, 2, 3, 4], expect=[24, 12, 8, 6])
@case([1, 0, 3], expect=[0, 3, 0])
def p091_product_except_self(nums):
    """Product of array except self (no division)

    Multiply prefix products by suffix products. O(n), O(1) extra space.
    """
    out, acc = [1] * len(nums), 1
    for i in range(len(nums)):
        out[i] = acc
        acc *= nums[i]
    acc = 1
    for i in range(len(nums) - 1, -1, -1):
        out[i] *= acc
        acc *= nums[i]
    return out


@case([2, 3, -2, 4], expect=6)
@case([-2, 0, -1], expect=0)
@case([-2, 3, -4], expect=24)
def p092_max_product_subarray(nums):
    """Maximum product subarray

    Track both the max and min product ending here, because a negative number
    can flip the min into the max.
    """
    best = hi = lo = nums[0]
    for n in nums[1:]:
        cands = (n, hi * n, lo * n)
        hi, lo = max(cands), min(cands)
        best = max(best, hi)
    return best


@case([1, 1, 1], 2, expect=2)
@case([1, 2, 3], 3, expect=2)
def p093_subarray_sum_equals_k(nums, k):
    """Count subarrays with sum k

    Prefix sums + hash map: if prefix - k was seen before, a subarray ends
    here. O(n).
    """
    seen, total, count = Counter({0: 1}), 0, 0
    for n in nums:
        total += n
        count += seen[total - k]
        seen[total] += 1
    return count


@case([100, 4, 200, 1, 3, 2], expect=4)
def p094_longest_consecutive_sequence(nums):
    """Longest consecutive sequence

    Put numbers in a set and only start counting from sequence starts
    (n-1 not in set). O(n).
    """
    s, best = set(nums), 0
    for n in s:
        if n - 1 not in s:
            m = n
            while m + 1 in s:
                m += 1
            best = max(best, m - n + 1)
    return best


@case([1, 2, 3, 1], expect=True)
@case([1, 2, 3], expect=False)
def p095_contains_duplicate(nums):
    """Does the array contain duplicates?

    A set shorter than the list means a duplicate exists. O(n).
    """
    return len(set(nums)) != len(nums)


@case([5, 20, 3, 2, 50, 80], 78, expect=True)
@case([5, 20, 3, 2, 50, 80], 100, expect=False)
def p096_pair_with_difference(nums, diff):
    """Is there a pair with the given difference?

    For each n, check if n + diff was already seen (hash set). O(n).
    """
    seen = set()
    for n in nums:
        if n - diff in seen or n + diff in seen:
            return True
        seen.add(n)
    return False


@case([2, 0, 1, 2, 0, 1], expect=[0, 0, 1, 1, 2, 2])
def p097_sort_zeros_ones_twos(nums):
    """Sort an array of 0s, 1s and 2s (Dutch national flag)

    Three pointers partition the array in one pass. O(n), O(1).
    """
    a = list(nums)
    lo, mid, hi = 0, 0, len(a) - 1
    while mid <= hi:
        if a[mid] == 0:
            a[lo], a[mid] = a[mid], a[lo]
            lo, mid = lo + 1, mid + 1
        elif a[mid] == 1:
            mid += 1
        else:
            a[mid], a[hi] = a[hi], a[mid]
            hi -= 1
    return a


@case([1, [2, [3, [4]], 5]], expect=[1, 2, 3, 4, 5])
def p098_flatten_nested_list(items):
    """Flatten an arbitrarily nested list

    Recurse into any element that is a list. Useful for nested JSON.
    """
    out = []
    for it in items:
        out.extend(p098_flatten_nested_list(it) if isinstance(it, list) else [it])
    return out


@case([1, 2, 3, 4, 5], 2, expect=[[1, 2], [3, 4], [5]])
def p099_chunk_list(nums, size):
    """Split a list into chunks of a given size

    Slice with a step of `size`. Used for batching and test sharding.
    """
    return [nums[i:i + size] for i in range(0, len(nums), size)]


@case([1, 5, 7, -1, 5], 6, expect=[(-1, 7), (1, 5)])
def p100_find_all_pairs_with_sum(nums, target):
    """All unique pairs that add up to target

    Track seen values; each match adds a sorted tuple to a set to avoid
    duplicates. O(n).
    """
    seen, pairs = set(), set()
    for n in nums:
        if target - n in seen:
            pairs.add(tuple(sorted((n, target - n))))
        seen.add(n)
    return sorted(pairs)


@case([7, 1, 5, 3, 6, 4], expect=5)
@case([7, 6, 4, 3, 1], expect=0)
def p101_max_profit(prices):
    """Best time to buy and sell a stock once

    Track the lowest price so far and the best profit selling today. O(n).
    """
    low, best = float("inf"), 0
    for p in prices:
        low = min(low, p)
        best = max(best, p - low)
    return best


@case([1, 8, 6, 2, 5, 4, 8, 3, 7], expect=49)
def p102_container_with_most_water(heights):
    """Container with most water

    Two pointers from both ends; always move the shorter wall inward because
    only that can increase the area. O(n).
    """
    lo, hi, best = 0, len(heights) - 1, 0
    while lo < hi:
        best = max(best, (hi - lo) * min(heights[lo], heights[hi]))
        if heights[lo] < heights[hi]:
            lo += 1
        else:
            hi -= 1
    return best


@case([0, 1, 0, 2, 1, 0, 1, 3, 2, 1, 2, 1], expect=6)
@case([4, 2, 0, 3, 2, 5], expect=9)
def p103_trapping_rain_water(heights):
    """Trapping rain water

    Two pointers with running left/right maxima: water above a bar is
    min(maxL, maxR) - height. O(n), O(1).
    """
    lo, hi = 0, len(heights) - 1
    lmax = rmax = water = 0
    while lo < hi:
        if heights[lo] < heights[hi]:
            lmax = max(lmax, heights[lo])
            water += lmax - heights[lo]
            lo += 1
        else:
            rmax = max(rmax, heights[hi])
            water += rmax - heights[hi]
            hi -= 1
    return water


@case([4, 5, 2, 25], expect=[5, 25, 25, -1])
def p104_next_greater_element(nums):
    """Next greater element for each item

    Monotonic stack of indices still waiting for a greater value. O(n).
    """
    res, stack = [-1] * len(nums), []
    for i, n in enumerate(nums):
        while stack and nums[stack[-1]] < n:
            res[stack.pop()] = n
        stack.append(i)
    return res


@case([1, 3, -1, -3, 5, 3, 6, 7], 3, expect=[3, 3, 5, 5, 6, 7])
def p105_sliding_window_maximum(nums, k):
    """Sliding window maximum

    A deque of indices keeps decreasing values; the front is the window max.
    O(n).
    """
    dq, out = deque(), []
    for i, n in enumerate(nums):
        while dq and nums[dq[-1]] <= n:
            dq.pop()
        dq.append(i)
        if dq[0] <= i - k:
            dq.popleft()
        if i >= k - 1:
            out.append(nums[dq[0]])
    return out


@case([2, 1, 5, 1, 3, 2], 3, expect=9)
def p106_max_sum_subarray_of_size_k(nums, k):
    """Maximum sum of a subarray of size k

    Fixed sliding window: add the new element, drop the old one. O(n).
    """
    cur = sum(nums[:k])
    best = cur
    for i in range(k, len(nums)):
        cur += nums[i] - nums[i - k]
        best = max(best, cur)
    return best


@case([3, 4, -1, 1], expect=2)
@case([1, 2, 0], expect=3)
@case([7, 8, 9], expect=1)
def p107_first_missing_positive(nums):
    """First missing positive integer

    Put the values in a set and count up from 1. O(n); the in-place
    index-swap trick makes it O(1) space.
    """
    s, i = set(nums), 1
    while i in s:
        i += 1
    return i


@case([1, -2, 3, -4, -5, 6], expect=[-2, -4, -5, 1, 3, 6])
def p108_negatives_first(nums):
    """Move negatives before positives (stable)

    Stable partition using two comprehensions. O(n).
    """
    return [n for n in nums if n < 0] + [n for n in nums if n >= 0]


@case([3, 2, 2, 3], 3, expect=[2, 2])
def p109_remove_element(nums, val):
    """Remove all instances of a value

    Keep everything that is not equal to val.
    """
    return [n for n in nums if n != val]


@case([1, 2, 3, 1], expect=2)
@case([1, 2, 1, 3, 5, 6, 4], expect=5)
def p110_find_peak_element(nums):
    """Find a peak element (greater than its neighbours)

    Binary search: if the right neighbour is bigger, a peak lies to the
    right; otherwise to the left (or here). O(log n).
    """
    lo, hi = 0, len(nums) - 1
    while lo < hi:
        mid = (lo + hi) // 2
        if nums[mid] < nums[mid + 1]:
            lo = mid + 1
        else:
            hi = mid
    return lo


@case([3, 1, 3, 2, 1], expect=[3, 1, 2])
def p111_unique_preserve_order(nums):
    """Unique elements preserving order

    dict.fromkeys keeps first occurrences in order.
    """
    return list(dict.fromkeys(nums))


@case([1, 2, 3, 4], [2, 4], expect=[1, 3])
def p112_array_difference(a, b):
    """Elements in a that are not in b

    Put b in a set for O(1) lookups. Handy for comparing expected vs actual.
    """
    sb = set(b)
    return [x for x in a if x not in sb]


@case([4, 5, 6, 7, 0, 1, 2], expect=0)
@case([1], expect=1)
def p113_min_in_rotated_sorted(nums):
    """Minimum in a rotated sorted array

    Binary search: if mid is greater than the last element the minimum is to
    the right. O(log n).
    """
    lo, hi = 0, len(nums) - 1
    while lo < hi:
        mid = (lo + hi) // 2
        if nums[mid] > nums[hi]:
            lo = mid + 1
        else:
            hi = mid
    return nums[lo]


@case([4, 5, 6, 7, 0, 1, 2], 0, expect=4)
@case([4, 5, 6, 7, 0, 1, 2], 3, expect=-1)
def p114_search_rotated(nums, target):
    """Search in a rotated sorted array

    Binary search; one half is always sorted, so decide which half can
    contain the target. O(log n).
    """
    lo, hi = 0, len(nums) - 1
    while lo <= hi:
        mid = (lo + hi) // 2
        if nums[mid] == target:
            return mid
        if nums[lo] <= nums[mid]:
            if nums[lo] <= target < nums[mid]:
                hi = mid - 1
            else:
                lo = mid + 1
        else:
            if nums[mid] < target <= nums[hi]:
                lo = mid + 1
            else:
                hi = mid - 1
    return -1


@case([5, 7, 7, 8, 8, 10], 8, expect=(3, 4))
@case([5, 7, 7, 8, 8, 10], 6, expect=(-1, -1))
def p115_first_last_position(nums, target):
    """First and last position of a value in a sorted array

    bisect_left / bisect_right give the boundaries in O(log n).
    """
    lo = bisect_left(nums, target)
    if lo == len(nums) or nums[lo] != target:
        return -1, -1
    return lo, bisect_right(nums, target) - 1


@case([3, 1, 2], expect=2)
@case([4, 1, 3, 2], expect=2.5)
def p116_median(nums):
    """Median of an array

    Sort; the middle element (odd) or the mean of the two middles (even).
    """
    s, n = sorted(nums), len(nums)
    mid = n // 2
    return s[mid] if n % 2 else (s[mid - 1] + s[mid]) / 2


@case([1, 2, 2, 3, 3], expect=[2, 3])
def p117_mode(nums):
    """Mode(s) of an array

    Counter gives frequencies; return every value with the max frequency.
    """
    c = Counter(nums)
    top = max(c.values())
    return sorted(n for n, f in c.items() if f == top)


@case([4, 5, 6, 5, 4, 4], expect=[4, 4, 4, 5, 5, 6])
def p118_sort_by_frequency(nums):
    """Sort by frequency (then by value)

    sorted() with a key of (-count, value).
    """
    c = Counter(nums)
    return sorted(nums, key=lambda n: (-c[n], n))


@case([2, 4, 1, 3, 5], expect=3)
@case([5, 4, 3, 2, 1], expect=10)
def p119_count_inversions(nums):
    """Count inversions

    Merge sort and count how many elements jump over others while merging.
    O(n log n) versus O(n^2) brute force.
    """
    def sort(a):
        if len(a) <= 1:
            return a, 0
        mid = len(a) // 2
        (l, lc), (r, rc) = sort(a[:mid]), sort(a[mid:])
        out, i, j, inv = [], 0, 0, lc + rc
        while i < len(l) and j < len(r):
            if l[i] <= r[j]:
                out.append(l[i])
                i += 1
            else:
                out.append(r[j])
                j += 1
                inv += len(l) - i
        return out + l[i:] + r[j:], inv

    return sort(list(nums))[1]


@case([1, 2], [1, 2, 3], expect=True)
@case([1, 4], [1, 2, 3], expect=False)
def p120_is_subset(a, b):
    """Is a a subset of b?

    set.issubset, O(len(a)).
    """
    return set(a) <= set(b)
