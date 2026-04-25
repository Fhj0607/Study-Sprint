import { Stack } from "expo-router";

export default function SubjectLayout() {
  return (
    <Stack>
      <Stack.Screen name="createSubject" options={{ title: "Create Subject" }} />
      <Stack.Screen name="editSubject" options={{ title: "Edit Subject" }} />
      <Stack.Screen name="viewDetailsSubject" options={{ title: "Subject Details" }} />
    </Stack>
  );
}