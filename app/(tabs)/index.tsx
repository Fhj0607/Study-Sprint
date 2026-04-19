import { defaultStyles } from "@/constants/defaultStyles";
import { supabase } from "@/lib/supabase";
import { Stack } from "expo-router";
import { Button, Text, View } from "react-native";

export default function HomeScreen() {
  return (
    <View style={defaultStyles.container}>
      <Stack.Screen
        options={{
          title: "Tasks",
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
