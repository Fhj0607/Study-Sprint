import { defaultStyles } from '@/constants/defaultStyles';
import { CheckAssignmentCompletion } from '@/lib/progress';
import { supabase } from '@/lib/supabase';
import type { Task } from '@/lib/types';
import { Ionicons } from '@expo/vector-icons';
import { Session } from '@supabase/supabase-js';
import { router, Stack, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Pressable,
  SectionList,
  Text,
  View,
} from 'react-native';

export default function Tasks() {
  const [tasks, SetTasks] = useState<Task[]>([]);
  const [session, SetSession] = useState<Session | null>(null);

  const taskSections = [
    {
      title: 'Upcoming Tasks',
      data: tasks.filter((task) => !task.isCompleted),
      emptyMessage: 'No upcoming tasks',
    },
    {
      title: 'Completed Tasks',
      data: tasks.filter((task) => task.isCompleted),
      emptyMessage: 'No completed tasks',
    },
  ];

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

  const GetTasks = async () => {
    const { data, error } = await supabase.from('tasks').select('*');

    if (error) {
      Alert.alert('Tasks could not be fetched, please try again');
      return;
    }

    SetTasks(data ?? []);
  };

  useFocusEffect(
    useCallback(() => {
      if (session) {
        GetTasks();
      }
    }, [session])
  );

  const DeleteTask = async (tId: string, aId: string) => {
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
              .eq('tId', tId);

            if (error) {
              Alert.alert('Task could not be deleted, please try again');
              return;
            }

            Alert.alert('Task deleted successfully!');

            try {
              await CheckAssignmentCompletion(aId);
            } catch {
              Alert.alert("Failed to update assignment completion state");
            }

            GetTasks();
          },
        },
      ]
    );
  };

  return (
    <View className="flex-1 bg-app-bg">
      <Stack.Screen
        options={{
          title: 'Tasks',
          headerTitleStyle: defaultStyles.title,
          headerRight: () => (
            <View className="flex-row items-center">
              <Pressable
                className="mr-3 h-10 w-10 items-center justify-center rounded-full border border-app-border bg-app-surface"
                onPress={GetTasks}
              >
                <Ionicons name="refresh" size={20} color="#333" />
              </Pressable>

              <Pressable
                className="rounded-full bg-app-subtle px-4 py-2"
                onPress={async () => await supabase.auth.signOut()}
              >
                <Text className="text-sm font-semibold text-text-secondary">
                  Logout
                </Text>
              </Pressable>
            </View>
          ),
        }}
      />

      <View className="flex-1 px-5 pt-5">
        <View className="mb-6">
          <Text className="text-3xl font-bold text-text-main">
            Tasks
          </Text>
          <Text className="mt-2 text-base leading-6 text-text-secondary">
            Break assignments into small steps and keep your progress clear.
          </Text>
        </View>

        <Pressable
          className="mb-6 h-14 items-center justify-center rounded-2xl bg-accent"
          onPress={() => router.push('/task/createTask')}
        >
          <Text className="text-base font-bold text-text-inverse">
            Create Task
          </Text>
        </Pressable>

        <SectionList
          sections={taskSections}
          keyExtractor={(item) => item.tId}
          showsVerticalScrollIndicator={false}
          stickySectionHeadersEnabled={false}
          contentContainerStyle={{
            paddingBottom: 32,
          }}
          renderSectionHeader={({ section: { title, data } }) => (
            <View className="mb-3 mt-2 flex-row items-center justify-between">
              <Text className="text-lg font-bold text-text-main">
                {title}
              </Text>

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
              <View className="mb-4 rounded-3xl border border-app-border bg-app-surface p-4 shadow-sm">
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
                        <Text className="text-sm font-bold text-text-inverse">
                          ✓
                        </Text>
                      )}
                    </View>

                    <View className="flex-1">
                      <Text
                        className={`text-base font-bold ${
                          item.isCompleted
                            ? 'text-text-secondary'
                            : 'text-text-main'
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

                      <View className="mt-3 self-start rounded-full bg-app-subtle px-3 py-1">
                        <Text className="text-xs font-semibold text-text-secondary">
                          {item.isCompleted ? 'Completed' : 'In progress'}
                        </Text>
                      </View>
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
                      <Text className="text-sm font-bold text-text-secondary">
                        Edit
                      </Text>
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
    </View>
  );
}