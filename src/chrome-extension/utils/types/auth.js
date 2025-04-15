
/**
 * Authentication types for MainGallery.AI Chrome Extension
 */

/**
 * @typedef {Object} UserInfo
 * @property {string} sub - Subject identifier
 * @property {string} name - User's full name
 * @property {string} [given_name] - User's given name
 * @property {string} [family_name] - User's family name
 * @property {string} picture - URL to user's profile picture
 * @property {string} email - User's email address
 * @property {boolean} [email_verified] - Whether email is verified
 * @property {string} [locale] - User's locale
 */

/**
 * @typedef {Object} AuthUser
 * @property {string} id - User ID
 * @property {string} email - User's email address
 * @property {string} [name] - User's name
 * @property {string} [picture] - URL to user's profile picture
 * @property {string} provider - Authentication provider
 * @property {Object} user_metadata - User metadata
 * @property {string} [user_metadata.full_name] - User's full name
 * @property {string} [user_metadata.avatar_url] - URL to user's avatar
 * @property {Object} app_metadata - App metadata
 * @property {string} app_metadata.provider - Authentication provider
 */

/**
 * @typedef {Object} AuthSession
 * @property {string} provider - Authentication provider
 * @property {string} provider_token - Provider-specific token
 * @property {string} access_token - Access token
 * @property {string} [refresh_token] - Refresh token
 * @property {number|string} expires_at - Expiration timestamp
 * @property {number} [created_at] - Creation timestamp
 * @property {number} [updated_at] - Update timestamp
 * @property {AuthUser} [user] - User object
 */

/**
 * @typedef {Object} AuthResult
 * @property {boolean} success - Whether authentication was successful
 * @property {string} [error] - Error message if unsuccessful
 * @property {AuthUser} [user] - User object if successful
 */

// Export empty object to make this a proper ES module
export default {};
