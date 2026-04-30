import { SUBJECT_COLORS } from '@/lib/subjectColors';
import { supabase } from '@/lib/supabase';
import { Subject } from '@/lib/types';
import { Session } from '@supabase/supabase-js';
import { router, Stack, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';

import type { SubjectColor } from '@/lib/subjectColors';

export default function Subjects() {
  const [subjects, SetSubjects] = useState<Subject[]>([]);
  const [session, SetSession] = useState<Session | null>(null);

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
    if (!session?.user.id) return;

    const { data, error } = await supabase
      .from('subjects')
      .select('*')
      .eq('uId', session.user.id)
      .order('lastChanged', { ascending: false });

    if (error) {
      Alert.alert('Subjects could not be fetched, please try again');
      return;
    }

    SetSubjects((data as Subject[]) ?? []);
  };

  useFocusEffect(
    useCallback(() => {
      if (session) {
        GetSubjects();
      }
    }, [session])
  );

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
        <View className="mb-6">
          <Text className="text-3xl font-bold text-text-main">Subjects</Text>
          <Text className="mt-2 text-base leading-6 text-text-secondary">
            Pick a subject to manage assignments and tasks.
          </Text>
        </View>

        {subjects.length === 0 ? (
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
            {subjects.map((subject) => {
                const colorKey: SubjectColor = subject.color ?? 'slate';
                const colorSet = SUBJECT_COLORS[colorKey];

              const firstLetter =
                subject.title?.trim().charAt(0).toUpperCase() || '?';

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
            })}
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