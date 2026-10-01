/* PostgreSQL engine for the SQL tab and the SQL cheat sheet.
 *
 * A plain ES module so the SAME code runs in the browser worker (PGlite = PostgreSQL compiled to WebAssembly)
 * and in the Node verification scripts (tools/check_sql.mjs, tools/check_cheatsheet.mjs).
 *
 * Every run happens inside BEGIN ... ROLLBACK, so INSERT / UPDATE / DELETE / CREATE examples never change the
 * sample data: the next run starts from the same rows.
 */
const NUMERIC_OIDS = new Set([20, 21, 23, 26, 700, 701, 1700]);   // int8, int2, int4, oid, float4, float8, numeric

export function formatCell(v) {
  if (v === null || v === undefined) return null;
  if (typeof v === "bigint") return v.toString();
  if (typeof v === "boolean") return v ? "true" : "false";
  if (v instanceof Date) {
    if (Number.isNaN(v.getTime())) return "invalid date";
    const iso = v.toISOString();                                  // 2024-01-15T00:00:00.000Z
    if (iso.endsWith("T00:00:00.000Z")) return iso.slice(0, 10);   // a DATE (or a midnight timestamp)
    return iso.slice(0, 19).replace("T", " ") + (iso.endsWith(".000Z") ? "" : iso.slice(19, 23));
  }
  if (Array.isArray(v)) return "{" + v.map((x) => formatCell(x) ?? "NULL").join(",") + "}";
  if (v instanceof Uint8Array) return "\\x" + [...v].map((b) => b.toString(16).padStart(2, "0")).join("");
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

/** Result as plain text, the format used for documented output: a header line, then one "a | b" line per row. */
export function resultToText(res) {
  if (!res.ok) return "ERROR: " + res.error;
  if (!res.hasResultSet) return res.statements > 1 ? `OK (${res.statements} statements)` : `OK (${res.affected} rows affected)`;
  const cell = (c) => (c === null ? "NULL" : c);
  return [res.columns.join(" | "), ...res.rows.map((r) => r.map(cell).join(" | "))].join("\n");
}

export async function createEngine(PGlite, setupSql) {
  const db = new PGlite();
  await db.exec(setupSql);
  let dirty = false;

  async function reset() {          // only needed if the user's SQL committed (it would escape the rollback)
    await db.exec("DROP SCHEMA public CASCADE; CREATE SCHEMA public;");
    await db.exec(setupSql);
    dirty = false;
  }

  return {
    db,
    async run(sql, { maxRows = 200 } = {}) {
      const started = performance.now();
      if (dirty) await reset();
      if (/\b(commit|end)\b\s*;/i.test(sql)) dirty = true;
      await db.exec("BEGIN");
      try {
        const results = await db.exec(sql, { rowMode: "array" });
        const sets = results.filter((r) => r.fields && r.fields.length);
        const last = sets[sets.length - 1] || null;
        const tail = results[results.length - 1];
        return {
          ok: true,
          statements: results.length,
          hasResultSet: !!last,
          columns: last ? last.fields.map((f) => f.name) : [],
          numeric: last ? last.fields.map((f) => NUMERIC_OIDS.has(f.dataTypeID)) : [],
          rows: last ? last.rows.slice(0, maxRows).map((r) => r.map(formatCell)) : [],
          rowCount: last ? last.rows.length : 0,
          truncated: last ? last.rows.length > maxRows : false,
          affected: tail && tail.affectedRows ? tail.affectedRows : 0,
          ms: performance.now() - started,
        };
      } catch (e) {
        return { ok: false, error: String((e && e.message) || e), position: e && e.position ? Number(e.position) : null, hint: (e && e.hint) || null, ms: performance.now() - started };
      } finally {
        try { await db.exec("ROLLBACK"); } catch (e) { /* the transaction was already closed */ }
      }
    },
    async close() { await db.close(); },
  };
}
