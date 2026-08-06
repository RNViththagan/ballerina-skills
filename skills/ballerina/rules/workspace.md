# Workspace Rules

Read when a repo holds more than one package — a root `Ballerina.toml` with a `[workspace]` section.

A workspace is also how you keep a service and a companion `main` (mock producer, seeder, CLI) **separately runnable**. Note this is a packaging choice, not a language limit: a single package may hold both — `main` completes during module initialization and the listeners start after it. Separate packages only when you need to invoke each on its own, because in one package starting the service also runs the `main`.

## Creating a new package

1. Create the package directory with a `Ballerina.toml` containing the `[package]` section (`name`, `org`, `version`).
2. Add the new package path to the `packages` array in the root workspace `Ballerina.toml`.
3. Create initial `.bal` files in the new package.

## Guidelines

- Always prefer modifying existing packages over creating new ones.
- The root workspace `Ballerina.toml` should only contain a `[workspace]` section.
- Do not modify existing package `Ballerina.toml` files for dependency management.
