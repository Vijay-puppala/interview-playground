"""String programs (p001-p060). Docstring = title, blank line, explanation."""
import re
import string as _string
from collections import Counter

from ._registry import case


@case("hello", expect="olleh")
@case("", expect="")
def p001_reverse_string(s):
    """Reverse a string

    Slicing with a step of -1 walks the string backwards. Interviewers often
    also want the two-pointer swap, but slicing is the idiomatic answer.
    Time O(n), space O(n).
    """
    return s[::-1]


@case("A man, a plan, a canal: Panama", expect=True)
@case("hello", expect=False)
def p002_is_palindrome(s):
    """Check if a string is a palindrome (ignoring case and symbols)

    Keep only alphanumerics, lower-case them, then compare with the reverse.
    Time O(n), space O(n).
    """
    cleaned = [c.lower() for c in s if c.isalnum()]
    return cleaned == cleaned[::-1]


@case("Listen", "Silent", expect=True)
@case("abc", "abd", expect=False)
def p003_is_anagram(a, b):
    """Check if two strings are anagrams

    Two strings are anagrams when their character counts are equal.
    Counter builds the frequency maps in O(n).
    """
    norm = lambda x: Counter(x.replace(" ", "").lower())
    return norm(a) == norm(b)


@case("Hello World", expect=(3, 7))
def p004_count_vowels_consonants(s):
    """Count vowels and consonants

    Walk the letters once; anything alphabetic that is not a vowel is a
    consonant. Time O(n).
    """
    vowels = consonants = 0
    for ch in s.lower():
        if ch.isalpha():
            if ch in "aeiou":
                vowels += 1
            else:
                consonants += 1
    return vowels, consonants


@case("aabbc", expect={"a": 2, "b": 2, "c": 1})
def p005_char_frequency(s):
    """Character frequency map

    A dict (or Counter) maps each character to its count; one pass, O(n).
    """
    freq = {}
    for ch in s:
        freq[ch] = freq.get(ch, 0) + 1
    return freq


@case("swiss", expect="w")
@case("aabb", expect=None)
def p006_first_non_repeating_char(s):
    """First non-repeating character

    Count every character, then scan again and return the first with count 1.
    Two passes, O(n).
    """
    counts = Counter(s)
    for ch in s:
        if counts[ch] == 1:
            return ch
    return None


@case("abcabc", expect="a")
@case("abc", expect=None)
def p007_first_repeating_char(s):
    """First repeating character

    Track seen characters in a set; the first one already seen is the answer.
    Time O(n), space O(k).
    """
    seen = set()
    for ch in s:
        if ch in seen:
            return ch
        seen.add(ch)
    return None


@case("banana", expect="ban")
def p008_remove_duplicates_preserve_order(s):
    """Remove duplicate characters, keep first occurrences

    dict.fromkeys keeps insertion order (Python 3.7+), so it de-duplicates
    while preserving order. O(n).
    """
    return "".join(dict.fromkeys(s))


@case("the sky is blue", expect="blue is sky the")
@case("  hello   world ", expect="world hello")
def p009_reverse_words(s):
    """Reverse the order of words

    split() without arguments collapses runs of whitespace; reverse the list
    and join with single spaces. O(n).
    """
    return " ".join(reversed(s.split()))


@case("hello world", expect="olleh dlrow")
def p010_reverse_each_word(s):
    """Reverse every word but keep word order

    Split into words, reverse each with slicing, join back. O(n).
    """
    return " ".join(w[::-1] for w in s.split(" "))


@case("hello big world", expect="Hello Big World")
def p011_capitalize_words(s):
    """Capitalize the first letter of each word

    Upper-case the first character and lower-case the rest of every word
    (what str.title does, minus its apostrophe quirks).
    """
    return " ".join(w[:1].upper() + w[1:].lower() for w in s.split(" "))


@case("The quick brown fox jumps over the lazy dog", expect=True)
@case("hello world", expect=False)
def p012_is_pangram(s):
    """Check if a sentence is a pangram

    A pangram contains all 26 letters, so the alphabet must be a subset of
    the letters in the sentence. O(n).
    """
    return set(_string.ascii_lowercase) <= set(s.lower())


@case("I love automation testing", expect="automation")
def p013_longest_word(s):
    """Find the longest word

    max() with key=len returns the first longest word. O(n).
    """
    return max(s.split(), key=len)


