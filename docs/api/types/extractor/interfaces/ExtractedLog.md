[**Documentation**](../../../README.md)

***

[Documentation](../../../README.md) / [types/extractor](../README.md) / ExtractedLog

# Interface: ExtractedLog

Defined in: [types/extractor.d.ts:3](https://github.com/Jason-Vaughan/CLiTS/blob/08dc9183978ffe290c0eea07fbaf407630d61e44/src/types/extractor.d.ts#L3)

## Properties

### details

> **details**: [`NetworkRequest`](../../chrome-types/interfaces/NetworkRequest.md) \| [`NetworkResponse`](../../chrome-types/interfaces/NetworkResponse.md) \| [`ConsoleMessage`](../../chrome-types/interfaces/ConsoleMessage.md) \| [`DevToolsLogEntry`](../../chrome-types/interfaces/DevToolsLogEntry.md)

Defined in: [types/extractor.d.ts:6](https://github.com/Jason-Vaughan/CLiTS/blob/08dc9183978ffe290c0eea07fbaf407630d61e44/src/types/extractor.d.ts#L6)

***

### level?

> `optional` **level**: `string`

Defined in: [types/extractor.d.ts:8](https://github.com/Jason-Vaughan/CLiTS/blob/08dc9183978ffe290c0eea07fbaf407630d61e44/src/types/extractor.d.ts#L8)

***

### source?

> `optional` **source**: `string`

Defined in: [types/extractor.d.ts:7](https://github.com/Jason-Vaughan/CLiTS/blob/08dc9183978ffe290c0eea07fbaf407630d61e44/src/types/extractor.d.ts#L7)

***

### stackTrace?

> `optional` **stackTrace**: `string`[]

Defined in: [types/extractor.d.ts:9](https://github.com/Jason-Vaughan/CLiTS/blob/08dc9183978ffe290c0eea07fbaf407630d61e44/src/types/extractor.d.ts#L9)

***

### timestamp

> **timestamp**: `string`

Defined in: [types/extractor.d.ts:5](https://github.com/Jason-Vaughan/CLiTS/blob/08dc9183978ffe290c0eea07fbaf407630d61e44/src/types/extractor.d.ts#L5)

***

### type

> **type**: `"log"` \| `"network"` \| `"console"`

Defined in: [types/extractor.d.ts:4](https://github.com/Jason-Vaughan/CLiTS/blob/08dc9183978ffe290c0eea07fbaf407630d61e44/src/types/extractor.d.ts#L4)
