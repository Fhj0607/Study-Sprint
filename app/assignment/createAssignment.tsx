import { defaultStyles } from '@/constants/defaultStyles';
import * as AsyncStorage from '@/lib/asyncStorage';
import { CheckSubjectCompletion } from '@/lib/progress';
import { supabase } from '@/lib/supabase';
import * as Notifications from 'expo-notifications';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
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

export default function CreateAssignment() {
  const sId = (useLocalSearchParams().sId as string) ?? null;
  const [title, SetTitle] = useState('');
  const [description, SetDescription] = useState('');
  const [deadline, SetDeadline] = useState('');
  const [isCompleted, SetIsCompleted] = useState(false);
  const [isSaving, SetIsSaving] = useState(false);

  const ScheduleDeadlineReminder = async (aId: string, title: string, deadline: string) => {
    const dl = new Date(deadline);

    if (isNaN(dl.getTime())) return null;

    const deadlineReminder = new Date(dl.getTime() - 24 * 60 * 60 * 1000);

      if (deadlineReminder <= new Date()) return null;

    const nId = await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Assignment deadline coming up',
        body: `${title} is due in 24 hours.`,
        data: { aId },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: deadlineReminder,
      },
    });

    return nId;
  }

  const CreateAssignment = async () => {
    if (title.trim() === '') {
      Alert.alert('Title is required!');
      return;
    }

    const { data: userData, error: userError } = await supabase.auth.getUser();

    if (userError || !userData.user) {
      router.replace('../createUser');
      return;
    }

    SetIsSaving(true);

    const { data: assignmentData, error: dbError } = await supabase.from('assignments').insert({
      title: title.trim(),
      description: description.trim(),
      deadline: deadline.trim(),
      isCompleted,
      lastChanged: new Date().toISOString(),
      uId: userData.user.id,
      sId,
    })
    .select()
    .single();

    if (dbError) {
      SetIsSaving(false);
      Alert.alert('Assignment could not be created, please try again');
      return;
    }

    Alert.alert('Assignment successfully created!');

    if (!isCompleted && assignmentData) {
      const nId = await ScheduleDeadlineReminder(assignmentData.aId, assignmentData.title, assignmentData.deadline);

      if (nId) {
        await AsyncStorage.SaveAssignmentNotificationId(assignmentData.aId, nId);
      }
    }

    if (sId) {
      try {
        await CheckSubjectCompletion(sId);
      } catch {
        Alert.alert("Failed to update subject status");
      }
    }

    SetTitle('');
    SetDescription('');
    SetDeadline('');
    SetIsCompleted(false);
    SetIsSaving(false);

    router.back();
  };

  const inputClassName =
    'rounded-2xl border border-app-border bg-app-subtle px-4 py-3 text-base text-text-main';

  const labelClassName = 'mb-2 text-sm font-semibold text-text-secondary';

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Create Assignment',
          headerTitleStyle: defaultStyles.title,
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
                Create Assignment
              </Text>
              <Text className="mt-2 text-base leading-6 text-text-secondary">
                Add a new assignment to keep your subject organized.
              </Text>
            </View>

            <View className="rounded-3xl border border-app-border bg-app-surface p-5 shadow-sm">
              <View className="mb-5">
                <Text className={labelClassName}>Title</Text>
                <TextInput
                  testID = "assignment-title-input"
                  className={inputClassName}
                  placeholder="Enter assignment title"
                  value={title}
                  onChangeText={SetTitle}
                  returnKeyType="next"
                />
              </View>

              <View className="mb-5">
                <Text className={labelClassName}>Description</Text>
                <TextInput
                  className={`${inputClassName} min-h-28`}
                  placeholder="Add a short description"
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
                  placeholder="YYYY-MM-DD"
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
                testID = "create-assignment-button"
                className={`h-14 items-center justify-center rounded-2xl ${
                  isSaving ? 'bg-accent-disabled' : 'bg-accent'
                }`}
                onPress={CreateAssignment}
                disabled={isSaving}
              >
                {isSaving ? (
                  <View className="flex-row items-center">
                    <ActivityIndicator size="small" />
                    <Text className="ml-3 text-base font-bold text-text-inverse">
                      Creating...
                    </Text>
                  </View>
                ) : (
                  <Text className="text-base font-bold text-text-inverse">
                    Create Assignment
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