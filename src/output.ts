import { Buffer } from "node:buffer";
import { MAX_ERROR_OUTPUT_BYTES, MAX_ERROR_OUTPUT_LINES, MAX_MODEL_OUTPUT_BYTES } from "./constants.js";
import type { TruncationMode } from "./types.js";

/**
 * Convert a tool result to a string for OpenCode.
 * Arrays are JSON-stringified; strings are returned as-is.
 * If the JSON output exceeds MAX_MODEL_OUTPUT_BYTES, returns
 * a fallback message.
 */
export function toOutput(value: unknown[] | string): string {
	if (typeof value === "string") return value;

	const visible = JSON.stringify(value);
	if (Buffer.byteLength(visible, "utf8") > MAX_MODEL_OUTPUT_BYTES) {
		return "CodeMapper output too large; narrow with path or query.";
	}

	return visible;
}

export function combineOutputs(stdout: string, stderr: string): string {
	const parts = [stdout.trim(), stderr.trim() ? `[stderr]\n${stderr.trim()}` : ""].filter(Boolean);
	return parts.join("\n\n").trim();
}

export function truncateText(
	text: string,
	mode: TruncationMode,
	maxBytes = MAX_ERROR_OUTPUT_BYTES,
	maxLines = MAX_ERROR_OUTPUT_LINES,
): { text: string; truncated: boolean } {
	const originalBytes = Buffer.byteLength(text, "utf8");
	const originalLines = countLines(text);
	let next = text;
	let truncated = false;

	const lines = next.split(/\r?\n/);
	if (lines.length > maxLines) {
		truncated = true;
		next = mode === "head" ? lines.slice(0, maxLines).join("\n") : lines.slice(lines.length - maxLines).join("\n");
	}

	if (Buffer.byteLength(next, "utf8") > maxBytes) {
		truncated = true;
		next = truncateUtf8(next, maxBytes, mode);
	}

	if (!truncated) return { text: next, truncated: false };
	const note = `[output truncated: ${originalLines} lines, ${originalBytes} bytes total; showing ${countLines(next)} lines, ${Buffer.byteLength(next, "utf8")} bytes]`;
	return { text: `${next}${next.endsWith("\n") ? "" : "\n\n"}${note}`, truncated: true };
}

export function countLines(text: string): number {
	if (!text.length) return 0;
	return text.split(/\r?\n/).length;
}

export function truncateUtf8(text: string, maxBytes: number, mode: TruncationMode): string {
	if (Buffer.byteLength(text, "utf8") <= maxBytes) return text;
	if (mode === "head") {
		let end = text.length;
		while (end > 0 && Buffer.byteLength(text.slice(0, end), "utf8") > maxBytes) end -= 1;
		return text.slice(0, end);
	}
	let start = 0;
	while (start < text.length && Buffer.byteLength(text.slice(start), "utf8") > maxBytes) start += 1;
	return text.slice(start);
}
