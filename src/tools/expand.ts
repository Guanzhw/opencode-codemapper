import { tool } from "@opencode-ai/plugin";
import { CM_TIMEOUT_MS } from "../constants.js";
import { renderToolFailure, runCm } from "../cm.js";
import { normalizeOptionalPath, normalizeRequiredString } from "../paths.js";
import { combineExpandItems, parseCalleesOutput, parseCallersOutput, parseDefinitionsOutput, parseTestsOutput } from "../parse.js";
import { toOutput } from "../output.js";

export const expandTool = tool({
	description:
		"Expand one known exact symbol into its CodeMapper relationship radius before editing or refactoring. Returns a JSON array combining exact definition item(s), static callers, direct callees/dependencies, and detected tests. Use for impact analysis of symbols like `cmd_query`, `try_load_or_rebuild`, `parse_file`, or `UserService`. Use expand.path to scope analysis to a specific directory for faster indexing and more relevant results. Use expand.fuzzy for fuzzy matching when symbol names are not exact.",
	args: {
		symbol: tool.schema.string().describe("Exact indexed symbol name to analyze, usually copied from a CodeMapper search result. Use fuzzy=true for partial matching."),
		path: tool.schema.string().optional().describe("Optional directory scope; defaults to the current project root. Examples: `src`, `packages/api`, `/home/user/my-project`. Speeds up analysis by limiting indexing to a specific directory."),
		fuzzy: tool.schema.boolean().optional().describe("Enable fuzzy matching for symbol names (default: false). Useful when you are unsure of the exact symbol name."),
	},
	async execute(args, context) {
		const symbol = normalizeRequiredString(args.symbol, "expand.symbol");
		if (typeof symbol !== "string") return symbol.error;

		const searchPath = normalizeOptionalPath(args.path, ".");
		const fuzzy = args.fuzzy === true;

		try {
			const cmQueryArgs = fuzzy
				? ["query", symbol, searchPath, "--format", "ai", "--context", "full"]
				: ["query", symbol, searchPath, "--format", "ai", "--context", "full", "--exact"];

			const definitionsRun = await runCm(context.directory, cmQueryArgs, {
				signal: context.abort,
				timeoutMs: CM_TIMEOUT_MS,
			});
			const definitions = parseDefinitionsOutput(definitionsRun.stdout);
			if (definitions.length === 0) return fuzzy ? `No symbol found: ${symbol}` : `No exact symbol found: ${symbol}`;

			const fuzzyFlag = fuzzy ? ["--fuzzy"] : [];
			const [callersRun, calleesRun, testsRun] = await Promise.all([
				runCm(context.directory, ["callers", symbol, searchPath, "--format", "ai", ...fuzzyFlag], { signal: context.abort, timeoutMs: CM_TIMEOUT_MS }),
				runCm(context.directory, ["callees", symbol, searchPath, "--format", "ai", ...fuzzyFlag], { signal: context.abort, timeoutMs: CM_TIMEOUT_MS }),
				runCm(context.directory, ["tests", symbol, searchPath, "--format", "ai", ...fuzzyFlag], { signal: context.abort, timeoutMs: CM_TIMEOUT_MS }),
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
