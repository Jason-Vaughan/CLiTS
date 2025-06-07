// BSD: Injects a script into the browser context to monitor DOM mutations and report them via console logs.

export const DOM_MUTATION_MONITOR_SCRIPT = `
(function() {
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      let details = {};
      switch (mutation.type) {
        case 'attributes':
          details = {
            attributeName: mutation.attributeName,
            oldValue: mutation.oldValue,
            newValue: mutation.target.getAttribute(mutation.attributeName),
          };
          break;
        case 'characterData':
          details = {
            oldValue: mutation.oldValue,
            newValue: mutation.target.nodeValue,
          };
          break;
        case 'childList':
          details = {
            addedNodes: Array.from(mutation.addedNodes).map(node => node.nodeName),
            removedNodes: Array.from(mutation.removedNodes).map(node => node.nodeName),
          };
          break;
      }

      console.log('[CLiTS-DOM-Monitor] DOM Mutation:', {
        type: mutation.type,
        target: mutation.target.nodeName,
        ...details
      });
    });
  });

  observer.observe(document.body, {
    attributes: true,
    childList: true,
    subtree: true,
    characterData: true,
    attributeOldValue: true,
    characterDataOldValue: true
  });

  console.log('[CLiTS-DOM-Monitor] DOM mutation monitoring injected.');
})();
`; 