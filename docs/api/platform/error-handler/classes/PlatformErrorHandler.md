[**Documentation**](../../../README.md)

***

[Documentation](../../../README.md) / [platform/error-handler](../README.md) / PlatformErrorHandler

# Class: PlatformErrorHandler

Defined in: [platform/error-handler.ts:31](https://github.com/Jason-Vaughan/CLiTS/blob/08dc9183978ffe290c0eea07fbaf407630d61e44/src/platform/error-handler.ts#L31)

## Constructors

### Constructor

> **new PlatformErrorHandler**(): `PlatformErrorHandler`

#### Returns

`PlatformErrorHandler`

## Methods

### handleError()

> `static` **handleError**(`error`): `null` \| [`PlatformError`](../interfaces/PlatformError.md)

Defined in: [platform/error-handler.ts:68](https://github.com/Jason-Vaughan/CLiTS/blob/08dc9183978ffe290c0eea07fbaf407630d61e44/src/platform/error-handler.ts#L68)

Handle platform-specific errors

#### Parameters

##### error

`undefined` | `null` | `string` | `Error`

#### Returns

`null` \| [`PlatformError`](../interfaces/PlatformError.md)

***

### isPlatformError()

> `static` **isPlatformError**(`error`): `boolean`

Defined in: [platform/error-handler.ts:51](https://github.com/Jason-Vaughan/CLiTS/blob/08dc9183978ffe290c0eea07fbaf407630d61e44/src/platform/error-handler.ts#L51)

Check if the error is a known platform-specific issue

#### Parameters

##### error

`undefined` | `null` | `string` | `Error`

#### Returns

`boolean`

***

### shouldSuppressError()

> `static` **shouldSuppressError**(`error`): `boolean`

Defined in: [platform/error-handler.ts:94](https://github.com/Jason-Vaughan/CLiTS/blob/08dc9183978ffe290c0eea07fbaf407630d61e44/src/platform/error-handler.ts#L94)

Check if an error should be suppressed based on platform-specific rules

#### Parameters

##### error

`string` | `Error`

#### Returns

`boolean`
