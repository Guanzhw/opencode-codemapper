# opencode-codemapper

OpenCode plugin that exposes the [CodeMapper](https://github.com/p1rallels/codemapper) CLI (`cm`) as five agent-facing tools for code exploration.

This is the OpenCode equivalent of [`pi-codemapper`](https://github.com/elpapi42/pi-codemapper).

## Tools

| Tool | Description |
|------|-------------|
| `search` | Find symbols, doc headings, and endpoints by name or compact keyword |
| `map` | Get repo/directory structure overview (stats + level-2 file map) |
| `outline` | List all symbols in one file without reading the full file |
| `expand` | Show a symbol's relationship radius: definition, callers, callees, tests |
| `path` | Find shortest detected static call path between two symbols |

## Prerequisites

- [OpenCode](https://opencode.ai) (tested with 1.3+)
- CodeMapper `cm` binary available on `PATH`, `~/.local/bin/cm`, or `CODEMAPPER_BIN` env var

### Installing CodeMapper

Build from source (requires [Rust](https://rustup.rs)):

```bash
git clone https://github.com/p1rallels/codemapper.git
cd codemapper
cargo build --release
sudo cp target/release/cm ~/.local/bin/cm
```

Quick check:

```bash
cm --help
cm stats . --format ai
```

## Install

**Option A — CLI (recommended):**

```bash
opencode plugin opencode-codemapper --global
```

**Option B — Manual config:**

In your `opencode.json` (project-level) or `~/.config/opencode/opencode.jsonc` (global), add:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["opencode-codemapper"]
}
```

Then restart OpenCode. The five tools will be available automatically.

> **Config location**: OpenCode looks for `opencode.json` / `opencode.jsonc` in the project root.
> Global config lives at `~/.config/opencode/opencode.jsonc`. Both `.json` and `.jsonc` (JSON with comments) are supported.

### Local development

Clone this repo and point OpenCode at the local path:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["/absolute/path/to/opencode-codemapper"]
}
```

## Usage

After installing, the five tools become available to the AI agent alongside built-in tools.

### Typical workflows

```
1. Explore:  map({ path: "." })
2. Search:   search({ query: "auth|login|session" })
3. Outline:  outline({ file: "src/auth.ts" })
4. Expand:   expand({ symbol: "authenticateUser" })
5. Trace:    path({ from: "loginHandler", to: "verifyPassword" })
```

## Tool reference

### `search({ query, path?, exact? })`

```
- query: string — symbol name, concept, route, or | -separated OR query
- path:  string (optional) — directory scope, defaults to "."
- exact: boolean (optional) — strict matching, defaults to false
```

Returns a JSON array of `symbol`, `doc_section`, and `endpoint` items.

### `map({ path? })`

```
- path: string (optional) — directory scope, defaults to "."
```

Returns a JSON array with one `stats` item plus `file` items. Falls back to `directory` groups when the file map is too large.

### `outline({ file })`

```
- file: string — file path (leading @ is stripped)
```

For code files, returns a JSON array with file metadata and symbol items.
For Markdown files, returns h1-h3 section headings with line counts.

### `expand({ symbol })`

```
- symbol: string — exact symbol name from CodeMapper index
```

Returns a JSON array combining `definition`, `caller`, `callee`, and `test` items.

### `path({ from, to })`

```
- from: string — exact source symbol name
- to: string — exact target symbol name
```

Returns a JSON array with one `call_path` item, or `[]` if no static path is detected.

## Configuration

Use `CODEMAPPER_BIN` when `cm` is not on OpenCode's runtime `PATH`:

```bash
CODEMAPPER_BIN=/absolute/path/to/cm opencode
```

The extension sets `NO_COLOR=1` and `TERM=dumb` when invoking `cm`.

## License

MIT
