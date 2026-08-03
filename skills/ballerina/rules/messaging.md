# Message-Driven Service Rules

Read when building a consumer for a broker or queue (Kafka, RabbitMQ, NATS, JMS, MQTT, …).

The first two sections apply to any broker. The third is Kafka's concrete API — other
connectors express the same ideas with their own calls, so ask the `library` agent for the
acknowledgement API of the one you are using rather than assuming Kafka's.

## Attaching the service

Some event/streaming listeners (change-data-capture, certain MQ connectors) attach their service to a vendor channel/topic string between the service type and `on`:

```ballerina
service <pkg>:<ServiceType> "<channel>" on <listener>
```

The channel is the **service's attach path** — not a listener constructor argument. Get it from the connector README/vendor docs (ask the `library` agent) before writing the service; omitting it usually compiles but the service silently receives nothing.

This does **not** apply to connectors that configure the destination on the listener itself — Kafka (`topics`), RabbitMQ queue-per-listener, and similar. There `service on myListener { ... }` is the complete attach form, and there is no channel string to hunt for. Confirm which shape the connector uses before assuming either.

## The acknowledgement boundary (any broker)

A listener usually hands the remote method a **batch** of messages, not one. When the requirement is at-least-once delivery — "if X fails, do not acknowledge the message" — where you acknowledge *is* the design. Get it wrong and messages are lost only under load, never in a single-message test.

- Decide, before writing the loop, which failures block the acknowledgement:

  | Failure | Blocks the ack? |
  | ------- | --------------- |
  | Persistence or another required side effect | **Yes** — do not acknowledge; arrange redelivery |
  | Malformed payload that can never succeed | No — log and skip, or the consumer wedges on a poison message forever |
  | Downstream call the design tolerates failing | No — record the outcome and carry on |

- Check whether the acknowledgement call is **per-message or batch-scoped** before using it. A batch-scoped call placed inside the message loop acknowledges messages the loop has not processed yet — including ones it deliberately skipped.
- Switching off automatic acknowledgement is only safe together with the above. Manual acknowledgement done carelessly is strictly worse than leaving it automatic.

## Preserving the raw payload (any broker)

Need the untouched payload (audit, replay, dead-letter)? Bind the message body as `string` or `byte[]` and persist it **before** parsing. Binding straight to a typed record discards the original bytes, so a parse failure loses the event entirely — usually the exact event you most wanted to keep.

## Kafka specifics

- `caller->'commit()` commits **every offset the consumer holds — the whole batch**, not the record in hand. Call it **once, after the loop**.
- To block the ack on failure, `caller->seek(...)` back to that record's offset and return **without** committing. Without the `seek` the record is not redelivered in-session: the consumer position has already advanced past it.
- `caller->commitOffset(...)` takes the **next offset to consume**, not the offset just processed. To acknowledge record `N`, commit `N + 1` — passing `N` acknowledges nothing and redelivers it forever.
- Set `autoCommit: false` only together with the above.
- Record inclusion keeps the raw bytes and puts `offset` in scope for `seek`:

  ```ballerina
  type RawOrderRecord record {|
      *kafka:AnydataConsumerRecord;
      string value;
  |};
  ```

For a worked at-least-once skeleton and the measured commit-scope behaviour, see [../troubleshooting/messaging.md](../troubleshooting/messaging.md).
