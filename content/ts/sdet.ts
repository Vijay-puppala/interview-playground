// ---- p201_parseLogLine
function p201_parseLogLine(line: string): { timestamp: string; level: string; message: string } | null {
  const m = line.match(/^(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}) \[(\w+)\] (.*)$/);
  return m ? { timestamp: m[1], level: m[2], message: m[3] } : null;
}

// ---- p202_countLogLevels
function p202_countLogLevels(lines: string[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const line of lines) {
    const rec = p201_parseLogLine(line);
    if (rec) counts[rec.level] = (counts[rec.level] ?? 0) + 1;
  }
  return counts;
}

// ---- p203_filterLogsByLevel
function p203_filterLogsByLevel(lines: string[], level: string): string[] {
  return lines.map(p201_parseLogLine).filter((r) => r && r.level === level).map((r) => r!.message);
}

// ---- p204_flattenDict
function p204_flattenDict(d: any, prefix = ""): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(d)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v !== null && typeof v === "object") Object.assign(out, p204_flattenDict(v, key));
    else out[key] = v;
  }
  return out;
}

// ---- p205_unflattenDict
function p205_unflattenDict(flat: Record<string, unknown>): Record<string, any> {
  const out: Record<string, any> = {};
  for (const [key, v] of Object.entries(flat)) {
    const parts = key.split(".");
    let node = out;
    for (const p of parts.slice(0, -1)) node = node[p] ??= {};
    node[parts[parts.length - 1]] = v;
  }
  return out;
}

// ---- p206_diffDicts
function p206_diffDicts(expected: Record<string, any>, actual: Record<string, any>) {
  const added: Record<string, any> = {};
  const removed: Record<string, any> = {};
  const changed: Record<string, [any, any]> = {};
  for (const k of Object.keys(actual)) if (!(k in expected)) added[k] = actual[k];
  for (const k of Object.keys(expected)) {
    if (!(k in actual)) removed[k] = expected[k];
    else if (JSON.stringify(expected[k]) !== JSON.stringify(actual[k])) changed[k] = [expected[k], actual[k]];
  }
  return { added, removed, changed };
}

// ---- p207_findKeyRecursive
function p207_findKeyRecursive(data: any, key: string): any[] {
  let found: any[] = [];
  if (Array.isArray(data)) {
    for (const item of data) found = found.concat(p207_findKeyRecursive(item, key));
  } else if (data !== null && typeof data === "object") {
    for (const [k, v] of Object.entries(data)) {
      if (k === key) found.push(v);
      found = found.concat(p207_findKeyRecursive(v, key));
    }
  }
  return found.sort();
}

// ---- p208_validateSchema
function p208_validateSchema(data: Record<string, any>, schema: Record<string, string>): string[] {
  const typeName = (v: unknown): string =>
    v === null ? "NoneType" : Array.isArray(v) ? "list" : typeof v === "string" ? "str"
      : typeof v === "boolean" ? "bool" : typeof v === "number" ? (Number.isInteger(v) ? "int" : "float")
        : "dict";
  const errors: string[] = [];
  for (const [key, expected] of Object.entries(schema)) {
    if (!(key in data)) errors.push(`${key}: missing`);
    else if (typeName(data[key]) !== expected) errors.push(`${key}: expected ${expected}, got ${typeName(data[key])}`);
  }
  return errors;
}

// ---- p209_parseCsvText
function p209_parseCsvText(text: string): Record<string, string>[] {
  const [header, ...rows] = text.split("\n").filter(Boolean).map((l) => l.split(","));
  return rows.map((r) => Object.fromEntries(header.map((h, i) => [h, r[i]])));
}

// ---- p210_toCsvText
function p210_toCsvText(rows: Record<string, unknown>[]): string {
  const cols = Object.keys(rows[0]);
  return [cols.join(","), ...rows.map((r) => cols.map((c) => r[c]).join(","))].join("\n") + "\n";
}

// ---- p211_csvColumnSum
function p211_csvColumnSum(text: string, column: string): number {
  return p209_parseCsvText(text).reduce((sum, r) => sum + Number(r[column]), 0);
}

