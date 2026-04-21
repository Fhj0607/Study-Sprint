import { defaultStyles } from '@/constants/defaultStyles';
import { supabase } from '@/lib/supabase';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, Button, Keyboard, KeyboardAvoidingView, Platform, Pressable, Text, TextInput, TouchableWithoutFeedback, View } from 'react-native';

export default function CreateTask() {
  const aId = (useLocalSearchParams().aId as string) ?? null;
  const [title, SetTitle] = useState('');
  const [description, SetDescription] = useState('');
  const [isCompleted, SetIsCompleted] = useState(false);
  const [isSaving, SetIsSaving] = useState(false);

  const CreateTask = async () => {
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

    const { error: dbError } = await supabase.from("tasks").insert({
      title,
      description,
      isCompleted,
      lastChanged: new Date().toISOString(),
      uId: data.user.id,
      aId: aId,
    });

    if (dbError) {
      Alert.alert("Task could not be created, please try again");
      return;
    }

    Alert.alert("Task successfully created!");

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
          title: "Create Task",
          headerTitleStyle: defaultStyles.title
        }}
      />

      <View style={defaultStyles.container}>
        <Text style={defaultStyles.title}>Create New Task</Text>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={defaultStyles.container}>
              <TextInput
                style={defaultStyles.inputText}
                placeholder="Enter title"
                value={title}
                onChangeText={SetTitle}
              />
              <TextInput
                style={defaultStyles.inputText}
                placeholder="Enter description"
                value={description}
                onChangeText={SetDescription}
              />

              <Pressable
                onPress={() => SetIsCompleted(state => !state)}
                style={defaultStyles.checkboxContainer}
              >
                <View style={defaultStyles.checkbox}>
                  {isCompleted && <Text style={defaultStyles.checkboxMark}>✓</Text>}
                </View>
                <Text style={defaultStyles.checkboxLabel}>{isCompleted ? 'Completed' : 'Not completed'}</Text>
              </Pressable>

              <Button title={isSaving ? "Saving..." : "Save"} onPress={CreateTask} disabled={isSaving} />
              {isSaving && (
                <ActivityIndicator size="large" />
              )}
              <Button title="Cancel" onPress={() => router.back()} />
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </View>
    </>
  )
}

