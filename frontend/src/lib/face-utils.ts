export function calculateBrightness(
	image: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement | ImageBitmap
): number {
	const canvas = document.createElement('canvas');
	const ctx = canvas.getContext('2d');

	// Prefer intrinsic video resolution when working with HTMLVideoElement,
	// since the width/height attributes may be 0 when sizing is done via CSS.
	let width: number | undefined;
	let height: number | undefined;

	if (image instanceof HTMLVideoElement) {
		width = image.videoWidth || image.width;
		height = image.videoHeight || image.height;
	} else {
		// HTMLImageElement | HTMLCanvasElement | ImageBitmap
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const anyImage = image as any;
		width = anyImage.width;
		height = anyImage.height;
	}

	if (!ctx || !width || !height) return 0;

	canvas.width = width;
	canvas.height = height;

	ctx.drawImage(image, 0, 0, width, height);

	const frame = ctx.getImageData(0, 0, width, height);
	if (!frame) return 0;

	let total = 0;
	const data = frame.data;

	for (let i = 0; i < data.length; i += 4) {
		total += (data[i] + data[i + 1] + data[i + 2]) / 3;
	}

	const avg = total / (data.length / 4);
	return Math.min(avg / 255, 1);
}

export function isFaceInsideFrame(
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	landmarks: any[],
	videoWidth: number,
	videoHeight: number,
	frame: { x: number; y: number; width: number; height: number }
): boolean {
	const xs = landmarks.map((p) => p.x * videoWidth);
	const ys = landmarks.map((p) => p.y * videoHeight);

	const centerX = xs.reduce((a, b) => a + b, 0) / xs.length;
	const centerY = ys.reduce((a, b) => a + b, 0) / ys.length;

	return (
		centerX >= frame.x &&
		centerX <= frame.x + frame.width &&
		centerY >= frame.y &&
		centerY <= frame.y + frame.height
	);
}

export function isFaceVisible(
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	landmarks: any[],
	videoWidth: number,
	videoHeight: number
): boolean {
	const xs = landmarks.map((p) => p.x * videoWidth);
	const ys = landmarks.map((p) => p.y * videoHeight);

	const minX = Math.min(...xs);
	const maxX = Math.max(...xs);
	const minY = Math.min(...ys);
	const maxY = Math.max(...ys);

	const boxWidth = maxX - minX;
	const boxHeight = maxY - minY;

	const minWidth = videoWidth * 0.12;
	const minHeight = videoHeight * 0.12;

	const margin = 0.08;
	const isInsideScreen =
		minX >= -videoWidth * margin &&
		maxX <= videoWidth * (1 + margin) &&
		minY >= -videoHeight * margin &&
		maxY <= videoHeight * (1 + margin);

	return isInsideScreen && boxWidth >= minWidth && boxHeight >= minHeight;
}

export function calculateFaceSpanNormalized(
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	landmarks: any[]
): number {
	if (!landmarks || landmarks.length === 0) return 0;

	// Helper to safely access a landmark by index with a fallback.
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const getPoint = (index: number): any | null => {
		return landmarks[index] ?? null;
	};

	// MediaPipe FaceMesh (468+ landmarks) layout – original implementation.
	if (landmarks.length > 200) {
		const chin = getPoint(152);
		const leftEye = getPoint(33);
		const rightEye = getPoint(263);
		if (!chin || !leftEye || !rightEye) return 0;

		const midEye = {
			x: (leftEye.x + rightEye.x) / 2,
			y: (leftEye.y + rightEye.y) / 2,
		};
		const dy = Math.abs(chin.y - midEye.y);
		return dy;
	}

	// face-api.js 68-point landmarks: use chin (8) and outer eye corners (36, 45).
	if (landmarks.length >= 46) {
		const chin = getPoint(8);
		const leftEye = getPoint(36);
		const rightEye = getPoint(45);
		if (chin && leftEye && rightEye) {
			const midEye = {
				x: (leftEye.x + rightEye.x) / 2,
				y: (leftEye.y + rightEye.y) / 2,
			};
			const dy = Math.abs(chin.y - midEye.y);
			return dy;
		}
	}

	// Fallback: approximate span as the vertical extent of all landmarks.
	const ys = landmarks.map((p) => p.y);
	const minY = Math.min(...ys);
	const maxY = Math.max(...ys);
	return maxY - minY;
}

