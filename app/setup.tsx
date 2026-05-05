import {
  GetActiveSession,
  GetSetupSprintDemoUsed,
  SaveSetupSprintDemoUsed,
  type ActiveSession,
} from '@/lib/asyncStorage';
import { DEFAULT_FOCUS_DURATION_MINUTES } from '@/lib/sessionDefaults';
import { getSetupStatus, type SetupStepKey } from '@/lib/setupStatus';
import { finalizeStoredSession } from '@/lib/sessionLifecycle';
import { supabase } from '@/lib/supabase';
import { Session } from '@supabase/supabase-js';
import { Redirect, Stack, router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

type SetupState = {
  subjectId: string | null;
  assignmentId: string | null;
  taskId: string | null;
  completedFocusSessions: number;
};

const SETUP_STEPS = [
  {
    key: 'subject',
    title: 'Create your first subject',
    description:
      'Start with one course or study area so the rest of the structure has a clear home.',
  },
  {
    key: 'assignment',
    title: 'Create your first assignment',
    description:
      'Add one project, exercise set, or exam-prep block inside that subject.',
  },
  {
    key: 'task',
    title: 'Create your first task',
    description:
      'Break the assignment into one concrete thing you can actually sit down and do.',
  },
  {
    key: 'sprint',
    title: 'Start your first sprint',
    description:
      'Begin one focused study session so the app immediately turns into action instead of setup.',
  },
] as const;

export default function SetupScreen() {
  const {
    subjectId: subjectIdParam,
    assignmentId: assignmentIdParam,
    taskId: taskIdParam,
  } = useLocalSearchParams<{
    subjectId?: string;
    assignmentId?: string;
    taskId?: string;
  }>();

  const [session, setSession] = useState<Session | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [setupState, setSetupState] = useState<SetupState>({
    subjectId: subjectIdParam ?? null,
    assignmentId: assignmentIdParam ?? null,
    taskId: taskIdParam ?? null,
    completedFocusSessions: 0,
  });
  const [activeSession, setActiveSession] = useState<ActiveSession | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session ?? null);
      setIsAuthLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setIsAuthLoading(false);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  const loadSetupState = useCallback(async () => {
    if (!session?.user.id) {
      setSetupState({
        subjectId: null,
        assignmentId: null,
        taskId: null,
        completedFocusSessions: 0,
      });
      setActiveSession(null);
      return;
    }

    const [storedActiveSession, status] = await Promise.all([
      GetActiveSession(),
      getSetupStatus(session.user.id),
    ]);

    if (storedActiveSession && storedActiveSession.endTime <= Date.now()) {
      await finalizeStoredSession('expired', storedActiveSession);
      setActiveSession(null);
    } else {
      setActiveSession(storedActiveSession);
    }

    setSetupState({
      subjectId: subjectIdParam ?? status.subjectId,
      assignmentId: assignmentIdParam ?? status.assignmentId,
      taskId: taskIdParam ?? status.taskId,
      completedFocusSessions: status.completedFocusSessions,
    });
  }, [assignmentIdParam, session?.user.id, subjectIdParam, taskIdParam]);

  useFocusEffect(
    useCallback(() => {
      void loadSetupState();
    }, [loadSetupState])
  );

  const currentStep: SetupStepKey = (() => {
    if (!setupState.subjectId) {
      return 'subject';
    }

    if (!setupState.assignmentId) {
      return 'assignment';
    }

    if (!setupState.taskId) {
      return 'task';
    }

    return 'sprint';
  })();

  const isSetupComplete =
    setupState.taskId !== null && setupState.completedFocusSessions > 0;

  const handlePrimaryAction = useCallback(async () => {
    if (isSetupComplete) {
      router.replace('/');
      return;
    }

    if (currentStep === 'subject') {
      router.push({
        pathname: '/subject/upsertSubject',
        params: { flow: 'setup' },
      });
      return;
    }

    if (currentStep === 'assignment' && setupState.subjectId) {
      router.push({
        pathname: '/assignment/upsertAssignment',
        params: {
          sId: setupState.subjectId,
          flow: 'setup',
        },
      });
      return;
    }

    if (currentStep === 'task' && setupState.assignmentId) {
      router.push({
        pathname: '/task/upsertTask',
        params: {
          aId: setupState.assignmentId,
          flow: 'setup',
        },
      });
      return;
    }

    if (!setupState.taskId) {
      return;
    }

    const freshActiveSession = await GetActiveSession();

    if (freshActiveSession && freshActiveSession.endTime > Date.now()) {
      router.push({
        pathname: '/task/timer',
        params: freshActiveSession.taskId
          ? { tId: freshActiveSession.taskId }
          : {
              sessionType: freshActiveSession.sessionType,
              durationMinutes: String(
                Math.max(1, Math.round(freshActiveSession.durationSeconds / 60))
              ),
            },
      });
      return;
    }

    if (freshActiveSession) {
      await finalizeStoredSession('expired', freshActiveSession);
      setActiveSession(null);
    }

    const shouldUseDemoSprint = session?.user.id
      ? !(await GetSetupSprintDemoUsed(session.user.id))
      : false;

    if (shouldUseDemoSprint && session?.user.id) {
      await SaveSetupSprintDemoUsed(session.user.id);
    }

    router.push({
      pathname: '/task/timer',
      params: shouldUseDemoSprint
        ? {
            tId: setupState.taskId,
            durationSeconds: '5',
            onboardingDemo: 'true',
          }
        : {
            tId: setupState.taskId,
            durationMinutes: String(DEFAULT_FOCUS_DURATION_MINUTES),
          },
    });
  }, [currentStep, isSetupComplete, session?.user.id, setupState]);

  const primaryLabel = isSetupComplete
    ? 'Go to dashboard'
    : currentStep === 'subject'
      ? 'Create first subject'
      : currentStep === 'assignment'
        ? 'Create first assignment'
        : currentStep === 'task'
          ? 'Create first task'
          : activeSession
            ? 'Open active sprint'
            : 'Start first sprint';

  if (isAuthLoading) {
    return null;
  }

  if (!session) {
    return <Redirect href="/login" />;
  }

  return (
    <View className="flex-1 bg-app-bg">
      <Stack.Screen
        options={{
          title: 'Guided Setup',
          headerTitleAlign: 'center',
        }}
      />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: 20,
          paddingBottom: 32,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View className="rounded-3xl border border-app-border bg-app-surface p-5">
          <Text className="text-xs font-bold uppercase tracking-[0.8px] text-text-muted">
            First-time setup
          </Text>
          <Text className="mt-2 text-3xl font-bold text-text-main">
            Build one simple study path
          </Text>
          <Text className="mt-3 text-base leading-6 text-text-secondary">
            You only need one subject, one assignment, one task, and one sprint to
            make the app useful.
          </Text>
        </View>

        <View className="mt-6 gap-3">
          {SETUP_STEPS.map((step, index) => {
            const isDone =
              step.key === 'subject'
                ? Boolean(setupState.subjectId)
                : step.key === 'assignment'
                  ? Boolean(setupState.assignmentId)
                  : step.key === 'task'
                    ? Boolean(setupState.taskId)
                    : isSetupComplete;
            const isCurrent = !isDone && currentStep === step.key;

            return (
              <View
                key={step.key}
                className={`rounded-3xl border p-4 ${
                  isCurrent
                    ? 'border-accent bg-accent-soft'
                    : 'border-app-border bg-app-surface'
                }`}
              >
                <View className="flex-row items-start">
                  <View
                    className={`mr-3 h-8 w-8 items-center justify-center rounded-full ${
                      isDone ? 'bg-accent' : isCurrent ? 'bg-text-main' : 'bg-app-subtle'
                    }`}
                  >
                    <Text
                      className={`text-sm font-bold ${
                        isDone || isCurrent ? 'text-text-inverse' : 'text-text-secondary'
                      }`}
                    >
                      {isDone ? '✓' : index + 1}
                    </Text>
                  </View>

                  <View className="flex-1">
                    <Text className="text-lg font-bold text-text-main">
                      {step.title}
                    </Text>
                    <Text className="mt-1 text-sm leading-5 text-text-secondary">
                      {step.description}
                    </Text>
                  </View>
                </View>
              </View>
            );
          })}
        </View>

        <View className="mt-6 rounded-3xl border border-app-border bg-app-surface p-5">
          <Text className="text-sm font-semibold text-text-secondary">
            {isSetupComplete
              ? 'You have already completed at least one focus sprint.'
              : currentStep === 'sprint'
                ? 'The structure is ready. The next step is to actually begin a sprint.'
                : 'Follow the next step below. The rest of the app will make more sense once that path exists.'}
          </Text>

          <Pressable
            className="mt-5 h-14 items-center justify-center rounded-2xl bg-accent"
            onPress={handlePrimaryAction}
          >
            <Text className="text-base font-bold text-text-inverse">
              {primaryLabel}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}
