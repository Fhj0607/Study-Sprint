import { GetActiveSession } from '@/lib/asyncStorage';
import { formatDateTime } from '@/lib/date';
import { CheckAssignmentCompletion } from '@/lib/progress';
import { DEFAULT_FOCUS_DURATION_MINUTES } from '@/lib/sessionDefaults';
import { finalizeStoredSession } from '@/lib/sessionLifecycle';
import { getSubjectColorSet, type SubjectColor } from '@/lib/subjectColors';
import { supabase } from '@/lib/supabase';
import type { Task } from '@/lib/types';
import { Session } from '@supabase/supabase-js';
import { router, Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';

function formatTrackedTime(totalSeconds: number) {
  if (totalSeconds <= 0) {
    return '0m';
  }

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  if (hours === 0) {
    return `${minutes}m`;
  }

  if (minutes === 0) {
    return `${hours}h`;
  }

  return `${hours}h ${minutes}m`;
}

export default function ViewDetailsTask() {
const { tId } = useLocalSearchParams<{ tId: string }>();

const [task, SetTask] = useState<Task | null>(null);
const [session, SetSession] = useState<Session | null>(null);
const [completedFocusSessions, setCompletedFocusSessions] = useState(0);
const [contextMeta, setContextMeta] = useState({
  subjectTitle: 'No Subject',
  assignmentTitle: 'No Assignment',
  subjectColor: 'slate' as SubjectColor,
});

useEffect(() => {
  supabase.auth.getSession().then(({ data }) => SetSession(data.session ?? null));

  const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
    SetSession(newSession);
  });

  return () => sub.subscription.unsubscribe();
}, []);

const loadTaskStudyActivity = useCallback(async (taskId: string, userId: string) => {
  const { count, error } = await supabase
    .from('sprint_sessions')
    .select('sessionId', { count: 'exact', head: true })
    .eq('taskId', taskId)
    .eq('userId', userId)
    .eq('sessionType', 'focus')
    .eq('status', 'completed');

  if (error) {
    setCompletedFocusSessions(0);
    return;
  }

  setCompletedFocusSessions(count ?? 0);
}, []);

const GetTask = useCallback(async (taskId: string) => {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('tId', taskId)
    .single();

  if (error || !data) {
    Alert.alert('Task could not be fetched, please try again');
    return;
  }

  SetTask(data);
  await loadTaskStudyActivity(taskId, data.uId);

  if (data.aId) {
    const { data: assignmentData, error: assignmentError } = await supabase
      .from('assignments')
      .select('title, sId')
      .eq('aId', data.aId)
      .single();

    if (assignmentError || !assignmentData) {
      setContextMeta({
        subjectTitle: 'Unknown Subject',
        assignmentTitle: 'Unknown Assignment',
        subjectColor: 'slate',
      });
      return;
    }

    if (assignmentData.sId) {
      const { data: subjectData, error: subjectError } = await supabase
        .from('subjects')
        .select('title, color')
        .eq('sId', assignmentData.sId)
        .single();

      if (subjectError || !subjectData) {
        setContextMeta({
          subjectTitle: 'Unknown Subject',
          assignmentTitle: assignmentData.title ?? 'Unknown Assignment',
          subjectColor: 'slate',
        });
        return;
      }

      setContextMeta({
        subjectTitle: subjectData.title ?? 'Unknown Subject',
        assignmentTitle: assignmentData.title ?? 'Unknown Assignment',
        subjectColor: (subjectData.color as SubjectColor | undefined) ?? 'slate',
      });
    }
  }
}, [loadTaskStudyActivity]);

useFocusEffect(
  useCallback(() => {
    if (session && tId) {
      GetTask(tId);
    }
  }, [GetTask, session, tId])
);

