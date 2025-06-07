[**Documentation**](../../../README.md)

***

[Documentation](../../../README.md) / [types/chrome-remote-interface](../README.md) / CDPClient

# Interface: CDPClient

Defined in: [types/chrome-remote-interface.d.ts:2](https://github.com/Jason-Vaughan/CLiTS/blob/08dc9183978ffe290c0eea07fbaf407630d61e44/src/types/chrome-remote-interface.d.ts#L2)

## Properties

### Console

> **Console**: `object`

Defined in: [types/chrome-remote-interface.d.ts:9](https://github.com/Jason-Vaughan/CLiTS/blob/08dc9183978ffe290c0eea07fbaf407630d61e44/src/types/chrome-remote-interface.d.ts#L9)

#### messageAdded

> **messageAdded**: `any`

#### disable()

> **disable**(): `Promise`\<`void`\>

##### Returns

`Promise`\<`void`\>

#### enable()

> **enable**(): `Promise`\<`void`\>

##### Returns

`Promise`\<`void`\>

***

### Log

> **Log**: `object`

Defined in: [types/chrome-remote-interface.d.ts:14](https://github.com/Jason-Vaughan/CLiTS/blob/08dc9183978ffe290c0eea07fbaf407630d61e44/src/types/chrome-remote-interface.d.ts#L14)

#### entryAdded

> **entryAdded**: `any`

#### disable()

> **disable**(): `Promise`\<`void`\>

##### Returns

`Promise`\<`void`\>

#### enable()

> **enable**(): `Promise`\<`void`\>

##### Returns

`Promise`\<`void`\>

***

### Network

> **Network**: `object`

Defined in: [types/chrome-remote-interface.d.ts:3](https://github.com/Jason-Vaughan/CLiTS/blob/08dc9183978ffe290c0eea07fbaf407630d61e44/src/types/chrome-remote-interface.d.ts#L3)

#### requestWillBeSent

> **requestWillBeSent**: `any`

#### responseReceived

> **responseReceived**: `any`

#### disable()

> **disable**(): `Promise`\<`void`\>

##### Returns

`Promise`\<`void`\>

#### enable()

> **enable**(): `Promise`\<`void`\>

##### Returns

`Promise`\<`void`\>

## Methods

### close()

> **close**(): `Promise`\<`void`\>

Defined in: [types/chrome-remote-interface.d.ts:19](https://github.com/Jason-Vaughan/CLiTS/blob/08dc9183978ffe290c0eea07fbaf407630d61e44/src/types/chrome-remote-interface.d.ts#L19)

#### Returns

`Promise`\<`void`\>

***

### on()

> **on**(`event`, `callback`): `void`

Defined in: [types/chrome-remote-interface.d.ts:20](https://github.com/Jason-Vaughan/CLiTS/blob/08dc9183978ffe290c0eea07fbaf407630d61e44/src/types/chrome-remote-interface.d.ts#L20)

#### Parameters

##### event

`string`

##### callback

(`data`) => `void`

#### Returns

`void`
