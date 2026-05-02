import { defaultStyles } from "@/constants/defaultStyles";
import {
  GetActiveSprint,
  RemoveActiveSprint,
  type ActiveSprint,
} from '@/lib/asyncStorage';
import { formatDate } from '@/lib/date';
import { RegisterForLocalNotificationsAsync } from '@/lib/notifications';
import { supabase } from "@/lib/supabase";
import { Session } from '@supabase/supabase-js';
import { router, Stack, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useState } from 'react';
import { Button, Pressable, StyleSheet, Text, View } from "react-native";

type UpcomingDeadlineTask = {
  tId: string;
  title: string;
  description: string;
  aId: string;
  subjectTitle: string;
  assignmentTitle: string;
  deadline: string;
};

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

  return (
    <View style={defaultStyles.container}>
      <Stack.Screen
        options={{
          title: "Home",
          headerTitleAlign: 'center',
          headerTitleStyle: defaultStyles.title,
          headerRight: () => {
            return (
              <View style={defaultStyles.buttonContainer}>
                <Button title="Logout" onPress={async () => await supabase.auth.signOut()} />
              </View>
            )
          },
        }}
      />

      <View style={defaultStyles.container}>
        {activeSprint ? (
          <View style={styles.activeSprintCard}>
            <Text style={styles.cardEyebrow}>Active Sprint</Text>
            <Text style={styles.cardTitle}>
              {activeSprintTaskTitle ?? 'Selected task'}
            </Text>
            <Text style={styles.cardDesc}> {activeSprintTaskDesc ?? null} </Text>
            <Text style={styles.cardMeta}>
              {formatTime(remainingSeconds)} remaining
            </Text>

            <Pressable
              style={styles.resumeButton}
              onPress={() =>
                router.push({
                  pathname: '/task/timer',
                  params: { tId: activeSprint.taskId },
                })
              }
            >
              <Text style={styles.resumeButtonText}>Open Sprint</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <Text style={defaultStyles.body}>No active sprint right now.</Text>

            <View style={styles.deadlineSection}>
              <Text style={styles.sectionTitle}>Tasks with upcoming deadlines</Text>

              {upcomingDeadlineTasks.length > 0 ? (
                upcomingDeadlineTasks.map((task) => (
                  <Pressable
                    key={task.tId}
                    style={styles.deadlineTaskCard}
                    onPress={() =>
                      router.push({
                        pathname: '/task/viewDetailsTask',
                        params: { tId: task.tId },
                      })
                    }
                  >
                    <Text style={styles.deadlineTaskTitle}>{task.title}</Text>
                    {task.description ? (
                      <Text style={styles.deadlineTaskDescription} numberOfLines={2}>
                        {task.description}
                      </Text>
                    ) : null}
                    <Text style={styles.deadlineTaskMeta}>
                      {task.subjectTitle} • {task.assignmentTitle} • {formatDate(task.deadline)}
                    </Text>
                  </Pressable>
                ))
              ) : (
                <Text style={styles.emptyDeadlineText}>No upcoming task deadlines.</Text>
              )}
            </View>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  activeSprintCard: {
    borderWidth: 1,
    borderColor: '#D5D9DF',
    borderRadius: 16,
    padding: 16,
    backgroundColor: '#F7F9FC',
    gap: 8,
  },
  cardEyebrow: {
    fontSize: 13,
    fontWeight: '600',
    color: '#5D6B7A',
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2933',
  },
  cardDesc: {
    fontSize: 14,
    fontWeight: '500',
    color: '#38414b',
  },
  cardMeta: {
    fontSize: 15,
    color: '#52606D',
  },
  resumeButton: {
    marginTop: 8,
    minHeight: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#323F4E',
    paddingHorizontal: 16,
  },
  resumeButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  deadlineSection: {
    marginTop: 24,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2933',
  },
  deadlineTaskCard: {
    borderWidth: 1,
    borderColor: '#D5D9DF',
    borderRadius: 16,
    padding: 16,
    backgroundColor: '#FFFFFF',
    gap: 6,
  },
  deadlineTaskTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2933',
  },
  deadlineTaskDescription: {
    fontSize: 14,
    color: '#52606D',
  },
  deadlineTaskMeta: {
    fontSize: 13,
    fontWeight: '600',
    color: '#7B8794',
  },
  emptyDeadlineText: {
    fontSize: 14,
    color: '#7B8794',
  },
});
