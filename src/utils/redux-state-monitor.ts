// BSD: Injects a script into the browser context to monitor Redux state changes and actions, reporting them via console logs.

export const REDUX_STATE_MONITOR_SCRIPT = `
(function() {
  const findReduxStore = () => {
    // Attempt to find Redux store if it's exposed globally (e.g., for debugging or by a specific setup)
    // This is a common pattern for applications exposing the store for testing/debugging.
    if (window.store && typeof window.store.getState === 'function' && typeof window.store.dispatch === 'function') {
      return window.store;
    }

    return null;
  };

  const store = findReduxStore();
  const devToolsExtension = window.__REDUX_DEVTOOLS_EXTENSION__;

  if (store) {
    console.log('[CLiTS-Redux-Monitor] Redux store found.');

    if (devToolsExtension) {
      console.log('[CLiTS-Redux-Monitor] Redux DevTools Extension found. Connecting...');
      const devTools = devToolsExtension.connect();

      // Subscribe to state changes and actions via DevTools extension
      devTools.subscribe(message => {
        if (message.type === 'DISPATCH' && message.payload) {
          console.log('[CLiTS-Redux-Monitor] DevTools: Action dispatched:', {
            action: JSON.parse(message.payload),
            state: JSON.parse(message.state)
          });
        } else if (message.type === 'ACTION' && message.payload) {
          console.log('[CLiTS-Redux-Monitor] DevTools: State change (from action):', {
            action: JSON.parse(message.payload),
            state: JSON.parse(message.state)
          });
        } else {
          console.log('[CLiTS-Redux-Monitor] DevTools: Message received:', message);
        }
      });

      // Dispatch initial state to DevTools if needed
      // devTools.init(store.getState());

      console.log('[CLiTS-Redux-Monitor] Redux state monitoring via DevTools extension injected.');
    } else {
      console.warn('[CLiTS-Redux-Monitor] Redux DevTools Extension not found. Falling back to patching dispatch.');
      
      // Patch dispatch to log actions and new state
      const originalDispatch = store.dispatch;
      store.dispatch = function(action) {
        const prevState = store.getState();
        const result = originalDispatch.apply(this, arguments);
        const newState = store.getState();
        console.log('[CLiTS-Redux-Monitor] Redux action dispatched (patched):', { action, prevState, newState });
        return result;
      };

      // Subscribe to state changes (alternative/complementary to patching dispatch)
      store.subscribe(() => {
        console.log('[CLiTS-Redux-Monitor] Redux state changed (subscribed):', store.getState());
      });

      console.log('[CLiTS-Redux-Monitor] Redux state monitoring via dispatch patch injected.');
    }
  } else {
    console.warn('[CLiTS-Redux-Monitor] Redux store not found. Skipping Redux state monitoring.');
  }
})();
`; 