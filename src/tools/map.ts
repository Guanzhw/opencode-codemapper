import { tool } from "@opencode-ai/plugin";
import { CM_TIMEOUT_MS, MAX_MODEL_OUTPUT_BYTES } from "../constants.js";
import { renderToolFailure, runCm, runCmStreamingLines } from "../cm.js";
import { normalizeOptionalPath } from "../paths.js";
import { parseStatsOutput } from "../parse.js";
import { toOutput } from "../output.js";
import { buildMapResult } from "../mapFallback.js";
import type { FileItem } from "../types.js";

export const mapTool = tool({
	description:
		"Map a repository or directory with CodeMapper before choosing files or search terms. Runs `cm stats` plus `cm map --level 2` and returns a JSON array containing one stats item plus file items when the file map fits. If the level-2 file map is too large, map returns stats, a notice, and compact directory groups so the agent can call map again on a smaller returned directory path. Use for repo/package/module orientation such as `.`, `src`, `packages/api`, or `docs`; the path must be a directory scope, not a single file.",
	args: {
		path: tool.schema.string().optional().describe("Directory scope (e.g. `src`, `packages/api`, or `.` for whole project). Defaults to `.`."),
	},
	async execute(args, context) {
		const targetPath = normalizeOptionalPath(args.path, ".");
		try {
			const stats = await runCm(context.directory, ["stats", targetPath, "--format", "ai"], { signal: context.abort, timeoutMs: CM_TIMEOUT_MS });
			const fileItems: FileItem[] = [];
			const handleMapLine = createMapLineHandler(fileItems);
			await runCmStreamingLines(
				context.directory,
				["map", targetPath, "--level", "2", "--format", "ai"],
				{ signal: context.abort, timeoutMs: CM_TIMEOUT_MS },
				handleMapLine,
			);
			return toOutput(buildMapResult(parseStatsOutput(stats.stdout, targetPath), fileItems, targetPath, MAX_MODEL_OUTPUT_BYTES));
		} catch (error) {
			return renderToolFailure(error);
		}
	},
});

function createMapLineHandler(fileItems: FileItem[]): (line: string) => void {
	let inFiles = false;
	return (line) => {
		const trimmed = line.trimEnd();
		if (trimmed === "[FILES]") {
			inFiles = true;
			return;
		}
		if (trimmed.startsWith("[") && trimmed !== "[FILES]") {
			inFiles = false;
			return;
		}
		if (!inFiles || !trimmed.trim()) return;

		const parts = trimmed.split("|");
		if (parts.length < 3) return;
		const size = Number(parts[2]);
		fileItems.push({
			kind: "file",
			path: parts[0],
			language: parts[1] || undefined,
			...(Number.isFinite(size) ? { sizeBytes: size } : {}),
		});
	};
}
