import { defaultStyles } from '@/constants/defaultStyles';
import { supabase } from '@/lib/supabase';
import { router, Stack } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, Button, Keyboard, KeyboardAvoidingView, Platform, Pressable, Text, TextInput, TouchableWithoutFeedback, View } from 'react-native';

export default function CreateTask() {
  const [title, SetTitle] = useState('');
  const [description, SetDescription] = useState('');
  const [isActive, SetIsActive] = useState(true);
  const [isSaving, SetIsSaving] = useState(false);

  const CreateSubject = async () => {
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

    const { error: dbError } = await supabase.from("subjects").insert({
      title,
      description,
      isActive,
      lastChanged: new Date().toISOString(),
      uId: data.user.id,
    });

    if (dbError) {
      Alert.alert("Subject could not be created, please try again");
      return;
    }

    Alert.alert("Subject successfully created!");

    SetTitle('');
    SetDescription('');
    SetIsActive(false);

    SetIsSaving(false);

    router.back();
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: "Create Subject",
          headerTitleStyle: defaultStyles.title
        }}
      />

      <View style={defaultStyles.container}>
        <Text style={defaultStyles.title}>Create New Subject</Text>
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
                onPress={() => SetIsActive(state => !state)}
                style={defaultStyles.checkboxContainer}
              >
                <View style={defaultStyles.checkbox}>
                  {isActive && <Text style={defaultStyles.checkboxMark}>✓</Text>}
                </View>
                <Text style={defaultStyles.checkboxLabel}>{isActive ? 'Active' : 'Inactive'}</Text>
              </Pressable>

              <Button title={isSaving ? "Saving..." : "Save"} onPress={CreateSubject} disabled={isSaving} />
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