@case("  hello   world  ", expect=2)
@case("", expect=0)
def p014_count_words(s):
    """Count the words in a sentence

    split() ignores leading, trailing and repeated whitespace. O(n).
    """
    return len(s.split())


@case("aabcccccaaa", expect="a2b1c5a3")
@case("", expect="")
def p015_compress_string(s):
    """Run-length encode a string

    Walk the string, counting how long each run of the same character is, and
    emit char+count. O(n).
    """
    if not s:
        return ""
    out, count = [], 1
    for prev, cur in zip(s, s[1:] + "\0"):
        if cur == prev:
            count += 1
        else:
            out.append(f"{prev}{count}")
            count = 1
    return "".join(out)


@case("a2b1c5a3", expect="aabcccccaaa")
@case("x12", expect="x" * 12)
def p016_decompress_string(s):
    """Decode a run-length encoded string

    A regex pulls out (char, digits) pairs; multi-digit counts work. O(n).
    """
    return "".join(ch * int(n) for ch, n in re.findall(r"(\D)(\d+)", s))


@case("abcabcbb", expect=3)
@case("bbbbb", expect=1)
@case("pwwkew", expect=3)
@case("", expect=0)
def p017_longest_unique_substring_length(s):
    """Longest substring without repeating characters

    Sliding window: remember the last index of each char; when a repeat shows
    up inside the window, move the left edge past it. O(n).
    """
    last, start, best = {}, 0, 0
    for i, ch in enumerate(s):
        if ch in last and last[ch] >= start:
            start = last[ch] + 1
        last[ch] = i
        best = max(best, i - start + 1)
    return best


@case("babad", expect="bab")
@case("cbbd", expect="bb")
def p018_longest_palindromic_substring(s):
    """Longest palindromic substring

    Expand around every possible centre (odd and even length) and keep the
    longest. Time O(n^2), space O(1).
    """
    best = ""
    for centre in range(len(s)):
        for lo, hi in ((centre, centre), (centre, centre + 1)):
            while lo >= 0 and hi < len(s) and s[lo] == s[hi]:
                lo, hi = lo - 1, hi + 1
            if hi - lo - 1 > len(best):
                best = s[lo + 1:hi]
    return best


@case(["flower", "flow", "flight"], expect="fl")
@case(["dog", "car"], expect="")
def p019_longest_common_prefix(words):
    """Longest common prefix of a list of strings

    Shrink the first word until every other word starts with it. O(total chars).
    """
    if not words:
        return ""
    prefix = words[0]
    for w in words[1:]:
        while not w.startswith(prefix):
            prefix = prefix[:-1]
    return prefix


@case("waterbottle", "erbottlewat", expect=True)
@case("abc", "acb", expect=False)
def p020_is_rotation(a, b):
    """Check if one string is a rotation of another

    b is a rotation of a exactly when b appears inside a+a (and lengths match).
    """
    return len(a) == len(b) and b in a + a


@case("Hello World", expect="hELLO wORLD")
def p021_swap_case(s):
    """Swap upper and lower case

    Flip each letter's case; characters without case are left alone.
    """
    return "".join(c.lower() if c.isupper() else c.upper() for c in s)


@case(" a b\tc\n", expect="abc")
def p022_remove_whitespace(s):
    """Remove all whitespace

    split() drops every whitespace run and join glues the pieces back.
    """
    return "".join(s.split())


@case("Mr John Smith", expect="Mr%20John%20Smith")
def p023_urlify_spaces(s):
    """Replace spaces with %20 (URLify)

    Same as str.replace; in a coding round you may be asked to do it in place.
    """
    return s.replace(" ", "%20")


@case("()[]{}", expect=True)
@case("([)]", expect=False)
@case("{[]}", expect=True)
@case("(", expect=False)
@case("", expect=True)
def p024_is_valid_parentheses(s):
    """Validate balanced brackets

    Push opening brackets on a stack; every closing bracket must match the top.
    The stack must be empty at the end. O(n).
    """
    pairs = {")": "(", "]": "[", "}": "{"}
    stack = []
    for ch in s:
        if ch in pairs:
            if not stack or stack.pop() != pairs[ch]:
                return False
        elif ch in pairs.values():
            stack.append(ch)
    return not stack


@case("aaaa", "aa", expect=3)
@case("hello", "l", expect=2)
def p025_count_overlapping_substring(s, sub):
    """Count (overlapping) occurrences of a substring

    str.count is non-overlapping, so test every start index with startswith.
    """
    return sum(s.startswith(sub, i) for i in range(len(s) - len(sub) + 1))


