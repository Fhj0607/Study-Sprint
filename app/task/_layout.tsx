import { Stack } from "expo-router";

export default function TaskLayout() {
  return (
    <Stack>
      <Stack.Screen name="upsertTask" options={{ title: "Create Task" }} />
      <Stack.Screen name="viewDetailsTask" options={{ title: "Task Details" }} />
    </Stack>
  );
}