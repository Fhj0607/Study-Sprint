import { defaultStyles } from '@/constants/defaultStyles';
import { GetAssignmentNotificationId, RemoveAssignmentNotificationId, SaveAssignmentNotificationId } from '@/lib/asyncStorage';
import { CheckSubjectCompletion } from '@/lib/progress';
import { supabase } from '@/lib/supabase';
import type { Assignment } from '@/lib/types';
import * as Notifications from 'expo-notifications';
import { router, Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Button, Keyboard, KeyboardAvoidingView, Platform, Pressable, Text, TextInput, TouchableWithoutFeedback, View } from 'react-native';

export default function EditAssignment() {
  const { aId } = useLocalSearchParams<{ aId: string }>();
  const [assignment, SetAssignment] = useState<Assignment | null>(null)
  const [isSaving, SetIsSaving] = useState(false);

  const ScheduleDeadlineReminder = async (aId: string, title: string, deadline: string) => {
    const dl = new Date(deadline);

    if (isNaN(dl.getTime())) return null;

    const deadlineReminder = new Date(dl.getTime() - 24 * 60 * 60 * 1000);

      if (deadlineReminder <= new Date()) return null;

    const nId = await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Assignment deadline coming up',
        body: `${title} is due in 24 hours.`,
        data: { aId },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: deadlineReminder,
      },
    });

    return nId;
  }  

  const CancelDeadlineReminder = async (aId: string) => {
    const nId = await GetAssignmentNotificationId(aId);

    if (!nId) return;

    await Notifications.cancelScheduledNotificationAsync(nId);
    await RemoveAssignmentNotificationId(aId);
  }

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
        
    const { data: userData, error: userError } = await supabase.auth.getUser();

    if(userError || !userData.user) {
      router.replace("../createUser");
      return;
    } 

    SetIsSaving(true);

    const { data: assignmentData, error: dbError } = await supabase.from("assignments").update({
      title: assignment.title,
      description: assignment.description,
      deadline: assignment.deadline,
      isCompleted: assignment.isCompleted,
      lastChanged: new Date().toISOString(),
      uId: userData.user.id,
      sId: assignment.sId,
    })
    .eq("aId", aId)
    .select()
    .single();

    SetIsSaving(false);

    if (dbError) {
      Alert.alert("Assignment could not be edited, please try again");
      return;
    }

    Alert.alert("Assignment successfully edited!");

    if (assignmentData) {
      await CancelDeadlineReminder(assignmentData.aId);

      if (!assignmentData.isCompleted) {
        const nId = await ScheduleDeadlineReminder(assignmentData.aId, assignmentData.title, assignmentData.deadline);

        if (nId) {
          await SaveAssignmentNotificationId(assignmentData.aId, nId);
        }
      }
    }

    if (assignmentData.sId) {
      try {
        await CheckSubjectCompletion(assignmentData.sId);
      } catch {
        Alert.alert("Failed to update subject status");
      }
    }

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
                  testID="assignment-title-input"
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

                <Button testID="edit-assignment-button" title={isSaving ? "Saving..." : "Save"} onPress={EditAssignment} disabled={isSaving} />
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

