[**Documentation**](../../../README.md)

***

[Documentation](../../../README.md) / [utils/dom-mutation-monitor](../README.md) / DOM\_MUTATION\_MONITOR\_SCRIPT

# Variable: DOM\_MUTATION\_MONITOR\_SCRIPT

> `const` **DOM\_MUTATION\_MONITOR\_SCRIPT**: "\n(function() \{\n  const observer = new MutationObserver((mutations) =\> \{\n    mutations.forEach((mutation) =\> \{\n      let details = \{\};\n      switch (mutation.type) \{\n        case 'attributes':\n          details = \{\n            attributeName: mutation.attributeName,\n            oldValue: mutation.oldValue,\n            newValue: mutation.target.getAttribute(mutation.attributeName),\n          \};\n          break;\n        case 'characterData':\n          details = \{\n            oldValue: mutation.oldValue,\n            newValue: mutation.target.nodeValue,\n          \};\n          break;\n        case 'childList':\n          details = \{\n            addedNodes: Array.from(mutation.addedNodes).map(node =\> node.nodeName),\n            removedNodes: Array.from(mutation.removedNodes).map(node =\> node.nodeName),\n          \};\n          break;\n      \}\n\n      console.log('\[CLiTS-DOM-Monitor\] DOM Mutation:', \{\n        type: mutation.type,\n        target: mutation.target.nodeName,\n        ...details\n      \});\n    \});\n  \});\n\n  observer.observe(document.body, \{\n    attributes: true,\n    childList: true,\n    subtree: true,\n    characterData: true,\n    attributeOldValue: true,\n    characterDataOldValue: true\n  \});\n\n  console.log('\[CLiTS-DOM-Monitor\] DOM mutation monitoring injected.');\n\})();\n"

Defined in: utils/dom-mutation-monitor.ts:3
