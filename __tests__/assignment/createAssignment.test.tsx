import { supabase } from "@/lib/supabase";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { router } from "expo-router";
import CreateAssignment from "../../app/assignment/createAssignment";

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
    sId: null,
  }),
}));

jest.mock("@/lib/progress", () => ({
  CheckAssignmentCompletion: jest.fn(),
}));

jest.mock("@/lib/asyncStorage", () => ({
  SaveAssignmentNotificationId: jest.fn(),
}));

jest.mock("expo-notifications", () => ({
  scheduleNotificationAsync: jest.fn(() => Promise.resolve("notification-123")),
  SchedulableTriggerInputTypes: {
    DATE: "date",
  },
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

test("creates an assignment and navigates back", async () => {
  mockSingle.mockResolvedValue({ 
    data: { 
        aId: "assignment-123", title: "create a simple test", deadline: "",
    },
    error: null,
  });

  const screen = render(<CreateAssignment />);
  fireEvent.changeText(screen.getByTestId("assignment-title-input"), "create a simple test");
  fireEvent.press(screen.getByTestId("create-assignment-button"));

  await waitFor(() => {
    expect(supabase.from).toHaveBeenCalledWith("assignments");
    expect(mockInsert).toHaveBeenCalled();
    expect(router.back).toHaveBeenCalled();
  });
});