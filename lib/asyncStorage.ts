import AsyncStorage from '@react-native-async-storage/async-storage';
import type { SessionType } from '@/lib/types';

const notificationKey = (aId: string) => `assignment_notification_${aId}`;
const activeSprintKey = 'active_sprint';

export type ActiveSession = {
  sessionId: string;
  sessionType: SessionType;
  taskId: string | null;
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

export async function SaveActiveSession(activeSession: ActiveSession) {
  await AsyncStorage.setItem(activeSprintKey, JSON.stringify(activeSession));
}

export async function GetActiveSession() {
  const activeSession = await AsyncStorage.getItem(activeSprintKey);

  if (!activeSession) {
    return null;
  }

  return JSON.parse(activeSession) as ActiveSession;
}

export async function RemoveActiveSession() {
  await AsyncStorage.removeItem(activeSprintKey);
}
