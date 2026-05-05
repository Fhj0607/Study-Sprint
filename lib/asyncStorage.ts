import AsyncStorage from '@react-native-async-storage/async-storage';
import type { SessionType } from '@/lib/types';

const notificationKey = (aId: string) => `assignment_notification_${aId}`;
const setupSprintDemoKey = (userId: string) => `setup_sprint_demo_${userId}`;
const activeSprintKey = 'active_sprint';
const studyCycleKey = 'study_cycle';

export type ActiveSession = {
  sessionId: string;
  sessionType: SessionType;
  taskId: string | null;
  returnTaskId?: string | null;
  durationSeconds: number;
  endTime: number;
};

export type StudyCycle = {
  taskId: string;
  completedFocusSessions: number;
  lastCompletedSessionType: SessionType;
  lastCompletedAt: number;
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

export async function SaveStudyCycle(studyCycle: StudyCycle) {
  await AsyncStorage.setItem(studyCycleKey, JSON.stringify(studyCycle));
}

export async function GetStudyCycle() {
  const studyCycle = await AsyncStorage.getItem(studyCycleKey);

  if (!studyCycle) {
    return null;
  }

  return JSON.parse(studyCycle) as StudyCycle;
}

export async function RemoveStudyCycle() {
  await AsyncStorage.removeItem(studyCycleKey);
}

export async function GetSetupSprintDemoUsed(userId: string) {
  const value = await AsyncStorage.getItem(setupSprintDemoKey(userId));
  return value === 'true';
}

export async function SaveSetupSprintDemoUsed(userId: string) {
  await AsyncStorage.setItem(setupSprintDemoKey(userId), 'true');
}
