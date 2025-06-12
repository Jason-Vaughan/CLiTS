// BSD: Injects a script into the browser context to monitor the event loop for long animation frames and report them via console logs.

export const EVENT_LOOP_MONITOR_SCRIPT = `
(function() {
  if (typeof PerformanceObserver === 'undefined' || !PerformanceObserver.supportedEntryTypes.includes('long-animation-frame')) {
    console.warn('[CLiTS-EventLoop-Monitor] Long Animation Frames API not supported. Skipping event loop monitoring.');
    return;
  }

  const observer = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      // Log all long-animation-frame entries
      console.log('[CLiTS-EventLoop-Monitor] Long Animation Frame detected:', {
        duration: entry.duration,
        blockingDuration: entry.blockingDuration,
        startTime: entry.startTime,
        scripts: entry.scripts ? entry.scripts.map(s => ({ 
          invoker: s.invoker, 
          sourceURL: s.sourceURL, 
          sourceFunctionName: s.sourceFunctionName, 
          duration: s.duration 
        })) : [],
        entry
      });
    }
  });

  observer.observe({ type: 'long-animation-frame', buffered: true });

  console.log('[CLiTS-EventLoop-Monitor] Event loop monitoring injected.');
})();
`; 