@case("sample string", expect="s")
def p026_max_occurring_char(s):
    """Most frequent character

    Counter.most_common(1) returns the most common element; ties go to the
    one seen first.
    """
    return Counter(s).most_common(1)[0][0]


@case("   -42abc", expect=-42)
@case("4193 with words", expect=4193)
@case("words 987", expect=0)
@case("91283472332", expect=2147483647)
def p027_my_atoi(s):
    """Implement atoi (string to integer)

    Regex grabs optional whitespace, sign and digits at the start; clamp the
    result to the 32-bit signed range.
    """
    m = re.match(r"\s*([+-]?\d+)", s)
    if not m:
        return 0
    return max(-2**31, min(2**31 - 1, int(m.group(1))))


@case(1994, expect="MCMXCIV")
@case(58, expect="LVIII")
def p028_int_to_roman(num):
    """Integer to Roman numeral

    Greedily subtract the largest roman value (including 900, 400, 90...)
    until the number is used up.
    """
    table = [(1000, "M"), (900, "CM"), (500, "D"), (400, "CD"), (100, "C"), (90, "XC"),
             (50, "L"), (40, "XL"), (10, "X"), (9, "IX"), (5, "V"), (4, "IV"), (1, "I")]
    out = []
    for value, sym in table:
        while num >= value:
            out.append(sym)
            num -= value
    return "".join(out)


@case("MCMXCIV", expect=1994)
@case("III", expect=3)
def p029_roman_to_int(s):
    """Roman numeral to integer

    If a symbol is smaller than the next one it is subtracted (IV = 4),
    otherwise added.
    """
    val = {"I": 1, "V": 5, "X": 10, "L": 50, "C": 100, "D": 500, "M": 1000}
    total = 0
    for i, ch in enumerate(s):
        if i + 1 < len(s) and val[ch] < val[s[i + 1]]:
            total -= val[ch]
        else:
            total += val[ch]
    return total


@case("12.5", expect=True)
@case("-3", expect=True)
@case("abc", expect=False)
@case("", expect=False)
@case("1.2.3", expect=False)
def p030_is_numeric_string(s):
    """Check if a string is a valid number

    A regex for optional sign, digits and optional fraction is stricter and
    more predictable than float(), which also accepts 'nan' and '1e5'.
    """
    return bool(re.fullmatch(r"[+-]?(\d+(\.\d*)?|\.\d+)", s))


@case("userFirstName", expect="user_first_name")
@case("HTTPResponseCode", expect="http_response_code")
def p031_camel_to_snake(s):
    """camelCase to snake_case

    Two regex passes insert underscores at word boundaries (handles acronyms
    like HTTP), then lower-case everything.
    """
    s = re.sub(r"(.)([A-Z][a-z]+)", r"\1_\2", s)
    return re.sub(r"([a-z0-9])([A-Z])", r"\1_\2", s).lower()


@case("user_first_name", expect="userFirstName")
def p032_snake_to_camel(s):
    """snake_case to camelCase

    Split on underscores; keep the first part, capitalise the rest.
    """
    first, *rest = s.split("_")
    return first + "".join(w.capitalize() for w in rest)


@case("abc", expect=True)
@case("aab", expect=False)
def p033_has_all_unique_chars(s):
    """Check if all characters are unique

    A set drops duplicates, so equal lengths mean all unique. O(n).
    """
    return len(set(s)) == len(s)


@case("hello", expect="ehllo")
def p034_sort_characters(s):
    """Sort the characters of a string

    sorted() returns a list of characters; join them back.
    """
    return "".join(sorted(s))


@case(["eat", "tea", "tan", "ate", "nat", "bat"],
      expect=[["ate", "eat", "tea"], ["bat"], ["nat", "tan"]])
def p035_group_anagrams(words):
    """Group anagrams together

    Anagrams share the same sorted-letters key; group words by that key in a
    dict. O(n * k log k).
    """
    groups = {}
    for w in words:
        groups.setdefault("".join(sorted(w)), []).append(w)
    return sorted(sorted(g) for g in groups.values())


@case("banana", "a", expect="bnn")
def p036_remove_char(s, ch):
    """Remove all occurrences of a character

    Filter the characters, or use str.replace(ch, '').
    """
    return "".join(c for c in s if c != ch)


