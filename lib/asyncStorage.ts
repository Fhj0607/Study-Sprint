import AsyncStorage from '@react-native-async-storage/async-storage';

const notificationKey = (aId: string) => `assignment_notification_${aId}`;

export async function SaveAssignmentNotificationId(aId: string, notificationId: string) {
  await AsyncStorage.setItem(notificationKey(aId), notificationId);
}

export async function GetAssignmentNotificationId(aId: string) {
  return await AsyncStorage.getItem(notificationKey(aId));
}

export async function RemoveAssignmentNotificationId(aId: string) {
  await AsyncStorage.removeItem(notificationKey(aId));
}