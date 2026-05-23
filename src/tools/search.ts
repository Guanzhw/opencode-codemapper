import { tool } from "@opencode-ai/plugin";
import { CM_TIMEOUT_MS, SEARCH_LIMIT } from "../constants.js";
import { renderToolFailure, runCm } from "../cm.js";
import { normalizeOptionalPath, normalizeRequiredString } from "../paths.js";
import { parseQueryOutput } from "../parse.js";
import { toOutput } from "../output.js";

export const searchTool = tool({
	description:
		"Search CodeMapper's indexed symbol and Markdown/doc names with `cm query --context full --limit 50`. Default matching is fuzzy/case-insensitive substring search; set exact=true only for a known exact indexed name. Query examples: `auth`, `cmd_query`, `Parser`, `parse|index|cache`, `Caching`, `functions`, `headings`, `/v1/orders`, or `GET /v1/orders`. Returns a JSON array of exact symbol, doc_section, and endpoint items with paths and line ranges; it is not semantic natural-language search and does not search arbitrary file text.",
	args: {
		query: tool.schema.string().describe("Symbol name, concept term, route, heading, or OR query (e.g. `auth`, `Parser`, `parse|index`, `/v1/orders`). Not a natural-language question."),
		path: tool.schema.string().optional().describe("Directory scope (e.g. `src`, `docs`, or `.` for whole project). Defaults to `.`."),
		exact: tool.schema.boolean().optional().describe("Enable strict/exact matching instead of fuzzy. Default: false."),
	},
	async execute(args, context) {
		const query = normalizeRequiredString(args.query, "search.query");
		if (typeof query !== "string") return query.error;

		const searchPath = normalizeOptionalPath(args.path, ".");
		const cmArgs = ["query", query, searchPath, "--format", "ai", "--context", "full", "--limit", String(SEARCH_LIMIT)];
		if (args.exact) cmArgs.push("--exact");

		try {
			const run = await runCm(context.directory, cmArgs, { signal: context.abort, timeoutMs: CM_TIMEOUT_MS });
			return toOutput(parseQueryOutput(run.stdout));
		} catch (error) {
			return renderToolFailure(error);
		}
	},
});
