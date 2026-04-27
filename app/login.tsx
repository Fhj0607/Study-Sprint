import { supabase } from "@/lib/supabase";
import { router } from "expo-router";
import { useState } from "react";
import { Alert, Keyboard, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, TouchableWithoutFeedback, View } from "react-native";

export default function Login() {
  const [email, SetEmail] = useState('');
  const [password, SetPassword] = useState('');  
  const [isLoading, SetIsLoading] = useState(false);

  const login = async () => {
    if(email.trim() === '' || password.trim() === '') {
      Alert.alert("All fields are required!");
      return;
    }

    SetIsLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    SetIsLoading(false);

    if (error) {
      Alert.alert("Login failed, please check your credentials and try again");
      return;
    }

    router.replace("/");
  }

  const inputClassName =
    'rounded-2xl border border-app-border bg-app-subtle px-4 py-3 text-base text-text-main'

  return (
  <KeyboardAvoidingView
    className="flex-1 bg-app-bg"
    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
  >
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <ScrollView
        className="flex-1"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: 'center',
          paddingHorizontal: 20,
          paddingTop: 64,
          paddingBottom: 32,
        }}
      >
        <View className="mb-10">
          <Text className="text-4xl font-bold text-text-main">
            Study Sprint
          </Text>

          <Text className="mt-3 text-base leading-6 text-text-secondary">
            Pick up where you left off.
          </Text>
        </View>

        <View className="rounded-3xl border border-app-border bg-app-surface p-5">
          <Text className="text-2xl font-bold text-text-main">
            Log in
          </Text>

          <Text className="mt-2 text-sm leading-5 text-text-secondary">
            Continue your study workflow.
          </Text>

          <View className="mb-5 mt-6">
            <Text className="mb-2 text-sm font-semibold text-text-secondary">
              Email
            </Text>
            <TextInput
              className={inputClassName}
              placeholder="you@example.com"
              placeholderTextColor="#9CA3AF"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              value={email}
              onChangeText={SetEmail}
            />
          </View>

          <View className="mb-6">
            <Text className="mb-2 text-sm font-semibold text-text-secondary">
              Password
            </Text>
            <TextInput
              className={inputClassName}
              placeholder="Enter your password"
              placeholderTextColor="#9CA3AF"
              secureTextEntry
              value={password}
              onChangeText={SetPassword}
            />
          </View>

          <Pressable
            className={`h-14 items-center justify-center rounded-2xl ${
              isLoading ? 'bg-accent-disabled' : 'bg-accent'
            }`}
            onPress={login}
            disabled={isLoading}
          >
            <Text className="text-base font-bold text-text-inverse">
              {isLoading ? 'Logging in...' : 'Log in'}
            </Text>
          </Pressable>

          <Pressable
            className="mt-4 h-12 items-center justify-center rounded-2xl border border-app-border bg-app-subtle"
            onPress={() => router.push('/createUser')}
          >
            <Text className="text-sm font-semibold text-text-secondary">
              Don&apos;t have an account? Sign up
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </TouchableWithoutFeedback>
  </KeyboardAvoidingView>
);
}