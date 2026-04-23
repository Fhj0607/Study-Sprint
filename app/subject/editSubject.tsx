import { defaultStyles } from '@/constants/defaultStyles';
import { supabase } from '@/lib/supabase';
import type { Subject } from '@/lib/types';
import { router, Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Button, Keyboard, KeyboardAvoidingView, Platform, Pressable, Text, TextInput, TouchableWithoutFeedback, View } from 'react-native';

export default function EditSubject() {
  const { sId } = useLocalSearchParams<{ sId: string }>();
  const [subject, SetSubject] = useState<Subject | null>(null)
  const [isSaving, SetIsSaving] = useState(false);

  const GetSubject = async (sId: string) => { 
    const { data, error } = await supabase.from("subjects").select("*").eq("sId", sId).single();

    if (error) {
      Alert.alert("Subject could not be fetched, please try again");
      return;
    }

    SetSubject(data ?? null);
  }

  useFocusEffect(
    useCallback(() => {
      if (sId) {
        GetSubject(sId);
      }
    }, [sId])
  );

  const EditSubject = async () => {
    if (!subject) return;

    if(subject.title.trim() === '') {
      Alert.alert("Title is required!");
      return;
    }
        
    const { data, error: userError } = await supabase.auth.getUser();

    if(userError || !data.user) {
      router.replace("../createUser");
      return;
    } 

    SetIsSaving(true);

    const { error: dbError } = await supabase.from("subjects").update({
      title: subject.title,
      description: subject.description,
      isActive: subject.isActive,
      lastChanged: new Date().toISOString(),
      uId: data.user.id,
    }).eq("sId", sId);

    SetIsSaving(false);

    if (dbError) {
      Alert.alert("Subject could not be edited, please try again");
      return;
    }

    Alert.alert("Subject successfully edited!");

    router.back();
  }

  return (
    <View style={defaultStyles.container}>
      <Stack.Screen
        options={{
          title: "Edit Subject",
          headerTitleStyle: defaultStyles.title
        }}
      />

      {!subject && (
        <View style={defaultStyles.container}>
          <Text style={defaultStyles.title}>Subject not found</Text>
        </View>
      )}

      {subject && (
        <View style={defaultStyles.container}>
          <Text style={defaultStyles.title}>Edit Subject</Text>
          <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
              <View style={defaultStyles.container}>
                <TextInput
                  style={defaultStyles.inputText}
                  placeholder="Title"
                  value={subject.title}
                  onChangeText={(text) => SetSubject(prev => prev ? { ...prev, title: text } : prev)}
                />
                <TextInput
                  style={defaultStyles.inputText}
                  placeholder="Text"
                  value={subject.description}
                  onChangeText={(text) => SetSubject(prev => prev ? { ...prev, description: text } : prev)}
                />
                <Pressable
                  onPress={() => SetSubject(prev => prev ? { ...prev, isActive: !prev.isActive } : prev)}
                  style={defaultStyles.checkboxContainer}
                >
                  <View style={defaultStyles.checkbox}>
                    {subject.isActive && <Text style={defaultStyles.checkboxMark}>✓</Text>}
                  </View>
                  <Text style={defaultStyles.checkboxLabel}>{subject.isActive ? 'Active' : 'inactive'}</Text>
                </Pressable>

                <Button title={isSaving ? "Saving..." : "Save"} onPress={EditSubject} disabled={isSaving} />
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

