# Message-Driven Service Rules (Kafka, RabbitMQ, NATS, JMS)

Read when building a consumer for a broker or queue.

## Attaching the service

Some event/streaming listeners (change-data-capture, certain MQ connectors) attach their service to a vendor channel/topic string between the service type and `on`:

```ballerina
service <pkg>:<ServiceType> "<channel>" on <listener>
```

The channel is the **service's attach path** — not a listener constructor argument. Get it from the connector README/vendor docs (ask the `library` agent) before writing the service; omitting it usually compiles but the service silently receives nothing.

This does **not** apply to connectors that configure the destination on the listener itself — Kafka (`topics`), RabbitMQ queue-per-listener, and similar. There `service on myListener { ... }` is the complete attach form, and there is no channel string to hunt for. Confirm which shape the connector uses before assuming either.

## Delivery semantics

A listener hands the remote method a **batch** of records, not one. When the requirement is at-least-once delivery ("if X fails, do not acknowledge the message"), the commit boundary *is* the design — get it wrong and messages are silently lost under load.

- `caller->'commit()` commits **every offset the consumer holds — the whole batch**, not the record in hand. Call it **once, after the loop**. A commit inside the loop acknowledges records the loop has not processed yet, including ones it already skipped.
- To block the ack on failure, `caller->seek(...)` back to that record's offset and return **without** committing. Without the `seek` the record is not redelivered in-session: the consumer position has already advanced past it.
- `caller->commitOffset(...)` takes the **next offset to consume**, not the offset just processed. To acknowledge record `N`, commit `N + 1` — passing `N` acknowledges nothing and redelivers it forever.
- Decide per failure kind whether it blocks the ack, before writing the loop:

  | Failure | Blocks the ack? |
  | ------- | --------------- |
  | Persistence or another required side effect | **Yes** — seek, return, do not commit |
  | Malformed payload that can never succeed | No — log and skip, or the consumer wedges on a poison message forever |
  | Downstream call the design tolerates failing | No — record the outcome and carry on |

- Set `autoCommit: false` **only** together with the above. Manual commit without them is strictly worse than auto-commit.

## Preserving the raw payload

Need the untouched payload (audit, replay, dead-letter)? Bind `value` as `string` or `byte[]` via record inclusion and persist that **before** parsing — binding straight to a typed record discards the original bytes, and a parse failure then loses the event entirely:

```ballerina
type RawOrderRecord record {|
    *kafka:AnydataConsumerRecord;
    string value;
|};
```

Record inclusion is also what puts `offset` in scope, which `seek` needs.

For a worked at-least-once skeleton and the measured commit-scope behaviour, see [../troubleshooting/messaging.md](../troubleshooting/messaging.md).
