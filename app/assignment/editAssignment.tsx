import { defaultStyles } from '@/constants/defaultStyles';
import { supabase } from '@/lib/supabase';
import { router, Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Button, Keyboard, KeyboardAvoidingView, Platform, Pressable, Text, TextInput, TouchableWithoutFeedback, View } from 'react-native';

type Assignment = {
  aId: string;
  title: string;
  description: string;
  deadline: string;
  isCompleted: boolean;
  lastChanged: string;
  uId: string;
  sId: string;
}

export default function EditAssignment() {
  const { aId } = useLocalSearchParams<{ aId: string }>();
  const [assignment, SetAssignment] = useState<Assignment | null>(null)
  const [isSaving, SetIsSaving] = useState(false);

  const GetAssignment = async (aId: string) => { 
    const { data, error } = await supabase.from("assignments").select("*").eq("aId", aId).single();

    if (error) {
      Alert.alert("Assignment could not be fetched, please try again");
      return;
    }

    SetAssignment(data ?? null);
  }

  useFocusEffect(
    useCallback(() => {
      if (aId) {
        GetAssignment(aId);
      }
    }, [aId])
  );

  const EditAssignment = async () => {
    if (!assignment) return;

    if(assignment.title.trim() === '' || assignment.deadline.trim() === '') {
      Alert.alert("Title and deadline are required!");
      return;
    }
        
    const { data, error: userError } = await supabase.auth.getUser();

    if(userError || !data.user) {
      router.replace("../createUser");
      return;
    } 

    SetIsSaving(true);

    const { error: dbError } = await supabase.from("assignments").update({
      title: assignment.title,
      description: assignment.description,
      deadline: assignment.deadline,
      isCompleted: assignment.isCompleted,
      lastChanged: new Date().toISOString(),
      uId: data.user.id,
      sId: assignment.sId,
    }).eq("aId", aId);

    SetIsSaving(false);

    if (dbError) {
      Alert.alert("Assignment could not be edited, please try again");
      return;
    }

    Alert.alert("Assignment successfully edited!");

    router.back();
  }

  return (
    <View style={defaultStyles.container}>
      <Stack.Screen
        options={{
          title: "Edit Assignment",
          headerTitleStyle: defaultStyles.title
        }}
      />

      {!assignment && (
        <View style={defaultStyles.container}>
          <Text style={defaultStyles.title}>Assignment not found</Text>
        </View>
      )}

      {assignment && (
        <View style={defaultStyles.container}>
          <Text style={defaultStyles.title}>Edit Assignment</Text>
          <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
              <View style={defaultStyles.container}>
                <TextInput
                  style={defaultStyles.inputText}
                  placeholder="Title"
                  value={assignment.title}
                  onChangeText={(text) => SetAssignment(prev => prev ? { ...prev, title: text } : prev)}
                />
                <TextInput
                  style={defaultStyles.inputText}
                  placeholder="Text"
                  value={assignment.description}
                  onChangeText={(text) => SetAssignment(prev => prev ? { ...prev, description: text } : prev)}
                />
                <TextInput
                  style={defaultStyles.inputText}
                  placeholder="Text"
                  value={assignment.deadline}
                  onChangeText={(text) => SetAssignment(prev => prev ? { ...prev, deadline: text } : prev)}
                />
                <Pressable
                  onPress={() => SetAssignment(prev => prev ? { ...prev, isCompleted: !prev.isCompleted } : prev)}
                  style={defaultStyles.checkboxContainer}
                >
                  <View style={defaultStyles.checkbox}>
                    {assignment.isCompleted && <Text style={defaultStyles.checkboxMark}>✓</Text>}
                  </View>
                  <Text style={defaultStyles.checkboxLabel}>{assignment.isCompleted ? 'Completed' : 'Not Completed'}</Text>
                </Pressable>

                <Button title={isSaving ? "Saving..." : "Save"} onPress={EditAssignment} disabled={isSaving} />
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