export function getFaceFrameRect(
	windowSize: { width: number; height: number },
	safeArea: { top: number; bottom: number },
	videoSize: { width: number; height: number }
): {
	windowRect: { x: number; y: number; width: number; height: number };
	videoRect: { x: number; y: number; width: number; height: number };
} {
	const vw = windowSize.width;
	const vh = windowSize.height;
	const safeAreaTop = safeArea.top || 0;
	const safeAreaBottom = safeArea.bottom || 0;
	const centerY = (vh - safeAreaBottom + safeAreaTop) / 2;

	let verticalDiameter, horizontalDiameter;
	const aspectRatio = vw / vh;
	if (aspectRatio > 0.7) {
		verticalDiameter = vh * 0.8;
		horizontalDiameter = verticalDiameter * 0.8;
		if (horizontalDiameter > vw * 0.9) {
			horizontalDiameter = vw * 0.9;
			verticalDiameter = horizontalDiameter / 0.8;
		}
	} else {
		horizontalDiameter = vw * 0.9;
		verticalDiameter = horizontalDiameter / 0.8;
		if (verticalDiameter > vh * 0.8) {
			verticalDiameter = vh * 0.8;
			horizontalDiameter = verticalDiameter * 0.8;
		}
	}
	
	const frameWidth = horizontalDiameter * 0.8;
	const frameHeight = verticalDiameter * 0.8;
	const frameX = vw / 2 - frameWidth / 2;
	const frameY = centerY - frameHeight / 2;

	const videoW = videoSize.width;
	const videoH = videoSize.height;
	const scale = Math.max(vw / videoW, vh / videoH);
	const scaledVideoW = videoW * scale;
	const scaledVideoH = videoH * scale;
	const offsetX = (scaledVideoW - vw) / 2;
	const offsetY = (scaledVideoH - vh) / 2;

	const videoRect = {
		x: (frameX + offsetX) / scale,
		y: (frameY + offsetY) / scale,
		width: frameWidth / scale,
		height: frameHeight / scale,
	};

	const windowRect = {
		x: frameX,
		y: frameY,
		width: frameWidth,
		height: frameHeight,
	};

	return { windowRect, videoRect };
}

function detectDeviceCharacteristics(windowSize: { width: number; height: number }) {
	const devicePixelRatio = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
	const screenDiagonal = Math.sqrt(windowSize.width ** 2 + windowSize.height ** 2) / devicePixelRatio;
	const aspectRatio = Math.max(windowSize.width, windowSize.height) / Math.min(windowSize.width, windowSize.height);
	
	const isFoldDevice = aspectRatio > 1.8; // Unfolded
	const isTabletSize = screenDiagonal > 2000;
	const isLargeScreen = isTabletSize || isFoldDevice;
	
	return {
		devicePixelRatio,
		screenDiagonal,
		aspectRatio,
		isFoldDevice,
		isTabletSize,
		isLargeScreen
	};
}

