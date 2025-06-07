[**Documentation**](../../../README.md)

***

[Documentation](../../../README.md) / [platform/chrome-error-handler](../README.md) / ChromeErrorHandler

# Class: ChromeErrorHandler

Defined in: [platform/chrome-error-handler.ts:27](https://github.com/Jason-Vaughan/CLiTS/blob/08dc9183978ffe290c0eea07fbaf407630d61e44/src/platform/chrome-error-handler.ts#L27)

## Constructors

### Constructor

> **new ChromeErrorHandler**(`config`): `ChromeErrorHandler`

Defined in: [platform/chrome-error-handler.ts:96](https://github.com/Jason-Vaughan/CLiTS/blob/08dc9183978ffe290c0eea07fbaf407630d61e44/src/platform/chrome-error-handler.ts#L96)

#### Parameters

##### config

`Partial`\<[`RetryConfig`](../interfaces/RetryConfig.md)\> = `{}`

#### Returns

`ChromeErrorHandler`

## Methods

### executeWithRetry()

> **executeWithRetry**\<`T`\>(`operation`, `operationName`): `Promise`\<`T`\>

Defined in: [platform/chrome-error-handler.ts:137](https://github.com/Jason-Vaughan/CLiTS/blob/08dc9183978ffe290c0eea07fbaf407630d61e44/src/platform/chrome-error-handler.ts#L137)

#### Type Parameters

##### T

`T`

#### Parameters

##### operation

() => `Promise`\<`T`\>

##### operationName

`string`

#### Returns

`Promise`\<`T`\>

***

### handleError()

> `static` **handleError**(`error`): `null` \| [`PlatformError`](../../error-handler/interfaces/PlatformError.md)

Defined in: [platform/chrome-error-handler.ts:110](https://github.com/Jason-Vaughan/CLiTS/blob/08dc9183978ffe290c0eea07fbaf407630d61e44/src/platform/chrome-error-handler.ts#L110)

#### Parameters

##### error

`Error`

#### Returns

`null` \| [`PlatformError`](../../error-handler/interfaces/PlatformError.md)

***

### isChromeError()

> `static` **isChromeError**(`error`): `boolean`

Defined in: [platform/chrome-error-handler.ts:103](https://github.com/Jason-Vaughan/CLiTS/blob/08dc9183978ffe290c0eea07fbaf407630d61e44/src/platform/chrome-error-handler.ts#L103)

#### Parameters

##### error

`undefined` | `null` | `Error`

#### Returns

`boolean`

***

### shouldSuppressError()

> `static` **shouldSuppressError**(`error`): `boolean`

Defined in: [platform/chrome-error-handler.ts:129](https://github.com/Jason-Vaughan/CLiTS/blob/08dc9183978ffe290c0eea07fbaf407630d61e44/src/platform/chrome-error-handler.ts#L129)

#### Parameters

##### error

`Error`

#### Returns

`boolean`
