import { filterGalleryImages } from '../gallerySync';
import type { GalleryImage } from '../../types/gallery';

describe('filterGalleryImages', () => {
  const base: Omit<GalleryImage, 'id' | 'url' | 'sourceURL' | 'timestamp' | 'createdAt'> = {};

  const createImage = (id: string, url: string): GalleryImage => ({
    id,
    url,
    sourceURL: url,
    timestamp: Date.now(),
    createdAt: new Date().toISOString(),
    ...base,
  });

  test('filters out images with empty URLs', () => {
    const images = [
      createImage('1', 'http://a'),
      createImage('2', ''),
      createImage('3', '   '),
    ];

    const result = filterGalleryImages(images);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('1');
  });

  test('removes duplicate URLs', () => {
    const images = [
      createImage('1', 'http://a'),
      createImage('2', 'http://b'),
      createImage('3', 'http://a'),
      createImage('4', 'http://b'),
    ];

    const result = filterGalleryImages(images);
    expect(result).toHaveLength(2);
    const urls = result.map(i => i.url);
    expect(urls).toEqual(['http://a', 'http://b']);
  });
});
