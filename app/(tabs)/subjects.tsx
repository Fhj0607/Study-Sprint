import { SUBJECT_COLORS, type SubjectColor } from '@/lib/subjectColors';
import { supabase } from '@/lib/supabase';
import { Subject } from '@/lib/types';
import { Session } from '@supabase/supabase-js';
import { router, Stack, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';

export default function Subjects() {
  const [subjects, SetSubjects] = useState<Subject[]>([]);
  const [session, SetSession] = useState<Session | null>(null);
  const [isLoading, SetIsLoading] = useState(true);

  const activeSubjects = subjects.filter((subject) => subject.isActive);
  const inactiveSubjects = subjects.filter((subject) => !subject.isActive);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      SetSession(data.session ?? null);
    });

    const { data: sub } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        SetSession(newSession);
      }
    );

    return () => sub.subscription.unsubscribe();
  }, []);

  const GetSubjects = async () => {
    if (!session?.user.id) {
      SetIsLoading(false);
      return;
    }

    SetIsLoading(true);

    const { data, error } = await supabase
      .from('subjects')
      .select('*')
      .eq('uId', session.user.id)
      .order('lastChanged', { ascending: false });

    if (error) {
      Alert.alert('Subjects could not be fetched, please try again');
      SetIsLoading(false);
      return;
    }

    SetSubjects((data as Subject[]) ?? []);
    SetIsLoading(false);
  };

  useFocusEffect(
    useCallback(() => {
      if (session) {
        GetSubjects();
      }
    }, [session])
  );

  const RenderSubjectCard = (subject: Subject) => {
    const colorKey: SubjectColor = subject.color ?? 'slate';
    const colorSet = SUBJECT_COLORS[colorKey];
    const firstLetter = subject.title?.trim().charAt(0).toUpperCase() || '?';

    return (
      <Pressable
        key={subject.sId}
        className="mb-4 rounded-3xl bg-app-surface p-4"
        style={{
          borderWidth: 1,
          borderColor: colorSet.strong,
        }}
        onPress={() =>
          router.push({
            pathname: '/subject/viewDetailsSubject',
            params: { sId: subject.sId },
          })
        }
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
            <Text
              className="text-base font-bold text-text-main"
              numberOfLines={1}
            >
              {subject.title}
            </Text>

            <Text
              className="mt-1 text-sm leading-5 text-text-secondary"
              numberOfLines={2}
            >
              {subject.description || 'No description added.'}
            </Text>
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
      </Pressable>
    );
  };

  return (
    <View className="flex-1 bg-app-bg">
      <Stack.Screen
        options={{
          title: 'Subjects',
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

      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: 20,
          paddingBottom: 32,
        }}
        showsVerticalScrollIndicator={false}
      >
        {isLoading ? (
          <View className="items-center justify-center rounded-3xl border border-app-border bg-app-surface p-5">
            <ActivityIndicator size="large" color="#2563eb" />
            <Text className="mt-4 text-center text-base font-semibold text-text-secondary">
              Loading subjects...
            </Text>
          </View>
        ) : subjects.length === 0 ? (
          <View className="rounded-3xl border border-app-border bg-app-surface p-5">
            <Text className="text-center text-base font-semibold text-text-secondary">
              No subjects yet
            </Text>
            <Text className="mt-1 text-center text-sm text-text-muted">
              Create your first subject to get started.
            </Text>
          </View>
        ) : (
          <View>
            <View className="mb-3 mt-2 flex-row items-center justify-between">
              <Text className="text-lg font-bold text-text-main">
                Active Subjects
              </Text>

              <View className="rounded-full bg-app-subtle px-3 py-1">
                <Text className="text-xs font-semibold text-text-muted">
                  {activeSubjects.length}
                </Text>
              </View>
            </View>

            {activeSubjects.length === 0 ? (
              <View className="mb-6 rounded-3xl border border-app-border bg-app-surface p-5">
                <Text className="text-center text-base font-semibold text-text-secondary">
                  No active subjects
                </Text>
                <Text className="mt-1 text-center text-sm text-text-muted">
                  Subjects with ongoing work will show up here.
                </Text>
              </View>
            ) : (
              activeSubjects.map(RenderSubjectCard)
            )}

            <View className="mb-3 mt-2 flex-row items-center justify-between">
              <Text className="text-lg font-bold text-text-main">
                Inactive Subjects
              </Text>

              <View className="rounded-full bg-app-subtle px-3 py-1">
                <Text className="text-xs font-semibold text-text-muted">
                  {inactiveSubjects.length}
                </Text>
              </View>
            </View>

            {inactiveSubjects.length === 0 ? (
              <View className="mb-6 rounded-3xl border border-app-border bg-app-surface p-5">
                <Text className="text-center text-base font-semibold text-text-secondary">
                  No inactive subjects
                </Text>
                <Text className="mt-1 text-center text-sm text-text-muted">
                  Completed or paused subjects will show up here.
                </Text>
              </View>
            ) : (
              inactiveSubjects.map(RenderSubjectCard)
            )}
          </View>
        )}

        <Pressable
          className="mt-2 h-14 items-center justify-center rounded-2xl bg-accent"
          onPress={() => router.push('/subject/upsertSubject')}
        >
          <Text className="text-base font-bold text-text-inverse">
            Create Subject
          </Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}
