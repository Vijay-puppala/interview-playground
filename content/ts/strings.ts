// Block markers ("// ---- name") split this file into one snippet per program.

// ---- p001_reverseString
function p001_reverseString(s: string): string {
  return [...s].reverse().join("");
}

// ---- p002_isPalindrome
function p002_isPalindrome(s: string): boolean {
  const cleaned = s.toLowerCase().replace(/[^a-z0-9]/g, "");
  return cleaned === [...cleaned].reverse().join("");
}

// ---- p003_isAnagram
function p003_isAnagram(a: string, b: string): boolean {
  const norm = (x: string): string => [...x.replace(/ /g, "").toLowerCase()].sort().join("");
  return norm(a) === norm(b);
}

// ---- p004_countVowelsConsonants
function p004_countVowelsConsonants(s: string): [number, number] {
  let vowels = 0;
  let consonants = 0;
  for (const ch of s.toLowerCase()) {
    if (/[a-z]/.test(ch)) {
      if ("aeiou".includes(ch)) vowels++;
      else consonants++;
    }
  }
  return [vowels, consonants];
}

// ---- p005_charFrequency
function p005_charFrequency(s: string): Record<string, number> {
  const freq: Record<string, number> = {};
  for (const ch of s) freq[ch] = (freq[ch] ?? 0) + 1;
  return freq;
}

// ---- p006_firstNonRepeatingChar
function p006_firstNonRepeatingChar(s: string): string | null {
  const counts = p005_charFrequency(s);
  for (const ch of s) if (counts[ch] === 1) return ch;
  return null;
}

// ---- p007_firstRepeatingChar
function p007_firstRepeatingChar(s: string): string | null {
  const seen = new Set<string>();
  for (const ch of s) {
    if (seen.has(ch)) return ch;
    seen.add(ch);
  }
  return null;
}

// ---- p008_removeDuplicatesPreserveOrder
function p008_removeDuplicatesPreserveOrder(s: string): string {
  return [...new Set(s)].join("");
}

// ---- p009_reverseWords
function p009_reverseWords(s: string): string {
  return s.split(/\s+/).filter(Boolean).reverse().join(" ");
}

// ---- p010_reverseEachWord
function p010_reverseEachWord(s: string): string {
  return s.split(" ").map((w) => [...w].reverse().join("")).join(" ");
}

// ---- p011_capitalizeWords
function p011_capitalizeWords(s: string): string {
  return s.split(" ").map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ");
}

// ---- p012_isPangram
function p012_isPangram(s: string): boolean {
  const letters = new Set(s.toLowerCase().replace(/[^a-z]/g, ""));
  return letters.size === 26;
}

// ---- p013_longestWord
function p013_longestWord(s: string): string {
  return s.split(/\s+/).filter(Boolean).reduce((best, w) => (w.length > best.length ? w : best), "");
}

// ---- p014_countWords
function p014_countWords(s: string): number {
  return s.split(/\s+/).filter(Boolean).length;
}

// ---- p015_compressString
function p015_compressString(s: string): string {
  let out = "";
  let count = 1;
  for (let i = 1; i <= s.length; i++) {
    if (s[i] === s[i - 1]) {
      count++;
    } else {
      out += s[i - 1] + count;
      count = 1;
    }
  }
  return out;
}

// ---- p016_decompressString
function p016_decompressString(s: string): string {
  let out = "";
  for (const [, ch, n] of s.matchAll(/(\D)(\d+)/g)) out += ch.repeat(Number(n));
  return out;
}

// ---- p017_longestUniqueSubstringLength
function p017_longestUniqueSubstringLength(s: string): number {
  const last = new Map<string, number>();
  let start = 0;
  let best = 0;
  for (let i = 0; i < s.length; i++) {
    const seenAt = last.get(s[i]);
    if (seenAt !== undefined && seenAt >= start) start = seenAt + 1;
    last.set(s[i], i);
    best = Math.max(best, i - start + 1);
  }
  return best;
}

