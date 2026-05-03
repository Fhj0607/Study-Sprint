import { defaultStyles } from '@/constants/defaultStyles';
import * as AsyncStorage from '@/lib/asyncStorage';
import { CheckSubjectCompletion } from '@/lib/progress';
import { supabase } from '@/lib/supabase';
import * as Notifications from 'expo-notifications';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  View,
} from 'react-native';

export default function UpsertAssignment() {
  const { aId, sId: routeSId, flow } = useLocalSearchParams<{
    aId?: string;
    sId?: string;
    flow?: string;
  }>();

  const isEditMode = Boolean(aId);
  const isSetupFlow = flow === 'setup';

  const [title, SetTitle] = useState('');
  const [description, SetDescription] = useState('');
  const [deadline, SetDeadline] = useState('');
  const [isCompleted, SetIsCompleted] = useState(false);
  const [subjectId, SetSubjectId] = useState<string | null>(routeSId ?? null);

  const [isLoading, SetIsLoading] = useState(isEditMode);
  const [isSaving, SetIsSaving] = useState(false);

  useEffect(() => {
    if (!isEditMode || !aId) {
      SetIsLoading(false);
      return;
    }

    const loadAssignment = async () => {
      SetIsLoading(true);

      const { data, error } = await supabase
        .from('assignments')
        .select('*')
        .eq('aId', aId)
        .single();

      SetIsLoading(false);

      if (error || !data) {
        Alert.alert('Assignment could not be loaded, please try again');
        router.back();
        return;
      }

      SetTitle(data.title ?? '');
      SetDescription(data.description ?? '');
      SetDeadline(data.deadline ?? '');
      SetIsCompleted(data.isCompleted ?? false);
      SetSubjectId(data.sId ?? routeSId ?? null);
    };

    loadAssignment();
  }, [aId, isEditMode, routeSId]);

  const ScheduleDeadlineReminder = async (
    assignmentId: string,
    assignmentTitle: string,
    assignmentDeadline: string
  ) => {
    const dl = new Date(assignmentDeadline);

    if (Number.isNaN(dl.getTime())) return null;

    const deadlineReminder = new Date(dl.getTime() - 24 * 60 * 60 * 1000);

    if (deadlineReminder <= new Date()) return null;

    const nId = await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Assignment deadline coming up',
        body: `${assignmentTitle} is due in 24 hours.`,
        data: { aId: assignmentId },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: deadlineReminder,
      },
    });

    return nId;
  };

  const updateDeadlineReminder = async (
    assignmentId: string,
    assignmentTitle: string,
    assignmentDeadline: string,
    completed: boolean
  ) => {
    const existingNotificationId =
      await AsyncStorage.GetAssignmentNotificationId(assignmentId);

    if (existingNotificationId) {
      try {
        await Notifications.cancelScheduledNotificationAsync(
          existingNotificationId
        );
      } catch {}
      await AsyncStorage.RemoveAssignmentNotificationId(assignmentId);
    }

    if (completed) return;

    const nId = await ScheduleDeadlineReminder(
      assignmentId,
      assignmentTitle,
      assignmentDeadline
    );

    if (nId) {
      await AsyncStorage.SaveAssignmentNotificationId(assignmentId, nId);
    }
  };

  const handleSubmit = async () => {
    if (title.trim() === '') {
      Alert.alert('Title is required!');
      return;
    }

    const { data: userData, error: userError } = await supabase.auth.getUser();

    if (userError || !userData.user) {
      router.replace('/login');
      return;
    }

    if (!subjectId) {
      Alert.alert('Missing subject', 'This assignment is not linked to a subject.');
      return;
    }

    SetIsSaving(true);

    const payload = {
      title: title.trim(),
      description: description.trim(),
      deadline: deadline.trim(),
      isCompleted,
      lastChanged: new Date().toISOString(),
      uId: userData.user.id,
      sId: subjectId,
    };

    const result =
      isEditMode && aId
        ? await supabase
            .from('assignments')
            .update(payload)
            .eq('aId', aId)
            .select()
            .single()
        : await supabase.from('assignments').insert(payload).select().single();

    if (result.error || !result.data) {
      SetIsSaving(false);
      Alert.alert(
        isEditMode
          ? 'Assignment could not be updated, please try again'
          : 'Assignment could not be created, please try again'
      );
      return;
    }

    const savedAssignment = result.data;

    await updateDeadlineReminder(
      savedAssignment.aId,
      savedAssignment.title,
      savedAssignment.deadline,
      savedAssignment.isCompleted
    );

    try {
      await CheckSubjectCompletion(subjectId);
    } catch {
      Alert.alert('Failed to update subject status');
    }

    SetIsSaving(false);

    if (!isEditMode && isSetupFlow) {
      router.replace({
        pathname: '/task/upsertTask',
        params: {
          aId: savedAssignment.aId,
          flow: 'setup',
        },
      });
      return;
    }

    Alert.alert(
      isEditMode
        ? 'Assignment successfully updated!'
        : 'Assignment successfully created!'
    );

    router.back();
  };

  const inputClassName =
    'rounded-2xl border border-app-border bg-app-subtle px-4 py-3 text-base text-text-main';

  const labelClassName = 'mb-2 text-sm font-semibold text-text-secondary';

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-app-bg">
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: isEditMode ? 'Edit Assignment' : 'Create Assignment',
          headerTitleStyle: defaultStyles.title,
          headerTitleAlign: 'center',
        }}
      />

      <KeyboardAvoidingView
        className="flex-1 bg-app-bg"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView
            className="flex-1"
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{
              flexGrow: 1,
              justifyContent: 'center',
              paddingHorizontal: 20,
              paddingVertical: 32,
            }}
          >
            <View className="mb-6">
              <Text className="text-3xl font-bold text-text-main">
                {isEditMode ? 'Edit Assignment' : 'Create Assignment'}
              </Text>
              <Text className="mt-2 text-base leading-6 text-text-secondary">
                {isEditMode
                  ? 'Update this assignment and keep your subject organized.'
                  : 'Add a new assignment to keep your subject organized.'}
              </Text>
            </View>

            <View className="rounded-3xl border border-app-border bg-app-surface p-5 shadow-sm">
              <View className="mb-5">
                <Text className={labelClassName}>Title</Text>
                <TextInput
                  className={inputClassName}
                  placeholder={
                    isSetupFlow ? 'e.g. Weekly problem set 3' : 'Enter assignment title'
                  }
                  placeholderTextColor="#9CA3AF"
                  value={title}
                  onChangeText={SetTitle}
                  returnKeyType="next"
                />
              </View>

              <View className="mb-5">
                <Text className={labelClassName}>Description</Text>
                <TextInput
                  className={`${inputClassName} min-h-28`}
                  placeholder={
                    isSetupFlow
                      ? 'e.g. Finish the next exercise set before Friday'
                      : 'Add a short description'
                  }
                  placeholderTextColor="#9CA3AF"
                  value={description}
                  onChangeText={SetDescription}
                  multiline
                  textAlignVertical="top"
                />
              </View>

              <View className="mb-5">
                <Text className={labelClassName}>Deadline</Text>
                <TextInput
                  className={inputClassName}
                  placeholder={isSetupFlow ? 'e.g. 2026-05-14' : 'YYYY-MM-DD'}
                  placeholderTextColor="#9CA3AF"
                  value={deadline}
                  onChangeText={SetDeadline}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              <Pressable
                className={`mb-6 flex-row items-center rounded-2xl border p-4 ${
                  isCompleted
                    ? 'border-accent bg-accent-soft'
                    : 'border-app-border bg-app-subtle'
                }`}
                onPress={() => SetIsCompleted((current) => !current)}
                disabled={isSaving}
              >
                <View
                  className={`mr-3 h-6 w-6 items-center justify-center rounded-md border-2 ${
                    isCompleted
                      ? 'border-accent bg-accent'
                      : 'border-app-border bg-app-surface'
                  }`}
                >
                  {isCompleted && (
                    <Text className="text-sm font-bold text-text-inverse">
                      ✓
                    </Text>
                  )}
                </View>

                <View className="flex-1">
                  <Text className="text-base font-semibold text-text-main">
                    Mark as completed
                  </Text>
                  <Text className="mt-1 text-sm text-text-muted">
                    You can change this later.
                  </Text>
                </View>
              </Pressable>

              <Pressable
                className={`h-14 items-center justify-center rounded-2xl ${
                  isSaving ? 'bg-accent-disabled' : 'bg-accent'
                }`}
                onPress={handleSubmit}
                disabled={isSaving}
              >
                {isSaving ? (
                  <View className="flex-row items-center">
                    <ActivityIndicator size="small" />
                    <Text className="ml-3 text-base font-bold text-text-inverse">
                      {isEditMode ? 'Saving...' : 'Creating...'}
                    </Text>
                  </View>
                ) : (
                  <Text className="text-base font-bold text-text-inverse">
                    {isEditMode ? 'Save Changes' : 'Create Assignment'}
                  </Text>
                )}
              </Pressable>

              <Pressable
                className="mt-3 h-14 items-center justify-center rounded-2xl border border-app-border bg-app-subtle"
                onPress={() => router.back()}
                disabled={isSaving}
              >
                <Text className="text-base font-semibold text-text-secondary">
                  Cancel
                </Text>
              </Pressable>
            </View>
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </>
  );
}
