import { Stack } from "expo-router";

export default function TaskLayout() {
  return (
    <Stack>
      <Stack.Screen name="createTask" options={{ title: "Create Task" }} />
      <Stack.Screen name="editTask" options={{ title: "Edit Task" }} />
      <Stack.Screen name="viewDetailsTask" options={{ title: "Task Details" }} />
    </Stack>
  );
}