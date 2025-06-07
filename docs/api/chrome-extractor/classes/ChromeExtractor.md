[**Documentation**](../../README.md)

***

[Documentation](../../README.md) / [chrome-extractor](../README.md) / ChromeExtractor

# Class: ChromeExtractor

Defined in: [chrome-extractor.ts:216](https://github.com/Jason-Vaughan/CLiTS/blob/08dc9183978ffe290c0eea07fbaf407630d61e44/src/chrome-extractor.ts#L216)

## Constructors

### Constructor

> **new ChromeExtractor**(`options`): `ChromeExtractor`

Defined in: [chrome-extractor.ts:227](https://github.com/Jason-Vaughan/CLiTS/blob/08dc9183978ffe290c0eea07fbaf407630d61e44/src/chrome-extractor.ts#L227)

#### Parameters

##### options

[`ChromeExtractorOptions`](../interfaces/ChromeExtractorOptions.md) = `{}`

#### Returns

`ChromeExtractor`

## Methods

### \_injectTestEvent()

> `protected` **\_injectTestEvent**(`type`, `payload`, `logsOverride?`): `void`

Defined in: [chrome-extractor.ts:1542](https://github.com/Jason-Vaughan/CLiTS/blob/08dc9183978ffe290c0eea07fbaf407630d61e44/src/chrome-extractor.ts#L1542)

Test hook: injects a simulated event into the log collection.

#### Parameters

##### type

'network' | 'console' | 'log'

`"log"` | `"network"` | `"console"`

##### payload

`any`

The event payload (NetworkRequest, NetworkResponse, ConsoleMessage, DevToolsLogEntry)

##### logsOverride?

`CollectedLogEntry`[]

(optional) logs array to use (for test injection)

#### Returns

`void`

***

### extract()

> **extract**(`targetId?`): `Promise`\<[`ExtractedLog`](../../extractor/interfaces/ExtractedLog.md)[]\>

Defined in: [chrome-extractor.ts:759](https://github.com/Jason-Vaughan/CLiTS/blob/08dc9183978ffe290c0eea07fbaf407630d61e44/src/chrome-extractor.ts#L759)

#### Parameters

##### targetId?

`string`

#### Returns

`Promise`\<[`ExtractedLog`](../../extractor/interfaces/ExtractedLog.md)[]\>

***

### getDebuggablePageTargets()

> **getDebuggablePageTargets**(): `Promise`\<`object`[]\>

Defined in: [chrome-extractor.ts:272](https://github.com/Jason-Vaughan/CLiTS/blob/08dc9183978ffe290c0eea07fbaf407630d61e44/src/chrome-extractor.ts#L272)

#### Returns

`Promise`\<`object`[]\>
