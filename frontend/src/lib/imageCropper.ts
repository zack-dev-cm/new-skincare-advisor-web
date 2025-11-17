export interface CroppedFaceResult {
  croppedData: string | null;
  originalWidth: number;
  originalHeight: number;
  box: { x: number; y: number; width: number; height: number } | null;
}

export async function cropFaceFromImage(
  imageData: string,
  faceapi: any
): Promise<CroppedFaceResult> {
  // Load image from data URL
  const img = await faceapi.fetchImage(imageData);
  const originalWidth = img.naturalWidth || img.width;
  const originalHeight = img.naturalHeight || img.height;

  if (!originalWidth || !originalHeight) {
    console.warn('cropFaceFromImage: invalid image dimensions');
    return {
      croppedData: null,
      originalWidth,
      originalHeight,
      box: null,
    };
  }

  // Detect a single face with landmarks
  const detection = await faceapi
    .detectSingleFace(img, new faceapi.TinyFaceDetectorOptions())
    .withFaceLandmarks();

  if (!detection) {
    console.warn('cropFaceFromImage: no face detected');
    return {
      croppedData: null,
      originalWidth,
      originalHeight,
      box: null,
    };
  }

  const faceBox = detection.detection.box;
  let { x, y, width, height } = faceBox;

  // --- ONLY ADD SPACE ON TOP (FOREHEAD) ---
  const extraTop = height * 0.4; // ~15% of face height above

  let cropX = x;
  let cropY = y - extraTop;
  let cropW = width;
  let cropH = height + extraTop;

  // Clamp to image bounds (only what’s needed)
  if (cropY < 0) {
    cropH += cropY; // reduce height by how much we went above
    cropY = 0;
  }
  if (cropY + cropH > originalHeight) {
    cropH = originalHeight - cropY;
  }

  // Safety clamp
  cropW = Math.max(1, cropW);
  cropH = Math.max(1, cropH);

  // Create canvas and draw cropped region
  const canvas = document.createElement('canvas');
  canvas.width = cropW;
  canvas.height = cropH;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    console.warn('cropFaceFromImage: could not get canvas context');
    return {
      croppedData: null,
      originalWidth,
      originalHeight,
      box: null,
    };
  }

  ctx.drawImage(
    img,
    cropX,
    cropY,
    cropW,
    cropH,
    0,
    0,
    cropW,
    cropH
  );

  const croppedData = canvas.toDataURL('image/jpeg', 0.95);

  return {
    croppedData,
    originalWidth,
    originalHeight,
    box: {
      x: cropX,
      y: cropY,
      width: cropW,
      height: cropH,
    },
  };
}