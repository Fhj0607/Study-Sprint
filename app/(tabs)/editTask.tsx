import { supabase } from '@/lib/supabase';
import {
  router,
  Stack,
  useFocusEffect,
  useLocalSearchParams,
} from 'expo-router';
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
  const { taskId } = useLocalSearchParams<{ taskId?: string }>();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [deadline, setDeadline] = useState('');
  const [isCompleted, setIsCompleted] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useFocusEffect(
    useCallback(() => {
      const getTask = async () => {
        if (!taskId) return;

        setIsLoading(true);

        try {
          const { data, error } = await supabase
            .from('tasks')
            .select('*')
            .eq('tId', taskId)
            .single();

          if (error || !data) {
            Alert.alert('Task not found');
            router.back();
            return;
          }

          setTitle(data.title ?? '');
          setDescription(data.description ?? '');
          setDeadline(data.deadline ?? '');
          setIsCompleted(Boolean(data.isCompleted));
        } finally {
          setIsLoading(false);
        }
      };

      getTask();
    }, [taskId])
  );

  const handleSaveTask = async () => {
    if (!title.trim() || !description.trim() || !deadline.trim()) {
      Alert.alert('All fields are required!');
      return;
    }

    setIsSaving(true);

    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();

      if (userError || !userData.user) {
        router.replace('../createUser');
        return;
      }

      const { error: dbError } = await supabase
        .from('tasks')
        .update({
          title: title.trim(),
          description: description.trim(),
          isCompleted,
          lastChanged: new Date().toISOString(),
          deadline: deadline.trim(),
          uId: userData.user.id,
        })
        .eq('tId', taskId);

      if (dbError) {
        Alert.alert('Task could not be edited, please try again');
        return;
      }

      Alert.alert('Task successfully edited!');
      router.back();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Edit Task',
          headerTitleStyle: {
            fontSize: 20,
            fontWeight: '700',
          },
        }}
      />

      <KeyboardAvoidingView
        className="flex-1 bg-gray-100"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerClassName="flex-grow justify-center px-5 py-8"
          >
            <View className="rounded-3xl bg-white p-6 shadow-lg">
              <Text className="mb-1 text-3xl font-bold text-gray-900">
                Edit Task
              </Text>

              <Text className="mb-6 text-base text-gray-500">
                Update the details for this task.
              </Text>

              {isLoading ? (
                <View className="items-center justify-center py-12">
                  <ActivityIndicator size="large" />
                  <Text className="mt-3 text-gray-500">Loading task...</Text>
                </View>
              ) : (
                <>
                  <View className="mb-4">
                    <Text className="mb-2 text-sm font-semibold text-gray-700">
                      Title
                    </Text>
                    <TextInput
                      className="rounded-xl border border-gray-300 bg-gray-50 px-4 py-3 text-base text-gray-900"
                      placeholder="Enter title"
                      placeholderTextColor="#9ca3af"
                      value={title}
                      onChangeText={setTitle}
                    />
                  </View>

                  <View className="mb-4">
                    <Text className="mb-2 text-sm font-semibold text-gray-700">
                      Description
                    </Text>
                    <TextInput
                      className="min-h-28 rounded-xl border border-gray-300 bg-gray-50 px-4 py-3 text-base text-gray-900"
                      placeholder="Enter description"
                      placeholderTextColor="#9ca3af"
                      value={description}
                      onChangeText={setDescription}
                      multiline
                      textAlignVertical="top"
                    />
                  </View>

                  <View className="mb-4">
                    <Text className="mb-2 text-sm font-semibold text-gray-700">
                      Deadline
                    </Text>
                    <TextInput
                      className="rounded-xl border border-gray-300 bg-gray-50 px-4 py-3 text-base text-gray-900"
                      placeholder="YYYY-MM-DD"
                      placeholderTextColor="#9ca3af"
                      value={deadline}
                      onChangeText={setDeadline}
                    />
                  </View>

                  <Pressable
                    className={`mb-6 flex-row items-center rounded-xl border p-4 ${
                      isCompleted
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-gray-300 bg-gray-50'
                    }`}
                    onPress={() => setIsCompleted((current) => !current)}
                  >
                    <View
                      className={`mr-3 h-6 w-6 items-center justify-center rounded-md border-2 ${
                        isCompleted
                          ? 'border-blue-600 bg-blue-600'
                          : 'border-gray-400 bg-white'
                      }`}
                    >
                      {isCompleted && (
                        <Text className="text-base font-bold text-white">✓</Text>
                      )}
                    </View>

                    <Text className="text-base font-semibold text-gray-900">
                      {isCompleted ? 'Completed' : 'Not completed'}
                    </Text>
                  </Pressable>

                  <Pressable
                    className={`h-14 items-center justify-center rounded-2xl ${
                      isSaving ? 'bg-blue-400' : 'bg-blue-600'
                    }`}
                    onPress={handleSaveTask}
                    disabled={isSaving}
                  >
                    <Text className="text-base font-bold text-white">
                      {isSaving ? 'Saving...' : 'Save Changes'}
                    </Text>
                  </Pressable>

                  {isSaving && (
                    <View className="mt-4">
                      <ActivityIndicator size="small" />
                    </View>
                  )}

                  <Pressable
                    className="mt-3 h-14 items-center justify-center rounded-2xl bg-gray-200"
                    onPress={() => router.back()}
                    disabled={isSaving}
                  >
                    <Text className="text-base font-bold text-gray-900">
                      Cancel
                    </Text>
                  </Pressable>
                </>
              )}
            </View>
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </>
  );
}