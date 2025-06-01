// Placeholder for proxy server list
const PROXY_SERVERS = {
  "US": { name: "United States", host: "3.225.41.109", port: "80", scheme: "http" }, // Assuming HTTP for simplicity, even if HTTPS is supported by proxy
  "DE": { name: "Germany", host: "161.35.70.249", port: "8080", scheme: "http" },
  "GB": { name: "United Kingdom", host: "134.209.29.120", port: "80", scheme: "http" }
};

let currentProxy = null;

// Function to set the proxy
function setProxy(countryCode, callback) {
  if (PROXY_SERVERS[countryCode]) {
    const config = {
      mode: "fixed_servers",
      rules: {
        singleProxy: {
          scheme: PROXY_SERVERS[countryCode].scheme,
          host: PROXY_SERVERS[countryCode].host,
          port: parseInt(PROXY_SERVERS[countryCode].port, 10)
        },
        bypassList: ["<local>"] // Bypass proxy for local addresses
      }
    };
    chrome.proxy.settings.set({ value: config, scope: "regular" }, function() {
      if (chrome.runtime.lastError) {
        const errorMessage = "Error setting proxy: " + chrome.runtime.lastError.message;
        console.error(errorMessage);
        currentProxy = null; // Ensure state is consistent
        updatePopupState(false, null);
        if (callback) callback(false, errorMessage);
        return;
      }
      const successMessage = "Proxy set to " + PROXY_SERVERS[countryCode].name;
      console.log(successMessage);
      currentProxy = countryCode;
      updatePopupState(true, countryCode);
      if (callback) callback(true, successMessage);
    });
  } else {
    const errorMessage = "No proxy configuration for country: " + countryCode;
    console.warn(errorMessage);
    // Attempt to clear proxy if an invalid country is chosen, might not be desired UX
    // For now, let's just callback with failure.
    // clearProxy();
    if (callback) callback(false, errorMessage);
  }
}

// Function to clear the proxy
function clearProxy(callback) {
  chrome.proxy.settings.clear({ scope: "regular" }, function() {
    if (chrome.runtime.lastError) {
      const errorMessage = "Error clearing proxy: " + chrome.runtime.lastError.message;
      console.error(errorMessage);
      // Even if clearing fails, we update the state to reflect the intent (disconnected)
      // but the actual proxy settings might be in an indeterminate state.
      // The callback should reflect the error.
      currentProxy = null; // Assume disconnected for our internal state.
      updatePopupState(false, null);
      if (callback) callback(false, errorMessage);
      return;
    }
    const successMessage = "Proxy cleared successfully.";
    console.log(successMessage);
    currentProxy = null;
    updatePopupState(false, null);
    if (callback) callback(true, successMessage);
  });
}

// Listen for messages from the popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log("Message received in background:", request);
  if (request.action === "connect") {
    if (request.country && PROXY_SERVERS[request.country]) {
      setProxy(request.country, (success, message) => {
        sendResponse({ success: success, message: message });
      });
    } else {
      // This case should ideally be caught by the 'No proxy configuration' in setProxy,
      // but as a safeguard or for non-existent country codes:
      sendResponse({ success: false, message: "Invalid country selected or no configuration available." });
    }
  } else if (request.action === "disconnect") {
    clearProxy((success, message) => {
      sendResponse({ success: success, message: message });
    });
  } else if (request.action === "getStatus") {
    sendResponse({
      success: true,
      isConnected: !!currentProxy,
      country: currentProxy
    });
  } else if (request.action === "getProxyServers") {
    sendResponse({ success: true, servers: PROXY_SERVERS });
  }
  return true; // Indicates that the response will be sent asynchronously
});

// Function to send state update to popup (if open)
function updatePopupState(isConnected, countryCode) {
  chrome.runtime.sendMessage({
    action: "updateState",
    isConnected: isConnected,
    country: countryCode
  }).catch(error => {
    // Catch error if popup is not open or listening
    if (error.message !== "Could not establish connection. Receiving end does not exist.") {
        console.warn("Error sending state update to popup:", error);
    }
  });
}

// Initial state check when the extension starts (e.g., browser startup)
chrome.proxy.settings.get({ incognito: false }, (details) => {
  if (details.value.mode === 'fixed_servers' && details.value.rules && details.value.rules.singleProxy) {
    // Try to infer currentProxy if settings were persisted
    const currentHost = details.value.rules.singleProxy.host;
    for (const code in PROXY_SERVERS) {
      if (PROXY_SERVERS[code].host === currentHost) {
        currentProxy = code;
        updatePopupState(true, code);
        break;
      }
    }
  } else {
    currentProxy = null;
    updatePopupState(false, null);
  }
});

console.log("Background script loaded.");
