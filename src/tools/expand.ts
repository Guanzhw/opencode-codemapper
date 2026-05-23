import { tool } from "@opencode-ai/plugin";
import { CM_TIMEOUT_MS } from "../constants.js";
import { renderToolFailure, runCm } from "../cm.js";
import { normalizeRequiredString } from "../paths.js";
import { combineExpandItems, parseCalleesOutput, parseCallersOutput, parseDefinitionsOutput, parseTestsOutput } from "../parse.js";
import { toOutput } from "../output.js";

export const expandTool = tool({
	description:
		"Expand one known exact symbol into its CodeMapper relationship radius before editing or refactoring. Returns a JSON array combining exact definition item(s), static callers, direct callees/dependencies, and detected tests. Use for impact analysis of symbols like `cmd_query`, `try_load_or_rebuild`, `parse_file`, or `UserService`. This v1 tool runs in the current cwd with no path scope and no fuzzy lookup; duplicate names can produce multiple definition/name-based relationship results.",
	args: {
		symbol: tool.schema.string().describe("Exact symbol name from CodeMapper index, e.g. `processPayment`, `CacheManager`, `cmd_query`. Use search first if the exact name is unknown."),
	},
	async execute(args, context) {
		const symbol = normalizeRequiredString(args.symbol, "expand.symbol");
		if (typeof symbol !== "string") return symbol.error;

		try {
			const definitionsRun = await runCm(
				context.directory,
				["query", symbol, ".", "--format", "ai", "--context", "full", "--exact"],
				{ signal: context.abort, timeoutMs: CM_TIMEOUT_MS },
			);
			const definitions = parseDefinitionsOutput(definitionsRun.stdout);
			if (definitions.length === 0) return `No exact symbol found: ${symbol}`;

			const [callersRun, calleesRun, testsRun] = await Promise.all([
				runCm(context.directory, ["callers", symbol, ".", "--format", "ai"], { signal: context.abort, timeoutMs: CM_TIMEOUT_MS }),
				runCm(context.directory, ["callees", symbol, ".", "--format", "ai"], { signal: context.abort, timeoutMs: CM_TIMEOUT_MS }),
				runCm(context.directory, ["tests", symbol, ".", "--format", "ai"], { signal: context.abort, timeoutMs: CM_TIMEOUT_MS }),
			]);

			return toOutput(
				combineExpandItems(
					definitions,
					parseCallersOutput(callersRun.stdout),
					parseCalleesOutput(calleesRun.stdout),
					parseTestsOutput(testsRun.stdout),
				),
			);
		} catch (error) {
			return renderToolFailure(error);
		}
	},
});