// ---- p212_compareLists
function p212_compareLists(expected: number[], actual: number[]) {
  const e = new Set(expected);
  const a = new Set(actual);
  return {
    missing: [...e].filter((x) => !a.has(x)).sort((x, y) => x - y),
    unexpected: [...a].filter((x) => !e.has(x)).sort((x, y) => x - y),
  };
}

// ---- p213_retry
function p213_retry<A extends unknown[], R>(fn: (...args: A) => R | Promise<R>, times = 3, delayMs = 0) {
  return async (...args: A): Promise<R> => {
    for (let attempt = 1; ; attempt++) {
      try {
        return await fn(...args);
      } catch (err) {
        if (attempt >= times) throw err;
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  };
}

// ---- p214_timed
function p214_timed<A extends unknown[], R>(fn: (...args: A) => R) {
  const wrapper = (...args: A): R => {
    const start = performance.now();
    try {
      return fn(...args);
    } finally {
      wrapper.lastDuration = (performance.now() - start) / 1000;
    }
  };
  wrapper.lastDuration = 0;
  return wrapper;
}

// ---- p215_waitUntil
async function p215_waitUntil<T>(condition: () => T, timeoutMs = 5000, intervalMs = 100): Promise<T> {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const value = condition();
    if (value) return value;
    if (Date.now() >= deadline) throw new Error(`condition not met within ${timeoutMs}ms`);
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
}

// ---- p216_backoffDelays
function p216_backoffDelays(attempts: number, base = 1, factor = 2, cap = 60): number[] {
  return Array.from({ length: attempts }, (_, i) => Math.min(base * factor ** i, cap));
}

// ---- p217_httpStatusCategory
function p217_httpStatusCategory(code: number): string {
  const names: Record<number, string> = {
    1: "Informational", 2: "Success", 3: "Redirection", 4: "Client Error", 5: "Server Error",
  };
  return names[Math.floor(code / 100)] ?? "Unknown";
}

// ---- p218_buildQueryString
function p218_buildQueryString(params: Record<string, string | number>): string {
  return new URLSearchParams(Object.entries(params).map(([k, v]) => [k, String(v)])).toString();
}

// ---- p219_parseQueryString
function p219_parseQueryString(qs: string): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const [k, v] of new URLSearchParams(qs)) (out[k] ??= []).push(v);
  return out;
}

// ---- p220_extractUrls
function p220_extractUrls(text: string): string[] {
  return (text.match(/https?:\/\/\S+/g) ?? []).map((u) => u.replace(/[.,);]+$/, ""));
}

// ---- p221_extractEmails
function p221_extractEmails(text: string): string[] {
  return text.match(/[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g) ?? [];
}

// ---- p222_extractPhoneNumbers
function p222_extractPhoneNumbers(text: string): string[] {
  return text.match(/\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g) ?? [];
}

// ---- p223_maskSensitive
function p223_maskSensitive(data: any, keys: string[] = ["password", "token", "secret", "api_key"]): any {
  if (Array.isArray(data)) return data.map((v) => p223_maskSensitive(v, keys));
  if (data !== null && typeof data === "object") {
    return Object.fromEntries(
      Object.entries(data).map(([k, v]) => [k, keys.includes(k.toLowerCase()) ? "***" : p223_maskSensitive(v, keys)]),
    );
  }
  return data;
}

// ---- p224_randomString
function p224_randomString(length = 8, seed?: number): string {
  const alphabet = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let state = (seed ?? Math.floor(Math.random() * 2 ** 32)) >>> 0;
  const rand = (): number => { // mulberry32: tiny seeded PRNG
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return Array.from({ length }, () => alphabet[Math.floor(rand() * alphabet.length)]).join("");
}

// ---- p225_generateTestEmail
function p225_generateTestEmail(name: string, domain = "example.com", suffix = ""): string {
  const local = name.trim().toLowerCase().replace(/ /g, ".");
  return suffix ? `${local}+${suffix}@${domain}` : `${local}@${domain}`;
}

// ---- p226_generateUsers
function p226_generateUsers(count: number, seed = 0): { id: number; name: string; age: number }[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    name: "user" + p224_randomString(5, seed + i),
    age: 18 + ((seed + i * 7) % 63),
  }));
}

