[**Documentation**](../../../README.md)

***

[Documentation](../../../README.md) / [types/report](../README.md) / ReportOptions

# Interface: ReportOptions

Defined in: [types/report.d.ts:3](https://github.com/Jason-Vaughan/CLiTS/blob/08dc9183978ffe290c0eea07fbaf407630d61e44/src/types/report.d.ts#L3)

## Properties

### extractionOptions?

> `optional` **extractionOptions**: `object`

Defined in: [types/report.d.ts:5](https://github.com/Jason-Vaughan/CLiTS/blob/08dc9183978ffe290c0eea07fbaf407630d61e44/src/types/report.d.ts#L5)

#### filters?

> `optional` **filters**: `object`

##### filters.domains?

> `optional` **domains**: `string`[]

##### filters.excludePatterns?

> `optional` **excludePatterns**: `string`[]

##### filters.keywords?

> `optional` **keywords**: `string`[]

##### filters.logLevels?

> `optional` **logLevels**: `string`[]

##### filters.sources?

> `optional` **sources**: `string`[]

#### format?

> `optional` **format**: `object`

##### format.groupByLevel?

> `optional` **groupByLevel**: `boolean`

##### format.groupBySource?

> `optional` **groupBySource**: `boolean`

##### format.includeStackTrace?

> `optional` **includeStackTrace**: `boolean`

##### format.includeTimestamp?

> `optional` **includeTimestamp**: `boolean`

#### includeConsole?

> `optional` **includeConsole**: `boolean`

#### includeNetwork?

> `optional` **includeNetwork**: `boolean`

***

### includeErrorSummary?

> `optional` **includeErrorSummary**: `boolean`

Defined in: [types/report.d.ts:22](https://github.com/Jason-Vaughan/CLiTS/blob/08dc9183978ffe290c0eea07fbaf407630d61e44/src/types/report.d.ts#L22)

***

### logs

> **logs**: [`ExtractedLog`](../../extractor/interfaces/ExtractedLog.md)[]

Defined in: [types/report.d.ts:4](https://github.com/Jason-Vaughan/CLiTS/blob/08dc9183978ffe290c0eea07fbaf407630d61e44/src/types/report.d.ts#L4)
