import AsyncStorage from '@react-native-async-storage/async-storage';

const notificationKey = (aId: string) => `assignment_notification_${aId}`;
const activeSprintKey = 'active_sprint';

export type ActiveSprint = {
  taskId: string;
  durationSeconds: number;
  endTime: number;
};

export async function SaveAssignmentNotificationId(aId: string, notificationId: string) {
  await AsyncStorage.setItem(notificationKey(aId), notificationId);
}

export async function GetAssignmentNotificationId(aId: string) {
  return await AsyncStorage.getItem(notificationKey(aId));
}

export async function RemoveAssignmentNotificationId(aId: string) {
  await AsyncStorage.removeItem(notificationKey(aId));
}

export async function SaveActiveSprint(activeSprint: ActiveSprint) {
  await AsyncStorage.setItem(activeSprintKey, JSON.stringify(activeSprint));
}

export async function GetActiveSprint() {
  const activeSprint = await AsyncStorage.getItem(activeSprintKey);

  if (!activeSprint) {
    return null;
  }

  return JSON.parse(activeSprint) as ActiveSprint;
}

export async function RemoveActiveSprint() {
  await AsyncStorage.removeItem(activeSprintKey);
}
