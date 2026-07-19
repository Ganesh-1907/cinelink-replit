/**
 * Image/URL utilities — R2 provides direct public URLs, no transformations needed.
 */

export function optimizeImage(
  url: string | null | undefined,
  _width = 600,
  _quality: 'auto' | 'good' | 'best' = 'good',
): string {
  return url || '';
}

export function optimizeVideo(
  url: string | null | undefined,
  _quality: 'auto' | 'good' | 'best' = 'auto',
): string {
  return url || '';
}
