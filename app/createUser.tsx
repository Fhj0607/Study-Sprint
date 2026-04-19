import { defaultStyles } from '@/constants/defaultStyles';
import { supabase } from '@/lib/supabase';
import { router, Stack } from 'expo-router';
import { useState } from 'react';
import { Alert, Button, Keyboard, KeyboardAvoidingView, Platform, Pressable, Text, TextInput, TouchableWithoutFeedback, View } from 'react-native';

export default function CreateUser() {
  const [email, SetEmail] = useState('');
  const [password, SetPassword] = useState('');

  const SignUp = async () => {
    if(email.trim() === '' || password.trim() === '') {
      Alert.alert("All fields are required!");
      return;
    }

    const {error} = await supabase.auth.signUp({
      email: email,
      password: password,
    });

    if (error) {
      Alert.alert("User could not be created, please try again");
      return;
    }

    router.replace("/");
  }

  return (
    <View style={defaultStyles.container}>
      <Stack.Screen
        options={{
          title: "Create User",
          headerTitleStyle: defaultStyles.title,
        }}
      />
      <View style={defaultStyles.container}>
        <Text style={defaultStyles.title}>Create User</Text>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={defaultStyles.container}>
              <TextInput
                style={defaultStyles.inputText}
                placeholder="Enter Email"
                value={email}
                onChangeText={SetEmail}   
                autoCapitalize="none"
              />
              <TextInput
                style={defaultStyles.inputText}
                placeholder="Enter Password"
                value={password}
                onChangeText={SetPassword}
                secureTextEntry
              />
                
              <Button title="Save" onPress={SignUp} />
              <Button title="Cancel" onPress={() => router.back()} />
              <Pressable onPress={() => router.push("/login")} style={defaultStyles.buttonContainer}>
                <Text style={defaultStyles.linkText}>Already have an Account? login here</Text>
              </Pressable>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </View>
    </View>
  )
}