@case("Hello World 123!", expect={"upper": 2, "lower": 8, "digits": 3, "special": 3})
def p037_classify_characters(s):
    """Count uppercase, lowercase, digits and special characters

    One pass using isupper/islower/isdigit; everything else (including
    spaces) counts as special.
    """
    r = {"upper": 0, "lower": 0, "digits": 0, "special": 0}
    for c in s:
        if c.isupper():
            r["upper"] += 1
        elif c.islower():
            r["lower"] += 1
        elif c.isdigit():
            r["digits"] += 1
        else:
            r["special"] += 1
    return r


@case("ace", "abcde", expect=True)
@case("aec", "abcde", expect=False)
def p038_is_subsequence(sub, s):
    """Check if one string is a subsequence of another

    Two pointers: advance through s, and advance in sub whenever the
    characters match. O(n).
    """
    it = iter(s)
    return all(ch in it for ch in sub)


@case("Hello, World!", 3, expect="Khoor, Zruog!")
@case("Khoor, Zruog!", -3, expect="Hello, World!")
def p039_caesar_cipher(s, shift):
    """Caesar cipher

    Shift each letter by `shift` positions with modulo 26 arithmetic,
    preserving case and leaving other characters unchanged.
    """
    out = []
    for c in s:
        if c.isalpha():
            base = ord("A") if c.isupper() else ord("a")
            out.append(chr((ord(c) - base + shift) % 26 + base))
        else:
            out.append(c)
    return "".join(out)


@case("Automation", expect="tmtn")
def p040_remove_vowels(s):
    """Remove all vowels

    Keep only characters that are not in 'aeiouAEIOU'.
    """
    return "".join(c for c in s if c not in "aeiouAEIOU")


@case("1010", "1011", expect="10101")
def p041_add_binary_strings(a, b):
    """Add two binary strings

    Convert with int(x, 2), add, convert back with bin().
    """
    return bin(int(a, 2) + int(b, 2))[2:]


@case("abc", expect=["abc", "acb", "bac", "bca", "cab", "cba"])
@case("aab", expect=["aab", "aba", "baa"])
def p042_string_permutations(s):
    """All unique permutations of a string

    itertools.permutations generates every ordering; a set removes duplicates
    when letters repeat. O(n! * n).
    """
    from itertools import permutations
    return sorted({"".join(p) for p in permutations(s)})


@case("egg", "add", expect=True)
@case("foo", "bar", expect=False)
@case("badc", "baba", expect=False)
def p043_is_isomorphic(a, b):
    """Check if two strings are isomorphic

    Characters must map one-to-one in both directions; compare the number of
    distinct (a, b) pairs against the distinct letters of each.
    """
    return len(a) == len(b) and len(set(zip(a, b))) == len(set(a)) == len(set(b))


@case("abba", "dog cat cat dog", expect=True)
@case("abba", "dog cat cat fish", expect=False)
@case("aaaa", "dog cat cat dog", expect=False)
def p044_word_pattern(pattern, text):
    """Word pattern (bijection between letters and words)

    Same idea as isomorphic strings, applied to the words of a sentence.
    """
    words = text.split()
    return len(pattern) == len(words) and len(set(zip(pattern, words))) == len(set(pattern)) == len(set(words))


@case("1234567812345678", expect="************5678")
def p045_mask_card_number(num):
    """Mask a card number except the last 4 digits

    A common SDET task: never print sensitive data in logs or reports.
    """
    return "*" * (len(num) - 4) + num[-4:]


@case("a1b22c3", expect=8)
def p046_sum_digits_in_string(s):
    """Sum all digit characters in a string

    Filter isdigit() characters and add them as ints.
    """
    return sum(int(c) for c in s if c.isdigit())


@case("abababa", "aba", expect=[0, 2, 4])
def p047_find_all_indices(s, sub):
    """Find all start indices of a substring (overlaps allowed)

    Repeatedly call str.find from one past the last hit.
    """
    out, i = [], s.find(sub)
    while i != -1:
        out.append(i)
        i = s.find(sub, i + 1)
    return out


@case("192.168.1.1", expect=True)
@case("256.1.1.1", expect=False)
@case("1.1.1", expect=False)
@case("01.1.1.1", expect=False)
@case("a.b.c.d", expect=False)
def p048_is_valid_ipv4(s):
    """Validate an IPv4 address

    Exactly four dot-separated numbers, each 0-255, no leading zeros.
    """
    parts = s.split(".")
    return len(parts) == 4 and all(
        p.isdigit() and 0 <= int(p) <= 255 and str(int(p)) == p for p in parts)


