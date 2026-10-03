const TARGET_BYTES = 1.2 * 1024 * 1024;
const MAX_DIMENSION = 2400;
// Below this, small prescription handwriting starts to blur, so we stop shrinking.
const MIN_DIMENSION = 1600;
const QUALITY_STEPS = [0.9, 0.82, 0.75, 0.68];
export const MAX_INPUT_BYTES = 25 * 1024 * 1024;
const MAX_UNCOMPRESSED_UPLOAD_BYTES = 10 * 1024 * 1024;

export class ImageCompressionError extends Error {}

async function decode(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if ('createImageBitmap' in window) {
    try {
      return await createImageBitmap(file, { imageOrientation: 'from-image' });
    } catch {
      // Fall through to <img>, which handles some formats createImageBitmap rejects.
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.decoding = 'async';
    image.src = url;
    await image.decode();
    return image;
  } finally {
    URL.revokeObjectURL(url);
  }
}

function toBlob(canvas: HTMLCanvasElement, quality: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new ImageCompressionError('Could not process image'))), 'image/jpeg', quality);
  });
}

function render(source: ImageBitmap | HTMLImageElement, longestSide: number) {
  const width = 'naturalWidth' in source ? source.naturalWidth : source.width;
  const height = 'naturalHeight' in source ? source.naturalHeight : source.height;
  const scale = Math.min(1, longestSide / Math.max(width, height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);
  const context = canvas.getContext('2d');
  if (!context) throw new ImageCompressionError('Your browser could not process this image');
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.imageSmoothingQuality = 'high';
  context.drawImage(source, 0, 0, canvas.width, canvas.height);
  return { canvas, longestSide: Math.max(canvas.width, canvas.height) };
}

/**
 * Shrinks a prescription photo to roughly 0.7–1.2 MB and at most 2400 px while keeping text readable.
 * Images that are already small enough are uploaded untouched.
 */
export async function compressPrescription(file: File): Promise<File> {
  if (!file.type.startsWith('image/') && !/\.(heic|heif)$/i.test(file.name)) {
    throw new ImageCompressionError('Please choose a photo of your prescription (JPG, PNG, WEBP or HEIC).');
  }
  if (file.size > MAX_INPUT_BYTES) throw new ImageCompressionError('This photo is larger than 25 MB. Please choose a smaller one.');

  let source: ImageBitmap | HTMLImageElement;
  try {
    source = await decode(file);
  } catch {
    // e.g. HEIC on browsers without HEIC decoding: Cloudinary can still accept the original.
    if (file.size <= MAX_UNCOMPRESSED_UPLOAD_BYTES) return file;
    throw new ImageCompressionError('This photo format is not supported here. Please take a screenshot or choose a JPG.');
  }

  try {
    const width = 'naturalWidth' in source ? source.naturalWidth : source.width;
    const height = 'naturalHeight' in source ? source.naturalHeight : source.height;
    if (file.size <= TARGET_BYTES && Math.max(width, height) <= MAX_DIMENSION && /^image\/(jpeg|png|webp)$/.test(file.type)) {
      return file;
    }

    let longestSide = Math.min(MAX_DIMENSION, Math.max(width, height));
    let best: Blob | null = null;
    while (true) {
      const rendered = render(source, longestSide);
      for (const quality of QUALITY_STEPS) {
        best = await toBlob(rendered.canvas, quality);
        if (best.size <= TARGET_BYTES) break;
      }
      if (!best || best.size <= TARGET_BYTES || rendered.longestSide <= MIN_DIMENSION) break;
      longestSide = Math.max(MIN_DIMENSION, Math.round(rendered.longestSide * 0.85));
    }

    const name = file.name.replace(/\.[^.]+$/, '') || 'prescription';
    return new File([best!], `${name}.jpg`, { type: 'image/jpeg', lastModified: Date.now() });
  } finally {
    if ('close' in source) source.close();
  }
}
