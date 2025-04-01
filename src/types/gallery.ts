
// Shared type definitions for gallery images
export type GalleryImage = {
  id: string;
  url: string;
  src?: string; // For compatibility with extension data
  prompt?: string;
  alt?: string;
  title?: string;
  platform?: string;
  creationDate?: string;
  sourceURL: string;
  tabUrl?: string;
  timestamp: number;
  type?: string;
  // Additional optional fields for AI generation metadata
  model?: string;
  seed?: string;
  status?: string;
  // Platform-specific fields
  platformName?: string;
  favicon?: string;
  tabTitle?: string;
  naturalWidth?: number;
  naturalHeight?: number;
  domain?: string;
  path?: string;
  pageTitle?: string;
};
