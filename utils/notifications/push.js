// Placeholder hooks for future Expo push notification integration.
// Wire to Supabase Edge Functions or your server to trigger pushes.
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

export async function requestPushPermissions() {
  const { status } = await Notifications.getPermissionsAsync();
  if (status === "granted") return status;
  const { status: newStatus } = await Notifications.requestPermissionsAsync();
  return newStatus;
}

export async function getExpoPushToken() {
  const permission = await requestPushPermissions();
  if (permission !== "granted") return null;
  const projectId = Notifications?.expoConfig?.extra?.eas?.projectId ?? undefined;
  const token = await Notifications.getExpoPushTokenAsync({ projectId });
  return token.data;
}

export function configureNotificationHandler() {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

export async function scheduleLocalNotification(title, body) {
  return Notifications.scheduleNotificationAsync({
    content: { title, body },
    trigger: null,
  });
}

