/*
 * Copyright (c) 2026, WSO2 LLC. (https://www.wso2.com).
 *
 * WSO2 LLC. licenses this file to you under the Apache License,
 * Version 2.0 (the "License"); you may not use this file except
 * in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied. See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

"use strict";

// Typed error hierarchy for the ballerina-library MCP server.
//
// Per the MCP spec, tool-execution errors should be returned inside the tool
// result as { content, isError: true } — not thrown as protocol errors — so
// the LLM can see them and self-correct. The agent (plugins/ballerina/agents
// /library.md) reads the JSON body in content[0].text and switches behaviour
// based on the `error` code.
//
// The format is versioned (ERROR_RESULT_VERSION) so we can evolve it later
// without surprising downstream agents.

const ERROR_RESULT_VERSION = 1;

class BalMcpError extends Error {
    constructor(code, message, opts = {}) {
        super(message);
        this.name = this.constructor.name === "Error" ? "BalMcpError" : this.constructor.name;
        if (this.name === "Object") this.name = "BalMcpError";
        this.code = code;
        this.retryable = opts.retryable === true;
        this.suggestion = opts.suggestion;
        this.details = opts.details ? { ...opts.details } : {};
        if (opts.cause) this.cause = opts.cause;
    }
}
// Ensure the base class itself reports name correctly regardless of subclass quirks
Object.defineProperty(BalMcpError.prototype, "name", { value: "BalMcpError", writable: true });

class ValidationError extends BalMcpError {
    constructor(message, opts = {}) {
        super("VALIDATION", message, { retryable: false, ...opts });
        this.name = "ValidationError";
    }
}

class PackageNotFoundError extends BalMcpError {
    constructor(qualifiedName, opts = {}) {
        super(
            "PACKAGE_NOT_FOUND",
            `Package ${qualifiedName} not found on Ballerina Central.`,
            {
                retryable: false,
                suggestion: opts.suggestion || "Use search_libraries to find the correct org/name.",
                details: { qualifiedName, ...(opts.details || {}) },
                ...opts,
            }
        );
        // Re-assign details since super spread put opts.details last after our merged object
        this.details = { qualifiedName, ...(opts.details || {}) };
        this.name = "PackageNotFoundError";
    }
}

class UpstreamError extends BalMcpError {
    constructor(kind, message, opts = {}) {
        super("UPSTREAM_ERROR", message, {
            retryable: true,
            ...opts,
            details: { kind, ...(opts.details || {}) },
        });
        this.name = "UpstreamError";
    }
}

class TimeoutError extends BalMcpError {
    constructor(message, opts = {}) {
        super("TIMEOUT", message, {
            retryable: true,
            suggestion: opts.suggestion || "The request timed out. Try a smaller package, an explicit version, or retry shortly.",
            ...opts,
        });
        this.name = "TimeoutError";
    }
}

class BalNotInstalledError extends BalMcpError {
    constructor(opts = {}) {
        super(
            "BAL_NOT_INSTALLED",
            "The `bal` command is not on PATH. Ballerina is required for library search.",
            {
                retryable: false,
                suggestion: opts.suggestion || "Install Ballerina (https://ballerina.io/downloads) and ensure `bal` is on PATH.",
                ...opts,
            }
        );
        this.name = "BalNotInstalledError";
    }
}

class BalCommandError extends BalMcpError {
    constructor(message, opts = {}) {
        const { stderr, exitCode, details, ...rest } = opts || {};
        super("BAL_COMMAND_FAILED", message, {
            retryable: false,
            details: { ...(details || {}), ...(stderr !== undefined ? { stderr } : {}), ...(exitCode !== undefined ? { exitCode } : {}) },
            ...rest,
        });
        // The super's details merge may have been clobbered by spread ordering; assert explicitly.
        if (stderr !== undefined) this.details.stderr = stderr;
        if (exitCode !== undefined) this.details.exitCode = exitCode;
        this.name = "BalCommandError";
    }
}

class CancelledError extends BalMcpError {
    constructor(message = "Request was cancelled.", opts = {}) {
        super("CANCELLED", message, { retryable: false, ...opts });
        this.name = "CancelledError";
    }
}

class InternalError extends BalMcpError {
    constructor(message, opts = {}) {
        super("INTERNAL_ERROR", message, { retryable: false, ...opts });
        this.name = "InternalError";
    }
}

/**
 * Convert any thrown error into a CallToolResult with isError: true.
 * The text content is JSON with this shape (versioned):
 *
 *   { version, error, message, retryable, suggestion?, details? }
 *
 * @param {Error} err
 * @param {string} [requestId]
 */
function formatErrorResult(err, requestId) {
    const bal = err instanceof BalMcpError
        ? err
        : new InternalError(err && err.message ? err.message : String(err), { cause: err });

    const details = { ...(bal.details || {}) };
    if (requestId !== undefined && requestId !== null) {
        details.requestId = requestId;
    }

    const body = {
        version: ERROR_RESULT_VERSION,
        error: bal.code,
        message: bal.message,
        retryable: bal.retryable,
    };
    if (bal.suggestion) body.suggestion = bal.suggestion;
    if (Object.keys(details).length > 0) body.details = details;

    return {
        content: [{ type: "text", text: JSON.stringify(body, null, 2) }],
        isError: true,
    };
}

module.exports = {
    ERROR_RESULT_VERSION,
    BalMcpError,
    ValidationError,
    PackageNotFoundError,
    UpstreamError,
    TimeoutError,
    BalNotInstalledError,
    BalCommandError,
    CancelledError,
    InternalError,
    formatErrorResult,
};
