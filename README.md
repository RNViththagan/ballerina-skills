# Ballerina Skills

Agent skills & plugins for Ballerina developers — language-server code intelligence for `.bal` files plus an AI coding assistant that writes integrations and services, discovers libraries from Ballerina Central, and runs and tests projects.

## Prerequisites

- Ballerina >= 2201.12.0 (Swan Lake Update 12+) — `bal` available in PATH
- Node.js >= 18 — for the bundled `ballerina-library` MCP server that powers library discovery

## Install

### via Claude Code

```bash
/plugin marketplace add ballerina-platform/skills
/plugin install ballerina@ballerina-skills
```

Then **restart the session**. This activates all four components:

- the **language server** for `.bal` files (completions, hover, diagnostics),
- the **`ballerina` skill** for writing, running, and testing code,
- the **`library` discovery agent** (bundled `ballerina-library` MCP server),
- the **skill-reminder hooks**.

No `npm install` step is required — the MCP server ships pre-bundled at `mcp/dist/server.js`.

Verify with `/plugin` (the `ballerina` plugin should be listed and enabled), then open a `.bal`
file or ask the agent to "write a Ballerina HTTP service".

> Support for Codex and the Open Agent Skills CLI (Cursor, Gemini CLI, Copilot, …) is coming.
> Those channels carry the **skill only** — the language server, the MCP discovery server, and the
> activation hooks are Claude Code plugin features.

## Skills

| Skill | Purpose | When to Use |
| --- | --- | --- |
| `ballerina` | Write, run, and test Ballerina programs and integrations | Building HTTP services, APIs, or integrations; running/testing/building a project; adding a library; setting up Ballerina |

## Usage

### Ask Your Agent

| You Say | Skill Used |
| --- | --- |
| "Write a Ballerina HTTP service" | `ballerina` |
| "Run the Ballerina project" | `ballerina` |
| "Fix this `.bal` file" | `ballerina` |
| "Find a Ballerina GitHub client" | `ballerina` (+ `library` agent) |
| "Set up Ballerina on my machine" | `ballerina` |

Or invoke it directly:

```bash
/ballerina <your request>
```

## License

Licensed under the Apache License, Version 2.0 ([LICENSE](LICENSE)). You may not use this file
except in compliance with the License.

---------------------------------------------------------------------------
(c) Copyright 2026 WSO2 LLC.