// ---- p227_boundaryValues
function p227_boundaryValues(low: number, high: number): number[] {
  return [low - 1, low, low + 1, high - 1, high, high + 1];
}

// ---- p228_testMatrix
function p228_testMatrix(options: Record<string, string[]>): Record<string, string>[] {
  return Object.entries(options).reduce<Record<string, string>[]>(
    (combos, [key, values]) => combos.flatMap((c) => values.map((v) => ({ ...c, [key]: v }))),
    [{}],
  );
}

// ---- p229_isValidDate
function p229_isValidDate(s: string): boolean {
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return false;
  const [y, mo, d] = m.slice(1).map(Number);
  const dt = new Date(Date.UTC(y, mo - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === mo - 1 && dt.getUTCDate() === d;
}

// ---- p230_daysBetween
function p230_daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(b) - Date.parse(a)) / 86_400_000);
}

// ---- p231_addBusinessDays
function p231_addBusinessDays(start: string, days: number): string {
  const d = new Date(start + "T00:00:00Z");
  while (days > 0) {
    d.setUTCDate(d.getUTCDate() + 1);
    if (d.getUTCDay() !== 0 && d.getUTCDay() !== 6) days--;
  }
  return d.toISOString().slice(0, 10);
}

// ---- p232_parseDuration
function p232_parseDuration(s: string): number {
  const units: Record<string, number> = { h: 3600, m: 60, s: 1 };
  let total = 0;
  for (const [, n, u] of s.matchAll(/(\d+)([hms])/g)) total += Number(n) * units[u];
  return total;
}

// ---- p233_formatSeconds
function p233_formatSeconds(total: number): string {
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const parts = [[h, "h"], [m, "m"], [s, "s"]].filter(([v]) => v).map(([v, u]) => `${v}${u}`);
  return parts.join(" ") || "0s";
}

// ---- p234_compareVersions
function p234_compareVersions(a: string, b: string): number {
  const x = a.split(".").map(Number);
  const y = b.split(".").map(Number);
  for (let i = 0; i < Math.max(x.length, y.length); i++) {
    const d = (x[i] ?? 0) - (y[i] ?? 0);
    if (d) return Math.sign(d);
  }
  return 0;
}

// ---- p235_sortVersions
function p235_sortVersions(versions: string[]): string[] {
  return [...versions].sort(p234_compareVersions);
}

// ---- p236_sortDicts
function p236_sortDicts(rows: Record<string, any>[], key: string): Record<string, any>[] {
  return [...rows].sort((a, b) => (a[key] < b[key] ? -1 : a[key] > b[key] ? 1 : 0));
}

// ---- p237_groupBy
function p237_groupBy(rows: Record<string, any>[], key: string): Record<string, Record<string, any>[]> {
  const out: Record<string, Record<string, any>[]> = {};
  for (const r of rows) (out[r[key]] ??= []).push(r);
  return out;
}

// ---- p238_dedupeDictsByKey
function p238_dedupeDictsByKey(rows: Record<string, any>[], key: string): Record<string, any>[] {
  const seen = new Set<unknown>();
  return rows.filter((r) => !seen.has(r[key]) && seen.add(r[key]));
}

// ---- p239_summarizeResults
function p239_summarizeResults(results: string[]) {
  const count = (s: string): number => results.filter((r) => r === s).length;
  const total = results.length;
  return {
    pass: count("pass"), fail: count("fail"), skip: count("skip"), total,
    pass_rate: total ? Math.round((10000 * count("pass")) / total) / 100 : 0,
  };
}

// ---- p240_passPercentage
function p240_passPercentage(passed: number, total: number): number {
  return total ? Math.round((10000 * passed) / total) / 100 : 0;
}

// ---- p241_findFlakyTests
function p241_findFlakyTests(history: Record<string, string[]>): string[] {
  return Object.keys(history).filter((t) => history[t].includes("pass") && history[t].includes("fail")).sort();
}

