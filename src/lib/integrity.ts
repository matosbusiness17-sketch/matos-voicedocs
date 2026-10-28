import { createHash } from "crypto";

/**
 * Deterministically sorts object keys for canonical JSON serialization.
 */
function canonicalizeJson(obj: unknown): string {
  if (obj === null || typeof obj !== "object") {
    return JSON.stringify(obj);
  }

  if (Array.isArray(obj)) {
    return `[${obj.map(canonicalizeJson).join(",")}]`;
  }

  const record = obj as Record<string, unknown>;
  const sortedKeys = Object.keys(record).sort();
  const pairs = sortedKeys.map(
    (key) => `${JSON.stringify(key)}:${canonicalizeJson(record[key])}`
  );
  return `{${pairs.join(",")}}`;
}

/**
 * Computes a standard SHA-256 integrity digest for an issued document snapshot.
 * Note: As documented, this provides internal snapshot change-detection and audit trail,
 * not a qualified digital signature.
 */
export function computeSnapshotIntegrityHash(snapshot: unknown): string {
  const canonicalString = canonicalizeJson(snapshot);
  return createHash("sha256").update(canonicalString, "utf8").digest("hex");
}