// ---- p018_longestPalindromicSubstring
function p018_longestPalindromicSubstring(s: string): string {
  let best = "";
  for (let centre = 0; centre < s.length; centre++) {
    for (const [a, b] of [[centre, centre], [centre, centre + 1]]) {
      let lo = a;
      let hi = b;
      while (lo >= 0 && hi < s.length && s[lo] === s[hi]) {
        lo--;
        hi++;
      }
      if (hi - lo - 1 > best.length) best = s.slice(lo + 1, hi);
    }
  }
  return best;
}

// ---- p019_longestCommonPrefix
function p019_longestCommonPrefix(words: string[]): string {
  if (words.length === 0) return "";
  let prefix = words[0];
  for (const w of words.slice(1)) {
    while (!w.startsWith(prefix)) prefix = prefix.slice(0, -1);
  }
  return prefix;
}

// ---- p020_isRotation
function p020_isRotation(a: string, b: string): boolean {
  return a.length === b.length && (a + a).includes(b);
}

// ---- p021_swapCase
function p021_swapCase(s: string): string {
  return [...s].map((c) => (c === c.toUpperCase() ? c.toLowerCase() : c.toUpperCase())).join("");
}

// ---- p022_removeWhitespace
function p022_removeWhitespace(s: string): string {
  return s.replace(/\s+/g, "");
}

// ---- p023_urlifySpaces
function p023_urlifySpaces(s: string): string {
  return s.replace(/ /g, "%20");
}

// ---- p024_isValidParentheses
function p024_isValidParentheses(s: string): boolean {
  const pairs: Record<string, string> = { ")": "(", "]": "[", "}": "{" };
  const stack: string[] = [];
  for (const ch of s) {
    if (ch in pairs) {
      if (stack.pop() !== pairs[ch]) return false;
    } else if ("([{".includes(ch)) {
      stack.push(ch);
    }
  }
  return stack.length === 0;
}

// ---- p025_countOverlappingSubstring
function p025_countOverlappingSubstring(s: string, sub: string): number {
  let count = 0;
  for (let i = 0; i <= s.length - sub.length; i++) if (s.startsWith(sub, i)) count++;
  return count;
}

// ---- p026_maxOccurringChar
function p026_maxOccurringChar(s: string): string {
  const freq = p005_charFrequency(s);
  let best = "";
  for (const ch of s) if (best === "" || freq[ch] > freq[best]) best = ch;
  return best;
}

// ---- p027_myAtoi
function p027_myAtoi(s: string): number {
  const m = s.match(/^\s*([+-]?\d+)/);
  if (!m) return 0;
  return Math.max(-(2 ** 31), Math.min(2 ** 31 - 1, parseInt(m[1], 10)));
}

