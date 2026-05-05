import { supabase } from '@/lib/supabase';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Keyboard,
  KeyboardAvoidingView,
  KeyboardEvent,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  View,
} from 'react-native';

export default function CreateUser() {
  const [email, SetEmail] = useState('');
  const [password, SetPassword] = useState('');
  const [isLoading, SetIsLoading] = useState(false);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const cardLift = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const handleKeyboardShow = (event: KeyboardEvent) => {
      setIsKeyboardVisible(true);

      const keyboardHeight = event.endCoordinates.height;
      const liftAmount = Math.min(
        Platform.OS === 'ios' ? keyboardHeight * 0.5 : keyboardHeight * 0.6,
        260
      );

      Animated.timing(cardLift, {
        toValue: -liftAmount,
        duration: event.duration ?? 220,
        useNativeDriver: true,
      }).start();
    };

    const handleKeyboardHide = () => {
      setIsKeyboardVisible(false);

      Animated.timing(cardLift, {
        toValue: 0,
        duration: 220,
        useNativeDriver: true,
      }).start();
    };

    const showSubscription = Keyboard.addListener(showEvent, handleKeyboardShow);
    const hideSubscription = Keyboard.addListener(hideEvent, handleKeyboardHide);

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, [cardLift]);

  const SignUp = async () => {
    if (email.trim() === '' || password.trim() === '') {
      Alert.alert('All fields are required!');
      return;
    }

    SetIsLoading(true);

    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
    });

    SetIsLoading(false);

    if (error) {
      Alert.alert(error.message, 'User could not be created, please try again');
      return;
    }

    if (!data.session) {
      Alert.alert(
        'Check your email',
        'Your account was created. Please confirm your email before signing in.'
      );
      router.replace('/login');
      return;
    }
    router.replace('/setup');
  };

  const inputClassName =
    'rounded-2xl border border-app-border bg-app-subtle px-4 py-3 text-base text-text-main';

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
          <Animated.View style={{ transform: [{ translateY: cardLift }] }}>
            <View className="mb-10">
              <Text className="mt-5 text-4xl font-bold text-text-main">
                Study Sprint
              </Text>

              <Text className="mt-3 text-base leading-6 text-text-secondary">
                Organize subjects, assignments, and tasks in one calm workflow.
              </Text>
            </View>

            <View className="rounded-3xl border border-app-border bg-app-surface p-5">
              <Text className="text-2xl font-bold text-text-main">
                Create account
              </Text>
              <Text className="mt-2 text-sm leading-5 text-text-secondary">
                Start your next study sprint.
              </Text>

              <View className="mt-5 rounded-2xl border border-app-border bg-app-subtle p-4">
                <Text className="text-sm font-bold text-text-main">
                  What this app does
                </Text>
                <Text className="mt-1 text-sm leading-5 text-text-secondary">
                  Study Sprint helps you move from subject to assignment to task,
                  then into a focused sprint.
                </Text>
                <Text className="mt-3 text-sm font-bold text-text-main">
                  Why an account exists
                </Text>
                <Text className="mt-1 text-sm leading-5 text-text-secondary">
                  Your account keeps that structure and your tracked study
                  progress attached to you.
                </Text>
              </View>

              <View className="mt-6 mb-5">
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
                  placeholder="Create a password so your progress follows you"
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
                onPress={SignUp}
                disabled={isLoading}
              >
                <Text className="text-base font-bold text-text-inverse">
                  {isLoading ? 'Creating account...' : 'Create account'}
                </Text>
              </Pressable>

              <Pressable
                className="mt-4 h-12 items-center justify-center rounded-2xl border border-app-border bg-app-subtle"
                onPress={() => router.push('/login')}
              >
                <Text className="text-sm font-semibold text-text-secondary">
                  Already have an account? Log in
                </Text>
              </Pressable>
            </View>
          </Animated.View>
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}
