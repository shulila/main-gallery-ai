
// Constants
export const MAIN_GALLERY_API_URL = 'https://maingallery.app/api';
export const DUMMY_API_URL = 'https://dummyapi.io/collect';

// Platform name mapping
export function getPlatformName(platformId) {
  const platformNames = {
    midjourney: 'Midjourney',
    dalle: 'DALL·E',
    stableDiffusion: 'Stable Diffusion',
    runway: 'Runway',
    pika: 'Pika',
    leonardo: 'Leonardo.ai'
  };
  
  return platformNames[platformId] || platformId;
}

// Helper for getting URL from extension resources
export function getExtensionResourceUrl(resourcePath) {
  return chrome.runtime.getURL(resourcePath);
}

// Get a data URI for a fallback icon (1x1 pixel transparent PNG)
export function getFallbackIconDataUri() {
  // This is a minimal transparent PNG that will always work as a fallback
  return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
}

// Get base64 data URI for notification icons - guaranteed to work for notifications
export function getNotificationIconDataUri() {
  // Simple 16x16 colored square with "MG" text that will always work for notifications
  return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAyhpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDUuNi1jMDE0IDc5LjE1Njc5NywgMjAxNC8wOC8yMC0wOTo1MzowMiAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvIiB4bWxuczp4bXBNTT0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL21tLyIgeG1sbnM6c3RSZWY9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9zVHlwZS9SZXNvdXJjZVJlZiMiIHhtcDpDcmVhdG9yVG9vbD0iQWRvYmUgUGhvdG9zaG9wIENDIDIwMTQgKE1hY2ludG9zaCkiIHhtcE1NOkluc3RhbmNlSUQ9InhtcC5paWQ6MUQ5NjM5RjgxQUYwMTFFNEJBQTdGNTQwNEY5Nzg4MjYiIHhtcE1NOkRvY3VtZW50SUQ9InhtcC5kaWQ6MUQ5NjM5RjkxQUYwMTFFNEJBQTdGNTQwNEY5Nzg4MjYiPiA8eG1wTU06RGVyaXZlZEZyb20gc3RSZWY6aW5zdGFuY2VJRD0ieG1wLmlpZDoxRDk2MzlGNjFBRjAxMUU0QkFBN0Y1NDA0Rjk3ODgyNiIgc3RSZWY6ZG9jdW1lbnRJRD0ieG1wLmRpZDoxRDk2MzlGNzFBRjAxMUU0QkFBN0Y1NDA0Rjk3ODgyNiIvPiA8L3JkZjpEZXNjcmlwdGlvbj4gPC9yZGY6UkRGPiA8L3g6eG1wbWV0YT4gPD94cGFja2V0IGVuZD0iciI/Po6G6sQAAAGvSURBVHjaYvj//z8DJQAggJgYKAQAAUSxAQABRLEBAAFEsQEAAUSxAQABxIIu8OzZMwZ5eXmGz58/MygoKDAcP36c4e3bt2A5Dg4OBi8vLzCNDgACCMMFMjIyDOfOnWMQFxdnuHPnDoOSkhIDCwsLmAaB58+fM9y8eZOBAQsACCCsLtDU1GTYunUrw4oVKxiePHnC8P//fzD98OFDhlu3bjHw8vJiGAAQQHiDAD0cYmJiGGxtbRmuXr2KEj4AAYTTBSBw4MABhocPHzIYGxszuLu7M7x//x5uAEAAEZWIQJpAhnz9+pVBQECAYdKkSQy8vLwMZ86cYQAIIKIMALkCFHSXLl1iOHToEDjoWFhYGHbu3MkAEEBEGQADt2/fZuDg4AD7hBEtCAECiGgXgFzh5+fHYGNjw3Dnzh0GYWFhhB8AAohoA/r6+hhA+QCUiPh5eBj+/P3LcP36dYa/f/8yAAQQ0UEICyZxUVGG379/M/z88YNhzZo1YDFQSgQIIKIMAKU6UMoD+f7MmTMMwMTDAMrGoOAEBSFAABFlACj/X7lyBcz+9esXw6FDhxhAqREUlgABBAAkva+HfMU/AQAAAABJRU5ErkJggg==';
}
