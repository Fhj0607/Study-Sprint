import { Stack } from "expo-router";

export default function AssignmentLayout() {
  return (
    <Stack>
      <Stack.Screen name="assignments" options={{ title: 'Assignments' }} />
      <Stack.Screen name="createAssignment" options={{ title: "Create Assignment" }} />
      <Stack.Screen name="editAssignment" options={{ title: "Edit Assignment" }} />
      <Stack.Screen name="viewDetailsAssignment" options={{ title: "Assignment Details" }} />
    </Stack>
  );
}