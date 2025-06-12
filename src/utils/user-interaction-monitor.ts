// BSD: Injects a script into the browser context to monitor common user interaction events (clicks, key presses, input changes) and report their details via console logs.

export const USER_INTERACTION_MONITOR_SCRIPT = `
(function() {
  document.addEventListener('click', (event) => {
    console.log('[CLiTS-Interaction-Monitor] Click event detected on target:', event.target.tagName);
  }, true);
  console.log('[CLiTS-Interaction-Monitor] User interaction monitoring injected.');
})();
`; 