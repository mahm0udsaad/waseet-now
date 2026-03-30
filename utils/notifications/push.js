// expo-notifications is loaded lazily to avoid TurboModule init at bundle time.
// On iOS 26 the TurboModule throws an ObjC exception when touched too early.
import * as Device from "expo-device";
import { Platform } from "react-native";
import Constants from "expo-constants";

let _Notifications = null;

async function getNotifications() {
  if (!_Notifications) {
    _Notifications = await import("expo-notifications");
  }
  return _Notifications;
}

/**
 * Configure notification handler to suppress system alerts when app is in foreground.
 * Background/closed notifications will still show as system banners.
 */
export async function configureNotificationHandler() {
  try {
    const Notifications = await getNotifications();
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: false, // Suppress system alert in foreground (use in-app toast instead)
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    });
  } catch (e) {
    console.warn('[push] setNotificationHandler failed:', e);
  }
}

/**
 * Setup Android notification channel (required for Android 8+)
 */
export async function setupAndroidNotificationChannel() {
  if (Platform.OS === "android") {
    const Notifications = await getNotifications();
    await Notifications.setNotificationChannelAsync("default", {
      name: "رسائل جديدة", // "New messages" in Arabic
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#FF231F7C",
      sound: "notification.wav",
    });
  }
}

export async function requestPushPermissions() {
  if (!Device.isDevice) {
    console.warn("Push notifications only work on physical devices");
    return null;
  }

  const Notifications = await getNotifications();
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    console.warn("Failed to get push token: permission denied");
    return null;
  }

  return finalStatus;
}

export async function getExpoPushToken() {
  const permission = await requestPushPermissions();
  if (permission !== "granted") return null;

  try {
    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    if (!projectId) {
      console.error("Missing EAS projectId in app.json");
      return null;
    }

    const Notifications = await getNotifications();
    const token = await Notifications.getExpoPushTokenAsync({ projectId });
    return token.data;
  } catch (error) {
    console.error("Failed to get Expo push token:", error);
    return null;
  }
}

export async function scheduleLocalNotification(title, body) {
  const Notifications = await getNotifications();
  return Notifications.scheduleNotificationAsync({
    content: { title, body },
    trigger: { type: 'timeInterval', seconds: 1 },
  });
}