@case("test.user+qa@example.com", expect=True)
@case("bad@", expect=False)
@case("no_at.com", expect=False)
@case("a@b", expect=False)
def p049_is_valid_email(s):
    """Validate an email address with a regex

    Local part, @, domain with at least one dot. Real-world validation is
    far looser; this is the pragmatic interview answer.
    """
    return bool(re.fullmatch(r"[\w.+-]+@[\w-]+(\.[\w-]+)+", s))


@case("The cat and the hat", expect={"the": 2, "cat": 1, "and": 1, "hat": 1})
def p050_word_frequency(s):
    """Word frequency (case-insensitive)

    Lower-case, extract words with a regex, count with Counter.
    """
    return dict(Counter(re.findall(r"\w+", s.lower())))


@case("a b a c b a", expect="a")
def p051_most_common_word(s):
    """Most common word

    Counter over the words; most_common(1) gives the winner.
    """
    return Counter(s.lower().split()).most_common(1)[0][0]


@case("Hello, World! #QA", expect="Hello World QA")
def p052_remove_punctuation(s):
    """Remove punctuation

    str.translate with a table that deletes every punctuation character.
    """
    return s.translate(str.maketrans("", "", _string.punctuation))


@case("hello", expect="holle")
@case("leetcode", expect="leotcede")
def p053_reverse_vowels(s):
    """Reverse only the vowels of a string

    Collect the vowels, then rebuild the string popping vowels from the end.
    """
    vowels = [c for c in s if c in "aeiouAEIOU"]
    return "".join(vowels.pop() if c in "aeiouAEIOU" else c for c in s)


@case("abcd", "abcde", expect="e")
def p054_find_extra_char(a, b):
    """Find the extra character in the longer string

    Counter subtraction leaves just the added character.
    """
    return next(iter(Counter(b) - Counter(a)))


@case("pale", "ple", expect=True)
@case("pale", "bale", expect=True)
@case("pale", "bake", expect=False)
def p055_one_edit_away(a, b):
    """Are two strings at most one edit apart?

    One insert, delete or replace allowed. Walk both strings, tolerating a
    single mismatch. O(n).
    """
    if abs(len(a) - len(b)) > 1:
        return False
    if len(a) < len(b):
        a, b = b, a
    i = j = 0
    edited = False
    while i < len(a) and j < len(b):
        if a[i] != b[j]:
            if edited:
                return False
            edited = True
            if len(a) == len(b):
                j += 1
        else:
            j += 1
        i += 1
    return True


@case("Hello World", 8, expect="Hello...")
@case("Hi", 8, expect="Hi")
def p056_truncate_with_ellipsis(s, width):
    """Truncate text to a width with '...'

    Handy for assertion messages and log lines.
    """
    return s if len(s) <= width else s[:width - 3] + "..."


@case("aabbbcc", expect=("b", 3))
def p057_longest_run(s):
    """Longest run of the same character

    Track the current run length and the best seen so far. O(n).
    """
    best_ch, best, run = "", 0, 0
    for i, ch in enumerate(s):
        run = run + 1 if i and s[i - 1] == ch else 1
        if run > best:
            best_ch, best = ch, run
    return best_ch, best


@case("())", expect=1)
@case("(((", expect=3)
@case("()", expect=0)
def p058_min_add_to_make_valid(s):
    """Minimum parentheses to add for validity

    Track the open balance; a ')' with no open bracket needs one addition.
    """
    balance = added = 0
    for ch in s:
        if ch == "(":
            balance += 1
        elif balance:
            balance -= 1
        else:
            added += 1
    return added + balance


@case("karolin", "kathrin", expect=3)
def p059_hamming_distance(a, b):
    """Hamming distance of two equal-length strings

    Count positions where the characters differ.
    """
    return sum(x != y for x, y in zip(a, b))


@case("kitten", "sitting", expect=3)
@case("", "abc", expect=3)
def p060_levenshtein_distance(a, b):
    """Levenshtein (edit) distance

    Dynamic programming: dp[j] = fewest edits to turn a[:i] into b[:j];
    each step is an insert, delete or replace. O(n*m).
    """
    prev = list(range(len(b) + 1))
    for i, ca in enumerate(a, 1):
        cur = [i]
        for j, cb in enumerate(b, 1):
            cur.append(min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (ca != cb)))
        prev = cur
    return prev[-1]
