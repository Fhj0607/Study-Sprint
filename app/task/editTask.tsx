import { CheckAssignmentCompletion } from '@/lib/progress';
import { supabase } from '@/lib/supabase';
import type { Task } from '@/lib/types';
import { router, Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
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

export default function EditTask() {
  const { tId } = useLocalSearchParams<{ tId: string }>();
  const [task, SetTask] = useState<Task | null>(null);
  const [isSaving, SetIsSaving] = useState(false);


  const GetTask = async (tId: string) => { 
    const { data, error } = await supabase.from("tasks").select("*").eq("tId", tId).single();

    if (error) {
      Alert.alert("Task could not be fetched, please try again");
      return;
    }

    SetTask(data ?? null);
  }

  useFocusEffect(
    useCallback(() => {
      if (tId) {
        GetTask(tId);
      }
    }, [tId])
  );

  const EditTask = async () => {
    if (!task) return;

    if(task.title.trim() === '') {
      Alert.alert("Title is required!");
      return;
    }
        
    const { data, error: userError } = await supabase.auth.getUser();

    if(userError || !data.user) {
      router.replace("../createUser");
      return;
    } 

    SetIsSaving(true);

    const { error: dbError } = await supabase.from("tasks").update({
      title: task.title,
      description: task.description,
      isCompleted: task.isCompleted,
      lastChanged: new Date().toISOString(),
      uId: data.user.id,
      aId: task.aId,
    }).eq("tId", tId);

    SetIsSaving(false);

    if (dbError) {
      Alert.alert("Task could not be edited, please try again");
      return;
    }

    if (task.aId) {
      try {
        await CheckAssignmentCompletion(task.aId);
      } catch {
        Alert.alert("Failed to update assignment completion state");
      }
    }

    Alert.alert("Task successfully edited!");
    router.back();
  };

  const inputClassName =
    'rounded-2xl border border-app-border bg-app-subtle px-4 py-3 text-base text-text-main';

  const labelClassName = 'mb-2 text-sm font-semibold text-text-secondary';


  return (
    <>
      <Stack.Screen
        options={{
          title: 'Edit Task',
        }}
      />

      {!task ? (
        <View className="flex-1 bg-app-bg px-5 pt-6">
          <View className="rounded-3xl border border-app-border bg-app-surface p-5">
            <Text className="text-2xl font-bold text-text-main">
              Task not found
            </Text>
            <Text className="mt-2 text-base text-text-secondary">
              The task could not be loaded.
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
      ) : (
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
                  Edit Task
                </Text>
                <Text className="mt-2 text-base leading-6 text-text-secondary">
                  Update the task details and completion state.
                </Text>
              </View>

              <View className="rounded-3xl border border-app-border bg-app-surface p-5">
                <View className="mb-5">
                  <Text className={labelClassName}>Title</Text>
                  <TextInput
                    className={inputClassName}
                    placeholder="Enter task title"
                    placeholderTextColor="#9CA3AF"
                    value={task.title}
                    onChangeText={(text) =>
                      SetTask((prev) => (prev ? { ...prev, title: text } : prev))
                    }
                    returnKeyType="next"
                  />
                </View>

                <View className="mb-5">
                  <Text className={labelClassName}>Description</Text>
                  <TextInput
                    className={`${inputClassName} min-h-28`}
                    placeholder="Add a short description"
                    placeholderTextColor="#9CA3AF"
                    value={task.description}
                    onChangeText={(text) =>
                      SetTask((prev) =>
                        prev ? { ...prev, description: text } : prev
                      )
                    }
                    multiline
                    textAlignVertical="top"
                  />
                </View>

                <Pressable
                  onPress={() =>
                    SetTask((prev) =>
                      prev ? { ...prev, isCompleted: !prev.isCompleted } : prev
                    )
                  }
                  disabled={isSaving}
                  className={`mb-6 flex-row items-center rounded-2xl border p-4 ${
                    task.isCompleted
                      ? 'border-accent bg-accent-soft'
                      : 'border-app-border bg-app-subtle'
                  }`}
                >
                  <View
                    className={`mr-3 h-6 w-6 items-center justify-center rounded-md border-2 ${
                      task.isCompleted
                        ? 'border-accent bg-accent'
                        : 'border-app-border bg-app-surface'
                    }`}
                  >
                    {task.isCompleted && (
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
                      You can change this again later.
                    </Text>
                  </View>
                </Pressable>

                <Pressable
                  className={`h-14 items-center justify-center rounded-2xl ${
                    isSaving ? 'bg-accent-disabled' : 'bg-accent'
                  }`}
                  onPress={EditTask}
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <View className="flex-row items-center">
                      <ActivityIndicator size="small" />
                      <Text className="ml-3 text-base font-bold text-text-inverse">
                        Saving...
                      </Text>
                    </View>
                  ) : (
                    <Text className="text-base font-bold text-text-inverse">
                      Save Changes
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
      )}
    </>
  );
}