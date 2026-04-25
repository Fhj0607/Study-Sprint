import { defaultStyles } from '@/constants/defaultStyles';
import { supabase } from '@/lib/supabase';
import { router, Stack } from 'expo-router';
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

export default function CreateSubject() {
  const [title, SetTitle] = useState('');
  const [description, SetDescription] = useState('');
  const [isActive, SetIsActive] = useState(true);
  const [isSaving, SetIsSaving] = useState(false);

  const CreateSubject = async () => {
    if (title.trim() === '') {
      Alert.alert('Title is required!');
      return;
    }

    const { data, error: userError } = await supabase.auth.getUser();

    if (userError || !data.user) {
      router.replace('../createUser');
      return;
    }

    SetIsSaving(true);

    const { error: dbError } = await supabase.from('subjects').insert({
      title: title.trim(),
      description: description.trim(),
      isActive,
      lastChanged: new Date().toISOString(),
      uId: data.user.id,
    });

    if (dbError) {
      SetIsSaving(false);
      Alert.alert('Subject could not be created, please try again');
      return;
    }

    Alert.alert('Subject successfully created!');

    SetTitle('');
    SetDescription('');
    SetIsActive(true);
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
          title: 'Create Subject',
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
                Create Subject
              </Text>
              <Text className="mt-2 text-base leading-6 text-text-secondary">
                Add a subject to organize your assignments and study tasks.
              </Text>
            </View>

            <View className="rounded-3xl border border-app-border bg-app-surface p-5 shadow-sm">
              <View className="mb-5">
                <Text className={labelClassName}>Title</Text>
                <TextInput
                  testID="subject-title-input"
                  className={inputClassName}
                  placeholder="Enter subject title"
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

              <Pressable
                onPress={() => SetIsActive((state) => !state)}
                disabled={isSaving}
                className={`mb-6 flex-row items-center rounded-2xl border p-4 ${
                  isActive
                    ? 'border-accent bg-accent-soft'
                    : 'border-app-border bg-app-subtle'
                }`}
              >
                <View
                  className={`mr-3 h-6 w-6 items-center justify-center rounded-md border-2 ${
                    isActive
                      ? 'border-accent bg-accent'
                      : 'border-app-border bg-app-surface'
                  }`}
                >
                  {isActive && (
                    <Text className="text-sm font-bold text-text-inverse">
                      ✓
                    </Text>
                  )}
                </View>

                <View className="flex-1">
                  <Text className="text-base font-semibold text-text-main">
                    Active subject
                  </Text>
                  <Text className="mt-1 text-sm text-text-muted">
                    Active subjects appear in your main study workflow.
                  </Text>
                </View>
              </Pressable>

              <Pressable
                testID="create-subject-button"
                className={`h-14 items-center justify-center rounded-2xl ${
                  isSaving ? 'bg-accent-disabled' : 'bg-accent'
                }`}
                onPress={CreateSubject}
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
                    Create Subject
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