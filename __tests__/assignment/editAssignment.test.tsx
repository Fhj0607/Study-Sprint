import EditAssignment from "@/app/assignment/editAssignment";
import { supabase } from "@/lib/supabase";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { router } from "expo-router";

const mockUpdateSingle = jest.fn();
const mockUpdateSelect = jest.fn(() => ({ single: mockUpdateSingle, }));
const mockUpdateEq = jest.fn(() => ({ select: mockUpdateSelect, }));
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
    aId: "assignment-123",
  }),
  useFocusEffect: (callback: () => void) => callback(),
}));

jest.mock("@/lib/progress", () => ({
  CheckAssignmentCompletion: jest.fn(),
}));

jest.mock("@/lib/asyncStorage", () => ({
  GetAssignmentNotificationId: jest.fn(() => Promise.resolve(null)),
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
        select: mockSelect,
        update: mockUpdate,
      })),
    },
  };
});

test("updates an assignment and navigates back", async () => {
  mockSingle.mockResolvedValue({ 
    data: {
        aId: "assignment-123", 
        title: "create a simple test",
        uId: "user-123",
        deadline: "2026-04-25",
    },
    error: null,
  });
  mockUpdateSingle.mockResolvedValue({
    data: {
        aId: "assignment-123", 
        title: "create a harder test",
        uId: "user-123",
        deadline: "2026-04-25",
    },
    error: null,
  });

  const screen = render(<EditAssignment />);
  fireEvent.changeText(await screen.findByTestId("assignment-title-input"), "create a harder test");
  fireEvent.press(screen.getByTestId("edit-assignment-button"));

  await waitFor(() => {
    expect(supabase.from).toHaveBeenCalledWith("assignments");
    expect(mockSelect).toHaveBeenCalled();
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "create a harder test",
        uId: "user-123",
        deadline: "2026-04-25",
      })
    );
    expect(mockUpdateSingle).toHaveBeenCalled();
    expect(router.back).toHaveBeenCalled();
  });
});