const handleSprintStart = async () => {
  const activeSession = await GetActiveSession();

  if (!activeSession) {
    router.push({
      pathname: '/task/timer',
      params: {
        tId: task?.tId,
        durationMinutes: String(DEFAULT_FOCUS_DURATION_MINUTES),
      },
    });
    return;
  }


  
  const secondsLeft = Math.ceil((activeSession.endTime - Date.now()) / 1000)

  if (secondsLeft <= 0) {
    await finalizeStoredSession('expired', activeSession);
    router.push({
      pathname: '/task/timer',
      params: {
        tId: task?.tId,
        durationMinutes: String(DEFAULT_FOCUS_DURATION_MINUTES),
      }
    });
    return;
    }
    

  if (activeSession.taskId === task?.tId) {
    router.push({
    pathname: '/task/timer',
    params: {
      tId: activeSession.taskId ?? undefined,
      durationMinutes: String(DEFAULT_FOCUS_DURATION_MINUTES),
    }});
    return;
    }

    Alert.alert(
      'Active session in progress', 
      `End the current session and start a new ${DEFAULT_FOCUS_DURATION_MINUTES} minute sprint on this task?`,
      [
        { text: 'Cancel', style: 'cancel',  },
        {
          text: 'Start new sprint',
          style: 'destructive',
          onPress: async () => {
            await finalizeStoredSession('cancelled', activeSession);
            router.push({
              pathname: '/task/timer',
              params: {
                tId: task?.tId,
                durationMinutes: String(DEFAULT_FOCUS_DURATION_MINUTES),
              },
            });
          },
        },
      ]
    );
  }


const DeleteTask = async (taskId: string) => {
  Alert.alert(
    'Delete Task',
    'Are you sure you want to delete this task?',
    [
      {
        text: 'Cancel',
        style: 'cancel',
      },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          const { error } = await supabase
            .from('tasks')
            .delete()
            .eq('tId', taskId);

          if (error) {
            Alert.alert('Task could not be deleted, please try again');
            return;
          }

          const aId = task?.aId;

          if (aId) {
            try {
              await CheckAssignmentCompletion(aId);
            } catch {
              Alert.alert('Failed to update assignment completion state');
            }
          }

          Alert.alert('Task deleted successfully!');
          router.back();
        },
      },
    ]
  );
};

const colorSet = getSubjectColorSet(contextMeta.subjectColor);

