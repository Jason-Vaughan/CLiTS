[**Documentation**](../../README.md)

***

[Documentation](../../README.md) / [chrome-extractor](../README.md) / ChromeExtractorOptions

# Interface: ChromeExtractorOptions

Defined in: [chrome-extractor.ts:170](https://github.com/Jason-Vaughan/CLiTS/blob/08dc9183978ffe290c0eea07fbaf407630d61e44/src/chrome-extractor.ts#L170)

## Properties

### enableReactHookMonitoring?

> `optional` **enableReactHookMonitoring**: `boolean`

Defined in: [chrome-extractor.ts:196](https://github.com/Jason-Vaughan/CLiTS/blob/08dc9183978ffe290c0eea07fbaf407630d61e44/src/chrome-extractor.ts#L196)

***

### filters?

> `optional` **filters**: `object`

Defined in: [chrome-extractor.ts:182](https://github.com/Jason-Vaughan/CLiTS/blob/08dc9183978ffe290c0eea07fbaf407630d61e44/src/chrome-extractor.ts#L182)

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

> `optional` **sources**: (`"jwt"` \| `"network"` \| `"console"` \| `"devtools"` \| `"websocket"` \| `"graphql"` \| `"redux"` \| `"performance"` \| `"eventloop"` \| `"userinteraction"` \| `"dommutation"` \| `"csschange"`)[]

***

### format?

> `optional` **format**: `object`

Defined in: [chrome-extractor.ts:190](https://github.com/Jason-Vaughan/CLiTS/blob/08dc9183978ffe290c0eea07fbaf407630d61e44/src/chrome-extractor.ts#L190)

#### groupByLevel?

> `optional` **groupByLevel**: `boolean`

#### groupBySource?

> `optional` **groupBySource**: `boolean`

#### includeStackTrace?

> `optional` **includeStackTrace**: `boolean`

#### includeTimestamp?

> `optional` **includeTimestamp**: `boolean`

***

### headless?

> `optional` **headless**: `boolean`

Defined in: [chrome-extractor.ts:206](https://github.com/Jason-Vaughan/CLiTS/blob/08dc9183978ffe290c0eea07fbaf407630d61e44/src/chrome-extractor.ts#L206)

***

### host?

> `optional` **host**: `string`

Defined in: [chrome-extractor.ts:172](https://github.com/Jason-Vaughan/CLiTS/blob/08dc9183978ffe290c0eea07fbaf407630d61e44/src/chrome-extractor.ts#L172)

***

### includeConsole?

> `optional` **includeConsole**: `boolean`

Defined in: [chrome-extractor.ts:175](https://github.com/Jason-Vaughan/CLiTS/blob/08dc9183978ffe290c0eea07fbaf407630d61e44/src/chrome-extractor.ts#L175)

***

### includeCssChangeMonitoring?

> `optional` **includeCssChangeMonitoring**: `boolean`

Defined in: [chrome-extractor.ts:205](https://github.com/Jason-Vaughan/CLiTS/blob/08dc9183978ffe290c0eea07fbaf407630d61e44/src/chrome-extractor.ts#L205)

***

### includeDomMutationMonitoring?

> `optional` **includeDomMutationMonitoring**: `boolean`

Defined in: [chrome-extractor.ts:204](https://github.com/Jason-Vaughan/CLiTS/blob/08dc9183978ffe290c0eea07fbaf407630d61e44/src/chrome-extractor.ts#L204)

***

### includeEventLoopMonitoring?

> `optional` **includeEventLoopMonitoring**: `boolean`

Defined in: [chrome-extractor.ts:202](https://github.com/Jason-Vaughan/CLiTS/blob/08dc9183978ffe290c0eea07fbaf407630d61e44/src/chrome-extractor.ts#L202)

***

### includeGraphqlMonitoring?

> `optional` **includeGraphqlMonitoring**: `boolean`

Defined in: [chrome-extractor.ts:199](https://github.com/Jason-Vaughan/CLiTS/blob/08dc9183978ffe290c0eea07fbaf407630d61e44/src/chrome-extractor.ts#L199)

***

### includeJwtMonitoring?

> `optional` **includeJwtMonitoring**: `boolean`

Defined in: [chrome-extractor.ts:198](https://github.com/Jason-Vaughan/CLiTS/blob/08dc9183978ffe290c0eea07fbaf407630d61e44/src/chrome-extractor.ts#L198)

***

### includeNetwork?

> `optional` **includeNetwork**: `boolean`

Defined in: [chrome-extractor.ts:174](https://github.com/Jason-Vaughan/CLiTS/blob/08dc9183978ffe290c0eea07fbaf407630d61e44/src/chrome-extractor.ts#L174)

***

### includePerformanceMonitoring?

> `optional` **includePerformanceMonitoring**: `boolean`

Defined in: [chrome-extractor.ts:201](https://github.com/Jason-Vaughan/CLiTS/blob/08dc9183978ffe290c0eea07fbaf407630d61e44/src/chrome-extractor.ts#L201)

***

### includeReduxMonitoring?

> `optional` **includeReduxMonitoring**: `boolean`

Defined in: [chrome-extractor.ts:200](https://github.com/Jason-Vaughan/CLiTS/blob/08dc9183978ffe290c0eea07fbaf407630d61e44/src/chrome-extractor.ts#L200)

***

### includeUserInteractionRecording?

> `optional` **includeUserInteractionRecording**: `boolean`

Defined in: [chrome-extractor.ts:203](https://github.com/Jason-Vaughan/CLiTS/blob/08dc9183978ffe290c0eea07fbaf407630d61e44/src/chrome-extractor.ts#L203)

***

### includeWebSockets?

> `optional` **includeWebSockets**: `boolean`

Defined in: [chrome-extractor.ts:197](https://github.com/Jason-Vaughan/CLiTS/blob/08dc9183978ffe290c0eea07fbaf407630d61e44/src/chrome-extractor.ts#L197)

***

### maxEntries?

> `optional` **maxEntries**: `number`

Defined in: [chrome-extractor.ts:173](https://github.com/Jason-Vaughan/CLiTS/blob/08dc9183978ffe290c0eea07fbaf407630d61e44/src/chrome-extractor.ts#L173)

***

### port?

> `optional` **port**: `number`

Defined in: [chrome-extractor.ts:171](https://github.com/Jason-Vaughan/CLiTS/blob/08dc9183978ffe290c0eea07fbaf407630d61e44/src/chrome-extractor.ts#L171)

***

### reconnect?

> `optional` **reconnect**: `object`

Defined in: [chrome-extractor.ts:177](https://github.com/Jason-Vaughan/CLiTS/blob/08dc9183978ffe290c0eea07fbaf407630d61e44/src/chrome-extractor.ts#L177)

#### delayBetweenAttemptsMs?

> `optional` **delayBetweenAttemptsMs**: `number`

#### enabled?

> `optional` **enabled**: `boolean`

#### maxAttempts?

> `optional` **maxAttempts**: `number`

***

### retryConfig?

> `optional` **retryConfig**: `Partial`\<[`RetryConfig`](../../platform/chrome-error-handler/interfaces/RetryConfig.md)\>

Defined in: [chrome-extractor.ts:176](https://github.com/Jason-Vaughan/CLiTS/blob/08dc9183978ffe290c0eea07fbaf407630d61e44/src/chrome-extractor.ts#L176)

***

### sanitizationRules?

> `optional` **sanitizationRules**: [`SanitizationRule`](../../utils/data-sanitizer/interfaces/SanitizationRule.md)[]

Defined in: [chrome-extractor.ts:207](https://github.com/Jason-Vaughan/CLiTS/blob/08dc9183978ffe290c0eea07fbaf407630d61e44/src/chrome-extractor.ts#L207)
