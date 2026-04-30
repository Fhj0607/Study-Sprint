import UpsertTask from "@/app/task/upsertTask";
import { CheckAssignmentCompletion } from "@/lib/progress";
import { supabase } from "@/lib/supabase";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { router } from "expo-router";

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
    aId: "assignment-123",
  }),
}));

jest.mock("@/lib/progress", () => ({
  CheckAssignmentCompletion: jest.fn(() => Promise.resolve()),
}));

jest.mock("@/lib/supabase", () => ({
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
}));

test("creates a task and navigates back", async () => {
  mockInsert.mockResolvedValue({ error: null });

  const screen = render(<UpsertTask />);
  fireEvent.changeText(screen.getByTestId("task-title-input"), "Read chapter 4");
  fireEvent.press(screen.getByTestId("upsert-task-button"));

  await waitFor(() => {
    expect(supabase.from).toHaveBeenCalledWith("tasks");
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Read chapter 4",
        uId: "user-123",
        aId: "assignment-123",
      })
    );
    expect(CheckAssignmentCompletion).toHaveBeenCalledWith("assignment-123");
    expect(router.back).toHaveBeenCalled();
  });
});