import { Stack } from "expo-router";

export default function SubjectLayout() {
  return (
    <Stack>
      <Stack.Screen name="upsertSubject" />
      <Stack.Screen name="viewDetailsSubject" options={{ title: "Subject Details" }} />
    </Stack>
  );
}