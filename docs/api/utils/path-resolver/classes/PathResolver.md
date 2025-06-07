[**Documentation**](../../../README.md)

***

[Documentation](../../../README.md) / [utils/path-resolver](../README.md) / PathResolver

# Class: PathResolver

Defined in: [utils/path-resolver.ts:7](https://github.com/Jason-Vaughan/CLiTS/blob/08dc9183978ffe290c0eea07fbaf407630d61e44/src/utils/path-resolver.ts#L7)

## Methods

### getProjectRoot()

> **getProjectRoot**(): `string`

Defined in: [utils/path-resolver.ts:49](https://github.com/Jason-Vaughan/CLiTS/blob/08dc9183978ffe290c0eea07fbaf407630d61e44/src/utils/path-resolver.ts#L49)

Gets the project root directory

#### Returns

`string`

***

### getSourceDir()

> **getSourceDir**(): `string`

Defined in: [utils/path-resolver.ts:56](https://github.com/Jason-Vaughan/CLiTS/blob/08dc9183978ffe290c0eea07fbaf407630d61e44/src/utils/path-resolver.ts#L56)

Gets the source directory

#### Returns

`string`

***

### resolveModule()

> **resolveModule**(`modulePath`): `string`

Defined in: [utils/path-resolver.ts:38](https://github.com/Jason-Vaughan/CLiTS/blob/08dc9183978ffe290c0eea07fbaf407630d61e44/src/utils/path-resolver.ts#L38)

Resolves a module path and verifies it exists

#### Parameters

##### modulePath

`string`

#### Returns

`string`

***

### resolvePath()

> **resolvePath**(`path`): `string`

Defined in: [utils/path-resolver.ts:28](https://github.com/Jason-Vaughan/CLiTS/blob/08dc9183978ffe290c0eea07fbaf407630d61e44/src/utils/path-resolver.ts#L28)

Resolves a path relative to the project root

#### Parameters

##### path

`string`

#### Returns

`string`

***

### validatePath()

> **validatePath**(`path`): `object`

Defined in: [utils/path-resolver.ts:63](https://github.com/Jason-Vaughan/CLiTS/blob/08dc9183978ffe290c0eea07fbaf407630d61e44/src/utils/path-resolver.ts#L63)

Validates if a path exists and is accessible

#### Parameters

##### path

`string`

#### Returns

`object`

##### error?

> `optional` **error**: `string`

##### exists

> **exists**: `boolean`

***

### getInstance()

> `static` **getInstance**(): `PathResolver`

Defined in: [utils/path-resolver.ts:18](https://github.com/Jason-Vaughan/CLiTS/blob/08dc9183978ffe290c0eea07fbaf407630d61e44/src/utils/path-resolver.ts#L18)

#### Returns

`PathResolver`
