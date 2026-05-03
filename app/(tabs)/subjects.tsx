import { SUBJECT_COLORS } from '@/lib/subjectColors';
import { supabase } from '@/lib/supabase';
import { Subject } from '@/lib/types';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Session } from '@supabase/supabase-js';
import { router, Stack, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, Text, View } from 'react-native';

import type { SubjectColor } from '@/lib/subjectColors';

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

export default function Subjects() {
  const [subjects, SetSubjects] = useState<Subject[]>([]);
  const [session, SetSession] = useState<Session | null>(null);
  const [isFlowInfoVisible, setIsFlowInfoVisible] = useState(false);

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

  const GetSubjects = useCallback(async () => {
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
  }, [session?.user.id]);

  useFocusEffect(
    useCallback(() => {
      if (session) {
        void GetSubjects();
      }
    }, [GetSubjects, session])
  );

  return (
    <View className="flex-1 bg-app-bg">
      <Stack.Screen
        options={{
          title: 'Subjects',
          headerTitleAlign: 'center',
          headerLeft: () => (
            <View className="ml-3">
              <Pressable
                className="h-10.5 w-11 items-center justify-center rounded-full"
                onPress={() => setIsFlowInfoVisible(true)}
              >
                <MaterialIcons name="help" size={36} color="#52606D" />
              </Pressable>
            </View>
          ),
          headerRight: () => (
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
          ),
        }}
      />

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
                      <Text className="text-[13px] font-extrabold text-white">
                        {step.label}
                      </Text>
                    </View>
                    {index < FLOW_STEPS.length - 1 ? (
                      <View className="my-[6px] min-h-7 w-[2px] flex-1 bg-[#D5D9DF]" />
                    ) : null}
                  </View>

                  <View className="flex-1 pb-[18px]">
                    <Text className="text-lg font-bold text-[#1F2933]">
                      {step.title}
                    </Text>
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
            <Text className="text-center text-xl font-bold text-text-main">
              No subjects yet
            </Text>
            <Text className="mt-2 text-center text-sm leading-5 text-text-secondary">
              Start with one subject so the rest of your study path has a clear
              place to live.
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

        {subjects.length > 0 ? (
          <Pressable
            className="mt-2 h-14 items-center justify-center rounded-2xl bg-accent"
            onPress={() => router.push('/subject/upsertSubject')}
          >
            <Text className="text-base font-bold text-text-inverse">
              Create Subject
            </Text>
          </Pressable>
        ) : null}
      </ScrollView>
    </View>
  );
}
