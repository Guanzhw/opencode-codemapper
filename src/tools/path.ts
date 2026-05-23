import { tool } from "@opencode-ai/plugin";
import { CM_TIMEOUT_MS } from "../constants.js";
import { renderToolFailure, runCm } from "../cm.js";
import { normalizeRequiredString } from "../paths.js";
import { parseTraceOutput } from "../parse.js";
import { toOutput } from "../output.js";

export const pathTool = tool({
	description:
		"Find the shortest detected static call path from one exact symbol to another using CodeMapper trace. Returns a JSON array with one call_path item when a path is found, `[]` when no static path is detected, or a plain string error. Use for questions like `main` -> `try_load_or_rebuild` or `handler` -> `send_response` after search has confirmed both exact symbol names. This v1 tool runs in the current cwd with no path scope or fuzzy lookup; `[]` does not prove runtime impossibility.",
	args: {
		from: tool.schema.string().describe("Exact source symbol name, e.g. `main`, `loginHandler`, `process_order`."),
		to: tool.schema.string().describe("Exact target symbol name, e.g. `verifyPassword`, `send_response`, `charge_payment`."),
	},
	async execute(args, context) {
		const from = normalizeRequiredString(args.from, "path.from");
		if (typeof from !== "string") return from.error;
		const to = normalizeRequiredString(args.to, "path.to");
		if (typeof to !== "string") return to.error;

		try {
			const run = await runCm(context.directory, ["trace", from, to, ".", "--format", "ai"], {
				signal: context.abort,
				timeoutMs: CM_TIMEOUT_MS,
			});
			return toOutput(parseTraceOutput(run.stdout, from, to));
		} catch (error) {
			return renderToolFailure(error);
		}
	},
});
