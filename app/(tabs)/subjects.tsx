import { defaultStyles } from "@/constants/defaultStyles";
import { supabase } from "@/lib/supabase";
import { Ionicons } from '@expo/vector-icons';
import { Session } from "@supabase/supabase-js";
import { router, Stack, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Alert, Button, Pressable, SectionList, Text, View } from "react-native";

type Subject = {
  sId: string;
  title: string;
  description: string;
  isActive: boolean;
  lastChanged: string;
  uId: string;
}

export default function Subjects() {
  const [subjects, SetSubject] = useState<Subject[]>([])
  const [session, SetSession] = useState<Session | null>(null)

  const subjectSections = [
    { title: "Active Subjects", data: subjects.filter((subject) => !subject.isActive), emptyMessage: "No active subjects" },
    { title: "Inactive Subjects", data: subjects.filter((subject) => subject.isActive), emptyMessage: "No inactive subjects" },
  ];

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => SetSession(data.session ?? null))
    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      SetSession(newSession)
    })
    return () => sub.subscription.unsubscribe()
    },
  [])

  const GetSubjects = async () => { 
    const { data, error } = await supabase.from("subjects").select("*");

    if (error) {
      Alert.alert("Subjects could not be fetched, please try again");
      return;
    }

    SetSubject(data ?? []);
  }

  useFocusEffect(
    useCallback(() => {
      if (session) {
        GetSubjects();
      }
    }, [session])
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
            GetSubjects();
          }
        }
      ]
    )
  }

  return (
    <View style={defaultStyles.container}>
      <Stack.Screen
        options={{
          title: "Subjects",
          headerTitleStyle: defaultStyles.title,
          headerRight: () => {
            return (
              <View style={defaultStyles.buttonContainer}>
                <Pressable style={defaultStyles.circularButton} onPress={GetSubjects}>
                  <Ionicons name="refresh" size={22} color="#333" />
                </Pressable>
                <Button title="Logout" onPress={async () => await supabase.auth.signOut()} />
              </View>
            )
          },
        }}
      />

      <View style={defaultStyles.buttonContainer}>
        <Button title="Create Subject" onPress={() => router.push("/subject/createSubject")} />
      </View>

      <SectionList
        sections={subjectSections}
        keyExtractor={(item) => item.sId}
        renderSectionHeader={({ section: { title } }) => <Text style={defaultStyles.subtitle}>{title}</Text>}
        renderItem={({ item }) => {
          const isOwner = session?.user.id === item.uId;

          return (
            <View style={defaultStyles.container}>
              <Pressable style={defaultStyles.buttonContainer} onPress={() => router.push({pathname: "/subject/viewDetailsSubject", params: { sId: item.sId }})}>
                <Text style={defaultStyles.title}>{item.title}</Text>
                <View style={defaultStyles.checkbox}>
                  {item.isActive && <Text style={defaultStyles.checkboxMark}>✓</Text>}
                </View>
              </Pressable>
              
              {isOwner && (
                <View style={defaultStyles.buttonContainer}>
                  <Button title="Edit" onPress={() => router.push({pathname: "/subject/editSubject", params: { sId: item.sId }})} />
                  <Button title="Delete" onPress={() => DeleteSubject(item.sId)} />
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
