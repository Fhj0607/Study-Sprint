import { defaultStyles } from '@/constants/defaultStyles';
import { CheckAssignmentCompletion, CheckSubjectCompletion } from '@/lib/progress';
import { supabase } from '@/lib/supabase';
import type { Assignment, Task } from '@/lib/types';
import { Session } from '@supabase/supabase-js';
import { router, Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Button, Pressable, SectionList, Text, View } from "react-native";

export default function ViewDetailsAssignment() {
  const { aId } = useLocalSearchParams<{ aId: string }>();
  const [assignment, SetAssignment] = useState<Assignment | null>(null)
  const [tasks, SetTasks] = useState<Task[]>([])
  const [session, SetSession] = useState<Session | null>(null)

  const taskSections = [
    { title: "Upcoming Tasks", data: tasks.filter((task) => !task.isCompleted), emptyMessage: "No upcoming tasks" },
    { title: "Completed Tasks", data: tasks.filter((task) => task.isCompleted), emptyMessage: "No completed tasks" },
  ];

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => SetSession(data.session ?? null))
    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      SetSession(newSession)
    })
    return () => sub.subscription.unsubscribe()
    },
  [])

  const GetAssignment = async (aId: string) => { 
    const { data, error } = await supabase.from("assignments").select("*").eq("aId", aId).single();

    if (error) {
      Alert.alert("Assignment could not be fetched, please try again");
      return;
    }

    SetAssignment(data ?? null);
  }

  const GetTasks = async (aId: string) => { 
    const { data, error } = await supabase.from("tasks").select("*").eq("aId", aId);

    if (error) {
      Alert.alert("Tasks could not be fetched, please try again");
      return;
    }

    SetTasks(data ?? []);
  }

  useFocusEffect(
    useCallback(() => {
      if (session && aId) {
        GetAssignment(aId);
        GetTasks(aId);
      }
    }, [session, aId])
  );

  const DeleteAssignment = async (aId: string) => {
    Alert.alert(
      "Delete Assignment",
      "Are you sure you want to delete this assignment?",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            const { error } = await supabase.from("assignments").delete().eq("aId", aId);

            if (error) {
              Alert.alert("Assignment could not be deleted, please try again");
              return;
            }

            Alert.alert("Assignment deleted successfully!");

            const sId = assignment?.sId;

            if (sId) {
              try {
                await CheckSubjectCompletion(sId);
              } catch {
                Alert.alert("Failed to update subject status");
              }
            }

            router.back();
          }
        }
      ]
    )
  }

  const DeleteTask = async (tId: string, aId: string) => {
    Alert.alert(
      "Delete Task",
      "Are you sure you want to delete this task?",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            const { error } = await supabase.from("tasks").delete().eq("tId", tId);

            if (error) {
              Alert.alert("Task could not be deleted, please try again");
              return;
            }

            Alert.alert("Task deleted successfully!");
            
            if (aId) {
              try {
                await CheckAssignmentCompletion(aId);
              } catch {
                Alert.alert("Failed to update assignment completion state");
              }
            }

            GetTasks(aId);
          }
        }
      ]
    )
  }

  const progress = tasks.length === 0 ? 0 : Math.round((tasks.filter(task => task.isCompleted).length / tasks.length) * 100);

  return (
    <View style={defaultStyles.container}>
      <Stack.Screen
        options={{
          title: "Details",
          headerTitleStyle: defaultStyles.title,
          headerLeft: () => {
            return (
              <View style={defaultStyles.buttonContainer}>
                <Button title="Back" onPress={router.back} />
              </View>
            )
          },
          headerRight: () => {
            return (
              <View style={defaultStyles.buttonContainer}>
                <Button title="Logout" onPress={async () => await supabase.auth.signOut()} />
              </View>
            )
          },
        }}
      />

      {!assignment && (
        <View style={defaultStyles.container}>
          <Text style={defaultStyles.title}>Assignment not found</Text>
        </View>
      )}
      
      {assignment && (
        <View style={defaultStyles.container}>
          <View style={defaultStyles.container}>
            <Text style={defaultStyles.title}>{assignment.title}</Text>
            <Text style={defaultStyles.body}>{assignment.description}</Text>
            <Text style={defaultStyles.body}>{assignment.deadline}</Text>
            <View style={defaultStyles.checkbox}>
                {assignment.isCompleted && <Text style={defaultStyles.checkboxMark}>✓</Text>}
            </View>
            <Text style={defaultStyles.body}>{assignment.lastChanged}</Text>
            <View style={{ marginTop: 10 }}>
              <Text style={{ marginBottom: 4 }}>{progress}%</Text>
              
              <View
                style={{
                  width: "100%",
                  height: 12,
                  backgroundColor: "#D9D9D9",
                  borderRadius: 999,
                  overflow: "hidden",
                }}
              >
                <View
                  style={{
                    width: `${progress}%`,
                    height: "100%",
                    backgroundColor: "#4CAF50",
                  }}
                />
              </View>
            </View>

            <Button title="Edit" onPress={() => router.push({pathname: "/assignment/editAssignment", params: { aId: assignment.aId }})} />
            <Button testID = "delete-assignment-button" title="Delete" onPress={() => DeleteAssignment(assignment.aId)} />
          </View>

          <View style={defaultStyles.buttonContainer}>
            <Button title="Create Task" onPress={() => router.push({pathname: "/task/createTask", params: { aId: assignment.aId }})} />
          </View>

          <SectionList
            sections={taskSections}
            keyExtractor={(item) => item.tId}
            renderSectionHeader={({ section: { title } }) => <Text style={defaultStyles.subtitle}>{title}</Text>}
            renderItem={({ item }) => {
              const isOwner = session?.user.id === item.uId;
          
              return (
                <View style={defaultStyles.container}>
                  <Pressable style={defaultStyles.container} onPress={() => router.push({pathname: "/task/viewDetailsTask", params: { tId: item.tId }})}>
                    <Text style={defaultStyles.boldBody}>{item.title}</Text>
                    <View style={defaultStyles.checkbox}>
                      {item.isCompleted && <Text style={defaultStyles.checkboxMark}>✓</Text>}
                    </View>
                  </Pressable>
          
                  {isOwner && (
                    <View style={defaultStyles.buttonContainer}>
                      <Button title="Edit" onPress={() => router.push({pathname: "/task/editTask", params: { tId: item.tId }})} />
                      <Button title="Delete" onPress={() => DeleteTask(item.tId, item.aId)} />
                    </View>
                  )}
                </View>
              );
            }}
            renderSectionFooter={({ section }) =>
              section.data.length === 0 ? (
                <View style={defaultStyles.container}>
                  <Text style={defaultStyles.body}>{section.emptyMessage}</Text>
                  <View style={defaultStyles.separator} />
                </View>
              ) : (
                <View style={defaultStyles.separator} />
              )
            }
          />
        </View>
      )}
    </View>
  );
}