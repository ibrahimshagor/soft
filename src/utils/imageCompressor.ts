/**
 * Reusable Client-Side Image Resizer & Compressor
 * Automatically scales down large device photos (5MB - 20MB+)
 * to clean, web-optimized JPEG/WebP base64 (<60KB)
 * to avoid localStorage/database memory bloat.
 */

export interface CompressImageOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number; // 0 to 1
  mimeType?: 'image/jpeg' | 'image/webp' | 'image/png';
}

export const compressAndResizeImage = (
  file: File | Blob,
  options: CompressImageOptions = {}
): Promise<{ dataUrl: string; originalSize: number; compressedSize: number }> => {
  const {
    maxWidth = 800,
    maxHeight = 800,
    quality = 0.78,
    mimeType = 'image/jpeg',
  } = options;

  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onerror = () => reject(new Error('Failed to read image file'));

    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error('Failed to load image in browser'));

      img.onload = () => {
        let width = img.naturalWidth || img.width;
        let height = img.naturalHeight || img.height;

        // Calculate proportional aspect ratio resize
        if (width > maxWidth || height > maxHeight) {
          if (width / height > maxWidth / maxHeight) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        // Draw onto offscreen canvas with high quality image smoothing
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, width);
        canvas.height = Math.max(1, height);

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        // Draw white background in case of transparent PNG converted to JPEG
        if (mimeType === 'image/jpeg') {
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, width, height);
        }

        ctx.drawImage(img, 0, 0, width, height);

        // Export compressed Base64 Data URL
        const dataUrl = canvas.toDataURL(mimeType, quality);
        const originalSize = file.size;
        // Approximate base64 string size in bytes
        const compressedSize = Math.round((dataUrl.length * 3) / 4);

        resolve({
          dataUrl,
          originalSize,
          compressedSize,
        });
      };

      img.src = e.target?.result as string;
    };

    reader.readAsDataURL(file);
  });
};

/**
 * Format bytes to readable string (e.g. 2.4 MB, 48 KB)
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};
