import Constants from "expo-constants";
import * as Crypto from "expo-crypto";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import * as SecureStore from "expo-secure-store";

const DEVICE_ID_KEY = "alma.ios.device-id";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

async function getDeviceId() {
  const existing = await SecureStore.getItemAsync(DEVICE_ID_KEY);
  if (existing) return existing;
  const next = Crypto.randomUUID();
  await SecureStore.setItemAsync(DEVICE_ID_KEY, next, {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
  return next;
}

export async function requestAlmaPushRegistration() {
  if (!Device.isDevice) throw new Error("physical_device_required");
  const current = await Notifications.getPermissionsAsync();
  const permission = current.granted
    ? current
    : await Notifications.requestPermissionsAsync();
  if (!permission.granted) throw new Error("notification_permission_denied");
  const projectId = Constants.expoConfig?.extra?.eas?.projectId as
    string | undefined;
  if (!projectId) throw new Error("eas_project_id_required");
  const token = await Notifications.getExpoPushTokenAsync({ projectId });
  return { expoPushToken: token.data, deviceId: await getDeviceId() };
}
