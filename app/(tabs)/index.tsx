import {
  GetActiveSprint,
  RemoveActiveSprint,
  type ActiveSprint,
} from '@/lib/asyncStorage';
import { formatDate } from '@/lib/date';
import { RegisterForLocalNotificationsAsync } from '@/lib/notifications';
import { CheckAssignmentCompletion } from '@/lib/progress';
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
    description: 'A sprint is one focused work session tied to a single task and tracked by the timer.',
  },
] as const;

function formatTime(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

export default function HomeScreen() {
  const [session, SetSession] = useState<Session | null>(null);
  const [activeSprint, setActiveSprint] = useState<ActiveSprint | null>(null);
  const [activeSprintTaskTitle, setActiveSprintTaskTitle] = useState<string | null>(null);
  const [activeSprintTaskDesc, setActiveSprintTaskDesc] = useState<string | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [upcomingDeadlineTasks, setUpcomingDeadlineTasks] = useState<UpcomingDeadlineTask[]>([]);
  const [isFlowInfoVisible, setIsFlowInfoVisible] = useState(false);
  const [completingTaskId, setCompletingTaskId] = useState<string | null>(null);

  const loadActiveSprint = useCallback(async () => {
    const storedSprint = await GetActiveSprint();

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
      await RemoveActiveSprint();
      setActiveSprint(null);
      setActiveSprintTaskTitle(null);
      setActiveSprintTaskDesc(null);
      setRemainingSeconds(0);
      return;
    }

    setActiveSprint(storedSprint);
    setRemainingSeconds(secondsLeft);

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
      void loadUpcomingDeadlineTasks();
    }, [loadActiveSprint, loadUpcomingDeadlineTasks])
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
        void RemoveActiveSprint();
        setActiveSprint(null);
        setActiveSprintTaskTitle(null);
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

      <View className="m-1 flex-1 p-6">
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
                    How the app is structured
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
                Build your work from the big container down to the focused work session.
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
              </View>

              <Pressable
                className="min-h-12 items-center justify-center rounded-2xl bg-[#323F4E] px-4"
                onPress={() => {
                  setIsFlowInfoVisible(false);
                  router.push('/subjects');
                }}
              >
                <Text className="text-[15px] font-bold text-white">Start with Subjects</Text>
              </Pressable>
            </View>
          </View>
        </Modal>

        {activeSprint ? (
          <View className="gap-2 rounded-2xl border border-[#D5D9DF] bg-[#F7F9FC] p-4">
            <Text className="text-[13px] font-semibold text-[#5D6B7A]">Active Sprint</Text>
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
                  params: { tId: activeSprint.taskId },
                })
              }
            >
              <Text className="text-[15px] font-bold text-white">Open Sprint</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <Text className="mx-1 my-1 text-left text-base font-normal">
              No active sprint right now.
            </Text>

            <View className="mt-6 gap-3">
              <Text className="text-lg font-bold text-[#1F2933]">
                Tasks with upcoming deadlines
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
          </>
        )}
      </View>
    </View>
  );
}
