# Ballerina Skills

Agent skills and plugins for Ballerina developers — language-server code intelligence for `.bal` files, and an AI coding assistant that writes integrations and services, discovers libraries from Ballerina Central, and builds, runs, and tests projects.

## Prerequisites

- Ballerina 2201.12.0 (Swan Lake Update 12) or later, with `bal` available on the `PATH`.
- Node.js 18 or later, required by the bundled library-discovery MCP server.

## Installation

### Claude Code

Register the marketplace and install the plugin:

```bash
/plugin marketplace add ballerina-platform/skills
/plugin install ballerina@ballerina-skills
```

Restart the session to activate the language server, the `ballerina` skill, the `library` discovery agent, and the activation hooks. The MCP server ships pre-built; no `npm install` step is required.

### Other agents (Open Agent Skills CLI)

Install the skill for Codex, Cursor, Gemini CLI, GitHub Copilot, and other agents:

```bash
npx skills add ballerina-platform/skills
```

Pass `--agent <name>` to target a specific agent. This channel installs the `ballerina` skill only; the language server, the library-discovery MCP server, and the activation hooks are Claude Code plugin features. On these agents, library discovery uses the `bal search` command.

## Skills

| Skill | Description |
|-------|-------------|
| `ballerina` | Write, build, run, and test Ballerina programs and integrations, and discover and add libraries from Ballerina Central. |

## Usage

The `ballerina` skill activates automatically when a request involves Ballerina work, or it can be invoked directly:

```bash
/ballerina <request>
```

Representative requests:

| Request | Outcome |
|---------|---------|
| "Write a Ballerina HTTP service" | Scaffolds and implements the service |
| "Run the Ballerina project" | Builds and runs the project |
| "Fix this `.bal` file" | Diagnoses and corrects the code |
| "Find a Ballerina GitHub client" | Discovers the library and its API |

## License

Licensed under the Apache License, Version 2.0. See the [LICENSE](LICENSE) file for details.

---------------------------------------------------------------------------
(c) Copyright 2026 WSO2 LLC.
