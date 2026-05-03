import type { SubjectColor } from '@/lib/subjectColors';

export type SessionType = 'focus' | 'short_break' | 'long_break';

export type Task = {
  tId: string;
  title: string;
  description: string;
  isCompleted: boolean;
  lastChanged: string;
  uId: string;
  aId: string;
  totalTimeInSeconds: number;
};

export type Assignment = {
  aId: string;
  title: string;
  description: string;
  deadline: string;
  isCompleted: boolean;
  lastChanged: string;
  uId: string;
  sId: string;
};

export type Subject = {
  sId: string;
  title: string;
  description: string;
  isActive: boolean;
  lastChanged: string;
  uId: string;
  color?: SubjectColor;
};
