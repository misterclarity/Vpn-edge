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
      statusDisplay.textContent = `Connected (${proxyCountries[countryCode].name})`;
      connectButton.textContent = 'Disconnect';
      connectButton.classList.add('connected');
      connectButton.disabled = false;
      countrySelect.value = countryCode;
      countrySelect.disabled = true;
    } else {
      statusDisplay.textContent = 'Disconnected';
      connectButton.textContent = 'Connect';
      connectButton.classList.remove('connected');
      connectButton.disabled = false;
      countrySelect.disabled = false;
      if (!countryCode && countrySelect.value && countrySelect.options[countrySelect.selectedIndex]?.value !== "") {
        // Don't reset selection if disconnect failed externally, or if there's a valid country selected.
        // This ensures if a user selected a country, then connection failed, their selection remains.
      } else if (!countryCode) {
         // If no country code is provided (e.g. initial state or explicit disconnect),
         // reset to placeholder if it exists, or ensure no selection.
         const placeholder = countrySelect.querySelector('option[value=""]');
         if (placeholder) {
           countrySelect.value = "";
         }
      }
    }
  }

  // Populate country select from background script's PROXY_SERVERS
  // For this, we need to get the list from the background script.
  // However, direct access isn't available. We'll have background send it,
  // or popup will request it. For now, let's hardcode it for popup rendering
  // and assume background.js has the primary list.

  // Request proxy servers from background script
  chrome.runtime.sendMessage({ action: 'getProxyServers' }, (response) => {
    if (chrome.runtime.lastError) {
      console.error("Error getting proxy servers:", chrome.runtime.lastError.message);
      statusDisplay.textContent = "Error loading servers.";
      // Handle error appropriately, maybe disable UI elements
      return;
    }
    if (response && response.success && response.servers) {
      proxyCountries = response.servers;
      countrySelect.innerHTML = ''; // Clear existing options if any

      const placeholderOption = document.createElement('option');
      placeholderOption.value = "";
      placeholderOption.textContent = "Select a country...";
      placeholderOption.disabled = true;
      placeholderOption.selected = true;
      countrySelect.appendChild(placeholderOption);

      for (const code in proxyCountries) {
        const option = document.createElement('option');
        option.value = code;
        option.textContent = proxyCountries[code].name;
        countrySelect.appendChild(option);
      }

      // After populating countries, request initial status
      chrome.runtime.sendMessage({ action: 'getStatus' }, (statusResponse) => {
        if (chrome.runtime.lastError) {
            console.error("Error getting initial status:", chrome.runtime.lastError.message);
            updateUI(false, null); // Assume disconnected if error
            return;
        }
        if (statusResponse && statusResponse.success) {
          updateUI(statusResponse.isConnected, statusResponse.country);
        } else {
          updateUI(false, null); // Assume disconnected
        }
      });

    } else {
      console.warn("Could not fetch proxy servers:", response?.message);
      statusDisplay.textContent = "Could not load servers.";
    }
  });

  // Event listener for the connect button
  connectButton.addEventListener('click', () => {
    if (connectButton.classList.contains('connected')) {
      // Action: Disconnect
      statusDisplay.textContent = "Disconnecting...";
      connectButton.textContent = 'Disconnecting...';
      connectButton.disabled = true;
      // countrySelect is already disabled in connected state

      chrome.runtime.sendMessage({ action: 'disconnect' }, (response) => {
        if (chrome.runtime.lastError) {
          console.error("Error sending disconnect message:", chrome.runtime.lastError.message);
          statusDisplay.textContent = "Error disconnecting: " + chrome.runtime.lastError.message;
          connectButton.textContent = 'Disconnect'; // Still connected, so offer to disconnect again
          connectButton.disabled = false;
          // countrySelect remains disabled as we are still connected
          return;
        }
        if (response && response.success) {
          updateUI(false, null); // This will re-enable controls
        } else {
          console.warn("Disconnect request failed:", response?.message);
          statusDisplay.textContent = response?.message || "Failed to disconnect. Still connected.";
          connectButton.textContent = 'Disconnect'; // Still connected
          connectButton.disabled = false;
          // countrySelect remains disabled
        }
      });
    } else {
      // Action: Connect
      const selectedCountry = countrySelect.value;
      if (selectedCountry && proxyCountries[selectedCountry]) {
        statusDisplay.textContent = `Attempting to connect to ${proxyCountries[selectedCountry].name}...`;
        connectButton.textContent = 'Connecting...';
        countrySelect.disabled = true;
        connectButton.disabled = true;

        chrome.runtime.sendMessage({ action: 'connect', country: selectedCountry }, (response) => {
          if (chrome.runtime.lastError) {
            console.error("Error sending connect message:", chrome.runtime.lastError.message);
            statusDisplay.textContent = "Error connecting: " + chrome.runtime.lastError.message;
            updateUI(false, selectedCountry); // Reset UI to disconnected, but keep country selection
            // updateUI will re-enable controls.
            // connectButton.textContent will be set to 'Connect' by updateUI.
            return;
          }
          if (response && response.success) {
            updateUI(true, selectedCountry);
          } else {
            console.warn("Connect request failed:", response?.message);
            statusDisplay.textContent = response?.message || "Failed to connect.";
            updateUI(false, selectedCountry); // Reset UI, keep country selection
            // updateUI will re-enable controls and set button text to 'Connect'.
          }
        });
      } else {
        statusDisplay.textContent = "Please select a country first.";
        // Ensure controls are enabled if no country was selected
        countrySelect.disabled = false;
        connectButton.disabled = false;
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

  // Request initial status when popup opens - MOVED into callback of getProxyServers
  // chrome.runtime.sendMessage({ action: 'getStatus' }, (response) => {
  //   if (chrome.runtime.lastError) {
  //       console.error("Error getting initial status:", chrome.runtime.lastError.message);
  //       updateUI(false, null); // Assume disconnected if error
  //       return;
  //   }
  //   if (response && response.success) {
  //     // Populate countries if background has them (e.g. if background fetched them dynamically)
  //     // For now, popup.js has a hardcoded list for display names.
  //     // This part would be more robust if background.js was the single source of truth for country list.
  //     updateUI(response.isConnected, response.country);
  //   } else {
  //     updateUI(false, null); // Assume disconnected
  //   }
  // });
});
