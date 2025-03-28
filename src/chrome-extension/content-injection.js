
// This script is dynamically injected and handles UI elements like floating buttons

// Create and insert floating connect button on valid gallery pages
function createFloatingConnectButton(platformId, platformName) {
  // Check if button already exists
  if (document.querySelector('.mg-floating-connect-button')) {
    return;
  }
  
  // Create button container
  const button = document.createElement('button');
  button.className = 'mg-floating-connect-button';
  button.id = 'mg-connect-button';
  button.setAttribute('data-platform', platformId);
  
  // Create icon
  const icon = document.createElement('div');
  icon.className = 'mg-floating-connect-icon';
  
  // Create icon SVG
  icon.innerHTML = `
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 5V19M5 12H19" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
  `;
  
  // Create text
  const text = document.createElement('span');
  text.className = 'mg-floating-connect-text';
  text.textContent = `Connect to MainGallery`;
  
  // Assemble button
  button.appendChild(icon);
  button.appendChild(text);
  
  // Add to document
  document.body.appendChild(button);
  
  // Add event listener
  button.addEventListener('click', function(e) {
    e.preventDefault();
    e.stopPropagation();
    
    // Send message to connect platform
    chrome.runtime.sendMessage({
      action: 'initiatePlatformConnection',
      platform: platformId
    });
    
    // Show connecting state
    showFloatingButtonState('connecting');
    
    // Prevent further clicks
    button.disabled = true;
  });
  
  // Add tooltip
  createTooltip(button, `Connect ${platformName} to MainGallery`);
  
  // Show button with animation
  setTimeout(() => {
    button.classList.add('show');
  }, 500);
}

// Create a tooltip element
function createTooltip(element, text) {
  const tooltip = document.createElement('div');
  tooltip.className = 'mg-tooltip';
  tooltip.textContent = text;
  document.body.appendChild(tooltip);
  
  // Show tooltip on hover
  element.addEventListener('mouseenter', () => {
    const rect = element.getBoundingClientRect();
    tooltip.style.top = `${rect.top - tooltip.offsetHeight - 10}px`;
    tooltip.style.left = `${rect.left + (rect.width / 2) - (tooltip.offsetWidth / 2)}px`;
    tooltip.classList.add('show');
  });
  
  // Hide tooltip on mouse leave
  element.addEventListener('mouseleave', () => {
    tooltip.classList.remove('show');
  });
}

// Update floating button state
function showFloatingButtonState(state, platformId) {
  const button = document.getElementById('mg-connect-button');
  if (!button) return;
  
  switch (state) {
    case 'connecting':
      button.classList.add('connecting');
      button.innerHTML = `
        <div class="mg-button-spinner"></div>
        <span class="mg-floating-connect-text show">Connecting...</span>
      `;
      break;
      
    case 'connected':
      button.classList.add('connected');
      button.innerHTML = `
        <div class="mg-check-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M20 6L9 17L4 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
        <span class="mg-floating-connect-text show">Connected!</span>
      `;
      
      // Remove button after showing connected state
      setTimeout(() => {
        button.classList.remove('show');
        setTimeout(() => {
          button.remove();
        }, 300);
      },
      2000);
      break;
      
    case 'error':
      button.classList.add('error');
      button.innerHTML = `
        <div class="mg-error-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
        <span class="mg-floating-connect-text show">Failed. Try again</span>
      `;
      
      // Reset button after error
      setTimeout(() => {
        button.classList.remove('error');
        button.disabled = false;
        button.innerHTML = `
          <div class="mg-floating-connect-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 5V19M5 12H19" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>
          <span class="mg-floating-connect-text">Connect to MainGallery</span>
        `;
      }, 3000);
      break;
  }
}

// Add CSS for the floating button and tooltip
function injectStyles() {
  const style = document.createElement('style');
  style.textContent = `
    /* Floating connect button - Apple-style */
    .mg-floating-connect-button {
      position: fixed;
      bottom: 24px;
      right: 24px;
      background-color: #ffffff;
      color: #3957ed;
      border: none;
      border-radius: 28px;
      padding: 12px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, sans-serif;
      font-size: 14px;
      font-weight: 500;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 48px;
      height: 48px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      cursor: pointer;
      z-index: 9999;
      transition: all 0.3s ease;
      opacity: 0;
      transform: translateY(20px);
      overflow: hidden;
    }

    .mg-floating-connect-button.show {
      opacity: 1;
      transform: translateY(0);
    }

    .mg-floating-connect-button:hover {
      background-color: #3957ed;
      color: #ffffff;
      transform: translateY(-2px);
      box-shadow: 0 6px 16px rgba(57, 87, 237, 0.25);
      width: auto;
      padding-right: 18px;
    }

    .mg-floating-connect-button:hover .mg-floating-connect-text {
      opacity: 1;
      width: auto;
      margin-left: 8px;
    }

    .mg-floating-connect-icon {
      width: 20px;
      height: 20px;
      flex-shrink: 0;
    }

    .mg-floating-connect-text {
      opacity: 0;
      width: 0;
      overflow: hidden;
      white-space: nowrap;
      transition: all 0.3s ease;
    }
    
    .mg-floating-connect-text.show {
      opacity: 1;
      width: auto;
      margin-left: 8px;
    }
    
    /* Button states */
    .mg-floating-connect-button.connecting,
    .mg-floating-connect-button.connected,
    .mg-floating-connect-button.error {
      width: auto;
      padding-right: 18px;
    }
    
    .mg-floating-connect-button.connected {
      background-color: #16a34a;
      color: white;
    }
    
    .mg-floating-connect-button.error {
      background-color: #dc2626;
      color: white;
    }
    
    /* Spinner for connecting state */
    .mg-button-spinner {
      width: 20px;
      height: 20px;
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-radius: 50%;
      border-top-color: white;
      animation: mg-spin 0.8s linear infinite;
      flex-shrink: 0;
    }
    
    @keyframes mg-spin {
      to { transform: rotate(360deg); }
    }
    
    /* Tooltip */
    .mg-tooltip {
      position: fixed;
      background-color: #ffffff;
      color: #1e293b;
      border-radius: 12px;
      padding: 10px 14px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 13px;
      max-width: 250px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      z-index: 10000;
      pointer-events: none;
      opacity: 0;
      transition: opacity 0.3s ease, transform 0.3s ease;
    }

    .mg-tooltip.show {
      opacity: 1;
    }
  `;
  
  document.head.appendChild(style);
}

// Export functions to be used from content.js
window.mgContentInjection = {
  createFloatingConnectButton,
  showFloatingButtonState,
  injectStyles
};
