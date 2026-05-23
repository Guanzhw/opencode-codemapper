import { tool } from "@opencode-ai/plugin";
import { CM_TIMEOUT_MS } from "../constants.js";
import { renderToolFailure, runCm } from "../cm.js";
import { isMarkdownFile, normalizeRequiredPath } from "../paths.js";
import { parseInspectOutput, parseMarkdownTreeOutput } from "../parse.js";
import { toOutput } from "../output.js";

export const outlineTool = tool({
	description:
		"Outline one known file with CodeMapper after map/search has identified it. For code files, returns file metadata plus symbols with names, types, line ranges, signatures, and exported flags when available. For Markdown files, returns h1-h3 heading sections with line counts. Use before reading a full file to choose targeted ranges; this is not repo-wide symbol search.",
	args: {
		file: tool.schema.string().describe("File path to outline, e.g. `src/auth.ts` or `@src/auth.ts`. Leading @ is stripped."),
	},
	async execute(args, context) {
		const file = normalizeRequiredPath(args.file, "outline.file");
		if (typeof file !== "string") return file.error;

		const cmArgs = isMarkdownFile(file)
			? ["inspect", file, "--tree", "--sizes", "--level", "3"]
			: ["inspect", file, "--format", "ai"];

		try {
			const run = await runCm(context.directory, cmArgs, { signal: context.abort, timeoutMs: CM_TIMEOUT_MS });
			return toOutput(
				isMarkdownFile(file)
					? parseMarkdownTreeOutput(run.stdout, file)
					: parseInspectOutput(run.stdout),
			);
		} catch (error) {
			return renderToolFailure(error);
		}
	},
});
