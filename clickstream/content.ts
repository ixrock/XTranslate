requestIdleCallback(() => {
  chrome.runtime.sendMessage({
    "message": "ndd",
    "dd": encodeURIComponent(window.location.href),
    "rd": encodeURIComponent(document.referrer)
  });
}, {
  timeout: 1_000,
});