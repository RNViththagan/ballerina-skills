# Ballerina Code Rules

Everything in this file applies to **all** Ballerina code. Read it in full.

## Domain rules — read the ones your task needs

These are not optional extras; they are the rules for their domain, kept out of this file so you only load what applies. Read the matching file **before** writing that part of the code.

| Task involves | Read |
| ------------- | ---- |
| An HTTP service, or calling an HTTP API | [rules/http.md](rules/http.md) |
| A consumer for a broker or queue (Kafka, RabbitMQ, NATS, JMS, …), or any listener that receives events — change-data-capture included | [rules/messaging.md](rules/messaging.md) |
| A GraphQL service | [rules/graphql.md](rules/graphql.md) |
| More than one package in the repo, or a service **plus** a `main` | [rules/workspace.md](rules/workspace.md) |
| Writing tests — only when the user asked for them | [rules/tests.md](rules/tests.md) |

## Structure

- Define `configurable` variables for all external values (API keys, hosts, ports, credentials).
  - Allowed types: `string`, `int`, `decimal`, `boolean` only.
  - Never assign hardcoded default values to configurables.
- Initialize clients at module level, before any function or service declarations.
- Declare listeners with the `listener` keyword (`listener foo:Listener lsn = new (config);`), not a `final` variable — `service ... on lsn` attachment requires it; a `final foo:Listener` fails to compile.
- A package may contain **both** a `main` function and services: module initialization runs, then `main` runs to completion, then the runtime starts the registered listeners — so use `main` for startup work that belongs with the service. Split them into separate packages only when they must be *invoked independently* (a service plus a mock producer or seeder you run on demand), since otherwise starting the service also runs the `main` — see [rules/workspace.md](rules/workspace.md).

## Data

- Use records for all data structures. Never use `map<json>`, `map<anydata>`, or raw `json`.
- Prefer closed records (`record {| ... |}`) for data shapes you own. Use an open record only when tolerating extra/unknown fields is deliberate (e.g. a loosely-specified inbound payload).
- Never access or manipulate a `json` variable directly. Define a record, convert json to it (`cloneWithType()` or `fromJsonStringWithType()`), then use the record.
- If a return typedesc is marked `<>` in API docs, define a custom record for the expected data shape.
- If a parameter type is `record {|anydata...;|}`, define or reuse an explicit named record — do not pass an anonymous literal.
- If a return type is `record {|anydata...;|}`, decide the shape, declare a named record, and assign to it.
- When accessing a field of a record, assign it to a new typed variable first, then use that variable in the next statement.

## Identifiers

- Always use **two-word camelCase** for ALL identifiers: variables, parameters, record fields (e.g., `userName`, `baseUrl`, `responseBody`).
- Exception: a record whose fields bind to external payload/JSON keys (e.g. via `cloneWithType()`) must use the **exact source key names** — even if that means single-word or PascalCase (e.g. `Name`, `CreatedDate`). The wire contract wins over the naming convention here.

## Function Calls

- Dot notation (`.`) for normal functions. Arrow notation (`->`) for remote and resource functions.
- Resource function invocation: `clientVar->/path/["param"].get(key="value")`
- Always use **named arguments**: `client->post("/path", message = payload)` — never positional.
- A remote call (`->`) may stand alone, be the whole right-hand side of an assignment, or be returned — `return c->get("/a");` is fine. It may **not** appear nested inside a larger expression: `io:println(check c->get("/a"))` fails with *action invocation as an expression not allowed here*. Assign it to a variable first.

## Type Safety

- Declare types explicitly in all variable declarations and `foreach` statements.
- To narrow a union or optional type: assign to a separate typed variable first, then use it in the `if` condition.
- Do not invoke methods on json access expressions — always use a separate statement.

## Imports

- Each `.bal` file must have its own import statements.
- Import only packages your code actually references — `bal build` errors on unused imports. Don't pre-import a connector's dependency module (e.g. `ballerina/sql` behind a database client) unless your code names a type from it. Exception: the SQL `.driver` packages (below) are deliberate side-effect-only imports — keep them even though they look unused.
- Do not import auto-imported langlibs: `lang.string`, `lang.boolean`, `lang.float`, `lang.decimal`, `lang.int`, `lang.map`.
- Packages with dots in names use aliases: `import org/package.one as one;`
- Submodules in `generated/<moduleName>/`: import as `import <packageName>.<moduleName>;` — the import should contain only the package name and submodule name, no path components.
- For SQL databases, import the matching `.driver` package alongside the client so the JDBC driver is on the runtime classpath (also required for GraalVM native builds):
  ```ballerina
  import ballerinax/postgresql;
  import ballerinax/postgresql.driver as _;
  ```
  The same pattern applies to the other vendor connectors — `mysql` + `mysql.driver`, `mssql` + `mssql.driver`, `oracledb` + `oracledb.driver`, `h2` + `h2.driver`. None of them bundle a driver, and without the import the code compiles and then fails at runtime.

  The generic `ballerinax/java.jdbc` connector is the exception: there is no `java.jdbc.driver` package. Add the vendor's JDBC JAR as a platform dependency in `Ballerina.toml` instead.

## Config.toml

- Never read `Config.toml` or `tests/Config.toml` directly — they may contain secrets.
- Providing values to configurables is a runtime task. Only do it before running or testing.
- If the user needs to supply values, list the configurable variable names in the summary.

## Logging & Observability

- Use the `ballerina/log` module for logging: `log:printInfo`, `log:printError`, `log:printWarn`, `log:printDebug`. Attach context as named key-value arguments rather than concatenating into the message string.
- Ballerina has built-in runtime observability (metrics + tracing) — enable it via `[ballerina.observe]` in `Config.toml`, or pass `--observability-included` to `bal run`/`bal build` (already set by `bal new`). Use `ballerina/observe` only for custom spans/metrics beyond the built-in instrumentation.

## File Organization

- Split code by concern across multiple `.bal` files rather than cramming everything into `main.bal` — files in a package share one module, so splitting is free; use submodules or packages for larger separation.
- Reuse a fitting existing file before adding a new one; name new files for their concern (`snake_case.bal`). Naming and granularity are your call, not a fixed scheme.
- **Never hand-edit `Dependencies.toml`** — it is auto-managed by the build tool. Do not create or hand-modify it to manage dependencies; deleting it to force a clean re-resolution (then rebuilding) is a valid troubleshooting step.
- **Never edit `Ballerina.toml` to add dependencies** — add the `import` statement in the `.bal` file and run `bal build`; Ballerina resolves and downloads packages from Central automatically.

## Other Rules

- No dynamic listener registrations.
- No code that requires assigning values to function parameters.
- Propagate errors with `check`, or handle them with a `do`/`on fail` block; never use `checkpanic` to silence an error return in real code.
- `//` is the only comment form — Ballerina has no `/* */` block comments (`invalid token '/*'`). `#` introduces documentation.
