import { getSetupStatus } from "@/lib/setupStatus";
import { supabase } from "@/lib/supabase";
import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Alert, Keyboard, KeyboardAvoidingView, KeyboardEvent, Platform, Pressable, ScrollView, Text, TextInput, TouchableWithoutFeedback, View } from "react-native";

export default function Login() {
  const [email, SetEmail] = useState('');
  const [password, SetPassword] = useState('');  
  const [isLoading, SetIsLoading] = useState(false);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const handleKeyboardShow = (event: KeyboardEvent) => {
      setIsKeyboardVisible(true);

      const keyboardHeight = event.endCoordinates.height;
      const offsetBaseline = Platform.OS === 'ios' ? 180 : 140;
      const nextScrollOffset = Math.max(0, keyboardHeight - offsetBaseline);

      scrollViewRef.current?.scrollTo({
        y: nextScrollOffset,
        animated: true,
      });
    };

    const handleKeyboardHide = () => {
      setIsKeyboardVisible(false);
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
    };

    const showSubscription = Keyboard.addListener(showEvent, handleKeyboardShow);
    const hideSubscription = Keyboard.addListener(hideEvent, handleKeyboardHide);

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  const login = async () => {
    if(email.trim() === '' || password.trim() === '') {
      Alert.alert("All fields are required!");
      return;
    }

    SetIsLoading(true);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    SetIsLoading(false);

    if (error) {
      Alert.alert("Login failed, please check your credentials and try again");
      return;
    }

    if (!data.user?.id) {
      Alert.alert("Login failed, missing user session after sign-in");
      return;
    }

    try {
      const setupStatus = await getSetupStatus(data.user.id);
      router.replace(setupStatus.isSetupComplete ? "/" : "/setup");
    } catch {
      router.replace("/setup");
    }
  }

  const inputClassName =
    'rounded-2xl border border-app-border bg-app-subtle px-4 py-3 text-base text-text-main'

  return (
  <KeyboardAvoidingView
    className="flex-1 bg-app-bg"
    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 24}
  >
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <ScrollView
        ref={scrollViewRef}
        className="flex-1"
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: isKeyboardVisible ? 'flex-start' : 'center',
          paddingHorizontal: 20,
          paddingTop: isKeyboardVisible ? 24 : 64,
          paddingBottom: isKeyboardVisible ? 96 : 32,
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

          <View className="mt-5 rounded-2xl border border-app-border bg-app-subtle p-4">
            <Text className="text-sm font-bold text-text-main">
              Your study path stays with your account
            </Text>
            <Text className="mt-1 text-sm leading-5 text-text-secondary">
              Subjects, assignments, tasks, and tracked sprint progress follow
              you after you sign in.
            </Text>
          </View>

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
              onFocus={() => {
                scrollViewRef.current?.scrollToEnd({ animated: true });
              }}
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
