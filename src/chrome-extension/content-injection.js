
// Create and inject a floating "Connect to MainGallery" button
function createFloatingConnectButton(platformId, platformName) {
  // Check if button already exists
  if (document.querySelector('.mg-floating-connect-button')) {
    return;
  }
  
  // Create button element
  const button = document.createElement('button');
  button.className = 'mg-floating-connect-button';
  button.innerHTML = `
    <svg class="mg-floating-icon" viewBox="0 0 24 24" width="20" height="20">
      <path d="M12 5v14M5 12h14"></path>
    </svg>
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
      border-radius: 16px;
      padding: 12px;
      font-size: 14px;
      font-weight: 500;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      display: flex;
      align-items: center;
      gap: 8px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      cursor: pointer;
      z-index: 9999;
      transition: all 0.3s ease;
      opacity: 0;
      transform: translateY(20px);
      width: 48px;
      overflow: hidden;
    }
    
    .mg-floating-connect-button.show {
      opacity: 1;
      transform: translateY(0);
    }
    
    .mg-floating-connect-button:hover {
      background-color: #3957ed;
      color: white;
      width: auto;
      padding-right: 18px;
    }
    
    .mg-floating-connect-button:hover .mg-floating-icon {
      transform: rotate(45deg);
    }
    
    .mg-floating-connect-button:hover .mg-button-text {
      width: auto;
      opacity: 1;
      margin-left: 8px;
    }
    
    .mg-floating-icon {
      stroke: currentColor;
      fill: none;
      stroke-width: 2;
      stroke-linecap: round;
      stroke-linejoin: round;
      width: 20px;
      height: 20px;
      transition: transform 0.3s ease;
    }
    
    .mg-button-text {
      width: 0;
      opacity: 0;
      white-space: nowrap;
      transition: all 0.3s ease;
      overflow: hidden;
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
  
  // Append style and button to document
  document.head.appendChild(style);
  document.body.appendChild(button);
  
  // Show the button with animation
  setTimeout(() => {
    button.classList.add('show');
  }, 500);
  
  // Handle button click
  button.addEventListener('click', () => {
    // Send message to background script to handle connection
    chrome.runtime.sendMessage({
      action: 'initiatePlatformConnection',
      platform: platformId
    });
    
    // Add loading state to button
    button.innerHTML = `
      <svg class="mg-floating-icon mg-spinner" viewBox="0 0 24 24" width="20" height="20">
        <circle cx="12" cy="12" r="10" stroke-dasharray="60" stroke-dashoffset="0"></circle>
      </svg>
      <span class="mg-button-text" style="width: auto; opacity: 1; margin-left: 8px;">Connecting...</span>
    `;
    
    // Add spinner style
    const spinnerStyle = document.createElement('style');
    spinnerStyle.textContent = `
      .mg-spinner {
        animation: mg-spin 1s linear infinite;
      }
    `;
    document.head.appendChild(spinnerStyle);
    
    // Disable button
    button.style.pointerEvents = 'none';
    button.style.opacity = '0.9';
    
    // After a delay, show success and remove
    setTimeout(() => {
      // Update to success state
      button.innerHTML = `
        <svg class="mg-floating-icon" viewBox="0 0 24 24" width="20" height="20">
          <path d="M20 6L9 17l-5-5"></path>
        </svg>
        <span class="mg-button-text" style="width: auto; opacity: 1; margin-left: 8px;">Connected!</span>
      `;
      button.style.backgroundColor = '#16a34a';
      button.style.color = 'white';
      button.style.width = 'auto';
      button.style.paddingRight = '18px';
      
      // Remove after success is shown
      setTimeout(() => {
        button.style.opacity = '0';
        button.style.transform = 'translateY(20px)';
        
        // Remove from DOM after animation
        setTimeout(() => {
          button.remove();
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
