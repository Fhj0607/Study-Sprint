import { supabase } from '@/lib/supabase';

export type SetupStepKey = 'subject' | 'assignment' | 'task' | 'sprint';

export type SetupStatus = {
  subjectId: string | null;
  assignmentId: string | null;
  taskId: string | null;
  completedFocusSessions: number;
  currentStep: SetupStepKey;
  isSetupComplete: boolean;
};

export async function getSetupStatus(userId: string): Promise<SetupStatus> {
  const [subjectResult, assignmentResult, taskResult, focusSessionResult] = await Promise.all([
    supabase
      .from('subjects')
      .select('sId')
      .eq('uId', userId)
      .order('lastChanged', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('assignments')
      .select('aId')
      .eq('uId', userId)
      .order('lastChanged', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('tasks')
      .select('tId')
      .eq('uId', userId)
      .order('lastChanged', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('sprint_sessions')
      .select('sessionId', { count: 'exact', head: true })
      .eq('userId', userId)
      .eq('sessionType', 'focus')
      .eq('status', 'completed'),
  ]);

  if (subjectResult.error) {
    throw subjectResult.error;
  }

  if (assignmentResult.error) {
    throw assignmentResult.error;
  }

  if (taskResult.error) {
    throw taskResult.error;
  }

  if (focusSessionResult.error) {
    throw focusSessionResult.error;
  }

  const subjectId = subjectResult.data?.sId ?? null;
  const assignmentId = assignmentResult.data?.aId ?? null;
  const taskId = taskResult.data?.tId ?? null;
  const completedFocusSessions = focusSessionResult.count ?? 0;

  let currentStep: SetupStepKey = 'sprint';

  if (!subjectId) {
    currentStep = 'subject';
  } else if (!assignmentId) {
    currentStep = 'assignment';
  } else if (!taskId) {
    currentStep = 'task';
  }

  return {
    subjectId,
    assignmentId,
    taskId,
    completedFocusSessions,
    currentStep,
    isSetupComplete: taskId !== null && completedFocusSessions > 0,
  };
}
