import { supabase } from '@/lib/supabase';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, Button, Keyboard, KeyboardAvoidingView, Platform, Pressable, Text, TextInput, TouchableWithoutFeedback, View } from 'react-native';

export default function CreateAssignment() {
  const sId = (useLocalSearchParams().sId as string) ?? null;
  const [title, SetTitle] = useState('');
  const [description, SetDescription] = useState('');
  const [deadline, SetDeadline] = useState('');
  const [isCompleted, SetIsCompleted] = useState(false);
  const [isSaving, SetIsSaving] = useState(false);

  const CreateAssignment = async () => {
    if(title.trim() === '' || deadline.trim() === '') {
      Alert.alert("Title and deadline are required!");
      return;
    }

    setIsSaving(true);

    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();

      if (userError || !userData.user) {
        router.replace('../createUser');
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
    SetDeadline('');
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

              <Button title={isSaving ? "Saving..." : "Save"} onPress={CreateAssignment} disabled={isSaving} />
              {isSaving && (
                <ActivityIndicator size="large" />
              )}
              <Button title="Cancel" onPress={() => router.back()} />
            </View>
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </>
  );
}