// ---- p242_normalizeText
function p242_normalizeText(s: string): string {
  return s.toLowerCase().split(/\s+/).filter(Boolean).join(" ");
}

// ---- p243_sha256Of
function p243_sha256Of(text: string): string {
  const K = new Uint32Array(64);
  for (let i = 0, n = 2; i < 64; n++) { // first 64 primes -> fractional parts of their cube roots
    let prime = true;
    for (let d = 2; d * d <= n; d++) if (n % d === 0) prime = false;
    if (prime) K[i++] = Math.floor((Math.cbrt(n) % 1) * 2 ** 32);
  }
  const H = new Uint32Array([0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19]);
  const bytes = [...new TextEncoder().encode(text), 0x80];
  while (bytes.length % 64 !== 56) bytes.push(0);
  const bitLen = text.length === 0 ? 0 : new TextEncoder().encode(text).length * 8;
  for (let i = 7; i >= 0; i--) bytes.push(i >= 4 ? 0 : (bitLen >>> (i * 8)) & 0xff);
  const rotr = (x: number, n: number): number => (x >>> n) | (x << (32 - n));
  for (let off = 0; off < bytes.length; off += 64) {
    const w = new Uint32Array(64);
    for (let i = 0; i < 16; i++) w[i] = (bytes[off + 4 * i] << 24) | (bytes[off + 4 * i + 1] << 16) | (bytes[off + 4 * i + 2] << 8) | bytes[off + 4 * i + 3];
    for (let i = 16; i < 64; i++) {
      const s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >>> 3);
      const s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) | 0;
    }
    let [a, b, c, d, e, f, g, h] = H;
    for (let i = 0; i < 64; i++) {
      const t1 = (h + (rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25)) + ((e & f) ^ (~e & g)) + K[i] + w[i]) | 0;
      const t2 = ((rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22)) + ((a & b) ^ (a & c) ^ (b & c))) | 0;
      [h, g, f, e, d, c, b, a] = [g, f, e, (d + t1) | 0, c, b, a, (t1 + t2) | 0];
    }
    [a, b, c, d, e, f, g, h].forEach((v, i) => (H[i] = (H[i] + v) | 0));
  }
  return [...H].map((v) => (v >>> 0).toString(16).padStart(8, "0")).join("");
}

// ---- p244_parseEnvText
function p244_parseEnvText(text: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    const i = line.indexOf("=");
    if (line && !line.startsWith("#") && i > 0) out[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
  return out;
}

// ---- p245_deepMerge
function p245_deepMerge(base: Record<string, any>, override: Record<string, any>): Record<string, any> {
  const isObj = (v: unknown): boolean => v !== null && typeof v === "object" && !Array.isArray(v);
  const out: Record<string, any> = { ...base };
  for (const [k, v] of Object.entries(override)) out[k] = isObj(v) && isObj(out[k]) ? p245_deepMerge(out[k], v) : v;
  return out;
}

// ---- p246_invertDict
function p246_invertDict(d: Record<string, string | number>): Record<string, string> {
  return Object.fromEntries(Object.entries(d).map(([k, v]) => [String(v), k]));
}

// ---- p247_percentile
function p247_percentile(values: number[], pct: number): number {
  const s = [...values].sort((a, b) => a - b);
  return s[Math.max(0, Math.ceil((pct / 100) * s.length) - 1)];
}

// ---- p248_shardTests
function p248_shardTests(tests: string[], workers: number): string[][] {
  return Array.from({ length: workers }, (_, w) => tests.filter((_, i) => i % workers === w));
}

// ---- p249_tailLines
function p249_tailLines(text: string, n: number): string[] {
  return text.split("\n").slice(-n);
}

// ---- p250_validatePassword
function p250_validatePassword(pw: string): string[] {
  const errors: string[] = [];
  if (pw.length < 8) errors.push("too short (min 8)");
  if (!/[A-Z]/.test(pw)) errors.push("missing uppercase");
  if (!/\d/.test(pw)) errors.push("missing digit");
  if (!/[^\w\s]/.test(pw)) errors.push("missing special character");
  return errors;
}
