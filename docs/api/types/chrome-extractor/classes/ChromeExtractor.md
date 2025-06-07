[**Documentation**](../../../README.md)

***

[Documentation](../../../README.md) / [types/chrome-extractor](../README.md) / ChromeExtractor

# Class: ChromeExtractor

Defined in: [types/chrome-extractor.d.ts:39](https://github.com/Jason-Vaughan/CLiTS/blob/08dc9183978ffe290c0eea07fbaf407630d61e44/src/types/chrome-extractor.d.ts#L39)

## Constructors

### Constructor

> **new ChromeExtractor**(`options?`): `ChromeExtractor`

Defined in: [types/chrome-extractor.d.ts:46](https://github.com/Jason-Vaughan/CLiTS/blob/08dc9183978ffe290c0eea07fbaf407630d61e44/src/types/chrome-extractor.d.ts#L46)

#### Parameters

##### options?

[`ChromeExtractorOptions`](../interfaces/ChromeExtractorOptions.md)

#### Returns

`ChromeExtractor`

## Methods

### \_injectTestEvent()

> `protected` **\_injectTestEvent**(`type`, `payload`, `logsOverride?`): `void`

Defined in: [types/chrome-extractor.d.ts:79](https://github.com/Jason-Vaughan/CLiTS/blob/08dc9183978ffe290c0eea07fbaf407630d61e44/src/types/chrome-extractor.d.ts#L79)

Test hook: injects a simulated event into the log collection.

#### Parameters

##### type

'network' | 'console' | 'log'

`"log"` | `"network"` | `"console"`

##### payload

The event payload (NetworkRequest, NetworkResponse, ConsoleMessage, DevToolsLogEntry)

[`NetworkRequest`](../../chrome-types/interfaces/NetworkRequest.md) | [`NetworkResponse`](../../chrome-types/interfaces/NetworkResponse.md) | [`ConsoleMessage`](../../chrome-types/interfaces/ConsoleMessage.md) | [`DevToolsLogEntry`](../../chrome-types/interfaces/DevToolsLogEntry.md)

##### logsOverride?

[`CollectedLogEntry`](../interfaces/CollectedLogEntry.md)[]

(optional) logs array to use (for test injection)

#### Returns

`void`

***

### extract()

> **extract**(): `Promise`\<[`ExtractedLog`](../../extractor/interfaces/ExtractedLog.md)[]\>

Defined in: [types/chrome-extractor.d.ts:71](https://github.com/Jason-Vaughan/CLiTS/blob/08dc9183978ffe290c0eea07fbaf407630d61e44/src/types/chrome-extractor.d.ts#L71)

#### Returns

`Promise`\<[`ExtractedLog`](../../extractor/interfaces/ExtractedLog.md)[]\>
