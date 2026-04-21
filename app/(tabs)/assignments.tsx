import { defaultStyles } from "@/constants/defaultStyles";
import { supabase } from "@/lib/supabase";
import { Ionicons } from '@expo/vector-icons';
import { Session } from "@supabase/supabase-js";
import { router, Stack, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Alert, Button, Pressable, SectionList, Text, View } from "react-native";

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

export default function Assignments() {
  const [assignments, SetAssignments] = useState<Assignment[]>([])
  const [session, SetSession] = useState<Session | null>(null)

  const assignmentSections = [
    { title: "Upcoming Assignments", data: assignments.filter((assignment) => !assignment.isCompleted), emptyMessage: "No upcoming assignments" },
    { title: "Completed Assignments", data: assignments.filter((assignment) => assignment.isCompleted), emptyMessage: "No completed assignments" },
  ];

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => SetSession(data.session ?? null))
    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      SetSession(newSession)
    })
    return () => sub.subscription.unsubscribe()
    },
  [])

  const GetAssignments = async () => { 
    const { data, error } = await supabase.from("assignments").select("*").order("deadline", { ascending: false });

    if (error) {
      Alert.alert("Assignments could not be fetched, please try again");
      return;
    }

    SetAssignments(data ?? []);
  }

  useFocusEffect(
    useCallback(() => {
      if (session) {
        GetAssignments();
      }
    }, [session])
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
            GetAssignments();
          }
        }
      ]
    )
  }

  return (
    <View style={defaultStyles.container}>
      <Stack.Screen
        options={{
          title: "Assignments",
          headerTitleStyle: defaultStyles.title,
          headerRight: () => {
            return (
              <View style={defaultStyles.buttonContainer}>
                <Pressable style={defaultStyles.circularButton} onPress={GetAssignments}>
                  <Ionicons name="refresh" size={22} color="#333" />
                </Pressable>
                <Button title="Logout" onPress={async () => await supabase.auth.signOut()} />
              </View>
            )
          },
        }}
      />

      <View style={defaultStyles.buttonContainer}>
        <Button title="Create Assignment" onPress={() => router.push("/assignment/createAssignment")} />
      </View>

      <SectionList
        sections={assignmentSections}
        keyExtractor={(item) => item.aId}
        renderSectionHeader={({ section: { title } }) => <Text style={defaultStyles.subtitle}>{title}</Text>}
        renderItem={({ item }) => {
          const isOwner = session?.user.id === item.uId;

          return (
            <View style={defaultStyles.container}>
              <Pressable style={defaultStyles.container} onPress={() => router.push({pathname: "/assignment/viewDetailsAssignment", params: { aId: item.aId }})}>
                <Text style={defaultStyles.boldBody}>{item.title}</Text>
                <Text style={defaultStyles.body}>{item.deadline}</Text>
                <View style={defaultStyles.checkbox}>
                  {item.isCompleted && <Text style={defaultStyles.checkboxMark}>✓</Text>}
                </View>
              </Pressable>
              
              {isOwner && (
                <View style={defaultStyles.buttonContainer}>
                  <Button title="Edit" onPress={() => router.push({pathname: "/assignment/editAssignment", params: { aId: item.aId }})} />
                  <Button title="Delete" onPress={() => DeleteAssignment(item.aId)} />
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
