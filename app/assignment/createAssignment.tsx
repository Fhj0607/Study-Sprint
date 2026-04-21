import { defaultStyles } from '@/constants/defaultStyles';
import { supabase } from '@/lib/supabase';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, Keyboard, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, TouchableWithoutFeedback, View } from 'react-native';

export default function CreateAssignment() {
  const sId = (useLocalSearchParams().sId as string) ?? null;
  const [title, SetTitle] = useState('');
  const [description, SetDescription] = useState('');
  const [deadline, SetDeadline] = useState('');
  const [isCompleted, SetIsCompleted] = useState(false);
  const [isSaving, SetIsSaving] = useState(false);

  const CreateAssignment = async () => {
    if(title.trim() === '') {
      Alert.alert("Title is required!");
      return;
    }
        
    const { data, error: userError } = await supabase.auth.getUser();

    if(userError || !data.user) {
      router.replace("../createUser");
      return;
    } 

    SetIsSaving(true);

    const { error: dbError } = await supabase.from("assignments").insert({
      title,
      description,
      deadline,
      isCompleted,
      lastChanged: new Date().toISOString(),
      uId: data.user.id,
      sId: sId,
    });

    if (dbError) {
      Alert.alert("Assignment could not be created, please try again");
      return;
    }

    Alert.alert("Assignment successfully created!");

    SetTitle('');
    SetDescription('');
    SetIsCompleted(false);

    SetIsSaving(false);

    router.back();
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: "Create Assignment",
          headerTitleStyle: defaultStyles.title
        }}
      />

      <View style={defaultStyles.container}>
        <Text style={defaultStyles.title}>Create New Assignment</Text>
        <KeyboardAvoidingView 
          className="flex-1 bg-gray-100"
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <ScrollView
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{
                flexGrow: 1,
                justifyContent: 'center',
                paddingHorizontal: 20,
                paddingVertical: 32,
              }}
            >
              <View className="rounded-3xl bg-white p-6 shadow-lg">
                <View className="mb-4">
                  <Text className="mb-2 text-sm font-semibold text-gray-700">
                    Title
                  </Text>
                  <TextInput
                    className="rounded-xl border border-gray-300 bg-gray-50 px-4 py-3 text-base text-gray-900"
                    placeholder="Enter title"
                    placeholderTextColor="#9ca3af"
                    value={title}
                    onChangeText={SetTitle}
                  />
                </View>

                <View className="mb-4">
                  <Text className="mb-2 text-sm font-semibold text-gray-700">
                    Description
                  </Text>
                  <TextInput
                    className="min-h-28 rounded-xl border border-gray-300 bg-gray-50 px-4 py-3 text-base text-gray-900"                      placeholder="Enter description"
                    placeholderTextColor="#9ca3af"
                    value={description}
                    onChangeText={SetDescription}
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
                    onChangeText={SetDeadline}
                  />
                </View>

                <Pressable
                  className={`mb-6 flex-row items-center rounded-xl border p-4
                    ${isCompleted
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-gray-300 bg-gray-50'
                    }`
                  }
                  onPress={() => SetIsCompleted((current) => !current)}
                >
                  <View
                    className={`mr-3 h-6 w-6 items-center justify-center rounded-md border-2 
                      ${isCompleted
                        ? 'border-blue-600 bg-blue-600' 
                        : 'border-gray-400 bg-white'
                      }`
                    }
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
                  onPress={CreateAssignment}
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
              </View>
            </ScrollView>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </View>
    </>
  );
}