if (!task) {
  return (
    <View className="flex-1 bg-app-bg px-5 pt-6">
      <Stack.Screen
        options={{
          title: 'Task Details',
          headerRight: () => (
            <Pressable
              className="rounded-full bg-app-subtle px-4 py-2"
              onPress={async () => await supabase.auth.signOut()}
            >
              <Text className="text-sm font-semibold text-text-secondary">
                Logout
              </Text>
            </Pressable>
          ),
        }}
      />

      <View
        className="rounded-3xl bg-app-surface p-5"
        style={{
          borderWidth: 1,
          borderColor: colorSet.strong,
        }}
      >
        <Text className="text-2xl font-bold text-text-main">
          Task not found
        </Text>
        <Text className="mt-2 text-base text-text-secondary">
          The task could not be loaded.
        </Text>

        <Pressable
          className="mt-5 h-12 items-center justify-center rounded-2xl bg-accent"
          onPress={() => router.back()}
        >
          <Text className="text-base font-bold text-text-inverse">
            Go back
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const isOwner = session?.user.id === task.uId;

return (
  <View className="flex-1 bg-app-bg px-5 pt-6">
    <Stack.Screen
      options={{
        title: 'Task Details',
        headerTitleAlign: 'center',
        headerRight: () => (
          <Pressable
            className="rounded-full bg-app-subtle px-4 py-2"
            onPress={async () => await supabase.auth.signOut()}
          >
            <Text className="text-sm font-semibold text-text-secondary">
              Logout
            </Text>
          </Pressable>
        ),
      }}
    />

    <View
      className="rounded-3xl bg-app-surface p-5"
      style={{
        borderWidth: 1,
        borderColor: colorSet.strong,
      }}
    >
      <View className="flex-row items-start">
        <View
          className="mr-3 mt-1 h-6 w-6 items-center justify-center rounded-md border-2"
          style={{
            borderColor: task.isCompleted ? colorSet.strong : '#DDD6C8',
            backgroundColor: task.isCompleted ? colorSet.strong : '#EFEBE3',
          }}
        >
          {task.isCompleted && (
            <Text className="text-sm font-bold text-text-inverse">✓</Text>
          )}
        </View>

        <View className="flex-1">
          <Text
            className={`text-2xl font-bold ${
              task.isCompleted ? 'text-text-secondary' : 'text-text-main'
            }`}
          >
            {task.title}
          </Text>

          {task.description ? (
            <Text className="mt-3 text-base leading-6 text-text-secondary">
              {task.description}
            </Text>
          ) : (
            <Text className="mt-3 text-base text-text-muted">
              No description added.
            </Text>
          )}

          <View className="mt-4 flex-row flex-wrap">
            <View
              className="mr-2 mb-2 rounded-full px-3 py-1"
              style={{ backgroundColor: colorSet.soft }}
            >
              <Text
                className="text-xs font-semibold"
                style={{ color: colorSet.strong }}
              >
                {contextMeta.subjectTitle}
              </Text>
            </View>

            <View className="mr-2 mb-2 rounded-full bg-app-subtle px-3 py-1">
              <Text className="text-xs font-semibold text-text-secondary">
                {contextMeta.assignmentTitle}
              </Text>
            </View>

            <View className="mr-2 mb-2 rounded-full bg-app-subtle px-3 py-1">
              <Text className="text-xs font-semibold text-text-secondary">
                Status: {task.isCompleted ? 'Completed' : 'Not completed'}
              </Text>
            </View>
          </View>

          <View className="mt-5 rounded-2xl bg-app-subtle p-4">
            <Text className="text-sm font-semibold text-text-secondary">
              Study activity
            </Text>
            <Text className="mt-1 text-xs leading-5 text-text-muted">
              This tracks focused work on the task separately from whether the task is marked completed.
            </Text>

            <View className="mt-4 flex-row gap-3">
              <View className="flex-1 rounded-2xl bg-app-surface px-4 py-3">
                <Text className="text-xs font-semibold uppercase tracking-[0.6px] text-text-muted">
                  Focus time
                </Text>
                <Text className="mt-1 text-lg font-bold text-text-main">
                  {formatTrackedTime(task.totalTimeInSeconds ?? 0)}
                </Text>
              </View>

              <View className="flex-1 rounded-2xl bg-app-surface px-4 py-3">
                <Text className="text-xs font-semibold uppercase tracking-[0.6px] text-text-muted">
                  Completed sessions
                </Text>
                <Text className="mt-1 text-lg font-bold text-text-main">
                  {completedFocusSessions}
                </Text>
              </View>
            </View>
          </View>

          <Text className="mt-2 text-sm text-text-muted">
            Last changed: {formatDateTime(task.lastChanged)}
          </Text>
        </View>
      </View>

    {isOwner && (
      <View className="mt-5 border-t border-app-border pt-5">
        <Pressable
          className="h-14 items-center justify-center rounded-2xl bg-accent"
          onPress={() => handleSprintStart()}
        >
          <Text className="text-base font-bold text-text-inverse">
            Start Sprint
          </Text>
        </Pressable>

        <Text className="mt-3 text-sm text-text-muted">
          Starts a {DEFAULT_FOCUS_DURATION_MINUTES} minute focus sprint for this task.
        </Text>

        <View className="mt-4 flex-row">
        <Pressable
          className="mr-3 flex-1 items-center justify-center rounded-2xl border border-app-border bg-app-subtle py-3"
          onPress={() =>
            router.push({
              pathname: '/task/upsertTask',
              params: { tId: task.tId },
            })
          }
        >
          <Text className="text-sm font-bold text-text-secondary">
            Edit
          </Text>
        </Pressable>
        <Pressable
          className="flex-1 items-center justify-center rounded-2xl border border-app-border bg-app-surface py-3"
          onPress={() => DeleteTask(task.tId)}
        >
          <Text className="text-sm font-bold text-status-danger">
            Delete
          </Text>
        </Pressable>
        </View>
      </View>
    )}
    </View>
  </View>
  );
}
