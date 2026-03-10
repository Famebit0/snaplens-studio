import { bootstrapCameraKit, CameraKit, CameraKitSession, Lens, createMediaStreamSource, Transform2D } from "@snap/camera-kit";

const STAGING_API_TOKEN =
  "eyJhbGciOiJIUzI1NiIsImtpZCI6IkNhbnZhc1MyU0hNQUNQcm9kIiwidHlwIjoiSldUIn0.eyJhdWQiOiJjYW52YXMtY2FudmFzYXBpIiwiaXNzIjoiY2FudmFzLXMyc3Rva2VuIiwibmJmIjoxNzczMDc4MzY3LCJzdWIiOiI3Y2ZhNWMxNi0yNDQ5LTRkYTYtYjUzYS1lMjM2NGQ5YWFmMDV-U1RBR0lOR34wYzBmMWY3NS1jYjFhLTRjYTEtOTk1Yy0wNjZkYzhiYWRiOGMifQ.Czes9u05nXNNe9LH9gH_eWX1NnW57eQTBn25jegG2mA";

const PRODUCTION_API_TOKEN =
  "eyJhbGciOiJIUzI1NiIsImtpZCI6IkNhbnZhc1MyU0hNQUNQcm9kIiwidHlwIjoiSldUIn0.eyJhdWQiOiJjYW52YXMtY2FudmFzYXBpIiwiaXNzIjoiY2FudmFzLXMyc3Rva2VuIiwibmJmIjoxNzczMDc4MzY3LCJzdWIiOiI3Y2ZhNWMxNi0yNDQ5LTRkYTYtYjUzYS1lMjM2NGQ5YWFmMDV-UFJPRFVDVElPTn5mNDRkZTIxNi0yOTZkLTQzOTItYThhNy05MzVlZThjMThmNjUifQ.1vqsCrGo-MkGQRaX1btFZdO6vk_JYPNplKIP86cncrM";

const LENS_GROUP_ID = "686db339-3033-46be-83ce-e07891d5a87e";
const DEMO_LENS_GROUP_ID = "9cd9719c-0c0f-4107-8f81-7367d11d1ed2";

// Use staging in dev, production when deployed
// Use production token ONLY on the published domain; everything else uses staging
const isProduction = window.location.hostname === "snaplens-studio.lovable.app";
const API_TOKEN = isProduction ? PRODUCTION_API_TOKEN : STAGING_API_TOKEN;

let cameraKitInstance: CameraKit | null = null;

export async function initCameraKit(): Promise<CameraKit> {
  if (cameraKitInstance) return cameraKitInstance;
  cameraKitInstance = await bootstrapCameraKit({ apiToken: API_TOKEN });
  return cameraKitInstance;
}

export async function loadLenses(cameraKit: CameraKit): Promise<Lens[]> {
  try {
    const result = await cameraKit.lensRepository.loadLensGroups([LENS_GROUP_ID]);
    if (result.lenses.length > 0) return result.lenses;
  } catch (e) {
    console.warn("Primary lens group failed, trying demo group:", e);
  }

  // Fallback to demo group
  try {
    const demoResult = await cameraKit.lensRepository.loadLensGroups([DEMO_LENS_GROUP_ID]);
    return demoResult.lenses;
  } catch (e) {
    console.error("Demo lens group also failed:", e);
    return [];
  }
}

export { createMediaStreamSource, Transform2D };
export type { CameraKit, CameraKitSession, Lens };
