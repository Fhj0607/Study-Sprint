import { defaultStyles } from '@/constants/defaultStyles';
import { CheckAssignmentCompletion } from '@/lib/progress';
import { supabase } from '@/lib/supabase';
import type { Task } from '@/lib/types';
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

export default function UpsertTask() {
  const { tId, aId: routeAId } = useLocalSearchParams<{
    tId?: string;
    aId?: string;
  }>();

  const isEditMode = Boolean(tId);

  const [title, SetTitle] = useState('');
  const [description, SetDescription] = useState('');
  const [isCompleted, SetIsCompleted] = useState(false);
  const [assignmentId, SetAssignmentId] = useState<string | null>(routeAId ?? null);

  const [isLoading, SetIsLoading] = useState(isEditMode);
  const [isSaving, SetIsSaving] = useState(false);

  useEffect(() => {
    if (!isEditMode || !tId) {
      SetIsLoading(false);
      return;
    }

    const loadTask = async () => {
      SetIsLoading(true);

      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('tId', tId)
        .single();

      SetIsLoading(false);

      if (error || !data) {
        Alert.alert('Task could not be loaded, please try again');
        router.back();
        return;
      }

      const task = data as Task;

      SetTitle(task.title ?? '');
      SetDescription(task.description ?? '');
      SetIsCompleted(task.isCompleted ?? false);
      SetAssignmentId(task.aId ?? routeAId ?? null);
    };

    loadTask();
  }, [isEditMode, tId, routeAId]);

  const handleSubmit = async () => {
    if (title.trim() === '') {
      Alert.alert('Title is required!');
      return;
    }

    const { data, error: userError } = await supabase.auth.getUser();

    if (userError || !data.user) {
      router.replace('/login');
      return;
    }

    if (!assignmentId) {
      Alert.alert('Missing assignment', 'This task is not linked to an assignment.');
      return;
    }

    SetIsSaving(true);

    const payload = {
      title: title.trim(),
      description: description.trim(),
      isCompleted,
      lastChanged: new Date().toISOString(),
      uId: data.user.id,
      aId: assignmentId,
    };

    const result =
      isEditMode && tId
        ? await supabase.from('tasks').update(payload).eq('tId', tId)
        : await supabase.from('tasks').insert(payload);

    if (result.error) {
      SetIsSaving(false);
      Alert.alert(
        isEditMode
          ? 'Task could not be updated, please try again'
          : 'Task could not be created, please try again'
      );
      return;
    }

    try {
      await CheckAssignmentCompletion(assignmentId);
    } catch {
      SetIsSaving(false);
      Alert.alert('Failed to update assignment completion state');
      return;
    }

    SetIsSaving(false);

    Alert.alert(
      isEditMode ? 'Task successfully updated!' : 'Task successfully created!'
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
          title: isEditMode ? 'Edit Task' : 'Create Task',
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
                {isEditMode ? 'Edit Task' : 'Create Task'}
              </Text>
              <Text className="mt-2 text-base leading-6 text-text-secondary">
                {isEditMode
                  ? 'Update this task and keep your assignment moving forward.'
                  : 'Add a small step to move this assignment forward.'}
              </Text>
            </View>

            <View className="rounded-3xl border border-app-border bg-app-surface p-5 shadow-sm">
              <View className="mb-5">
                <Text className={labelClassName}>Title</Text>
                <TextInput
                  testID="task-title-input"
                  className={inputClassName}
                  placeholder="Enter task title"
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
                  placeholder="Add a short description"
                  placeholderTextColor="#9CA3AF"
                  value={description}
                  onChangeText={SetDescription}
                  multiline
                  textAlignVertical="top"
                />
              </View>

              <Pressable
                onPress={() => SetIsCompleted((state) => !state)}
                disabled={isSaving}
                className={`mb-6 flex-row items-center rounded-2xl border p-4 ${
                  isCompleted
                    ? 'border-accent bg-accent-soft'
                    : 'border-app-border bg-app-subtle'
                }`}
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
                testID="upsert-task-button"
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
                    {isEditMode ? 'Save Changes' : 'Create Task'}
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