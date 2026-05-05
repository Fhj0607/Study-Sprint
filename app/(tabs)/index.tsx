import {
  GetActiveSession,
  type ActiveSession,
} from '@/lib/asyncStorage';
import type { SessionType } from '@/lib/types';
import { formatDate, formatDateTime } from '@/lib/date';
import { RegisterForLocalNotificationsAsync } from '@/lib/notifications';
import { CheckAssignmentCompletion } from '@/lib/progress';
import { DEFAULT_FOCUS_DURATION_MINUTES } from '@/lib/sessionDefaults';
import { finalizeStoredSession } from '@/lib/sessionLifecycle';
import { supabase } from "@/lib/supabase";
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Session } from '@supabase/supabase-js';
import { router, Stack, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";

type UpcomingDeadlineTask = {
  tId: string;
  title: string;
  description: string;
  aId: string;
  subjectTitle: string;
  assignmentTitle: string;
  deadline: string;
};

type DashboardProgressSummary = {
  completedFocusSessionsToday: number;
  minutesStudiedToday: number;
  minutesStudiedThisWeek: number;
};

type RecentSession = {
  sessionId: string;
  taskTitle: string | null;
  sessionType: SessionType;
  elapsedSeconds: number;
  status: string;
  startedAt: string | null;
  endedAt: string | null;
};

type RecentlyCompletedTask = {
  tId: string;
  title: string;
  assignmentTitle: string;
  lastChanged: string;
};

const FLOW_STEPS = [
  {
    label: '1',
    title: 'Subject',
    description: 'A subject is the top-level container for one course or area you are studying.',
  },
  {
    label: '2',
    title: 'Assignment',
    description: 'Each subject contains assignments like projects, exercises, or exam prep blocks.',
  },
  {
    label: '3',
    title: 'Task',
    description: 'Assignments are broken down into tasks so you always have one concrete thing to work on.',
  },
  {
    label: '4',
    title: 'Sprint',
    description: 'A sprint is one focused work session tied to a single task. After it ends, you can take a break, continue the same task, or return to the dashboard.',
  },
] as const;

function formatTime(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

function getSessionLabel(sessionType: SessionType) {
  switch (sessionType) {
    case 'short_break':
      return 'Short Break';
    case 'long_break':
      return 'Long Break';
    default:
      return 'Active Sprint';
  }
}

function formatTrackedMinutes(totalSeconds: number) {
  return Math.floor(totalSeconds / 60);
}

function formatTrackedDuration(totalSeconds: number) {
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

function getSessionStatusLabel(status: string) {
  switch (status) {
    case 'completed':
      return 'Completed';
    case 'cancelled':
      return 'Cancelled';
    case 'expired':
      return 'Timed out';
    default:
      return status;
  }
}

function getStartOfToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function getStartOfWeek() {
  const today = getStartOfToday();
  const currentDay = today.getDay();
  const daysSinceMonday = (currentDay + 6) % 7;

  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - daysSinceMonday);
  return startOfWeek;
}

export default function HomeScreen() {
  const [session, SetSession] = useState<Session | null>(null);
  const [activeSprint, setActiveSprint] = useState<ActiveSession | null>(null);
  const [activeSprintTaskTitle, setActiveSprintTaskTitle] = useState<string | null>(null);
  const [activeSprintTaskDesc, setActiveSprintTaskDesc] = useState<string | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [dashboardSummary, setDashboardSummary] = useState<DashboardProgressSummary>({
    completedFocusSessionsToday: 0,
    minutesStudiedToday: 0,
    minutesStudiedThisWeek: 0,
  });
  const [recentSessions, setRecentSessions] = useState<RecentSession[]>([]);
  const [recentlyCompletedTasks, setRecentlyCompletedTasks] = useState<RecentlyCompletedTask[]>([]);
  const [upcomingDeadlineTasks, setUpcomingDeadlineTasks] = useState<UpcomingDeadlineTask[]>([]);
  const [isFlowInfoVisible, setIsFlowInfoVisible] = useState(false);
  const [completingTaskId, setCompletingTaskId] = useState<string | null>(null);
  const [subjectCount, setSubjectCount] = useState(0);

  const loadActiveSprint = useCallback(async () => {
    const storedSprint = await GetActiveSession();

    if (!storedSprint) {
      setActiveSprint(null);
      setActiveSprintTaskTitle(null);
      setActiveSprintTaskDesc(null);
      setRemainingSeconds(0);
      return;
    }

    const secondsLeft = Math.max(
      0,
      Math.ceil((storedSprint.endTime - Date.now()) / 1000)
    );

    if (secondsLeft <= 0) {
      await finalizeStoredSession('expired', storedSprint);
      setActiveSprint(null);
      setActiveSprintTaskTitle(null);
      setActiveSprintTaskDesc(null);
      setRemainingSeconds(0);
      return;
    }

    setActiveSprint(storedSprint);
    setRemainingSeconds(secondsLeft);

    if (!storedSprint.taskId) {
      setActiveSprintTaskTitle(getSessionLabel(storedSprint.sessionType));
      setActiveSprintTaskDesc('Take the break before you jump into the next focus session.');
      return;
    }

    const { data: dbTitle } = await supabase
      .from('tasks')
      .select('title')
      .eq('tId', storedSprint.taskId)
      .single();

      const { data: dbDesc } = await supabase
      .from('tasks')
      .select('description')
      .eq('tId', storedSprint.taskId)
      .single();

    setActiveSprintTaskTitle(dbTitle?.title ?? null);
    setActiveSprintTaskDesc(dbDesc?.description);
  }, []);

  const loadUpcomingDeadlineTasks = useCallback(async () => {
    if (!session?.user.id) {
      setUpcomingDeadlineTasks([]);
      return;
    }

    const { data: tasksData, error: tasksError } = await supabase
      .from('tasks')
      .select('tId, title, description, aId')
      .eq('uId', session.user.id)
      .eq('isCompleted', false);

    if (tasksError || !tasksData || tasksData.length === 0) {
      setUpcomingDeadlineTasks([]);
      return;
    }

    const assignmentIds = [...new Set(tasksData.map((task) => task.aId).filter(Boolean))];

    if (assignmentIds.length === 0) {
      setUpcomingDeadlineTasks([]);
      return;
    }

    const { data: assignmentsData, error: assignmentsError } = await supabase
      .from('assignments')
      .select('aId, sId, title, deadline')
      .in('aId', assignmentIds)
      .eq('isCompleted', false);

    if (assignmentsError || !assignmentsData) {
      setUpcomingDeadlineTasks([]);
      return;
    }

    const subjectIds = [...new Set(assignmentsData.map((assignment) => assignment.sId).filter(Boolean))];

    const { data: subjectsData, error: subjectsError } = await supabase
      .from('subjects')
      .select('sId, title')
      .in('sId', subjectIds);

    if (subjectsError || !subjectsData) {
      setUpcomingDeadlineTasks([]);
      return;
    }

    const now = Date.now();
    const assignmentsById = new Map(
      assignmentsData.map((assignment) => [assignment.aId, assignment])
    );
    const subjectsById = new Map(
      subjectsData.map((subject) => [subject.sId, subject])
    );

    const enrichedTasks = tasksData
      .map((task) => {
        const assignment = assignmentsById.get(task.aId);

        if (!assignment?.deadline) {
          return null;
        }

        const deadlineTime = new Date(assignment.deadline).getTime();

        if (Number.isNaN(deadlineTime) || deadlineTime < now) {
          return null;
        }

        const subject = subjectsById.get(assignment.sId);

        return {
          tId: task.tId,
          title: task.title,
          description: task.description,
          aId: task.aId,
          subjectTitle: subject?.title ?? 'Unknown Subject',
          assignmentTitle: assignment.title,
          deadline: assignment.deadline,
        } satisfies UpcomingDeadlineTask;
      })
      .filter((task): task is UpcomingDeadlineTask => task !== null)
      .sort(
        (left, right) =>
          new Date(left.deadline).getTime() - new Date(right.deadline).getTime()
      );

    setUpcomingDeadlineTasks(enrichedTasks);
  }, [session?.user.id]);

  const loadDashboardProgress = useCallback(async () => {
    if (!session?.user.id) {
      setDashboardSummary({
        completedFocusSessionsToday: 0,
        minutesStudiedToday: 0,
        minutesStudiedThisWeek: 0,
      });
      setRecentSessions([]);
      setRecentlyCompletedTasks([]);
      return;
    }

    const startOfToday = getStartOfToday().toISOString();
    const startOfWeek = getStartOfWeek().toISOString();

    const [
      { data: weeklySessions, error: weeklySessionsError },
      { data: rawRecentSessions, error: recentSessionsError },
      { data: completedTasks, error: completedTasksError },
      { count: fetchedSubjectCount, error: subjectCountError },
    ] = await Promise.all([
      supabase
        .from('sprint_sessions')
        .select('sessionId, sessionType, elapsedSeconds, status, startedAt, endedAt')
        .eq('userId', session.user.id)
        .eq('sessionType', 'focus')
        .not('endedAt', 'is', null)
        .gte('endedAt', startOfWeek),
      supabase
        .from('sprint_sessions')
        .select('sessionId, taskId, sessionType, elapsedSeconds, status, startedAt, endedAt')
        .eq('userId', session.user.id)
        .not('endedAt', 'is', null)
        .order('endedAt', { ascending: false })
        .limit(6),
      supabase
        .from('tasks')
        .select('tId, title, aId, lastChanged')
        .eq('uId', session.user.id)
        .eq('isCompleted', true)
        .order('lastChanged', { ascending: false })
        .limit(3),
      supabase
        .from('subjects')
        .select('sId', { count: 'exact', head: true })
        .eq('uId', session.user.id),
    ]);

    if (weeklySessionsError || recentSessionsError || completedTasksError || subjectCountError) {
      setDashboardSummary({
        completedFocusSessionsToday: 0,
        minutesStudiedToday: 0,
        minutesStudiedThisWeek: 0,
      });
      setRecentSessions([]);
      setRecentlyCompletedTasks([]);
      setSubjectCount(0);
      return;
    }

    setSubjectCount(fetchedSubjectCount ?? 0);

    const weeklySessionRows = weeklySessions ?? [];
    const todaySummary = weeklySessionRows.reduce(
      (summary, currentSession) => {
        const endedAt = currentSession.endedAt ? new Date(currentSession.endedAt) : null;

        if (!endedAt || Number.isNaN(endedAt.getTime())) {
          return summary;
        }

        const elapsedSeconds = currentSession.elapsedSeconds ?? 0;

        summary.minutesStudiedThisWeek += formatTrackedMinutes(elapsedSeconds);

        if (endedAt >= new Date(startOfToday)) {
          summary.minutesStudiedToday += formatTrackedMinutes(elapsedSeconds);

          if (currentSession.status === 'completed') {
            summary.completedFocusSessionsToday += 1;
          }
        }

        return summary;
      },
      {
        completedFocusSessionsToday: 0,
        minutesStudiedToday: 0,
        minutesStudiedThisWeek: 0,
      } satisfies DashboardProgressSummary
    );

    setDashboardSummary(todaySummary);

    const recentSessionRows = rawRecentSessions ?? [];
    const recentTaskIds = [
      ...new Set(
        recentSessionRows
          .map((recentSession) => recentSession.taskId)
          .filter((taskId): taskId is string => Boolean(taskId))
      ),
    ];

    const completedTaskRows = completedTasks ?? [];
    const completedAssignmentIds = [
      ...new Set(
        completedTaskRows
          .map((task) => task.aId)
          .filter((assignmentId): assignmentId is string => Boolean(assignmentId))
      ),
    ];

    const [{ data: recentTasks }, { data: completedAssignments }] = await Promise.all([
      recentTaskIds.length > 0
        ? supabase
            .from('tasks')
            .select('tId, title')
            .in('tId', recentTaskIds)
        : Promise.resolve({ data: [], error: null }),
      completedAssignmentIds.length > 0
        ? supabase
            .from('assignments')
            .select('aId, title')
            .in('aId', completedAssignmentIds)
        : Promise.resolve({ data: [], error: null }),
    ]);

    const tasksById = new Map((recentTasks ?? []).map((task) => [task.tId, task.title]));
    const assignmentsById = new Map(
      (completedAssignments ?? []).map((assignment) => [assignment.aId, assignment.title])
    );

    setRecentSessions(
      recentSessionRows.map((recentSession) => ({
        sessionId: recentSession.sessionId,
        taskTitle: recentSession.taskId ? (tasksById.get(recentSession.taskId) ?? null) : null,
        sessionType: recentSession.sessionType,
        elapsedSeconds: recentSession.elapsedSeconds ?? 0,
        status: recentSession.status,
        startedAt: recentSession.startedAt,
        endedAt: recentSession.endedAt,
      }))
    );

    setRecentlyCompletedTasks(
      completedTaskRows.map((task) => ({
        tId: task.tId,
        title: task.title,
        assignmentTitle: assignmentsById.get(task.aId) ?? 'Unknown Assignment',
        lastChanged: task.lastChanged,
      }))
    );
  }, [session?.user.id]);

  useEffect(() => {
    supabase.auth
      .getSession()
      .then(({ data }) => SetSession(data.session ?? null));

    const { data: sub } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        SetSession(newSession);
      }
    );

    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session) {
      RegisterForLocalNotificationsAsync();
    }
  }, [session]);

  useFocusEffect(
    useCallback(() => {
      void loadActiveSprint();
      void loadDashboardProgress();
      void loadUpcomingDeadlineTasks();
    }, [loadActiveSprint, loadDashboardProgress, loadUpcomingDeadlineTasks])
  );

  useEffect(() => {
    if (!activeSprint) {
      return;
    }

    const intervalId = setInterval(() => {
      const secondsLeft = Math.max(
        0,
        Math.ceil((activeSprint.endTime - Date.now()) / 1000)
      );

      setRemainingSeconds(secondsLeft);

      if (secondsLeft <= 0) {
        void finalizeStoredSession('expired', activeSprint);
        setActiveSprint(null);
        setActiveSprintTaskTitle(null);
        setActiveSprintTaskDesc(null);
      }
    }, 1000);

    return () => clearInterval(intervalId);
  }, [activeSprint]);

  const handleTaskCompletion = useCallback(async (task: UpcomingDeadlineTask) => {
    if (completingTaskId) {
      return;
    }

    setCompletingTaskId(task.tId);

    const { error } = await supabase
      .from('tasks')
      .update({
        isCompleted: true,
        lastChanged: new Date().toISOString(),
      })
      .eq('tId', task.tId);

    if (error) {
      setCompletingTaskId(null);
      Alert.alert('Task could not be completed, please try again');
      return;
    }

    try {
      await CheckAssignmentCompletion(task.aId);
    } catch {
      setCompletingTaskId(null);
      Alert.alert('Task was updated, but assignment progress could not be refreshed');
      return;
    }

    setUpcomingDeadlineTasks((currentTasks) =>
      currentTasks.filter((currentTask) => currentTask.tId !== task.tId)
    );
    setCompletingTaskId(null);
  }, [completingTaskId]);

  const handleStartSprint = useCallback(async (task: UpcomingDeadlineTask) => {
    const storedSession = await GetActiveSession();

    if (!storedSession) {
      router.push({
        pathname: '/task/timer',
        params: {
          tId: task.tId,
          durationMinutes: String(DEFAULT_FOCUS_DURATION_MINUTES),
        },
      });
      return;
    }

    const secondsLeft = Math.ceil((storedSession.endTime - Date.now()) / 1000);

    if (secondsLeft <= 0) {
      await finalizeStoredSession('expired', storedSession);
      router.push({
        pathname: '/task/timer',
        params: {
          tId: task.tId,
          durationMinutes: String(DEFAULT_FOCUS_DURATION_MINUTES),
        },
      });
      return;
    }

    if (storedSession.taskId === task.tId) {
      router.push({
        pathname: '/task/timer',
        params: {
          tId: task.tId,
          durationMinutes: String(DEFAULT_FOCUS_DURATION_MINUTES),
        },
      });
      return;
    }

    Alert.alert(
      'Active session in progress',
      `End the current session and start a new ${DEFAULT_FOCUS_DURATION_MINUTES} minute sprint on "${task.title}"?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Start sprint',
          style: 'destructive',
          onPress: async () => {
            await finalizeStoredSession('cancelled', storedSession);
            router.push({
              pathname: '/task/timer',
              params: {
                tId: task.tId,
                durationMinutes: String(DEFAULT_FOCUS_DURATION_MINUTES),
              },
            });
          },
        },
      ]
    );
  }, []);

  return (
    <View className="flex-1 bg-app-bg">
      <Stack.Screen
        options={{
          title: 'Dashboard',
          headerTitleAlign: 'center',
          headerLeft: () => {
            return (
              <View className="ml-3">
                <Pressable
                  className="h-10.5 w-11 items-center justify-center rounded-full"
                  onPress={() => setIsFlowInfoVisible(true)}
                >
                  <MaterialIcons name="help" size={36} color="#52606D" />
                </Pressable>
              </View>
            )
          },
          headerRight: () => {
            return (
              <View className="mr-3">
                <Pressable
                  className="rounded-full bg-app-subtle px-4 py-2"
                  onPress={async () => await supabase.auth.signOut()}
                >
                  <Text className="text-sm font-semibold text-text-secondary">
                    Logout
                  </Text>
                </Pressable>
              </View>
            )
          },
        }}
      />

      <ScrollView
        className="m-1 flex-1"
        contentContainerStyle={{ padding: 24, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        <Modal
          animationType="fade"
          transparent
          visible={isFlowInfoVisible}
          onRequestClose={() => setIsFlowInfoVisible(false)}
        >
          <View className="flex-1 justify-center bg-[rgba(15,23,42,0.42)] px-5">
            <Pressable
              className="absolute inset-0"
              onPress={() => setIsFlowInfoVisible(false)}
            />

            <View className="max-h-[80%] gap-4 rounded-[28px] bg-[#FCFDFE] p-5 shadow-lg">
              <View className="flex-row items-start justify-between gap-3">
                <View>
                  <Text className="text-xs font-bold uppercase tracking-[0.8px] text-[#7B8794]">
                    How work is organized
                  </Text>
                  <Text className="mt-1 text-[28px] font-extrabold text-[#1F2933]">
                    Study flow
                  </Text>
                </View>

                <Pressable
                  className="h-9 w-9 items-center justify-center rounded-full bg-[#EFF3F8]"
                  onPress={() => setIsFlowInfoVisible(false)}
                >
                  <MaterialIcons name="close" size={18} color="#52606D" />
                </Pressable>
              </View>

              <Text className="text-[15px] leading-[22px] text-[#52606D]">
                Build your work from the big container down to one concrete task, then use sprints and breaks to move that work forward.
              </Text>

              <ScrollView
                className="max-h-80"
                contentContainerStyle={{ gap: 4 }}
                showsVerticalScrollIndicator={false}
              >
                {FLOW_STEPS.map((step, index) => (
                  <View key={step.title} className="flex-row gap-[14px]">
                    <View className="items-center">
                      <View className="h-8 w-8 items-center justify-center rounded-full bg-[#323F4E]">
                        <Text className="text-[13px] font-extrabold text-white">{step.label}</Text>
                      </View>
                      {index < FLOW_STEPS.length - 1 ? (
                        <View className="my-[6px] min-h-7 w-[2px] flex-1 bg-[#D5D9DF]" />
                      ) : null}
                    </View>

                    <View className="flex-1 pb-[18px]">
                      <Text className="text-lg font-bold text-[#1F2933]">{step.title}</Text>
                      <Text className="mt-1 text-sm leading-[21px] text-[#52606D]">
                        {step.description}
                      </Text>
                    </View>
                  </View>
                ))}
              </ScrollView>

              <View className="rounded-[18px] bg-[#F1F5F9] px-4 py-[14px]">
                <Text className="text-xs font-bold uppercase tracking-[0.8px] text-[#7B8794]">
                  Quick map
                </Text>
                <Text className="mt-[6px] text-base font-bold text-[#1F2933]">
                  {'Subject -> Assignment -> Task -> Sprint'}
                </Text>
                <Text className="mt-2 text-sm leading-[20px] text-[#52606D]">
                  The dashboard then helps you resume an active session, start the next sprint, or review recent study progress.
                </Text>
              </View>

              <Pressable
                className="min-h-12 items-center justify-center rounded-2xl bg-[#323F4E] px-4"
                onPress={() => {
                  setIsFlowInfoVisible(false);
                  router.push('/subjects');
                }}
              >
                <Text className="text-[15px] font-bold text-white">Open Subjects</Text>
              </Pressable>
            </View>
          </View>
        </Modal>

        {subjectCount === 0 ? (
          <View className="mb-6 rounded-3xl border border-app-border bg-app-surface p-5">
            <Text className="text-xs font-bold uppercase tracking-[0.8px] text-text-muted">
              First step
            </Text>
            <Text className="mt-2 text-2xl font-bold text-text-main">
              Build your first study path
            </Text>
            <Text className="mt-2 text-sm leading-5 text-text-secondary">
              Start with one subject, then add one assignment and one task so you
              can reach your first sprint without guessing what to do next.
            </Text>

            <Pressable
              className="mt-5 h-14 items-center justify-center rounded-2xl bg-accent"
              onPress={() => router.push('/setup')}
            >
              <Text className="text-base font-bold text-text-inverse">
                Start Guided Setup
              </Text>
            </Pressable>
          </View>
        ) : null}

        {activeSprint ? (
          <View className="gap-2 rounded-2xl border border-[#D5D9DF] bg-[#F7F9FC] p-4">
            <Text className="text-[13px] font-semibold text-[#5D6B7A]">
              {getSessionLabel(activeSprint.sessionType)}
            </Text>
            <Text className="text-[20px] font-bold text-[#1F2933]">
              {activeSprintTaskTitle ?? 'Selected task'}
            </Text>
            <Text className="text-sm font-medium text-[#38414b]">
              {' '}
              {activeSprintTaskDesc ?? null}
              {' '}
            </Text>
            <Text className="text-[15px] text-[#52606D]">
              {formatTime(remainingSeconds)} remaining
            </Text>

            <Pressable
              className="mt-2 min-h-11 items-center justify-center rounded-xl bg-[#323F4E] px-4"
              onPress={() =>
                router.push({
                  pathname: '/task/timer',
                  params: activeSprint.taskId
                    ? { tId: activeSprint.taskId }
                    : {
                        sessionType: activeSprint.sessionType,
                        durationMinutes: String(Math.max(1, Math.round(activeSprint.durationSeconds / 60))),
                      },
                })
              }
            >
              <Text className="text-[15px] font-bold text-white">
                {activeSprint.sessionType === 'focus' ? 'Resume Sprint' : 'Resume Break'}
              </Text>
            </Pressable>
          </View>
        ) : (
          <Text className="mx-1 my-1 text-left text-base font-normal">
            No active sprint right now.
          </Text>
        )}

        <View className="mt-6 gap-3">
          <Text className="text-lg font-bold text-[#1F2933]">
            Study progress
          </Text>
          <Text className="text-sm leading-[20px] text-[#6B7580]">
            A quick view of today&apos;s and this week&apos;s focused study effort.
          </Text>

          <View className="flex-row gap-3">
            <View className="flex-1 rounded-2xl border border-[#D5D9DF] bg-white p-4">
              <Text className="text-[12px] font-semibold uppercase tracking-[0.6px] text-[#7B8794]">
                Focus sessions today
              </Text>
              <Text className="mt-2 text-[24px] font-extrabold text-[#1F2933]">
                {dashboardSummary.completedFocusSessionsToday}
              </Text>
            </View>

            <View className="flex-1 rounded-2xl border border-[#D5D9DF] bg-white p-4">
              <Text className="text-[12px] font-semibold uppercase tracking-[0.6px] text-[#7B8794]">
                Minutes today
              </Text>
              <Text className="mt-2 text-[24px] font-extrabold text-[#1F2933]">
                {dashboardSummary.minutesStudiedToday}
              </Text>
            </View>
          </View>

          <View className="rounded-2xl border border-[#D5D9DF] bg-[#F7F9FC] p-4">
            <Text className="text-[12px] font-semibold uppercase tracking-[0.6px] text-[#7B8794]">
              Minutes this week
            </Text>
            <Text className="mt-2 text-[24px] font-extrabold text-[#1F2933]">
              {dashboardSummary.minutesStudiedThisWeek}
            </Text>
          </View>
        </View>

        <View className="mt-6 gap-3">
          <Text className="text-lg font-bold text-[#1F2933]">
            Tasks with upcoming deadlines
          </Text>
          <Text className="text-sm leading-[20px] text-[#6B7580]">
            The next concrete work items that are most likely to matter soon.
          </Text>

          {upcomingDeadlineTasks.length > 0 ? (
            upcomingDeadlineTasks.map((task) => (
              <Pressable
                key={task.tId}
                className="gap-[6px] rounded-2xl border border-[#D5D9DF] bg-white p-4"
                onPress={() =>
                  router.push({
                    pathname: '/task/viewDetailsTask',
                    params: { tId: task.tId },
                  })
                }
              >
                <Text className="text-base font-bold text-[#1F2933]">{task.title}</Text>
                {task.description ? (
                  <Text className="text-sm text-[#52606D]" numberOfLines={2}>
                    {task.description}
                  </Text>
                ) : null}
                <Text className="text-[13px] font-semibold text-[#7B8794]">
                  {task.subjectTitle} • {task.assignmentTitle} • {formatDate(task.deadline)}
                </Text>

                <Pressable
                  className="mt-2 min-h-10 items-center justify-center rounded-xl bg-[#DCE8F7] px-4"
                  onPress={(event) => {
                    event.stopPropagation();
                    void handleStartSprint(task);
                  }}
                >
                  <Text className="text-sm font-bold text-[#1F2933]">
                    Start Sprint
                  </Text>
                </Pressable>

                <Pressable
                  className={`mt-2 min-h-10 items-center justify-center rounded-xl px-4 ${
                    completingTaskId === task.tId ? 'bg-[#9AA5B1]' : 'bg-[#323F4E]'
                  }`}
                  disabled={completingTaskId !== null}
                  onPress={(event) => {
                    event.stopPropagation();
                    Alert.alert(
                      'Complete task',
                      'Mark this task as completed?',
                      [
                        {
                          text: 'Cancel',
                          style: 'cancel',
                        },
                        {
                          text: 'Complete',
                          onPress: () => {
                            void handleTaskCompletion(task);
                          },
                        },
                      ]
                    );
                  }}
                >
                  <Text className="text-sm font-bold text-white">
                    {completingTaskId === task.tId ? 'Completing...' : 'Mark as completed'}
                  </Text>
                </Pressable>
              </Pressable>
            ))
          ) : (
            <Text className="text-sm text-[#7B8794]">No upcoming task deadlines.</Text>
          )}
        </View>

        <View className="mt-6 gap-6 md:flex-row">
          <View className="gap-3 md:flex-1">
            <Text className="text-lg font-bold text-[#1F2933]">
              Recent sessions
            </Text>
            <Text className="text-sm leading-[20px] text-[#6B7580]">
              The latest recorded sprints and breaks.
            </Text>

            {recentSessions.length > 0 ? (
              recentSessions.map((recentSession) => (
                <View
                  key={recentSession.sessionId}
                  className="gap-[6px] rounded-2xl border border-[#D5D9DF] bg-white p-4"
                >
                  <View className="flex-row items-start justify-between gap-3">
                    <View className="flex-1">
                      <Text className="text-base font-bold text-[#1F2933]">
                        {recentSession.taskTitle ?? getSessionLabel(recentSession.sessionType)}
                      </Text>
                      <Text className="mt-1 text-sm text-[#52606D]">
                        {getSessionLabel(recentSession.sessionType)} • {formatTrackedDuration(recentSession.elapsedSeconds)}
                      </Text>
                    </View>

                    <View className="rounded-full bg-[#EFF3F8] px-3 py-[6px]">
                      <Text className="text-[12px] font-bold text-[#52606D]">
                        {getSessionStatusLabel(recentSession.status)}
                      </Text>
                    </View>
                  </View>

                  <Text className="text-[13px] font-semibold text-[#7B8794]">
                    {formatDateTime(recentSession.endedAt ?? recentSession.startedAt)}
                  </Text>
                </View>
              ))
            ) : (
              <Text className="text-sm text-[#7B8794]">No recent sessions yet.</Text>
            )}
          </View>

          <View className="gap-3 md:flex-1">
            <Text className="text-lg font-bold text-[#1F2933]">
              Recently completed tasks
            </Text>
            <Text className="text-sm leading-[20px] text-[#6B7580]">
              Tasks you have recently finished and moved out of the queue.
            </Text>

            {recentlyCompletedTasks.length > 0 ? (
              recentlyCompletedTasks.map((task) => (
                <Pressable
                  key={task.tId}
                  className="gap-[6px] rounded-2xl border border-[#D5D9DF] bg-white p-4"
                  onPress={() =>
                    router.push({
                      pathname: '/task/viewDetailsTask',
                      params: { tId: task.tId },
                    })
                  }
                >
                  <Text className="text-base font-bold text-[#1F2933]">{task.title}</Text>
                  <Text className="text-sm text-[#52606D]">{task.assignmentTitle}</Text>
                  <Text className="text-[13px] font-semibold text-[#7B8794]">
                    Completed {formatDateTime(task.lastChanged)}
                  </Text>
                </Pressable>
              ))
            ) : (
              <Text className="text-sm text-[#7B8794]">No completed tasks yet.</Text>
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
