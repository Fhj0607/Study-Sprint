import { supabase } from "@/lib/supabase";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { router } from "expo-router";
import CreateTask from "../../app/task/createTask";

const mockInsert = jest.fn();

jest.mock("expo-router", () => ({
  router: {
    back: jest.fn(),
    replace: jest.fn(),
  },
  Stack: {
    Screen: () => null,
  },
  useLocalSearchParams: () => ({
    aId: null,
  }),
}));

jest.mock("@/lib/progress", () => ({
  CheckAssignmentCompletion: jest.fn(),
}));

jest.mock("@/lib/supabase", () => {
  return {
    supabase: {
      auth: {
        getUser: jest.fn(() =>
          Promise.resolve({
            data: { user: { id: "user-123" } },
            error: null,
          })
        ),
      },
      from: jest.fn(() => ({
        insert: mockInsert,
      })),
    },
  };
});

test("creates a task and navigates back", async () => {
  mockInsert.mockResolvedValue({ error: null });

  const screen = render(<CreateTask />);
  fireEvent.changeText(screen.getByTestId("task-title-input"), "Read chapter 4");
  fireEvent.press(screen.getByTestId("create-task-button"));

  await waitFor(() => {
    expect(supabase.from).toHaveBeenCalledWith("tasks");
    expect(mockInsert).toHaveBeenCalled();
    expect(router.back).toHaveBeenCalled();
  });
});