# HTTP Rules

Read when building an HTTP service or calling an HTTP API.

## Service design

Define resource function signatures first, with full return types:

```ballerina
resource function get users() returns UserList|http:NotFound|http:NotImplemented {
    return http:NOT_IMPLEMENTED;
}
```

Use `http:NotImplemented` as a placeholder return type initially, then implement each resource function.

## Client resilience

Configure retries on the client — do not hand-write a retry loop with `runtime:sleep`:

```ballerina
http:Client partnerClient = check new (partnerBaseUrl,
    timeout = 30,
    retryConfig = {
        count: 2,                              // RETRIES, not attempts — 2 means 3 calls
        interval: 1,
        backOffFactor: 2.0,
        maxWaitInterval: 20,
        statusCodes: [500, 502, 503, 504]
    }
);
```

- `count` is the number of **retries**, so "max N attempts" is `count: N - 1`. With the settings above, `count: 2` issues 3 requests in total, spaced ~1 s then ~2 s.
- `statusCodes` is an explicit list, not a range. `[500, 502, 503, 504]` is *not* "all 5xx" — 501, 505, 507 and 511 fall through unretried. List every code you mean.
- Exhausting retries keeps the two failure kinds distinguishable: a listed status code comes back as an **`http:Response` carrying its real status**; a transport failure (DNS, refused, timeout) comes back as an **`http:ClientError`**. So there is never a reason to invent a status code for a call that never reached the server — record "no response" as its own outcome.
- The built-in retry does not log individual attempts. Needing per-attempt correlation logging is the only good reason to write the loop yourself; preserving the status code is not.
