[**Documentation**](../../../README.md)

***

[Documentation](../../../README.md) / [utils/user-interaction-monitor](../README.md) / USER\_INTERACTION\_MONITOR\_SCRIPT

# Variable: USER\_INTERACTION\_MONITOR\_SCRIPT

> `const` **USER\_INTERACTION\_MONITOR\_SCRIPT**: "\n(function() \{\n  document.addEventListener('click', (event) =\> \{\n    console.log('\[CLiTS-Interaction-Monitor\] Click event detected on target:', event.target.tagName);\n  \}, true);\n  console.log('\[CLiTS-Interaction-Monitor\] User interaction monitoring injected.');\n\})();\n"

Defined in: utils/user-interaction-monitor.ts:3