export function calculateZoomThresholds(
	windowSize: { width: number; height: number },
	safeArea: { top: number; bottom: number },
	videoSize: { width: number; height: number }
): {
	minThreshold: number;
	perfectMinThreshold: number;
	perfectMaxThreshold: number;
	maxThreshold: number;
} {
	const { videoRect } = getFaceFrameRect(windowSize, safeArea, videoSize);
	
	const frameHeightInVideo = videoRect.height;
	
	const tooFarFrameOccupancy = 0.5;      // too small - need to get closer
	const perfectMinFrameOccupancy = 0.9;   // good minimum - closer is better
	const perfectMaxFrameOccupancy = 1.4;   // good maximum - allow larger faces for detail
	const tooCloseFrameOccupancy = 1.6;     // too large - only slightly larger than perfect max
	
	const faceHeightToSpanRatio = 0.65;
	
	const tooFarFaceHeight = frameHeightInVideo * tooFarFrameOccupancy;
	const perfectMinFaceHeight = frameHeightInVideo * perfectMinFrameOccupancy;
	const perfectMaxFaceHeight = frameHeightInVideo * perfectMaxFrameOccupancy;
	const tooCloseFaceHeight = frameHeightInVideo * tooCloseFrameOccupancy;
	
	const minThreshold = (tooFarFaceHeight * faceHeightToSpanRatio) / videoSize.height;
	const perfectMinThreshold = (perfectMinFaceHeight * faceHeightToSpanRatio) / videoSize.height;
	const perfectMaxThreshold = (perfectMaxFaceHeight * faceHeightToSpanRatio) / videoSize.height;
	const maxThreshold = (tooCloseFaceHeight * faceHeightToSpanRatio) / videoSize.height;
	
	const deviceInfo = detectDeviceCharacteristics(windowSize);
	const { screenDiagonal, aspectRatio, isLargeScreen } = deviceInfo;
	
	let adjustmentFactor = 1.0;
	if (isLargeScreen) {
		const sizeBasedAdjustment = Math.min(screenDiagonal / 1800, 1.4);
		const aspectBasedAdjustment = Math.min(aspectRatio / 1.5, 1.3);
		adjustmentFactor = Math.max(sizeBasedAdjustment, aspectBasedAdjustment);
		
		adjustmentFactor = Math.min(Math.max(adjustmentFactor, 1.1), 1.5);
	}
	
	return {
		minThreshold: minThreshold * adjustmentFactor,
		perfectMinThreshold: perfectMinThreshold * adjustmentFactor,
		perfectMaxThreshold: perfectMaxThreshold * adjustmentFactor,
		maxThreshold: maxThreshold * adjustmentFactor
	};
}

export function determineZoomStatus(
	faceSpan: number,
	thresholds: {
		minThreshold: number;
		perfectMinThreshold: number;
		perfectMaxThreshold: number;
		maxThreshold: number;
	},
	currentStatus: 'too-close' | 'too-far' | 'perfect'
): 'too-close' | 'too-far' | 'perfect' {
	const hysteresisFactor = 0.02;

	if (currentStatus === 'perfect') {
		if (faceSpan < thresholds.perfectMinThreshold - hysteresisFactor) {
			return 'too-far';
		}
		if (faceSpan > thresholds.perfectMaxThreshold + hysteresisFactor) {
			return 'too-close';
		}
		return 'perfect';
	}

	if (faceSpan < thresholds.perfectMinThreshold) {
		return 'too-far';
	}
	if (faceSpan > thresholds.perfectMaxThreshold) {
		return 'too-close';
	}
	return 'perfect';
}

export function debugZoomThresholds(
	windowSize: { width: number; height: number },
	safeArea: { top: number; bottom: number },
	videoSize: { width: number; height: number }
): void {
	if (typeof window === 'undefined' || !window.console) return;
	
	const deviceInfo = detectDeviceCharacteristics(windowSize);
	const { videoRect } = getFaceFrameRect(windowSize, safeArea, videoSize);
	const thresholds = calculateZoomThresholds(windowSize, safeArea, videoSize);
	
	console.group('Face Detection Thresholds Debug');
	console.log('Device Info:', {
		screenSize: `${windowSize.width}x${windowSize.height}`,
		aspectRatio: deviceInfo.aspectRatio.toFixed(2),
		screenDiagonal: Math.round(deviceInfo.screenDiagonal),
		isFoldDevice: deviceInfo.isFoldDevice,
		isTabletSize: deviceInfo.isTabletSize,
		isLargeScreen: deviceInfo.isLargeScreen
	});
	console.log('Video & Frame:', {
		videoSize: `${videoSize.width}x${videoSize.height}`,
		frameInVideo: `${Math.round(videoRect.width)}x${Math.round(videoRect.height)}`,
		frameHeight: `${Math.round(videoRect.height)}px (${((videoRect.height / videoSize.height) * 100).toFixed(1)}% of video)`
	});
	console.log('Thresholds:', {
		tooFar: `< ${thresholds.minThreshold.toFixed(3)}`,
		perfectRange: `${thresholds.perfectMinThreshold.toFixed(3)} - ${thresholds.perfectMaxThreshold.toFixed(3)}`,
		tooClose: `> ${thresholds.maxThreshold.toFixed(3)}`
	});
	console.groupEnd();
}
