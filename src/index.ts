import type { Plugin } from "@opencode-ai/plugin";
import { searchTool } from "./tools/search.js";
import { mapTool } from "./tools/map.js";
import { outlineTool } from "./tools/outline.js";
import { expandTool } from "./tools/expand.js";
import { pathTool } from "./tools/path.js";

export const CodeMapperPlugin: Plugin = async () => ({
	tool: {
		search: searchTool,
		map: mapTool,
		outline: outlineTool,
		expand: expandTool,
		path: pathTool,
	},
});
