import { Stack } from "expo-router";

export default function AssignmentLayout() {
  return (
    <Stack>
      <Stack.Screen name="upsertAssignment" options={{ title: 'Create/Edit Assignment' }} />
      <Stack.Screen name="viewDetailsAssignment" options={{ title: "Assignment Details" }} />
    </Stack>
  );
}