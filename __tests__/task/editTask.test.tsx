import UpsertTask from "@/app/task/upsertTask";
import { CheckAssignmentCompletion } from "@/lib/progress";
import { supabase } from "@/lib/supabase";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { router } from "expo-router";

const mockUpdateEq = jest.fn();
const mockUpdate = jest.fn(() => ({ eq: mockUpdateEq, }));
const mockSingle = jest.fn();
const mockSelectEq = jest.fn(() => ({ single: mockSingle, }));
const mockSelect = jest.fn(() => ({ eq: mockSelectEq, }));

jest.mock("expo-router", () => ({
  router: {
    back: jest.fn(),
    replace: jest.fn(),
  },
  Stack: {
    Screen: () => null,
  },
  useLocalSearchParams: () => ({
    tId: "task-123",
  }),
  useFocusEffect: (callback: () => void) => callback(),
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
      select: mockSelect,
      update: mockUpdate,
    })),
  },
}));

test("updates a task and navigates back", async () => {
  mockSingle.mockResolvedValue({ 
    data: {
      tId: "task-123", 
      title: "Read chapter 4",
      uId: "user-123",
      aId: "assignment-123",
    },
    error: null,
  });
  mockUpdateEq.mockResolvedValue({ error: null, });

  const screen = render(<UpsertTask />);
  fireEvent.changeText(await screen.findByTestId("task-title-input"), "Read chapter 5");
  fireEvent.press(screen.getByTestId("upsert-task-button"));

  await waitFor(() => {
    expect(supabase.from).toHaveBeenCalledWith("tasks");
    expect(mockSelect).toHaveBeenCalled();
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Read chapter 5",
        uId: "user-123",
        aId: "assignment-123",
      })
    );
    expect(mockUpdateEq).toHaveBeenCalledWith("tId", "task-123");
    expect(CheckAssignmentCompletion).toHaveBeenCalledWith("assignment-123");    
    expect(router.back).toHaveBeenCalled();
  });
});