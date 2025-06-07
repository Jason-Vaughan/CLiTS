// BSD: Injects a script into the browser context to monitor React hooks (useState, useEffect) and report their usage via console logs.

export const REACT_HOOK_MONITOR_SCRIPT = `
(function() {
  // Check if React is available
  if (typeof window.React === 'undefined') {
    console.warn('[CLiTS-React-Monitor] React not found on window. Skipping hook monitoring.');
    return;
  }

  // Store original hooks
  const originalUseState = window.React.useState;
  const originalUseEffect = window.React.useEffect;
  const originalCreateElement = window.React.createElement;

  // Patch useState
  window.React.useState = function(...args) {
    const [value, setter] = originalUseState.apply(this, args);
    console.log('[CLiTS-React-Monitor] useState called', { initialValue: args[0], currentValue: value });

    const newSetter = (newValue) => {
      console.log('[CLiTS-React-Monitor] useState setter called', { oldValue: value, newValue });
      return setter(newValue);
    };

    return [value, newSetter];
  };

  // Patch useEffect
  window.React.useEffect = function(...args) {
    const [effect, dependencies] = args;
    console.log('[CLiTS-React-Monitor] useEffect called', { dependencies });

    // Wrap the effect to log its execution
    const wrappedEffect = () => {
      console.log('[CLiTS-React-Monitor] useEffect executing', { dependencies });
      const cleanup = effect();
      if (typeof cleanup === 'function') {
        return () => {
          console.log('[CLiTS-React-Monitor] useEffect cleanup');
          cleanup();
        };
      }
      return cleanup;
    };

    return originalUseEffect.call(this, wrappedEffect, dependencies);
  };

  // Patch React.createElement for prop monitoring
  window.React.createElement = function(type, props, ...children) {
    if (typeof type === 'string') { // For intrinsic elements (e.g., 'div', 'p')
      console.log('[CLiTS-React-Monitor] HTMLElement created/updated with props:', { type, props });
    } else if (typeof type === 'function' || (typeof type === 'object' && type !== null && (type.$$typeof === Symbol.for('react.memo') || type.$$typeof === Symbol.for('react.forward_ref')))) { // For React components
      const componentName = type.displayName || type.name || (type.type && (type.type.displayName || type.type.name)) || 'UnknownComponent';
      console.log('[CLiTS-React-Monitor] Component created/updated with props:', { component: componentName, props });
    }
    return originalCreateElement.apply(this, arguments);
  };

  // Attempt to hook into React DevTools Global Hook for lifecycle monitoring
  if (typeof window.__REACT_DEVTOOLS_GLOBAL_HOOK__ !== 'undefined') {
    const hook = window.__REACT_DEVTOOLS_GLOBAL_HOOK__;

    // Patch onCommitFiberRoot for component mount/update
    const originalOnCommitFiberRoot = hook.onCommitFiberRoot;
    hook.onCommitFiberRoot = function(...args) {
      console.log('[CLiTS-React-Monitor] onCommitFiberRoot (component mounted/updated)', { fiberRoot: args[1] });
      return originalOnCommitFiberRoot.apply(this, args);
    };

    // Patch onCommitFiberUnmount for component unmount
    const originalOnCommitFiberUnmount = hook.onCommitFiberUnmount;
    hook.onCommitFiberUnmount = function(...args) {
      console.log('[CLiTS-React-Monitor] onCommitFiberUnmount (component unmounted)', { fiber: args[1] });
      return originalOnCommitFiberUnmount.apply(this, args);
    };
    console.log('[CLiTS-React-Monitor] React DevTools Global Hook found and patched for lifecycle monitoring.');
  } else {
    console.warn('[CLiTS-React-Monitor] React DevTools Global Hook not found. Advanced component lifecycle monitoring may be limited.');
  }

  console.log('[CLiTS-React-Monitor] React hooks monitoring injected.');
})();
`; 