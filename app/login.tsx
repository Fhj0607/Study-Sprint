import { defaultStyles } from "@/constants/defaultStyles";
import { supabase } from "@/lib/supabase";
import { router, Stack } from "expo-router";
import { useState } from "react";
import { Alert, Button, Keyboard, KeyboardAvoidingView, Platform, Text, TextInput, TouchableWithoutFeedback, View } from "react-native";

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');  

  const login = async () => {
    if(email.trim() === '' || password.trim() === '') {
      Alert.alert("All fields are required!");
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      Alert.alert("Login failed, please check your credentials and try again");
      return;
    }

    router.replace("/");
  }

  return (
    <View style={defaultStyles.container}>
      <Stack.Screen
        options={{
          title: "Login",
          headerTitleStyle: defaultStyles.title
        }}
      />

      <View style={defaultStyles.container}>
        <Text style={defaultStyles.title}>Login</Text>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}> 
            <View style={defaultStyles.container}>  
              <TextInput
                style={defaultStyles.inputText}
                placeholder="Enter Email" 
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
              />
              <TextInput
                style={defaultStyles.inputText}
                placeholder="Enter Password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
              <Button title="Login" onPress={login} />
              <Button title="Cancel" onPress={() => router.push("/")} />
            </View>   
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </View>
    </View>
  )
}