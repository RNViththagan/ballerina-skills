# Workspace Rules

Read when a repo holds more than one package — a root `Ballerina.toml` with a `[workspace]` section.

A workspace is also how you keep a service and a companion `main` (mock producer, seeder, CLI) **separately runnable**. This is a packaging choice, not a language limit: a single package may hold both — module initialization runs, then `main` runs to completion, then the listeners start.

That ordering is why one package is usually the wrong home for a companion script:

- Starting the service also runs the `main`.
- Listeners do not start until `main` **returns**. A `main` that blocks — polling, sleeping, waiting on input — leaves the service unreachable for as long as it runs.
- A `main` that returns an error aborts the program, and the listeners never start at all.

Keep a `main` in the same package only when it is genuinely startup work that must finish before serving begins.

## Creating a new package

1. Create the package directory with a `Ballerina.toml` containing the `[package]` section (`name`, `org`, `version`).
2. Add the new package path to the `packages` array in the root workspace `Ballerina.toml`.
3. Create initial `.bal` files in the new package.

## Guidelines

- Always prefer modifying existing packages over creating new ones.
- The root workspace `Ballerina.toml` should only contain a `[workspace]` section.
- Do not modify existing package `Ballerina.toml` files for dependency management.
