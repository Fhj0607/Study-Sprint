import { defaultStyles } from "@/constants/defaultStyles";
import { supabase } from "@/lib/supabase";
import { Ionicons } from '@expo/vector-icons';
import { Session } from "@supabase/supabase-js";
import { router, Stack, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Alert, Button, Pressable, SectionList, Text, View } from "react-native";

type Task = {
  tId: string;
  title: string;
  description: string;
  isCompleted: boolean;
  lastChanged: string;
  deadline: string;
  uId: string;
}

export default function Tasks() {
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

  useFocusEffect(
    useCallback(() => {
      if (session) {
        GetTasks();
      }
    }, [session])
  );

  const GetTasks = async () => { 
    const { data, error } = await supabase.from("tasks").select("tId, title, description, isCompleted,lastChanged, deadline, uId").order("deadline", { ascending: false });

    if (error) {
      Alert.alert("Task could not be fetched, please try again");
      return;
    }

    SetTasks(data ?? []);
  }

  const DeleteTask = async (tId: string) => {
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
            GetTasks();
          }
        }
      ]
    )
  }

  return (
    <View style={defaultStyles.container}>
      <Stack.Screen
        options={{
          title: "Tasks",
          headerTitleStyle: defaultStyles.title,
          headerRight: () => {
            return (
              <View style={defaultStyles.buttonContainer}>
                <Pressable style={defaultStyles.circularButton} onPress={GetTasks}>
                  <Ionicons name="refresh" size={22} color="#333" />
                </Pressable>
                <Button title="Logout" onPress={async () => await supabase.auth.signOut()} />
              </View>
            )
          },
        }}
      />

      <View style={defaultStyles.buttonContainer}>
        <Button title="Create Task" onPress={() => router.push("/createTask")} />
      </View>

      <SectionList
        sections={taskSections}
        keyExtractor={(item) => item.tId}
        renderSectionHeader={({ section: { title } }) => <Text style={defaultStyles.subtitle}>{title}</Text>}
        renderItem={({ item }) => {
          const isOwner = session?.user.id === item.uId;

          return (
            <View style={defaultStyles.container}>
              <Text style={defaultStyles.boldBody}>{item.title}</Text>
              <Text style={defaultStyles.body}>{item.deadline}</Text> 

              {isOwner && (
                <View style={defaultStyles.buttonContainer}>
                  <Button title="Edit" onPress={() => router.push({pathname: "/editTask", params: { tId: item.tId }})} />
                  <Button title="Delete" onPress={() => DeleteTask(item.tId)} />
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
  )
}
