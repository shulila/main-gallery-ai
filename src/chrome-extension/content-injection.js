
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
      <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14zm-5-7l-3 3.72L9 13l-3 4h12l-4-5z"></path>
    </svg>
    Connect to MainGallery
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
      padding: 12px 18px;
      font-size: 14px;
      font-weight: 500;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      display: flex;
      align-items: center;
      gap: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      cursor: pointer;
      z-index: 9999;
      transition: all 0.3s ease;
      opacity: 0;
      transform: translateY(20px);
    }
    
    .mg-floating-connect-button.show {
      opacity: 1;
      transform: translateY(0);
    }
    
    .mg-floating-connect-button:hover {
      background-color: #3957ed;
      color: white;
      transform: translateY(-2px);
      box-shadow: 0 6px 16px rgba(57, 87, 237, 0.25);
    }
    
    .mg-floating-icon {
      fill: currentColor;
      width: 20px;
      height: 20px;
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
      <div class="mg-floating-spinner"></div>
      Connecting...
    `;
    button.style.pointerEvents = 'none';
    button.style.opacity = '0.7';
    
    // Add spinner style
    const spinnerStyle = document.createElement('style');
    spinnerStyle.textContent = `
      .mg-floating-spinner {
        width: 16px;
        height: 16px;
        border: 2px solid rgba(255, 255, 255, 0.3);
        border-radius: 50%;
        border-top-color: currentColor;
        animation: mg-spin 1s linear infinite;
      }
      
      @keyframes mg-spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `;
    document.head.appendChild(spinnerStyle);
  });
  
  // Optionally, add a tooltip to explain the button
  const tooltip = document.createElement('div');
  tooltip.className = 'mg-tooltip';
  tooltip.textContent = `Save your ${platformName} creations to MainGallery`;
  document.body.appendChild(tooltip);
  
  // Show tooltip on hover
  button.addEventListener('mouseenter', (e) => {
    tooltip.style.left = `${e.clientX - 125}px`;
    tooltip.style.top = `${e.clientY - 40}px`;
    tooltip.classList.add('show');
  });
  
  button.addEventListener('mousemove', (e) => {
    tooltip.style.left = `${e.clientX - 125}px`;
    tooltip.style.top = `${e.clientY - 40}px`;
  });
  
  button.addEventListener('mouseleave', () => {
    tooltip.classList.remove('show');
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
