import { formatDate, formatDateTime } from '@/lib/date';
import { CheckSubjectCompletion } from '@/lib/progress';
import { SUBJECT_COLORS, type SubjectColor } from '@/lib/subjectColors';
import { supabase } from '@/lib/supabase';
import type { Assignment } from '@/lib/types';
import { Session } from '@supabase/supabase-js';
import { router, Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, SectionList, Text, View } from 'react-native';

export type Subject = {
  sId: string;
  title: string;
  description: string;
  isActive: boolean;
  lastChanged: string;
  uId: string;
  color: SubjectColor;
};

export default function ViewDetailsSubject() {
  const { sId } = useLocalSearchParams<{ sId: string }>();
  const [subject, SetSubject] = useState<Subject | null>(null);  
  const [assignments, SetAssignments] = useState<Assignment[]>([]);
  const [session, SetSession] = useState<Session | null>(null);

  const assignmentSections = [
    {
      title: 'Active Assignments',
      data: assignments.filter((assignment) => !assignment.isCompleted),
      emptyMessage: 'No active assignments',
    },
    {
      title: 'Completed Assignments',
      data: assignments.filter((assignment) => assignment.isCompleted),
      emptyMessage: 'No completed assignments',
    },
  ];

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => SetSession(data.session ?? null));

    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      SetSession(newSession);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  const GetSubject = async (subjectId: string) => {
    const { data, error } = await supabase
      .from('subjects')
      .select('*')
      .eq('sId', subjectId)
      .single();

    if (error) {
      Alert.alert('Subject could not be fetched, please try again');
      return;
    }

    SetSubject((data as Subject) ?? null);  
  };

  const GetAssignments = async (subjectId: string) => {
    const { data, error } = await supabase
      .from('assignments')
      .select('*')
      .eq('sId', subjectId)
      .order('deadline', { ascending: true });

    if (error) {
      Alert.alert('Assignments could not be fetched, please try again');
      return;
    }

    SetAssignments(data ?? []);
  };

  useFocusEffect(
    useCallback(() => {
      if (session && sId) {
        GetSubject(sId);
        GetAssignments(sId);
      }
    }, [session, sId])
  );

  const DeleteSubject = async (subjectId: string) => {
    Alert.alert(
      'Delete Subject',
      'Are you sure you want to delete this subject?',
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
              .from('subjects')
              .delete()
              .eq('sId', subjectId);

            if (error) {
              Alert.alert('Subject could not be deleted, please try again');
              return;
            }

            Alert.alert('Subject deleted successfully!');
            router.back();
          },
        },
      ]
    );
  };

  const DeleteAssignment = async (assignmentId: string, subjectId: string) => {
    Alert.alert(
      'Delete Assignment',
      'Are you sure you want to delete this assignment?',
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
              .from('assignments')
              .delete()
              .eq('aId', assignmentId);

            if (error) {
              Alert.alert('Assignment could not be deleted, please try again');
              return;
            }

            if (subjectId) {
              try {
                await CheckSubjectCompletion(subjectId);
              } catch {
                Alert.alert('Failed to update subject status');
              }
            }

            await GetAssignments(subjectId);
            await GetSubject(subjectId);

            Alert.alert('Assignment deleted successfully!');
          },
        },
      ]
    );
  };

  const completedAssignments = assignments.filter((assignment) => assignment.isCompleted).length;
  const totalAssignments = assignments.length;
  const remainingAssignments = totalAssignments - completedAssignments;

  const progress =
    assignments.length === 0
      ? 0
      : Math.round((completedAssignments / totalAssignments) * 100);

  if (!subject) {
    return (
      <View className="flex-1 bg-app-bg px-5 pt-6">
        <Stack.Screen
          options={{
            title: 'Subject Details',
          }}
        />

        <View className="rounded-3xl border border-app-border bg-app-surface p-5">
          <Text className="text-2xl font-bold text-text-main">
            Subject not found
          </Text>
          <Text className="mt-2 text-base text-text-secondary">
            The subject could not be loaded.
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

  const colorKey: SubjectColor = subject.color ?? 'slate';
  const colorSet = SUBJECT_COLORS[colorKey];

  const firstLetter = subject.title?.trim().charAt(0).toUpperCase() || 'S';

  return (
    <View className="flex-1 bg-app-bg">
      <Stack.Screen
        options={{
          title: 'Subject Details',
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
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: 20,
          paddingBottom: 32,
        }}
        sections={assignmentSections}
        keyExtractor={(item) => item.aId}
        showsVerticalScrollIndicator={false}
        stickySectionHeadersEnabled={false}
        ListHeaderComponent={
          <View>
            <View
              className="rounded-3xl bg-app-surface p-5"
              style={{
                borderWidth: 1,
                borderColor: colorSet.strong,
              }}
            >
              <View className="flex-row items-center">
                <View
                  className="mr-3 h-12 w-12 items-center justify-center rounded-2xl"
                  style={{ backgroundColor: colorSet.soft }}
                >
                  <Text
                    className="text-base font-bold"
                    style={{ color: colorSet.strong }}
                  >
                    {firstLetter}
                  </Text>
                </View>

                <View className="flex-1">
                  <Text className="text-2xl font-bold text-text-main">
                    {subject.title}
                  </Text>

                  {subject.description ? (
                    <Text className="mt-1 text-sm leading-5 text-text-secondary">
                      {subject.description}
                    </Text>
                  ) : (
                    <Text className="mt-1 text-sm leading-5 text-text-muted">
                      No description added.
                    </Text>
                  )}
                </View>

                <View className="ml-3">
                  <View
                    className="rounded-full px-3 py-1"
                    style={{ backgroundColor: colorSet.soft }}
                  >
                    <Text
                      className="text-xs font-semibold"
                      style={{ color: colorSet.strong }}
                    >
                      {subject.isActive ? 'Active' : 'Inactive'}
                    </Text>
                  </View>
                </View>
              </View>

              <View className="mt-5">
                <View className="mb-2 flex-row items-center justify-between">
                  <Text className="text-sm font-semibold text-text-secondary">
                    Assignment Progress
                  </Text>

                  <Text className="text-sm font-bold text-text-main">
                    {completedAssignments}/{totalAssignments}
                  </Text>
                </View>

                <View className="h-3 overflow-hidden rounded-full bg-app-subtle">
                  <View
                    className="h-full rounded-full"
                    style={{
                      width: `${progress}%`,
                      backgroundColor: colorSet.strong,
                    }}
                  />
                </View>

                <Text className="mt-2 text-xs font-medium text-text-secondary">
                  {remainingAssignments === 0
                    ? 'All assignments complete'
                    : `${remainingAssignments} assignment${
                        remainingAssignments === 1 ? '' : 's'
                      } remaining`}
                </Text>
              </View>

              <Text className="mt-4 text-sm text-text-muted">
                Last changed: {formatDateTime(subject.lastChanged)}
              </Text>

              <View className="mt-5 flex-row border-t border-app-border pt-5">
                <Pressable
                  className="mr-3 flex-1 items-center justify-center rounded-2xl border border-app-border bg-app-subtle py-3"
                  onPress={() =>
                    router.push({
                      pathname: '/subject/upsertSubject',
                      params: { sId: subject.sId },
                    })
                  }
                >
                  <Text className="text-sm font-bold text-text-secondary">
                    Edit
                  </Text>
                </Pressable>

                <Pressable
                  className="flex-1 items-center justify-center rounded-2xl border border-app-border bg-app-surface py-3"
                  onPress={() => DeleteSubject(subject.sId)}
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
                  pathname: '/assignment/createAssignment',
                  params: { sId: subject.sId },
                })
              }
            >
              <Text className="text-base font-bold text-text-inverse">
                Create Assignment
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
                    pathname: '/assignment/viewDetailsAssignment',
                    params: { aId: item.aId },
                  })
                }
              >
                <View className="flex-row items-center">
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

                    <Text className="mt-2 text-sm text-text-secondary">
                      Deadline: {formatDate(item.deadline)}
                    </Text>
                  </View>

                  <View className="ml-3">
                    <View className="rounded-full bg-app-subtle px-3 py-1">
                      <Text className="text-xs font-semibold text-text-secondary">
                        {item.isCompleted ? 'Completed' : 'Upcoming'}
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
                        pathname: '/assignment/editAssignment',
                        params: { aId: item.aId },
                      })
                    }
                  >
                    <Text className="text-sm font-bold text-text-secondary">
                      Edit
                    </Text>
                  </Pressable>

                  <Pressable
                    className="flex-1 items-center justify-center rounded-2xl border border-app-border bg-app-surface py-3"
                    onPress={() => DeleteAssignment(item.aId, item.sId)}
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
                Assignments for this subject will show up here.
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