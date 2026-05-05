import { getSetupStatus } from '@/lib/setupStatus';
import { SUBJECT_COLORS, type SubjectColor } from '@/lib/subjectColors';
import { supabase } from '@/lib/supabase';
import { Subject } from '@/lib/types';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Session } from '@supabase/supabase-js';
import { Redirect, router, Stack, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, Text, View, ActivityIndicator } from 'react-native';

const FLOW_STEPS = [
  {
    label: '1',
    title: 'Subject',
    description: 'Start with the broad area you are studying, like one course or one exam you are preparing for.',
  },
  {
    label: '2',
    title: 'Assignment',
    description: 'Inside that, add the bigger piece of work you want to move forward, like a project, a problem set, or revision block.',
  },
  {
    label: '3',
    title: 'Task',
    description: 'Then break it down into one task that feels concrete enough to begin without overthinking it.',
  },
  {
    label: '4',
    title: 'Sprint',
    description: 'That task is what you bring into a focus session. After a sprint, you take a short pause, then come back to the same kind of focused work. After a few rounds, the app gives you a longer pause so the rhythm still feels sustainable.',
  },
] as const;

export default function Subjects() {
  const [subjects, SetSubjects] = useState<Subject[]>([]);
  const [session, SetSession] = useState<Session | null>(null);
  const [isFlowInfoVisible, setIsFlowInfoVisible] = useState(false);
  const [needsSetup, setNeedsSetup] = useState<boolean | null>(null);
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

  useEffect(() => {
    const loadSetupGate = async () => {
      if (!session?.user.id) {
        setNeedsSetup(false);
        return;
      }

      try {
        const setupStatus = await getSetupStatus(session.user.id);
        setNeedsSetup(!setupStatus.isSetupComplete);
      } catch {
        setNeedsSetup(true);
      }
    };

    setNeedsSetup(null);
    void loadSetupGate();
  }, [session?.user.id]);

  const GetSubjects = useCallback(async () => {
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

    SetIsLoading(false);

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

  if (session && needsSetup === null) {
    return null;
  }

  if (needsSetup) {
    return <Redirect href="/setup" />;
  }

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
  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-app-bg">
        <ActivityIndicator size="large" />
      </View>
    );
  }

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
              The idea is to make getting started feel lighter. You decide what you are studying, narrow it down to one clear task, and then let the app carry you through a simple rhythm of focus and recovery.
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
              <Text className="mt-2 text-sm leading-[20px] text-[#52606D]">
                In practice, that usually becomes focus session, short pause, focus session again, and eventually a longer pause when you have done a few solid rounds.
              </Text>
            </View>

            <Pressable
              className="min-h-12 items-center justify-center rounded-2xl bg-[#323F4E] px-4"
              onPress={() => setIsFlowInfoVisible(false)}
            >
              <Text className="text-[15px] font-bold text-white">Close Guide</Text>
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
        {isLoading ? (
          <View className="items-center justify-center rounded-3xl border border-app-border bg-app-surface p-5">
            <ActivityIndicator size="large" color="#2563eb" />
            <Text className="mt-4 text-center text-base font-semibold text-text-secondary">
              Loading subjects...
            </Text>
          </View>
        ) : subjects.length === 0 ? (
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
