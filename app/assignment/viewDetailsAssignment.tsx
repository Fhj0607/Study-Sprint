import { CheckAssignmentCompletion, CheckSubjectCompletion } from '@/lib/progress';
import { supabase } from '@/lib/supabase';
import type { Assignment, Task } from '@/lib/types';
import { Session } from '@supabase/supabase-js';
import { router, Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, SectionList, Text, View } from "react-native";

export default function ViewDetailsAssignment() {
  const { aId } = useLocalSearchParams<{ aId: string }>();
  const [assignment, SetAssignment] = useState<Assignment | null>(null)
  const [tasks, SetTasks] = useState<Task[]>([])
  const [session, SetSession] = useState<Session | null>(null)

  const taskSections = [
    { title: "Upcoming Tasks", data: tasks.filter((task) => !task.isCompleted), emptyMessage: "No upcoming tasks" },
    { title: "Completed Tasks", data: tasks.filter((task) => task.isCompleted), emptyMessage: "No completed tasks" },
  ];

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => SetSession(data.session ?? null))
    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      SetSession(newSession)
    })
    return () => sub.subscription.unsubscribe()
    },
  [])

  const GetAssignment = async (aId: string) => { 
    const { data, error } = await supabase.from("assignments").select("*").eq("aId", aId).single();

    if (error) {
      Alert.alert("Assignment could not be fetched, please try again");
      return;
    }

    SetAssignment(data ?? null);
  }

  const GetTasks = async (aId: string) => { 
    const { data, error } = await supabase.from("tasks").select("*").eq("aId", aId);

    if (error) {
      Alert.alert("Tasks could not be fetched, please try again");
      return;
    }

    SetTasks(data ?? []);
  }

  useFocusEffect(
    useCallback(() => {
      if (session && aId) {
        GetAssignment(aId);
        GetTasks(aId);
      }
    }, [session, aId])
  );

  const DeleteAssignment = async (aId: string) => {
    Alert.alert(
      "Delete Assignment",
      "Are you sure you want to delete this assignment?",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            const { error } = await supabase.from("assignments").delete().eq("aId", aId);

            if (error) {
              Alert.alert("Assignment could not be deleted, please try again");
              return;
            }

            Alert.alert("Assignment deleted successfully!");

            const sId = assignment?.sId;

            if (sId) {
              try {
                await CheckSubjectCompletion(sId);
              } catch {
                Alert.alert("Failed to update subject status");
              }
            }

            router.back();
          }
        }
      ]
    )
  }

  const DeleteTask = async (tId: string, aId: string) => {
    Alert.alert(
      "Delete Task",
      "Are you sure you want to delete this task?",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            const { error } = await supabase.from("tasks").delete().eq("tId", tId);

            if (error) {
              Alert.alert("Task could not be deleted, please try again");
              return;
            }

            Alert.alert("Task deleted successfully!");
            
            if (aId) {
              try {
                await CheckAssignmentCompletion(aId);
              } catch {
                Alert.alert("Failed to update assignment completion state");
              }
            }

            GetTasks(aId);
          }
        }
      ]
    )
  }
  
  const completedTasks = tasks.filter((task) => task.isCompleted).length;
  const totalTasks = tasks.length;
  const remainingTasks = totalTasks - completedTasks;

  const progress =
    totalTasks === 0
      ? 0
      : Math.round((completedTasks / totalTasks) * 100);

  if (!assignment) {
    return (
      <View className="flex-1 bg-app-bg px-5 pt-6">
        <Stack.Screen
          options={{
            title: 'Details',
          }}
        />

        <View className="rounded-3xl border border-app-border bg-app-surface p-5">
          <Text className="text-2xl font-bold text-text-main">
            Assignment not found
          </Text>
          <Text className="mt-2 text-base text-text-secondary">
            The assignment could not be loaded.
          </Text>

          <Pressable
            className="mt-5 h-12 items-center justify-center rounded-2xl bg-accent"
            onPress={() => router.back()}
          >
            <Text className="text-base font-bold text-text-inverse">Go back</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-app-bg">
      <Stack.Screen
        options={{
          title: 'Assignment Details',
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

      <SectionList
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 32 }}
        sections={taskSections}
        keyExtractor={(item) => item.tId}
        showsVerticalScrollIndicator={false}
        stickySectionHeadersEnabled={false}
        ListHeaderComponent={
          <View>
            <View className="rounded-3xl border border-app-border bg-app-surface p-5">
              <View className="flex-row items-start">
                <View
                  className={`mr-3 mt-1 h-6 w-6 items-center justify-center rounded-md border-2 ${
                    assignment.isCompleted
                      ? 'border-accent bg-accent'
                      : 'border-app-border bg-app-subtle'
                  }`}
                >
                  {assignment.isCompleted && (
                    <Text className="text-sm font-bold text-text-inverse">✓</Text>
                  )}
                </View>

                <View className="flex-1">
                  <Text className="text-2xl font-bold text-text-main">
                    {assignment.title}
                  </Text>

                  {assignment.description ? (
                    <Text className="mt-2 text-base leading-6 text-text-secondary">
                      {assignment.description}
                    </Text>
                  ) : null}

                  <View className="mt-4 flex-row flex-wrap">
                    <View className="mr-2 mb-2 rounded-full bg-app-subtle px-3 py-1">
                      <Text className="text-xs font-semibold text-text-secondary">
                        Deadline: {assignment.deadline || 'No deadline'}
                      </Text>
                    </View>

                    <View className="mr-2 mb-2 rounded-full bg-app-subtle px-3 py-1">
                      <Text className="text-xs font-semibold text-text-secondary">
                        {assignment.isCompleted ? 'Completed' : 'In progress'}
                      </Text>
                    </View>
                  </View>

                 <View className="mt-5">
                  <View className="mb-2 flex-row items-center justify-between">
                    <Text className="text-sm font-semibold text-text-secondary">
                      Task Progress
                    </Text>

                    <Text className="text-sm font-bold text-text-main">
                      {completedTasks}/{totalTasks}
                    </Text>
                  </View>

                  <View className="h-3 overflow-hidden rounded-full bg-app-subtle">
                    <View
                      className="h-full rounded-full"
                      style={{
                        width: `${progress}%`,
                        backgroundColor: progress === 100 ? '#34D399' : '#3B82F6',
                      }}
                    />
                  </View>

                  <Text className="mt-2 text-xs font-medium text-text-secondary">
                    {remainingTasks === 0
                      ? 'All tasks complete'
                      : `${remainingTasks} task${remainingTasks === 1 ? '' : 's'} remaining`}
                  </Text>
                </View>

                  <Text className="mt-4 text-sm text-text-muted">
                    Last changed: {assignment.lastChanged}
                  </Text>
                </View>
              </View>

              <View className="mt-5 flex-row border-t border-app-border pt-5">
                <Pressable
                  className="mr-3 flex-1 items-center justify-center rounded-2xl border border-app-border bg-app-subtle py-3"
                  onPress={() =>
                    router.push({
                      pathname: '/assignment/editAssignment',
                      params: { aId: assignment.aId },
                    })
                  }
                >
                  <Text className="text-sm font-bold text-text-secondary">Edit</Text>
                </Pressable>

                <Pressable
                  className="flex-1 items-center justify-center rounded-2xl border border-app-border bg-app-surface py-3"
                  onPress={() => DeleteAssignment(assignment.aId)}
                >
                  <Text className="text-sm font-bold text-status-danger">
                    Delete
                  </Text>
                </Pressable>
              </View>
            </View>

            <Pressable
              className="mb-6 mt-5 h-14 items-center justify-center rounded-2xl bg-accent"
              onPress={() =>
                router.push({
                  pathname: '/task/createTask',
                  params: { aId: assignment.aId },
                })
              }
            >
              <Text className="text-base font-bold text-text-inverse">
                Create Task
              </Text>
            </Pressable>
          </View>
        }
        renderSectionHeader={({ section: { title, data } }) => (
          <View className="mb-3 mt-2 flex-row items-center justify-between">
            <Text className="text-lg font-bold text-text-main">{title}</Text>

            <View className="rounded-full bg-app-subtle px-3 py-1">
              <Text className="text-xs font-semibold text-text-muted">
                {data.length}
              </Text>
            </View>
          </View>
        )}
        renderItem={({ item }) => {
          const isOwner = session?.user.id === item.uId;

          return (
            <View className="mb-4 rounded-3xl border border-app-border bg-app-surface p-4">
              <Pressable
                onPress={() =>
                  router.push({
                    pathname: '/task/viewDetailsTask',
                    params: { tId: item.tId },
                  })
                }
              >
                <View className="flex-row items-start">
                  <View
                    className={`mr-3 mt-1 h-6 w-6 items-center justify-center rounded-md border-2 ${
                      item.isCompleted
                        ? 'border-accent bg-accent'
                        : 'border-app-border bg-app-subtle'
                    }`}
                  >
                    {item.isCompleted && (
                      <Text className="text-sm font-bold text-text-inverse">✓</Text>
                    )}
                  </View>

                  <View className="flex-1">
                    <Text
                      className={`text-base font-bold ${
                        item.isCompleted ? 'text-text-secondary' : 'text-text-main'
                      }`}
                    >
                      {item.title}
                    </Text>

                    {item.description ? (
                      <Text
                        className="mt-1 text-sm leading-5 text-text-muted"
                        numberOfLines={2}
                      >
                        {item.description}
                      </Text>
                    ) : null}
                  </View>
                </View>
              </Pressable>

              {isOwner && (
                <View className="mt-4 flex-row border-t border-app-border pt-4">
                  <Pressable
                    className="mr-3 flex-1 items-center justify-center rounded-2xl border border-app-border bg-app-subtle py-3"
                    onPress={() =>
                      router.push({
                        pathname: '/task/editTask',
                        params: { tId: item.tId },
                      })
                    }
                  >
                    <Text className="text-sm font-bold text-text-secondary">Edit</Text>
                  </Pressable>

                  <Pressable
                    className="flex-1 items-center justify-center rounded-2xl border border-app-border bg-app-surface py-3"
                    onPress={() => DeleteTask(item.tId, item.aId)}
                  >
                    <Text className="text-sm font-bold text-status-danger">
                      Delete
                    </Text>
                  </Pressable>
                </View>
              )}
            </View>
          );
        }}
        renderSectionFooter={({ section }) =>
          section.data.length === 0 ? (
            <View className="mb-6 rounded-3xl border border-app-border bg-app-surface p-5">
              <Text className="text-center text-base font-semibold text-text-secondary">
                {section.emptyMessage}
              </Text>
              <Text className="mt-1 text-center text-sm text-text-muted">
                Tasks for this assignment will show up here.
              </Text>
            </View>
          ) : (
            <View className="mb-2" />
          )
        }
      />
    </View>
  );
}