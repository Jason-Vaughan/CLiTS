[**Documentation**](../../../README.md)

***

[Documentation](../../../README.md) / [utils/event-loop-monitor](../README.md) / EVENT\_LOOP\_MONITOR\_SCRIPT

# Variable: EVENT\_LOOP\_MONITOR\_SCRIPT

> `const` **EVENT\_LOOP\_MONITOR\_SCRIPT**: "\n(function() \{\n  if (typeof PerformanceObserver === 'undefined' \|\| !PerformanceObserver.supportedEntryTypes.includes('long-animation-frame')) \{\n    console.warn('\[CLiTS-EventLoop-Monitor\] Long Animation Frames API not supported. Skipping event loop monitoring.');\n    return;\n  \}\n\n  const observer = new PerformanceObserver((list) =\> \{\n    for (const entry of list.getEntries()) \{\n      // Log all long-animation-frame entries\n      console.log('\[CLiTS-EventLoop-Monitor\] Long Animation Frame detected:', \{\n        duration: entry.duration,\n        blockingDuration: entry.blockingDuration,\n        startTime: entry.startTime,\n        scripts: entry.scripts ? entry.scripts.map(s =\> (\{ \n          invoker: s.invoker, \n          sourceURL: s.sourceURL, \n          sourceFunctionName: s.sourceFunctionName, \n          duration: s.duration \n        \})) : \[\],\n        entry\n      \});\n    \}\n  \});\n\n  observer.observe(\{ type: 'long-animation-frame', buffered: true \});\n\n  console.log('\[CLiTS-EventLoop-Monitor\] Event loop monitoring injected.');\n\})();\n"

Defined in: utils/event-loop-monitor.ts:3
