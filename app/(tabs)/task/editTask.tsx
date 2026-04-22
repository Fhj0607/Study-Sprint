import { defaultStyles } from '@/constants/defaultStyles';
import { supabase } from '@/lib/supabase';
import { router, Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Button, Keyboard, KeyboardAvoidingView, Platform, Pressable, Text, TextInput, TouchableWithoutFeedback, View } from 'react-native';

type Task = {
  tId: string;
  title: string;
  description: string;
  isCompleted: boolean;
  lastChanged: string;
  uId: string;
  aId: string;
}

export default function EditTask() {
  const { tId } = useLocalSearchParams<{ tId: string }>();
  const [task, SetTask] = useState<Task | null>(null)
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

    Alert.alert("Task successfully edited!");

    router.back();
  }

  return (
    <View style={defaultStyles.container}>
      <Stack.Screen
        options={{
          title: "Edit Task",
          headerTitleStyle: defaultStyles.title
        }}
      />

      {!task && (
        <View style={defaultStyles.container}>
          <Text style={defaultStyles.title}>Task not found</Text>
        </View>
      )}

      {task && (
        <View style={defaultStyles.container}>
          <Text style={defaultStyles.title}>Edit Task</Text>
          <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
              <View style={defaultStyles.container}>
                <TextInput
                  style={defaultStyles.inputText}
                  placeholder="Title"
                  value={task.title}
                  onChangeText={(text) => SetTask(prev => prev ? { ...prev, title: text } : prev)}
                />
                <TextInput
                  style={defaultStyles.inputText}
                  placeholder="Text"
                  value={task.description}
                  onChangeText={(text) => SetTask(prev => prev ? { ...prev, description: text } : prev)}
                />
                <Pressable
                  onPress={() => SetTask(prev => prev ? { ...prev, isCompleted: !prev.isCompleted } : prev)}
                  style={defaultStyles.checkboxContainer}
                >
                  <View style={defaultStyles.checkbox}>
                    {task.isCompleted && <Text style={defaultStyles.checkboxMark}>✓</Text>}
                  </View>
                  <Text style={defaultStyles.checkboxLabel}>{task.isCompleted ? 'Completed' : 'Not Completed'}</Text>
                </Pressable>

                <Button title={isSaving ? "Saving..." : "Save"} onPress={EditTask} disabled={isSaving} />
                {isSaving && (
                  <ActivityIndicator size="large" />
                )}
                <Button title="Cancel" onPress={() => router.back()} />
              </View>
            </TouchableWithoutFeedback>
          </KeyboardAvoidingView>
        </View>
      )}
    </View>
  )
}

