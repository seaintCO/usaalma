import type { ConfigContext, ExpoConfig } from "expo/config";

const baseUrl =
  process.env.EXPO_PUBLIC_ALMA_BASE_URL ?? "https://www.seaintalma.com";
const easProjectId = process.env.EXPO_PUBLIC_EAS_PROJECT_ID?.trim();

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: "ALMA Office",
  slug: "alma-office",
  owner: process.env.EXPO_OWNER || undefined,
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/icon.png",
  userInterfaceStyle: "light",
  scheme: "alma",
  ios: {
    bundleIdentifier: "com.seaint.alma",
    buildNumber: "1",
    supportsTablet: false,
    associatedDomains: [
      "applinks:www.seaintalma.com",
      "webcredentials:www.seaintalma.com",
    ],
    infoPlist: {
      NSCameraUsageDescription:
        "ALMA uses the camera when you choose to scan receipts or attach job photos.",
      NSMicrophoneUsageDescription:
        "ALMA uses the microphone when you choose voice input, transcription, or live translation.",
      NSPhotoLibraryUsageDescription:
        "ALMA lets you choose photos to attach to receipts, customers, documents, and conversations.",
      NSFaceIDUsageDescription:
        "ALMA can use Face ID to protect access to your signed-in business office.",
      UIBackgroundModes: ["remote-notification"],
    },
  },
  plugins: [
    "expo-asset",
    [
      "expo-camera",
      {
        cameraPermission:
          "Allow ALMA to scan receipts and capture business attachments.",
      },
    ],
    [
      "expo-audio",
      {
        microphonePermission:
          "Allow ALMA to use your microphone for voice input, transcription, and live translation.",
      },
    ],
    [
      "expo-notifications",
      { icon: "./assets/notification-icon.png", color: "#25C9A7" },
    ],
    [
      "expo-secure-store",
      {
        configureAndroidBackup: true,
        faceIDPermission: "Allow ALMA to use Face ID.",
      },
    ],
    [
      "expo-splash-screen",
      {
        backgroundColor: "#080A0D",
        image: "./assets/splash-icon.png",
        imageWidth: 180,
      },
    ],
  ],
  extra: {
    almaBaseUrl: baseUrl,
    ...(easProjectId ? { eas: { projectId: easProjectId } } : {}),
  },
  updates: {
    fallbackToCacheTimeout: 0,
  },
  runtimeVersion: {
    policy: "appVersion",
  },
});
