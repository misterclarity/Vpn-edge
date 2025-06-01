document.addEventListener('DOMContentLoaded', () => {
  const statusDisplay = document.getElementById('status');
  const countrySelect = document.getElementById('country-select');
  const connectButton = document.getElementById('connect-button');

  // Placeholder for proxy server list - this will be populated from background
  let proxyCountries = {};

  // Function to update UI elements
  function updateUI(isConnected, countryCode) {
    if (isConnected && countryCode && proxyCountries[countryCode]) {
      statusDisplay.textContent = `Connected (${proxyCountries[countryCode].name})`;
      connectButton.textContent = 'Disconnect';
      connectButton.classList.add('connected');
      countrySelect.value = countryCode;
      countrySelect.disabled = true;
    } else {
      statusDisplay.textContent = 'Disconnected';
      connectButton.textContent = 'Connect';
      connectButton.classList.remove('connected');
      countrySelect.disabled = false;
      if (!countryCode && countrySelect.value) {
        // Don't reset selection if disconnect failed or was an external clear
      } else if (!countryCode) {
         countrySelect.value = "";
      }
    }
  }

  // Populate country select from background script's PROXY_SERVERS
  // For this, we need to get the list from the background script.
  // However, direct access isn't available. We'll have background send it,
  // or popup will request it. For now, let's hardcode it for popup rendering
  // and assume background.js has the primary list.

  // Simplified list for popup rendering - ideally fetched from background.js
  const localProxyCountries = {
    "US": { name: "United States" },
    "DE": { name: "Germany" },
    "GB": { name: "United Kingdom" }
  };
  proxyCountries = localProxyCountries; // Use this for UI population

  for (const code in proxyCountries) {
    const option = document.createElement('option');
    option.value = code;
    option.textContent = proxyCountries[code].name;
    countrySelect.appendChild(option);
  }


  // Event listener for the connect button
  connectButton.addEventListener('click', () => {
    if (connectButton.classList.contains('connected')) {
      // Action: Disconnect
      chrome.runtime.sendMessage({ action: 'disconnect' }, (response) => {
        if (chrome.runtime.lastError) {
          console.error("Error sending disconnect message:",chrome.runtime.lastError.message);
          // Handle error appropriately, maybe update UI to show error
          statusDisplay.textContent = "Error disconnecting";
          return;
        }
        if (response && response.success) {
          updateUI(false, null);
        } else {
          console.warn("Disconnect request failed:", response?.message);
          // Optionally update UI to show failed disconnect
        }
      });
    } else {
      // Action: Connect
      const selectedCountry = countrySelect.value;
      if (selectedCountry && proxyCountries[selectedCountry]) {
        chrome.runtime.sendMessage({ action: 'connect', country: selectedCountry }, (response) => {
          if (chrome.runtime.lastError) {
            console.error("Error sending connect message:",chrome.runtime.lastError.message);
            statusDisplay.textContent = "Error connecting";
            return;
          }
          if (response && response.success) {
            updateUI(true, selectedCountry);
          } else {
            console.warn("Connect request failed:", response?.message);
            statusDisplay.textContent = response?.message || "Failed to connect";
            updateUI(false, null); // Reset UI
          }
        });
      } else {
        statusDisplay.textContent = "Please select a country.";
      }
    }
  });

  // Listen for state updates from the background script
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "updateState") {
      console.log("Popup received state update:", request);
      // Update proxyCountries if background sends a more definitive list
      // For now, assume the hardcoded list is sufficient for names
      updateUI(request.isConnected, request.country);
    }
  });

  // Request initial status when popup opens
  chrome.runtime.sendMessage({ action: 'getStatus' }, (response) => {
    if (chrome.runtime.lastError) {
        console.error("Error getting initial status:", chrome.runtime.lastError.message);
        updateUI(false, null); // Assume disconnected if error
        return;
    }
    if (response && response.success) {
      // Populate countries if background has them (e.g. if background fetched them dynamically)
      // For now, popup.js has a hardcoded list for display names.
      // This part would be more robust if background.js was the single source of truth for country list.
      updateUI(response.isConnected, response.country);
    } else {
      updateUI(false, null); // Assume disconnected
    }
  });
});
