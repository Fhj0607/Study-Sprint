import UpsertAssignment from "@/app/assignment/upsertAssignment";
import { supabase } from "@/lib/supabase";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { router } from "expo-router";

const mockSingle = jest.fn();
const mockSelect = jest.fn(() => ({ single: mockSingle, }));
const mockInsert = jest.fn(() => ({ select: mockSelect, }));

jest.mock("expo-router", () => ({
  router: {
    back: jest.fn(),
    replace: jest.fn(),
  },
  Stack: {
    Screen: () => null,
  },
  useLocalSearchParams: () => ({
    sId: "subject-123",
  }),
}));

jest.mock("@/lib/asyncStorage", () => ({
  GetAssignmentNotificationId: jest.fn(() => Promise.resolve()),
  SaveAssignmentNotificationId: jest.fn(() => Promise.resolve()),
  RemoveAssignmentNotificationId: jest.fn(() => Promise.resolve()),
}));

jest.mock("expo-notifications", () => ({
  scheduleNotificationAsync: jest.fn(() => Promise.resolve("notification-123")),
  SchedulableTriggerInputTypes: {
    DATE: "date",
  },
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

test("creates an assignment and navigates back", async () => {
  mockSingle.mockResolvedValue({ 
    data: { 
        aId: "assignment-123", 
        title: "create a simple test", 
        deadline: "",
    },
    error: null,
  });

  const screen = render(<UpsertAssignment />);
  fireEvent.changeText(screen.getByTestId("assignment-title-input"), "create a simple test");
  fireEvent.press(screen.getByTestId("upsert-assignment-button"));

  await waitFor(() => {
    expect(supabase.from).toHaveBeenCalledWith("assignments");
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "create a simple test",
        uId: "user-123",
        sId: "subject-123",
      })
    );
    expect(router.back).toHaveBeenCalled();
  });
});
