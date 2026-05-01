import { defaultStyles } from "@/constants/defaultStyles";
import { RegisterForLocalNotificationsAsync } from '@/lib/notifications';
import { supabase } from "@/lib/supabase";
import { Session } from '@supabase/supabase-js';
import { Stack } from "expo-router";
import { useEffect, useState } from 'react';
import { Button, Text, View } from "react-native";

export default function HomeScreen() {
  const [session, SetSession] = useState<Session | null>(null);

  useEffect(() => {
    supabase.auth
      .getSession()
      .then(({ data }) => SetSession(data.session ?? null));

    const { data: sub } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        SetSession(newSession);
      }
    );

    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session) {
      RegisterForLocalNotificationsAsync();
    }
  }, [session])

  return (
    <View style={defaultStyles.container}>
      <Stack.Screen
        options={{
          title: "Home",
          headerTitleAlign: 'center',
          headerTitleStyle: defaultStyles.title,
          headerRight: () => {
            return (
              <View style={defaultStyles.buttonContainer}>
                <Button title="Logout" onPress={async () => await supabase.auth.signOut()} />
              </View>
            )
          },
        }}
      />

      <View style={defaultStyles.container}>
        <Text style={defaultStyles.body}>Hello, World!</Text>
      </View>
    </View>
  )
}
