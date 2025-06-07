[**Documentation**](../../../README.md)

***

[Documentation](../../../README.md) / [types/chrome-extractor](../README.md) / CollectedLogEntry

# Interface: CollectedLogEntry

Defined in: [types/chrome-extractor.d.ts:33](https://github.com/Jason-Vaughan/CLiTS/blob/08dc9183978ffe290c0eea07fbaf407630d61e44/src/types/chrome-extractor.d.ts#L33)

## Properties

### details

> **details**: [`NetworkRequest`](../../chrome-types/interfaces/NetworkRequest.md) \| [`NetworkResponse`](../../chrome-types/interfaces/NetworkResponse.md) \| [`ConsoleMessage`](../../chrome-types/interfaces/ConsoleMessage.md) \| [`DevToolsLogEntry`](../../chrome-types/interfaces/DevToolsLogEntry.md)

Defined in: [types/chrome-extractor.d.ts:36](https://github.com/Jason-Vaughan/CLiTS/blob/08dc9183978ffe290c0eea07fbaf407630d61e44/src/types/chrome-extractor.d.ts#L36)

***

### timestamp

> **timestamp**: `string`

Defined in: [types/chrome-extractor.d.ts:35](https://github.com/Jason-Vaughan/CLiTS/blob/08dc9183978ffe290c0eea07fbaf407630d61e44/src/types/chrome-extractor.d.ts#L35)

***

### type

> **type**: `"log"` \| `"network"` \| `"console"`

Defined in: [types/chrome-extractor.d.ts:34](https://github.com/Jason-Vaughan/CLiTS/blob/08dc9183978ffe290c0eea07fbaf407630d61e44/src/types/chrome-extractor.d.ts#L34)
