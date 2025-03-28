
// Create and inject a floating "Connect to MainGallery" button with Apple-style design
function createFloatingConnectButton(platformId, platformName) {
  // Check if button already exists
  if (document.querySelector('.mg-floating-connect-button')) {
    return;
  }
  
  // Create button element
  const button = document.createElement('button');
  button.className = 'mg-floating-connect-button';
  
  // Create button contents: icon + text (initially hidden)
  button.innerHTML = `
    <div class="mg-button-icon">
      <img src="chrome-extension://__MSG_@@extension_id__/icons/icon48.png" class="mg-logo-icon" alt="MainGallery">
      <svg class="mg-plus-icon" viewBox="0 0 24 24" width="20" height="20">
        <path d="M12 5v14M5 12h14"></path>
      </svg>
    </div>
    <span class="mg-button-text">Add to MainGallery</span>
  `;
  
  // Add styles
  const style = document.createElement('style');
  style.textContent = `
    .mg-floating-connect-button {
      position: fixed;
      bottom: 20px;
      right: 20px;
      background-color: white;
      color: #3957ed;
      border: none;
      border-radius: 28px;
      padding: 12px;
      font-size: 14px;
      font-weight: 500;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      display: flex;
      align-items: center;
      gap: 8px;
      box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
      cursor: pointer;
      z-index: 9999;
      transition: all 0.3s ease;
      opacity: 0;
      transform: translateY(20px);
      overflow: hidden;
      width: 48px;
      height: 48px;
    }
    
    .mg-floating-connect-button.show {
      opacity: 1;
      transform: translateY(0);
    }
    
    .mg-button-icon {
      position: relative;
      width: 24px;
      height: 24px;
      flex-shrink: 0;
    }
    
    .mg-logo-icon {
      position: absolute;
      top: 0;
      left: 0;
      width: 24px;
      height: 24px;
      border-radius: 6px;
      transition: opacity 0.3s ease;
    }
    
    .mg-plus-icon {
      position: absolute;
      top: 0;
      left: 0;
      width: 24px;
      height: 24px;
      stroke: currentColor;
      fill: none;
      stroke-width: 2;
      stroke-linecap: round;
      stroke-linejoin: round;
      opacity: 0;
      transition: opacity 0.3s ease;
    }
    
    .mg-button-text {
      opacity: 0;
      width: 0;
      white-space: nowrap;
      transition: all 0.3s ease;
      overflow: hidden;
    }
    
    .mg-floating-connect-button:hover {
      background-color: #3957ed;
      color: white;
      padding-right: 18px;
      width: auto;
      box-shadow: 0 4px 16px rgba(57, 87, 237, 0.25);
      transform: translateY(-2px);
    }
    
    .mg-floating-connect-button:hover .mg-logo-icon {
      opacity: 0;
    }
    
    .mg-floating-connect-button:hover .mg-plus-icon {
      opacity: 1;
    }
    
    .mg-floating-connect-button:hover .mg-button-text {
      opacity: 1;
      width: auto;
      margin-left: 8px;
    }
    
    .mg-loader-svg {
      width: 24px;
      height: 24px;
    }

    .mg-tooltip {
      position: fixed;
      background-color: white;
      color: #1e293b;
      border-radius: 12px;
      padding: 10px 14px;
      font-size: 13px;
      max-width: 250px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      z-index: 10000;
      pointer-events: none;
      opacity: 0;
      transition: opacity 0.3s ease, transform 0.3s ease;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }
    
    .mg-tooltip.show {
      opacity: 1;
    }
    
    @keyframes mg-fade-in {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }
    
    @keyframes mg-fade-out {
      from { opacity: 1; transform: translateY(0); }
      to { opacity: 0; transform: translateY(10px); }
    }
    
    @keyframes mg-spin {
      0% { transform: rotate(0deg); stroke-dashoffset: 60; }
      100% { transform: rotate(360deg); stroke-dashoffset: 0; }
    }
  `;
  
  // Create tooltip
  const tooltip = document.createElement('div');
  tooltip.className = 'mg-tooltip';
  tooltip.textContent = 'Connect this platform to MainGallery';
  
  // Append style, button and tooltip to document
  document.head.appendChild(style);
  document.body.appendChild(button);
  document.body.appendChild(tooltip);
  
  // Show the button with animation
  setTimeout(() => {
    button.classList.add('show');
  }, 500);
  
  // Add tooltip logic
  button.addEventListener('mouseenter', () => {
    const rect = button.getBoundingClientRect();
    tooltip.style.bottom = `${window.innerHeight - rect.top + 10}px`;
    tooltip.style.left = `${rect.left + rect.width / 2 - 125}px`;
    tooltip.classList.add('show');
  });
  
  button.addEventListener('mouseleave', () => {
    tooltip.classList.remove('show');
  });
  
  // Handle button click
  button.addEventListener('click', () => {
    // Send message to background script to handle connection
    chrome.runtime.sendMessage({
      action: 'initiatePlatformConnection',
      platform: platformId
    });
    
    // Add loading state to button
    const buttonIcon = button.querySelector('.mg-button-icon');
    const buttonText = button.querySelector('.mg-button-text');
    
    // Replace icons with loader
    buttonIcon.innerHTML = `
      <svg class="mg-loader-svg" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="2" stroke-dasharray="60" stroke-dashoffset="0"></circle>
      </svg>
    `;
    
    // Add animation to loader
    const loaderSvg = buttonIcon.querySelector('.mg-loader-svg');
    loaderSvg.style.animation = 'mg-spin 1s linear infinite';
    
    // Update text and show it
    buttonText.textContent = 'Connecting...';
    buttonText.style.opacity = '1';
    buttonText.style.width = 'auto';
    buttonText.style.marginLeft = '8px';
    
    // Update button styles for loading state
    button.style.width = 'auto';
    button.style.paddingRight = '18px';
    button.style.pointerEvents = 'none';
    
    // After a delay, show success and remove
    setTimeout(() => {
      // Update to success state
      buttonIcon.innerHTML = `
        <svg class="mg-loader-svg" viewBox="0 0 24 24" width="24" height="24">
          <path d="M20 6L9 17l-5-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path>
        </svg>
      `;
      buttonText.textContent = 'Connected!';
      button.style.backgroundColor = '#16a34a';
      button.style.color = 'white';
      
      // After showing success, auto-redirect to MainGallery
      setTimeout(() => {
        chrome.runtime.sendMessage({ action: 'openGallery' });
        
        // Remove button with animation
        button.style.opacity = '0';
        button.style.transform = 'translateY(20px)';
        tooltip.style.opacity = '0';
        
        // Remove from DOM after animation
        setTimeout(() => {
          button.remove();
          tooltip.remove();
        }, 300);
      }, 1500);
    }, 2000);
  });
  
  // Return the button element
  return button;
}

// Remove the floating button if it exists
function removeFloatingConnectButton() {
  const button = document.querySelector('.mg-floating-connect-button');
  if (button) {
    button.style.animation = 'mg-fade-out 0.3s forwards';
    setTimeout(() => {
      button.remove();
    }, 300);
  }
  
  const tooltip = document.querySelector('.mg-tooltip');
  if (tooltip) {
    tooltip.remove();
  }
}

// Export these functions for use in the main content script
window.mgContentInjection = {
  createFloatingConnectButton,
  removeFloatingConnectButton
};
