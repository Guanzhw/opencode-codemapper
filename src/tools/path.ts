import { tool } from "@opencode-ai/plugin";
import { CM_TIMEOUT_MS } from "../constants.js";
import { renderToolFailure, runCm } from "../cm.js";
import { normalizeOptionalPath, normalizeRequiredString } from "../paths.js";
import { parseTraceOutput } from "../parse.js";
import { toOutput } from "../output.js";

export const pathTool = tool({
	description:
		"Find the shortest detected static call path from one exact symbol to another using CodeMapper trace. Returns a JSON array with one call_path item when a path is found, `[]` when no static path is detected, or a plain string error. Use for questions like `main` -> `try_load_or_rebuild` or `handler` -> `send_response` after search has confirmed both exact symbol names. Use path.path to scope tracing to a specific directory for faster indexing. Use path.fuzzy for fuzzy matching when symbol names are not exact.",
	args: {
		from: tool.schema.string().describe("Exact source/start symbol name for static tracing, preferably copied from a CodeMapper search. Use fuzzy=true for partial matching."),
		to: tool.schema.string().describe("Exact target/end symbol name for static tracing, preferably copied from a CodeMapper search. `[]` from the tool means no static path was detected, not that runtime reachability is impossible."),
		path: tool.schema.string().optional().describe("Optional directory scope; defaults to the current project root. Examples: `src`, `packages/api`, `/home/user/my-project`. Speeds up analysis by limiting indexing to a specific directory."),
		fuzzy: tool.schema.boolean().optional().describe("Enable fuzzy matching for symbol names (default: false). Useful when you are unsure of the exact symbol name."),
	},
	async execute(args, context) {
		const from = normalizeRequiredString(args.from, "path.from");
		if (typeof from !== "string") return from.error;
		const to = normalizeRequiredString(args.to, "path.to");
		if (typeof to !== "string") return to.error;

		const searchPath = normalizeOptionalPath(args.path, ".");
		const cmArgs = ["trace", from, to, searchPath, "--format", "ai"];
		if (args.fuzzy) cmArgs.push("--fuzzy");

		try {
			const run = await runCm(context.directory, cmArgs, {
				signal: context.abort,
				timeoutMs: CM_TIMEOUT_MS,
			});
			return toOutput(parseTraceOutput(run.stdout, from, to));
		} catch (error) {
			return renderToolFailure(error);
		}
	},
});
