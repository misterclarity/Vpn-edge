# Manual Testing Guide - VPN Extension Popup

This document outlines the steps to manually test the core functionalities of the VPN extension popup.

## 1. Prerequisites

*   The extension is loaded into your browser (e.g., Chrome via "Load unpacked" in `chrome://extensions`).
*   (Optional but Recommended) The browser's developer console is open (usually F12 or Right-click > Inspect) to observe logs from `popup.js` and `background.js`, which can help diagnose issues. Switch the console context to the extension when inspecting the popup.

## 2. Test Case 1: Initial State and Server List Population

*   **Steps:**
    1.  Open the extension popup by clicking its icon in the browser toolbar.

*   **Expected Results:**
    1.  The status text (e.g., element with ID `status`) displays "Disconnected".
    2.  A button (e.g., element with ID `connect-button`) is visible with the text "Connect".
    3.  A dropdown menu (e.g., element with ID `country-select`) is populated. The first option should be "Select a country..." (or similar placeholder), followed by the list of available proxy server countries (e.g., "United States", "Germany", "United Kingdom").
    4.  The country dropdown is enabled, allowing selection.
    5.  The "Connect" button is enabled.

## 3. Test Case 2: Connection Success

*   **Steps:**
    1.  Open the extension popup.
    2.  Select a country from the dropdown menu (e.g., "United States").
    3.  Click the "Connect" button.

*   **Expected Results:**
    1.  Immediately after clicking "Connect":
        *   The "Connect" button's text changes to "Connecting...".
        *   The status text displays a message like "Attempting to connect to United States...".
        *   The country dropdown and the "Connecting..." button become disabled.
    2.  After a short delay (while the proxy connection is established):
        *   The status text updates to "Connected (United States)" (or the name of the selected country).
        *   The button's text changes to "Disconnect".
        *   The "Disconnect" button is enabled.
        *   The country dropdown remains disabled and shows the currently connected country (e.g., "United States").
    3.  (Optional) Verify actual IP change:
        *   Open a new tab and navigate to an IP checker website (e.g., `https://www.whatismyip.com/`).
        *   The displayed IP address should correspond to the proxy server of the selected country.

## 4. Test Case 3: Disconnection

*   **Steps:**
    1.  Ensure the extension is already connected to a proxy (follow Test Case 2).
    2.  Open the extension popup if it's not already open.
    3.  Click the "Disconnect" button.

*   **Expected Results:**
    1.  Immediately after clicking "Disconnect":
        *   The "Disconnect" button's text changes to "Disconnecting...".
        *   The status text displays "Disconnecting...".
        *   The "Disconnecting..." button becomes disabled.
        *   The country dropdown remains disabled.
    2.  After a short delay:
        *   The status text updates to "Disconnected".
        *   The button's text changes to "Connect".
        *   The "Connect" button is enabled.
        *   The country dropdown becomes enabled.
        *   The country dropdown might show the previously selected country or revert to the "Select a country..." placeholder.
    3.  (Optional) Verify IP reverts:
        *   Refresh or open an IP checker website.
        *   The displayed IP address should be your original IP address.

## 5. Test Case 4: Attempt to Connect without Selecting a Country

*   **Steps:**
    1.  Open the extension popup.
    2.  Ensure that no country is selected in the dropdown (it should show "Select a country..." or a similar placeholder). If a country is selected, click the dropdown and select the placeholder.
    3.  Click the "Connect" button.

*   **Expected Results:**
    1.  The status text displays an informative message like "Please select a country first."
    2.  The "Connect" button remains enabled with the text "Connect".
    3.  The country dropdown remains enabled.
    4.  No connection attempt is initiated (no "Connecting..." messages).

## 6. Test Case 5: Connection Failure (Simulated)

This test case often requires a temporary modification to the extension's code to reliably simulate a failure.

*   **Setup:**
    1.  Open `background.js` in a text editor.
    2.  Locate the `PROXY_SERVERS` object.
    3.  Modify the `host` property of one of the server entries to an invalid or non-existent address (e.g., change Germany's host to `"invalid-host-for-testing"`).
    4.  Save `background.js`.
    5.  Reload the extension in your browser:
        *   Go to `chrome://extensions` (or your browser's equivalent).
        *   Find your extension and click its "reload" button/icon.

*   **Steps:**
    1.  Open the extension popup.
    2.  Select the country whose configuration you intentionally broke (e.g., "Germany").
    3.  Click the "Connect" button.

*   **Expected Results:**
    1.  The UI initially behaves like a normal connection attempt:
        *   Button text changes to "Connecting...".
        *   Status displays "Attempting to connect to Germany...".
        *   Country dropdown and "Connecting..." button become disabled.
    2.  After a short delay (due to the connection attempt failing):
        *   The status text displays an error message. This could be generic like "Failed to connect." or more specific, like "Error setting proxy: net::ERR_NAME_NOT_RESOLVED" (the exact message depends on the browser and the nature of the error).
        *   The button's text reverts to "Connect".
        *   The "Connect" button becomes enabled.
        *   The country dropdown becomes enabled.
        *   The country dropdown should still show "Germany" (the country the user attempted to connect to).

*   **Cleanup:**
    1.  Edit `background.js` again and revert the `host` property to its original valid value.
    2.  Save `background.js`.
    3.  Reload the extension in the browser.

## 7. Test Case 6: State Persistence and Initialization

This test verifies that the popup correctly reflects the extension's state when reopened.

*   **Steps (Part 1 - Connected State):**
    1.  Open the popup.
    2.  Select a country (e.g., "United States") and click "Connect".
    3.  Wait for the connection to establish ("Connected (United States)").
    4.  Close the popup (click outside it or click the extension icon again).
    5.  Re-open the popup by clicking the extension icon.

*   **Expected Results (Part 1):**
    1.  The status text immediately displays "Connected (United States)" (or the name of the connected country).
    2.  The button text is "Disconnect".
    3.  The button is enabled.
    4.  The country dropdown is disabled and shows "United States" (the connected country).

*   **Steps (Part 2 - Disconnected State):**
    1.  With the popup open and connected, click the "Disconnect" button.
    2.  Wait for the disconnection to complete ("Disconnected").
    3.  Close the popup.
    4.  Re-open the popup.

*   **Expected Results (Part 2):**
    1.  The status text immediately displays "Disconnected".
    2.  The button text is "Connect".
    3.  The button is enabled.
    4.  The country dropdown is enabled.
    5.  The country dropdown may show the last selected country or the "Select a country..." placeholder.
