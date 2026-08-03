# Workspace Rules

Read when a repo holds more than one package — a root `Ballerina.toml` with a `[workspace]` section.

A workspace is also the answer when one requirement needs two entry points: a service **and** a companion `main` (mock producer, seeder, CLI). The constraint is one entry point per package, not one per repository.

## Creating a new package

1. Create the package directory with a `Ballerina.toml` containing the `[package]` section (`name`, `org`, `version`).
2. Add the new package path to the `packages` array in the root workspace `Ballerina.toml`.
3. Create initial `.bal` files in the new package.

## Guidelines

- Always prefer modifying existing packages over creating new ones.
- The root workspace `Ballerina.toml` should only contain a `[workspace]` section.
- Do not modify existing package `Ballerina.toml` files for dependency management.
