import { defaultStyles } from '@/constants/defaultStyles';
import { supabase } from '@/lib/supabase';
import { Session } from '@supabase/supabase-js';
import { router, Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Button, Text, View } from "react-native";

type Task = {
  tId: string;
  title: string;
  description: string;
  isCompleted: boolean;
  lastChanged: string;
  uId: string;
  aId: string;
}

export default function ViewDetailsTask() {
  const { tId } = useLocalSearchParams<{ tId: string }>();
  const [task, SetTask] = useState<Task | null>(null)
  const [session, SetSession] = useState<Session | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => SetSession(data.session ?? null))
    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      SetSession(newSession)
    })
    return () => sub.subscription.unsubscribe()
    },
  [])

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
      if (session && tId) {
        GetTask(tId);
      }
    }, [session, tId])
  );

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
            router.back();
          }
        }
      ]
    )
  }

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

      {!task && (
        <View style={defaultStyles.container}>
          <Text style={defaultStyles.title}>Task not found</Text>
        </View>
      )}
      
      {task && (
        <View style={defaultStyles.container}>
          <Text style={defaultStyles.title}>{task.title}</Text>
          <Text style={defaultStyles.body}>{task.description}</Text>
          <View style={defaultStyles.checkbox}>
              {task.isCompleted && <Text style={defaultStyles.checkboxMark}>✓</Text>}
          </View>
          <Text style={defaultStyles.body}>{task.lastChanged}</Text>

          <View style={defaultStyles.buttonContainer}>
            <Button title="Edit" onPress={() => router.push({pathname: "/task/editTask", params: { tId: task.tId }})} />
            <Button title="Delete" onPress={() => DeleteTask(task.tId)} />
          </View>
        </View>
      )}
    </View>
  );
}