// ---- p028_intToRoman
function p028_intToRoman(num: number): string {
  const table: [number, string][] = [[1000, "M"], [900, "CM"], [500, "D"], [400, "CD"], [100, "C"], [90, "XC"],
    [50, "L"], [40, "XL"], [10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"]];
  let out = "";
  for (const [value, sym] of table) {
    while (num >= value) {
      out += sym;
      num -= value;
    }
  }
  return out;
}

// ---- p029_romanToInt
function p029_romanToInt(s: string): number {
  const val: Record<string, number> = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 };
  let total = 0;
  for (let i = 0; i < s.length; i++) {
    total += i + 1 < s.length && val[s[i]] < val[s[i + 1]] ? -val[s[i]] : val[s[i]];
  }
  return total;
}

// ---- p030_isNumericString
function p030_isNumericString(s: string): boolean {
  return /^[+-]?(\d+(\.\d*)?|\.\d+)$/.test(s);
}

// ---- p031_camelToSnake
function p031_camelToSnake(s: string): string {
  return s
    .replace(/(.)([A-Z][a-z]+)/g, "$1_$2")
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .toLowerCase();
}

// ---- p032_snakeToCamel
function p032_snakeToCamel(s: string): string {
  const [first, ...rest] = s.split("_");
  return first + rest.map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join("");
}

// ---- p033_hasAllUniqueChars
function p033_hasAllUniqueChars(s: string): boolean {
  return new Set(s).size === s.length;
}

// ---- p034_sortCharacters
function p034_sortCharacters(s: string): string {
  return [...s].sort().join("");
}

// ---- p035_groupAnagrams
function p035_groupAnagrams(words: string[]): string[][] {
  const groups = new Map<string, string[]>();
  for (const w of words) {
    const key = [...w].sort().join("");
    groups.set(key, [...(groups.get(key) ?? []), w]);
  }
  const cmp = (a: string[], b: string[]): number => (a.join() < b.join() ? -1 : a.join() > b.join() ? 1 : 0);
  return [...groups.values()].map((g) => g.sort()).sort(cmp);
}

// ---- p036_removeChar
function p036_removeChar(s: string, ch: string): string {
  return [...s].filter((c) => c !== ch).join("");
}

// ---- p037_classifyCharacters
function p037_classifyCharacters(s: string): Record<string, number> {
  const r = { upper: 0, lower: 0, digits: 0, special: 0 };
  for (const c of s) {
    if (/[A-Z]/.test(c)) r.upper++;
    else if (/[a-z]/.test(c)) r.lower++;
    else if (/\d/.test(c)) r.digits++;
    else r.special++;
  }
  return r;
}

// ---- p038_isSubsequence
function p038_isSubsequence(sub: string, s: string): boolean {
  let i = 0;
  for (const ch of s) if (i < sub.length && ch === sub[i]) i++;
  return i === sub.length;
}

// ---- p039_caesarCipher
function p039_caesarCipher(s: string, shift: number): string {
  return [...s].map((c) => {
    if (!/[A-Za-z]/.test(c)) return c;
    const base = c === c.toUpperCase() ? 65 : 97;
    return String.fromCharCode(((((c.charCodeAt(0) - base + shift) % 26) + 26) % 26) + base);
  }).join("");
}

// ---- p040_removeVowels
function p040_removeVowels(s: string): string {
  return s.replace(/[aeiou]/gi, "");
}

// ---- p041_addBinaryStrings
function p041_addBinaryStrings(a: string, b: string): string {
  return (BigInt("0b" + a) + BigInt("0b" + b)).toString(2);
}

// ---- p042_stringPermutations
function p042_stringPermutations(s: string): string[] {
  const out = new Set<string>();
  const go = (cur: string, rest: string): void => {
    if (!rest) out.add(cur);
    for (let i = 0; i < rest.length; i++) go(cur + rest[i], rest.slice(0, i) + rest.slice(i + 1));
  };
  go("", s);
  return [...out].sort();
}

// ---- p043_isIsomorphic
function p043_isIsomorphic(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  const ab = new Map<string, string>();
  const ba = new Map<string, string>();
  for (let i = 0; i < a.length; i++) {
    if ((ab.get(a[i]) ?? b[i]) !== b[i] || (ba.get(b[i]) ?? a[i]) !== a[i]) return false;
    ab.set(a[i], b[i]);
    ba.set(b[i], a[i]);
  }
  return true;
}

// ---- p044_wordPattern
function p044_wordPattern(pattern: string, text: string): boolean {
  const words = text.split(/\s+/);
  if (pattern.length !== words.length) return false;
  const pw = new Map<string, string>();
  const wp = new Map<string, string>();
  for (let i = 0; i < pattern.length; i++) {
    if ((pw.get(pattern[i]) ?? words[i]) !== words[i] || (wp.get(words[i]) ?? pattern[i]) !== pattern[i]) return false;
    pw.set(pattern[i], words[i]);
    wp.set(words[i], pattern[i]);
  }
  return true;
}

// ---- p045_maskCardNumber
function p045_maskCardNumber(num: string): string {
  return "*".repeat(num.length - 4) + num.slice(-4);
}

// ---- p046_sumDigitsInString
function p046_sumDigitsInString(s: string): number {
  return [...s].filter((c) => /\d/.test(c)).reduce((sum, c) => sum + Number(c), 0);
}

// ---- p047_findAllIndices
function p047_findAllIndices(s: string, sub: string): number[] {
  const out: number[] = [];
  let i = s.indexOf(sub);
  while (i !== -1) {
    out.push(i);
    i = s.indexOf(sub, i + 1);
  }
  return out;
}

// ---- p048_isValidIpv4
function p048_isValidIpv4(s: string): boolean {
  const parts = s.split(".");
  return parts.length === 4 && parts.every((p) => /^\d+$/.test(p) && Number(p) <= 255 && String(Number(p)) === p);
}

// ---- p049_isValidEmail
function p049_isValidEmail(s: string): boolean {
  return /^[\w.+-]+@[\w-]+(\.[\w-]+)+$/.test(s);
}

// ---- p050_wordFrequency
function p050_wordFrequency(s: string): Record<string, number> {
  const freq: Record<string, number> = {};
  for (const w of s.toLowerCase().match(/\w+/g) ?? []) freq[w] = (freq[w] ?? 0) + 1;
  return freq;
}

// ---- p051_mostCommonWord
function p051_mostCommonWord(s: string): string {
  const freq = p050_wordFrequency(s);
  return Object.keys(freq).reduce((best, w) => (freq[w] > freq[best] ? w : best));
}

// ---- p052_removePunctuation
function p052_removePunctuation(s: string): string {
  return s.replace(/[!-\/:-@\[-`{-~]/g, "");
}

// ---- p053_reverseVowels
function p053_reverseVowels(s: string): string {
  const vowels = [...s].filter((c) => /[aeiou]/i.test(c));
  return [...s].map((c) => (/[aeiou]/i.test(c) ? vowels.pop()! : c)).join("");
}

// ---- p054_findExtraChar
function p054_findExtraChar(a: string, b: string): string {
  const counts = p005_charFrequency(a);
  for (const ch of b) {
    if (!counts[ch]) return ch;
    counts[ch]--;
  }
  return "";
}

// ---- p055_oneEditAway
function p055_oneEditAway(a: string, b: string): boolean {
  if (Math.abs(a.length - b.length) > 1) return false;
  if (a.length < b.length) [a, b] = [b, a];
  let i = 0;
  let j = 0;
  let edited = false;
  while (i < a.length && j < b.length) {
    if (a[i] !== b[j]) {
      if (edited) return false;
      edited = true;
      if (a.length === b.length) j++;
    } else {
      j++;
    }
    i++;
  }
  return true;
}

// ---- p056_truncateWithEllipsis
function p056_truncateWithEllipsis(s: string, width: number): string {
  return s.length <= width ? s : s.slice(0, width - 3) + "...";
}

// ---- p057_longestRun
function p057_longestRun(s: string): [string, number] {
  let bestCh = "";
  let best = 0;
  let run = 0;
  for (let i = 0; i < s.length; i++) {
    run = i > 0 && s[i - 1] === s[i] ? run + 1 : 1;
    if (run > best) {
      bestCh = s[i];
      best = run;
    }
  }
  return [bestCh, best];
}

// ---- p058_minAddToMakeValid
function p058_minAddToMakeValid(s: string): number {
  let balance = 0;
  let added = 0;
  for (const ch of s) {
    if (ch === "(") balance++;
    else if (balance > 0) balance--;
    else added++;
  }
  return added + balance;
}

// ---- p059_hammingDistance
function p059_hammingDistance(a: string, b: string): number {
  let d = 0;
  for (let i = 0; i < Math.min(a.length, b.length); i++) if (a[i] !== b[i]) d++;
  return d;
}

// ---- p060_levenshteinDistance
function p060_levenshteinDistance(a: string, b: string): number {
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) {
      cur.push(Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)));
    }
    prev = cur;
  }
  return prev[b.length];
}
