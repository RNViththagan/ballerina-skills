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

const fs = require("node:fs");
const path = require("node:path");

const { fetchJson } = require("./net.js");
const {
    PackageNotFoundError,
    UpstreamError,
} = require("./errors.js");

// Ballerina Central public REST API (v2.0). Endpoints used:
//   GET registry/packages?org=<org>&limit=1000&readme=false  — list an org's packages
//   GET docs/<org>/<name>/<version>                           — fetch a package's API docs
const CENTRAL_BASE_URL = "https://api.central.ballerina.io/2.0/";

// ---------------------------------------------------------------------------
// fetchOrgPackages
//   GET registry/packages?org=<org>&limit=1000&readme=false
// ---------------------------------------------------------------------------

async function fetchOrgPackages(org, { fetch, signal, limit = 1000 } = {}) {
    const url = `${CENTRAL_BASE_URL}registry/packages?org=${encodeURIComponent(org)}&limit=${limit}&readme=false`;
    const body = await fetchJson(url, { fetch, signal });
    return body.packages || [];
}

// ---------------------------------------------------------------------------
// resolveLatestVersion — filter to the exact org/name client-side
// ---------------------------------------------------------------------------

async function resolveLatestVersion(org, name, { fetch, signal } = {}) {
    const packages = await fetchOrgPackages(org, { fetch, signal });
    const exact = packages.find((p) => p.organization === org && p.name === name);
    if (!exact) {
        throw new PackageNotFoundError(`${org}/${name}`);
    }
    return exact.version;
}

// ---------------------------------------------------------------------------
// fetchDocs
//   GET docs/<org>/<name>/<version>
// ---------------------------------------------------------------------------

async function fetchDocs(org, name, version, { fetch, signal } = {}) {
    const url = `${CENTRAL_BASE_URL}docs/${encodeURIComponent(org)}/${encodeURIComponent(name)}/${encodeURIComponent(version)}`;
    try {
        return await fetchJson(url, { fetch, signal });
    } catch (err) {
        // 404 from the docs endpoint means the (org, name, version) tuple isn't published.
        if (err instanceof UpstreamError && err.details && err.details.status === 404) {
            throw new PackageNotFoundError(`${org}/${name}:${version}`, {
                suggestion: `Verify the package exists and the version '${version}' is published. Run 'bal search' to see available packages.`,
                details: { org, name, version },
            });
        }
        throw err;
    }
}

// ---------------------------------------------------------------------------
// Dependencies.toml parsing
// ---------------------------------------------------------------------------

function parseDependenciesToml(content) {
    const map = {};
    if (!content) {
        return map;
    }
    const lines = content.split("\n");
    let inPackage = false;
    let org;
    let name;
    let version;
    const flush = () => {
        if (inPackage && org && name && version) {
            map[`${org}/${name}`] = version;
        }
        org = undefined;
        name = undefined;
        version = undefined;
    };
    for (const raw of lines) {
        const line = raw.trim();
        if (line.startsWith("[[package]]")) {
            flush();
            inPackage = true;
            continue;
        }
        if (line.startsWith("[")) {
            flush();
            inPackage = false;
            continue;
        }
        if (!inPackage) continue;
        const match = line.match(/^(\w+)\s*=\s*"([^"]*)"$/);
        if (!match) continue;
        const [, key, value] = match;
        if (key === "org") org = value;
        else if (key === "name") name = value;
        else if (key === "version") version = value;
    }
    flush();
    return map;
}

function readDependenciesVersions(projectDir, { dependenciesFileName = "Dependencies.toml" } = {}) {
    if (!projectDir) return {};
    const filePath = path.join(projectDir, dependenciesFileName);
    try {
        const content = fs.readFileSync(filePath, "utf-8");
        return parseDependenciesToml(content);
    } catch (err) {
        if (err && err.code === "ENOENT") return {};
        throw err;
    }
}

// ---------------------------------------------------------------------------
// resolveVersion — Dependencies.toml first, then Central fallback
// ---------------------------------------------------------------------------

async function resolveVersion(org, name, opts = {}) {
    const { version, projectDir, dependenciesFileName, fetch, signal } = opts;
    if (version) return version;
    const locked = readDependenciesVersions(projectDir, { dependenciesFileName });
    const lockedVersion = locked[`${org}/${name}`];
    if (lockedVersion) return lockedVersion;
    return resolveLatestVersion(org, name, { fetch, signal });
}

module.exports = {
    CENTRAL_BASE_URL,
    fetchOrgPackages,
    resolveLatestVersion,
    fetchDocs,
    parseDependenciesToml,
    readDependenciesVersions,
    resolveVersion,
};
