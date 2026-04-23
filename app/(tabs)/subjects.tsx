import { defaultStyles } from '@/constants/defaultStyles';
import { supabase } from '@/lib/supabase';
import type { Subject } from '@/lib/types';
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

export default function Subjects() {
  const [subjects, SetSubjects] = useState<Subject[]>([]);
  const [session, SetSession] = useState<Session | null>(null);

  const subjectSections = [
    {
      title: 'Active Subjects',
      data: subjects.filter((subject) => subject.isActive),
      emptyMessage: 'No active subjects',
    },
    {
      title: 'Inactive Subjects',
      data: subjects.filter((subject) => !subject.isActive),
      emptyMessage: 'No inactive subjects',
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

  const GetSubjects = async () => {
    const { data, error } = await supabase
      .from('subjects')
      .select('*')
      .order('lastChanged', { ascending: false });

    if (error) {
      Alert.alert('Subjects could not be fetched, please try again');
      return;
    }

    SetSubjects(data ?? []);
  };

  useFocusEffect(
    useCallback(() => {
      if (session) {
        GetSubjects();
      }
    }, [session])
  );

  const DeleteSubject = async (sId: string) => {
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
              .eq('sId', sId);

            if (error) {
              Alert.alert('Subject could not be deleted, please try again');
              return;
            }

            Alert.alert('Subject deleted successfully!');
            GetSubjects();
          },
        },
      ]
    );
  };

  return (
    <View className="flex-1 bg-app-bg">
      <Stack.Screen
        options={{
          title: 'Subjects',
          headerTitleStyle: defaultStyles.title,
          headerRight: () => (
            <View className="flex-row items-center">
              <Pressable
                className="mr-3 h-10 w-10 items-center justify-center rounded-full border border-app-border bg-app-surface"
                onPress={GetSubjects}
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
            Subjects
          </Text>
          <Text className="mt-2 text-base leading-6 text-text-secondary">
            Organize your study work by subject, then break it into assignments
            and tasks.
          </Text>
        </View>

        <Pressable
          className="mb-6 h-14 items-center justify-center rounded-2xl bg-accent"
          onPress={() => router.push('/subject/createSubject')}
        >
          <Text className="text-base font-bold text-text-inverse">
            Create Subject
          </Text>
        </Pressable>

        <SectionList
          sections={subjectSections}
          keyExtractor={(item) => item.sId}
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
                      pathname: '/subject/viewDetailsSubject',
                      params: { sId: item.sId },
                    })
                  }
                >
                  <View className="flex-row items-start">
                    <View
                      className={`mr-3 mt-1 h-6 w-6 items-center justify-center rounded-md border-2 ${
                        item.isActive
                          ? 'border-accent bg-accent'
                          : 'border-app-border bg-app-subtle'
                      }`}
                    >
                      {item.isActive && (
                        <Text className="text-sm font-bold text-text-inverse">
                          ✓
                        </Text>
                      )}
                    </View>

                    <View className="flex-1">
                      <Text
                        className={`text-base font-bold ${
                          item.isActive
                            ? 'text-text-main'
                            : 'text-text-secondary'
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
                          {item.isActive ? 'Active' : 'Inactive'}
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
                          pathname: '/subject/editSubject',
                          params: { sId: item.sId },
                        })
                      }
                    >
                      <Text className="text-sm font-bold text-text-secondary">
                        Edit
                      </Text>
                    </Pressable>

                    <Pressable
                      className="flex-1 items-center justify-center rounded-2xl border border-app-border bg-app-surface py-3"
                      onPress={() => DeleteSubject(item.sId)}
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
                  Subjects you create will show up here.
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