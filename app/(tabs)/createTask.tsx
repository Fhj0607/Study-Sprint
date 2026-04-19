import { defaultStyles } from '@/constants/defaultStyles';
import { supabase } from '@/lib/supabase';
import { router, Stack } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, Button, Keyboard, KeyboardAvoidingView, Platform, Pressable, Text, TextInput, TouchableWithoutFeedback, View } from 'react-native';

export default function CreateTask() {
  const [title, SetTitle] = useState('');
  const [description, SetDescription] = useState('');
  const [isCompleted, SetIsCompleted] = useState(false);
  const [deadline, SetDeadline] = useState('');
  const [isSaving, SetIsSaving] = useState(false);

  const AddNote = async () => {
    if(title.trim() === '' || description.trim() === '' || deadline.trim() === '') {
      Alert.alert("All fields are required!");
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
      deadline,
      uId: data.user.id,
    });

    if (dbError) {
      Alert.alert("Task could not be created, please try again");
      SetIsSaving(false);
      return;
    }

    Alert.alert("Task successfully added!");

    SetTitle('');
    SetDescription('');
    SetIsCompleted(false);
    SetDeadline('');

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
              <TextInput
                style={defaultStyles.inputText}
                placeholder="Deadline (YYYY-MM-DD)"
                value={deadline}
                onChangeText={SetDeadline}
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

              <Button title={isSaving ? "Saving..." : "Save"} onPress={AddNote} disabled={isSaving} />
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

