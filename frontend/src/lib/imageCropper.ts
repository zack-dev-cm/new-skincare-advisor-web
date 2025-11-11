export async function cropFaceFromImage(imageData: string, faceapi: any) {
  return new Promise(async (resolve, reject) => {
    try {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = imageData;

      img.onload = async () => {
        const detection = await faceapi
          .detectSingleFace(img, new faceapi.TinyFaceDetectorOptions())
          .withFaceLandmarks();

        if (!detection || !detection.detection) {
          resolve({
            croppedData: imageData,
            box: null,
            originalWidth: img.width,
            originalHeight: img.height
          });
          return;
        }

        const { box } = detection.detection;

        const cropX = Math.max(0, Math.round(box.x));
        const cropY = Math.max(0, Math.round(box.y));
        const cropWidth = Math.min(img.width - cropX, Math.round(box.width));
        const cropHeight = Math.min(img.height - cropY, Math.round(box.height));

        const cropCanvas = document.createElement("canvas");
        cropCanvas.width = cropWidth;
        cropCanvas.height = cropHeight;
        const ctx = cropCanvas.getContext("2d")!;
        ctx.drawImage(
          img,
          cropX,
          cropY,
          cropWidth,
          cropHeight,
          0,
          0,
          cropWidth,
          cropHeight
        );

        const croppedData = cropCanvas.toDataURL("image/jpeg", 1.0);

        resolve({
          croppedData,
          box: { x: cropX, y: cropY, width: cropWidth, height: cropHeight },
          originalWidth: img.width,
          originalHeight: img.height
        });
      };
    } catch (err) {
      reject(err);
    }
  });
}
