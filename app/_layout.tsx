import { Stack } from "expo-router";
import "../global.css";

export default function RootLayout() {
  return (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="setup" options={{ headerShown: true }} />
      <Stack.Screen name="subject" options={{ headerShown: false }} />
      <Stack.Screen name="assignment" options={{ headerShown: false }} />
      <Stack.Screen name="task" options={{ headerShown: false }} />
      <Stack.Screen name="createUser" options={{ headerShown: true, title: "" }} />
      <Stack.Screen name="login" options={{ headerShown: false }} />
    </Stack>
  );
}
