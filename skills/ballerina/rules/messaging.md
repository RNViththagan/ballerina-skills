# Event-Driven Service Rules

Read when building anything that receives events through a listener — a broker or queue consumer (Kafka, RabbitMQ, NATS, JMS, MQTT, …) or a change-data-capture listener.

Attaching the service is connector-specific — read that section for the one you are using.
The acknowledgement and raw-payload sections hold for any broker. The last section is
Kafka's concrete API; other connectors express the same ideas with their own calls, so ask
the `library` agent for the acknowledgement API of the one you are using rather than
assuming Kafka's.

## Attaching the service

Connectors are split on where the destination goes, and you cannot infer it from the kind of connector — check the one in front of you (ask the `library` agent, or read its README).

**Destination on the listener.** `service on myListener { ... }` is the complete attach form; there is no channel string to look for.

```ballerina
listener kafka:Listener lsn = new (bootstrapServers = url, topics = ["orders"], ...);
service on lsn { ... }
```

Verified in this group: `ballerinax/kafka` (`topics`), `ballerina/mqtt` (`subscriptions`), `ballerinax/cdc` (`mysql:CdcListener`).

**Destination as the service attach path**, between the service type and `on`:

```ballerina
service <pkg>:<ServiceType> "<destination>" on <listener>
```

Verified in this group: `ballerinax/rabbitmq` (queue name), `ballerinax/nats` (subject), `ballerinax/salesforce` (CDC channel).

Note that "change-data-capture" does not settle it — Salesforce CDC takes an attach path, `ballerinax/cdc` does not.

Getting it wrong is **not** silent. Omitting a required attach path fails loudly, though not always at the same stage:

```text
rabbitmq, nats   ->  ERROR Invalid service attach point. Only string literals are allowed.   (build)
salesforce       ->  error: Invalid channel name: 'null'                                     (startup)
```

## The acknowledgement boundary (any broker)

Check first whether the remote method receives **one** message or a **batch** — the signature tells you. RabbitMQ and NATS deliver a single message; Kafka delivers an array. When the requirement is at-least-once delivery — "if X fails, do not acknowledge the message" — where you acknowledge *is* the design, and batch delivery is what makes it easy to get wrong: messages are then lost only under load, never in a single-message test.

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
