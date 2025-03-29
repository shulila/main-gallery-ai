
// Runway API integration for MainGallery extension

// Base URL for Supabase Edge Function
const FUNCTION_BASE_URL = "https://ovhriawcqvcpagcaidlb.supabase.co/functions/v1";

/**
 * Calls the Runway Edge Function with the specified action and parameters
 * @param {string} action - The action to perform (authenticate, fetchUserAssets, generateImage, etc)
 * @param {Object} params - The parameters for the action
 * @returns {Promise<Object>} The API response
 */
export async function callRunwayAPI(action, params = {}) {
  try {
    console.log(`Calling Runway API: ${action}`, params);
    
    // Get auth token if available
    const authData = await chrome.storage.sync.get(['main_gallery_auth_token']);
    const token = authData.main_gallery_auth_token || null;
    
    // Prepare headers
    const headers = {
      'Content-Type': 'application/json',
    };
    
    // Add authorization if token is available
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    // Make the request to the Edge Function
    const response = await fetch(`${FUNCTION_BASE_URL}/runway`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        action,
        params
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `HTTP error ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error(`Runway API error (${action}):`, error);
    throw error;
  }
}

/**
 * Authenticates with Runway
 * @returns {Promise<Object>} Authentication result
 */
export async function authenticateWithRunway() {
  return callRunwayAPI('authenticate');
}

/**
 * Fetches a user's assets from Runway
 * @param {Object} options - Options for fetching assets
 * @param {number} options.limit - Number of assets to fetch
 * @param {number} options.page - Page number for pagination
 * @returns {Promise<Object>} The list of assets
 */
export async function fetchRunwayAssets(options = {}) {
  return callRunwayAPI('fetchUserAssets', options);
}

/**
 * Generates an image using Runway
 * @param {string} prompt - The image prompt
 * @param {Object} options - Additional generation options
 * @returns {Promise<Object>} The generation job result
 */
export async function generateRunwayImage(prompt, options = {}) {
  if (!prompt) {
    throw new Error('Image prompt is required');
  }
  
  return callRunwayAPI('generateImage', {
    prompt,
    ...options
  });
}

/**
 * Checks the status of a Runway generation job
 * @param {string} jobId - The job ID to check
 * @param {Object} options - Additional options
 * @returns {Promise<Object>} The job status
 */
export async function checkRunwayJobStatus(jobId, options = {}) {
  if (!jobId) {
    throw new Error('Job ID is required');
  }
  
  return callRunwayAPI('checkJobStatus', {
    jobId,
    ...options
  });
}
