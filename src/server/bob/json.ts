/**
 * Bob 2.0 responses are model output, so the JSON can arrive wrapped in a
 * markdown fence, as a JSON string, or nested under a data/result/output key.
 * This extracts the first usable JSON object without being clever about it.
 */
export function extractJsonPayload(value: unknown): unknown {
  if (value == null) return null;

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed === "") return null;

    try {
      return JSON.parse(trimmed);
    } catch {
      // fall through to fence / brace scanning
    }

    const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fenced?.[1]) {
      try {
        return JSON.parse(fenced[1].trim());
      } catch {
        // fall through to brace scanning
      }
    }

    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start !== -1 && end > start) {
      try {
        return JSON.parse(trimmed.slice(start, end + 1));
      } catch {
        return null;
      }
    }

    return null;
  }

  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    for (const key of ["data", "result", "output", "analysis", "repository", "last_message"]) {
      if (record[key] != null) {
        const extracted = extractJsonPayload(record[key]);
        if (extracted != null) return extracted;
      }
    }
  }

  return value;
}

export function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim() !== "" ? value.trim() : null;
}
