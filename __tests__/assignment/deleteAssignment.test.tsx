import { supabase } from "@/lib/supabase";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { router } from "expo-router";
import { Alert } from "react-native";
import ViewDetailsAssignment from "../../app/assignment/viewDetailsAssignment";

const mockSingleAssignment = jest.fn();
const mockSelectAssignmentEq = jest.fn(() => ({ single: mockSingleAssignment, }));
const mockSelectAssignment = jest.fn(() => ({ eq: mockSelectAssignmentEq, }));
const mockSelectTasksEq = jest.fn();
const mockSelectTasks = jest.fn(() => ({ eq: mockSelectTasksEq }));
const mockDeleteAssignmentEq = jest.fn();
const mockDeleteAssignment = jest.fn(() => ({ eq: mockDeleteAssignmentEq, }));

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

jest.mock("@/lib/supabase", () => {
  return {
    supabase: {
      auth: {
        getUser: jest.fn(() =>
          Promise.resolve({
            data: { user: { uId: "user-123" } },
            error: null,
          })
        ),
        getSession: jest.fn(() =>
          Promise.resolve({
            data: {
              session: {
                user: { uId: "user-123" },
              },
            },
          })
        ),
        onAuthStateChange: jest.fn(() => ({
          data: {
            subscription: {
              unsubscribe: jest.fn(),
            },
          },
        })),
      },
      from: jest.fn((table) => {
        if (table === "assignments") {
          return {
            select: mockSelectAssignment,
            delete: mockDeleteAssignment,
          };
        }

        if (table === "tasks") {
          return {
            select: mockSelectTasks,
          };
        }

        return {};
      }),
    },
  };
});

const alertSpy = jest.spyOn(Alert, "alert");

test("deletes a task and navigates back", async () => {
  mockSingleAssignment.mockResolvedValue({ 
    data: { 
      aId: "assignment-123",
      title: "create a simple test",
      uId: "user-123",
    },
    error: null,
  });
  mockSelectTasksEq.mockResolvedValue({ data: [], error: null, })
  mockDeleteAssignmentEq.mockResolvedValue({ error: null, });

  const screen = render(<ViewDetailsAssignment />);
  fireEvent.press(await screen.findByTestId("delete-assignment-button"));

  expect(alertSpy).toHaveBeenCalledWith(
    "Delete Assignment",
    "Are you sure you want to delete this assignment?",
    expect.any(Array),
  );

  const alertButtons = alertSpy.mock.calls[0][2];
  const confirmDeleteButton = alertButtons[1];

  await confirmDeleteButton.onPress();    

  await waitFor(() => {
    expect(supabase.from).toHaveBeenCalledWith("assignments");
    expect(mockDeleteAssignment).toHaveBeenCalled();
    expect(mockDeleteAssignmentEq).toHaveBeenCalledWith("aId", "assignment-123");
    expect(router.back).toHaveBeenCalled();
  });
});