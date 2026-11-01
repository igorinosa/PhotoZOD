import { FaceDetector, FilesetResolver } from '@mediapipe/tasks-vision';

let faceDetector: FaceDetector | null = null;

export async function initFaceDetector() {
  if (!faceDetector) {
    console.log('[Face Detection] Initializing MediaPipe FaceDetector...');
    try {
      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm"
      );
      faceDetector = await FaceDetector.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: "https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite",
          delegate: "CPU"
        },
        runningMode: "IMAGE",
        minDetectionConfidence: 0.3 // More permissive to catch smaller/blurry faces
      });
      console.log('[Face Detection] MediaPipe FaceDetector initialized successfully.');
    } catch (err) {
      console.error('[Face Detection] Failed to initialize MediaPipe FaceDetector:', err);
      throw err;
    }
  }
  return faceDetector;
}

export async function detectFaces(image: any): Promise<any[]> {
  console.log('[Face Detection] Starting detection on image:', image.width, 'x', image.height);
  const detector = await initFaceDetector();
  
  const detections = detector.detect(image);
  const count = detections?.detections?.length || 0;
  console.log("Faces detected:", count);
  
  if (!detections || !detections.detections || detections.detections.length === 0) {
    console.log('[Face Detection] No faces detected.');
    return [];
  }

  console.log(`[Face Detection] Detected ${detections.detections.length} faces.`);
  console.log("Faces detected:", detections.detections.length);

  return detections.detections.map((face: any, index: number) => {
    const bbox = face.boundingBox;
    const landmarks = face.keypoints ? face.keypoints.map((kp: any) => [kp.x * 100, kp.y * 100]) : [];

    // Convert pixels to percentages for the UI
    const x = (bbox.originX / image.width) * 100;
    const y = (bbox.originY / image.height) * 100;
    const width = (bbox.width / image.width) * 100;
    const height = (bbox.height / image.height) * 100;

    return {
      id: `face_${Date.now()}_${index}`,
      bbox: { x, y, width, height },
      landmarks: landmarks,
      confidence: face.categories && face.categories.length > 0 ? face.categories[0].score : 0.9
    };
  });
}
