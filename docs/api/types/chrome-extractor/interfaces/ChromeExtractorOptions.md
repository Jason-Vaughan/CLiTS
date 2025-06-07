[**Documentation**](../../../README.md)

***

[Documentation](../../../README.md) / [types/chrome-extractor](../README.md) / ChromeExtractorOptions

# Interface: ChromeExtractorOptions

Defined in: [types/chrome-extractor.d.ts:5](https://github.com/Jason-Vaughan/CLiTS/blob/08dc9183978ffe290c0eea07fbaf407630d61e44/src/types/chrome-extractor.d.ts#L5)

## Properties

### filters?

> `optional` **filters**: `object`

Defined in: [types/chrome-extractor.d.ts:17](https://github.com/Jason-Vaughan/CLiTS/blob/08dc9183978ffe290c0eea07fbaf407630d61e44/src/types/chrome-extractor.d.ts#L17)

#### advancedFilter?

> `optional` **advancedFilter**: `string`

#### domains?

> `optional` **domains**: `string`[]

#### excludePatterns?

> `optional` **excludePatterns**: `string`[]

#### keywords?

> `optional` **keywords**: `string`[]

#### logLevels?

> `optional` **logLevels**: (`"info"` \| `"error"` \| `"warning"` \| `"debug"`)[]

#### sources?

> `optional` **sources**: (`"network"` \| `"console"` \| `"devtools"`)[]

***

### format?

> `optional` **format**: `object`

Defined in: [types/chrome-extractor.d.ts:25](https://github.com/Jason-Vaughan/CLiTS/blob/08dc9183978ffe290c0eea07fbaf407630d61e44/src/types/chrome-extractor.d.ts#L25)

#### groupByLevel?

> `optional` **groupByLevel**: `boolean`

#### groupBySource?

> `optional` **groupBySource**: `boolean`

#### includeStackTrace?

> `optional` **includeStackTrace**: `boolean`

#### includeTimestamp?

> `optional` **includeTimestamp**: `boolean`

***

### host?

> `optional` **host**: `string`

Defined in: [types/chrome-extractor.d.ts:7](https://github.com/Jason-Vaughan/CLiTS/blob/08dc9183978ffe290c0eea07fbaf407630d61e44/src/types/chrome-extractor.d.ts#L7)

***

### includeConsole?

> `optional` **includeConsole**: `boolean`

Defined in: [types/chrome-extractor.d.ts:10](https://github.com/Jason-Vaughan/CLiTS/blob/08dc9183978ffe290c0eea07fbaf407630d61e44/src/types/chrome-extractor.d.ts#L10)

***

### includeNetwork?

> `optional` **includeNetwork**: `boolean`

Defined in: [types/chrome-extractor.d.ts:9](https://github.com/Jason-Vaughan/CLiTS/blob/08dc9183978ffe290c0eea07fbaf407630d61e44/src/types/chrome-extractor.d.ts#L9)

***

### maxEntries?

> `optional` **maxEntries**: `number`

Defined in: [types/chrome-extractor.d.ts:8](https://github.com/Jason-Vaughan/CLiTS/blob/08dc9183978ffe290c0eea07fbaf407630d61e44/src/types/chrome-extractor.d.ts#L8)

***

### port?

> `optional` **port**: `number`

Defined in: [types/chrome-extractor.d.ts:6](https://github.com/Jason-Vaughan/CLiTS/blob/08dc9183978ffe290c0eea07fbaf407630d61e44/src/types/chrome-extractor.d.ts#L6)

***

### reconnect?

> `optional` **reconnect**: `object`

Defined in: [types/chrome-extractor.d.ts:12](https://github.com/Jason-Vaughan/CLiTS/blob/08dc9183978ffe290c0eea07fbaf407630d61e44/src/types/chrome-extractor.d.ts#L12)

#### delayBetweenAttemptsMs?

> `optional` **delayBetweenAttemptsMs**: `number`

#### enabled?

> `optional` **enabled**: `boolean`

#### maxAttempts?

> `optional` **maxAttempts**: `number`

***

### retryConfig?

> `optional` **retryConfig**: `Partial`\<[`RetryConfig`](../../../platform/chrome-error-handler/interfaces/RetryConfig.md)\>

Defined in: [types/chrome-extractor.d.ts:11](https://github.com/Jason-Vaughan/CLiTS/blob/08dc9183978ffe290c0eea07fbaf407630d61e44/src/types/chrome-extractor.d.ts#L11)
