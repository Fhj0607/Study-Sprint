import { defaultStyles } from '@/constants/defaultStyles';
import { CheckSubjectCompletion } from '@/lib/progress';
import { supabase } from '@/lib/supabase';
import type { Assignment, Subject } from '@/lib/types';
import { Session } from '@supabase/supabase-js';
import { router, Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Button, Pressable, SectionList, Text, View } from "react-native";

export default function ViewDetailsSubject() {
  const { sId } = useLocalSearchParams<{ sId: string }>();
  const [subject, SetSubject] = useState<Subject | null>(null)
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

  const GetSubject = async (sId: string) => { 
    const { data, error } = await supabase.from("subjects").select("*").eq("sId", sId).single();

    if (error) {
      Alert.alert("Subject could not be fetched, please try again");
      return;
    }

    SetSubject(data ?? null);
  }

  const GetAssignments = async (sId: string) => { 
    const { data, error } = await supabase.from("assignments").select("*").eq("sId", sId).order("deadline", { ascending: true });

    if (error) {
      Alert.alert("Assignments could not be fetched, please try again");
      return;
    }

    SetAssignments(data ?? []);
  }

  useFocusEffect(
    useCallback(() => {
      if (session && sId) {
        GetSubject(sId);
        GetAssignments(sId);
      }
    }, [session, sId])
  );

  const DeleteSubject = async (sId: string) => {
    Alert.alert(
      "Delete Subject",
      "Are you sure you want to delete this subject?",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            const { error } = await supabase.from("subjects").delete().eq("sId", sId);

            if (error) {
              Alert.alert("Subject could not be deleted, please try again");
              return;
            }

            Alert.alert("Subject deleted successfully!");
            router.back();
          }
        }
      ]
    )
  }

  const DeleteAssignment = async (aId: string, sId: string) => {
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
            
            if (sId) {
              try {
                await CheckSubjectCompletion(sId);
              } catch {
                Alert.alert("Failed to update subject status");
              }
            }

            GetAssignments(sId);
          }
        }
      ]
    )
  }

  const progress = assignments.length === 0 ? 0 : Math.round((assignments.filter(assignment => assignment.isCompleted).length / assignments.length) * 100);

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

      {!subject && (
        <View style={defaultStyles.container}>
          <Text style={defaultStyles.title}>Subject not found</Text>
        </View>
      )}
      
      {subject && (
        <View style={defaultStyles.container}>
          <View style={defaultStyles.container}>
            <Text style={defaultStyles.title}>{subject.title}</Text>
            <Text style={defaultStyles.body}>{subject.description}</Text>
            <View style={defaultStyles.checkbox}>
                {subject.isActive && <Text style={defaultStyles.checkboxMark}>✓</Text>}
            </View>
            <Text style={defaultStyles.body}>{subject.lastChanged}</Text>
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

            <Button title="Edit" onPress={() => router.push({pathname: "/subject/editSubject", params: { sId: subject.sId }})} />
            <Button title="Delete" onPress={() => DeleteSubject(subject.sId)} />

            <View style={defaultStyles.buttonContainer}>
              <Button title="Create Assignment" onPress={() => router.push({pathname: "/assignment/createAssignment", params: { sId: subject.sId }})} />
            </View>
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
                      <Button title="Delete" onPress={() => DeleteAssignment(item.aId, item.sId)} />
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