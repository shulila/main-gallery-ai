
// Midjourney API integration for MainGallery extension

// Base URL for Supabase Edge Function
const FUNCTION_BASE_URL = "https://ovhriawcqvcpagcaidlb.supabase.co/functions/v1";

/**
 * Calls the Midjourney Edge Function with the specified action and parameters
 * @param {string} action - The action to perform (authenticate, fetchUserImages, generateImage)
 * @param {Object} params - The parameters for the action
 * @returns {Promise<Object>} The API response
 */
export async function callMidjourneyAPI(action, params = {}) {
  try {
    console.log(`Calling Midjourney API: ${action}`, params);
    
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
    const response = await fetch(`${FUNCTION_BASE_URL}/midjourney`, {
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
    console.error(`Midjourney API error (${action}):`, error);
    throw error;
  }
}

/**
 * Authenticates with Midjourney
 * @returns {Promise<Object>} Authentication result
 */
export async function authenticateWithMidjourney() {
  return callMidjourneyAPI('authenticate');
}

/**
 * Fetches a user's images from Midjourney
 * @param {Object} options - Options for fetching images
 * @param {number} options.limit - Number of images to fetch
 * @param {string} options.cursor - Pagination cursor
 * @returns {Promise<Object>} The list of images
 */
export async function fetchMidjourneyImages(options = {}) {
  return callMidjourneyAPI('fetchUserImages', options);
}

/**
 * Generates an image using Midjourney
 * @param {string} prompt - The image prompt
 * @param {Object} options - Additional generation options
 * @returns {Promise<Object>} The generation job result
 */
export async function generateMidjourneyImage(prompt, options = {}) {
  if (!prompt) {
    throw new Error('Image prompt is required');
  }
  
  return callMidjourneyAPI('generateImage', {
    prompt,
    ...options
  });
}
