import JSZip from 'jszip';

export interface WatermarkOptions {
  text?: string;
  logoUrl?: string;
  opacity?: number;
  scale?: number;   // e.g. 0.15 - 0.45 (ratio of image width, default 0.22)
  position?: 'bottom-center' | 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left' | 'diagonal' | 'center';
  maxWidth?: number; // 0 or undefined = preserve exact natural original resolution
  quality?: number;  // Standard high crisp quality without file size bloat (0.92 default)
  mode?: 'text' | 'logo' | 'both';
  forcePreserveOriginal?: boolean;
}

/**
 * Converts a Blob/File to a direct lossless Data URL (Exact 1:1 original bytes)
 */
const readFileAsDataUrl = (fileOrBlob: Blob | File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(fileOrBlob);
  });
};

export const optimizeAndWatermarkImage = async (
  imageSource: Blob | File | string,
  options: WatermarkOptions = {}
): Promise<string> => {
  const {
    text = '',
    logoUrl,
    opacity = 0.85,
    scale = 0.22,
    position = 'bottom-right',
    maxWidth = 0, // 0 = giữ đúng 100% kích thước và độ nét nguyên bản của ảnh gốc
    quality = 0.92, // Chất lượng nén 92% giữ nét chữ nguyên bản, dung lượng nhẹ mượt
    mode = 'logo',
    forcePreserveOriginal = false,
  } = options;

  // Kiểm tra nếu không cần đóng dấu logo/text -> Giữ nguyên 100% tệp gốc (không vẽ lại, không tăng dung lượng)
  const hasWatermark = Boolean((logoUrl && logoUrl.trim()) || (text && text.trim()));
  
  if (!hasWatermark || forcePreserveOriginal) {
    if (typeof imageSource !== 'string') {
      try {
        return await readFileAsDataUrl(imageSource);
      } catch (e) {
        // Fallback to canvas
      }
    } else if (imageSource.startsWith('data:') || imageSource.startsWith('http')) {
      return imageSource;
    }
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      // Giữ nguyên đúng kích thước gốc của ảnh (1:1 với naturalWidth)
      let width = img.naturalWidth || img.width;
      let height = img.naturalHeight || img.height;

      // Chỉ giảm kích thước nếu được cài đặt maxWidth cụ thể (> 0)
      if (maxWidth > 0 && width > maxWidth) {
        const ratio = maxWidth / width;
        width = maxWidth;
        height = Math.round(height * ratio);
      }

      // Nếu không có watermark và không cần đổi kích thước -> trả về ảnh gốc ngay
      if (!hasWatermark && width === (img.naturalWidth || img.width)) {
        if (typeof imageSource === 'string') {
          resolve(imageSource);
          return;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        reject(new Error('Canvas context not available'));
        return;
      }

      // Bật chế độ vẽ mượt chất lượng cao để giữ trọn nét vẽ gốc
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      // Vẽ ảnh với kích thước gốc nguyên bản
      ctx.drawImage(img, 0, 0, width, height);

      // Nếu có logo bản quyền, đóng dấu logo theo tỷ lệ ảnh gốc
      if (logoUrl && logoUrl.trim()) {
        const logoImg = new Image();
        if (!logoUrl.startsWith('data:') && !logoUrl.startsWith('blob:')) {
          logoImg.crossOrigin = 'anonymous';
        }
        logoImg.onload = () => {
          ctx.save();
          ctx.globalAlpha = opacity;
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          
          const effectiveScale = Math.max(0.1, Math.min(0.6, scale));
          const logoMaxW = Math.round(width * effectiveScale);
          const logoAspect = (logoImg.naturalWidth || 1) / (logoImg.naturalHeight || 1);
          const logoW = Math.min(logoMaxW, Math.max(60, logoImg.naturalWidth ? Math.round(logoImg.naturalWidth * (effectiveScale / 0.22)) : 160));
          const logoH = logoW / logoAspect;

          let lx = width - logoW - 20;
          let ly = height - logoH - 20;

          if (position === 'bottom-left') {
            lx = 20;
            ly = height - logoH - 20;
          } else if (position === 'top-right') {
            lx = width - logoW - 20;
            ly = 20;
          } else if (position === 'top-left') {
            lx = 20;
            ly = 20;
          } else if (position === 'bottom-center') {
            lx = (width - logoW) / 2;
            ly = height - logoH - 20;
          } else if (position === 'center') {
            lx = (width - logoW) / 2;
            ly = (height - logoH) / 2;
          }

          ctx.drawImage(logoImg, lx, ly, logoW, logoH);
          ctx.restore();

          const optimizedUrl = canvas.toDataURL('image/jpeg', quality);
          resolve(optimizedUrl);
        };
        logoImg.onerror = () => {
          const optimizedUrl = canvas.toDataURL('image/jpeg', quality);
          resolve(optimizedUrl);
        };
        logoImg.src = logoUrl;
      } else {
        const optimizedUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(optimizedUrl);
      }
    };

    img.onerror = () => {
      reject(new Error('Failed to load image for optimization'));
    };

    if (typeof imageSource === 'string') {
      img.src = imageSource;
    } else {
      img.src = URL.createObjectURL(imageSource);
    }
  });
};

/**
 * Process array of image Files (JPG/PNG/WEBP), sort them, and optimize with watermark
 */
export const processMultipleImageFiles = async (
  files: File[],
  onProgress?: (progress: number, current: number, total: number) => void,
  watermarkOptions?: WatermarkOptions
): Promise<string[]> => {
  const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });
  const sortedFiles = [...files].sort((a, b) => collator.compare(a.name, b.name));

  const processedImages: string[] = [];
  const total = sortedFiles.length;

  for (let i = 0; i < total; i++) {
    const file = sortedFiles[i];
    const optimizedDataUrl = await optimizeAndWatermarkImage(file, watermarkOptions);
    processedImages.push(optimizedDataUrl);

    if (onProgress) {
      onProgress(Math.round(((i + 1) / total) * 100), i + 1, total);
    }
  }

  return processedImages;
};

/**
 * Extract an uploaded ZIP file, sort image entries naturally,
 * and optimize + stamp watermark on every image.
 */
export const processZipFile = async (
  zipFile: File,
  onProgress?: (progress: number, current: number, total: number) => void,
  watermarkOptions?: WatermarkOptions
): Promise<string[]> => {
  const zip = new JSZip();
  const loadedZip = await zip.loadAsync(zipFile);

  // Filter image files inside the ZIP (skip directory entries and hidden/metadata files)
  const imageExtensions = /\.(jpe?g|png|webp|gif|bmp)$/i;
  const imageEntries = Object.keys(loadedZip.files).filter(
    (filename) =>
      !loadedZip.files[filename].dir &&
      !filename.startsWith('__MACOSX') &&
      !filename.includes('/.') &&
      imageExtensions.test(filename)
  );

  if (imageEntries.length === 0) {
    throw new Error('Không tìm thấy file ảnh hợp lệ trong file ZIP! (Chấp nhận .jpg, .png, .webp)');
  }

  // Natural sort filenames (e.g. 1.jpg, 2.jpg, 10.jpg or chap1/01.jpg, chap1/02.jpg)
  const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });
  imageEntries.sort((a, b) => {
    const lastSlashA = a.lastIndexOf('/');
    const lastSlashB = b.lastIndexOf('/');
    const dirA = lastSlashA >= 0 ? a.substring(0, lastSlashA) : '';
    const dirB = lastSlashB >= 0 ? b.substring(0, lastSlashB) : '';
    if (dirA !== dirB) {
      return collator.compare(dirA, dirB);
    }
    const baseA = lastSlashA >= 0 ? a.substring(lastSlashA + 1) : a;
    const baseB = lastSlashB >= 0 ? b.substring(lastSlashB + 1) : b;
    return collator.compare(baseA, baseB);
  });

  const processedImages: string[] = [];
  const total = imageEntries.length;

  for (let i = 0; i < total; i++) {
    const filename = imageEntries[i];
    const fileData = await loadedZip.files[filename].async('blob');
    const optimizedDataUrl = await optimizeAndWatermarkImage(fileData, watermarkOptions);
    processedImages.push(optimizedDataUrl);

    if (onProgress) {
      onProgress(Math.round(((i + 1) / total) * 100), i + 1, total);
    }
  }

  return processedImages;
};
