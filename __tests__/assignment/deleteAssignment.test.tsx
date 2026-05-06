import ViewDetailsAssignment from "@/app/assignment/viewDetailsAssignment";
import { supabase } from "@/lib/supabase";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { router } from "expo-router";
import { Alert } from "react-native";

const mockAssignmentSingle = jest.fn();
const mockAssignmentSelectEq = jest.fn(() => ({ single: mockAssignmentSingle, }));
const mockAssignmentSelect = jest.fn(() => ({ eq: mockAssignmentSelectEq, }));
const mockAssignmentDeleteEq = jest.fn();
const mockAssignmentDelete = jest.fn(() => ({ eq: mockAssignmentDeleteEq, }));

const mockTasksSelectEq = jest.fn();
const mockTasksSelect = jest.fn(() => ({ eq: mockTasksSelectEq }));

const mockSubjectSingle = jest.fn();
const mockSubjectSelectEq = jest.fn(() => ({ single: mockSubjectSingle }));
const mockSubjectSelect = jest.fn(() => ({ eq: mockSubjectSelectEq }));

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
  useFocusEffect: (callback: () => void) => {
    const React = require("react");
    React.useEffect(callback, [callback]);
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
      getSession: jest.fn(() =>
        Promise.resolve({
          data: {
            session: {
              user: { id: "user-123" },
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
    from: jest.fn((table: string) => {
      if (table === "assignments") {
        return {
          select: mockAssignmentSelect,
          delete: mockAssignmentDelete,
        };
      }

      if (table === "tasks") {
        return {
          select: mockTasksSelect,
        };
      }

      if (table === "subjects") {
        return {
          select: mockSubjectSelect,
        };
      }

      return {};
    }),
  },
}));

const alertSpy = jest.spyOn(Alert, "alert");

test("deletes an assignment and navigates back", async () => {
  mockAssignmentSingle.mockResolvedValue({ 
    data: { 
      aId: "assignment-123",
      title: "create a simple test",
      uId: "user-123",
      sId: "subject-123"
    },
    error: null,
  });
  mockTasksSelectEq.mockResolvedValue({ data: [], error: null, })
  mockSubjectSingle.mockResolvedValue({
    data: {
      sId: "subject-123",
      title: "ikt205g26v",
      color: "blue",
    },
    error: null,
  });
  mockAssignmentDeleteEq.mockResolvedValue({ error: null, });

  const screen = render(<ViewDetailsAssignment />);

  await screen.findByText("create a simple test");
  await screen.findByText("ikt205g26v");

  fireEvent.press(await screen.findByTestId("delete-assignment-button"));

  expect(alertSpy).toHaveBeenCalledWith(
    "Delete Assignment",
    "Are you sure you want to delete this assignment?",
    expect.any(Array),
  );

  const alertButtons = alertSpy.mock.calls[0]?.[2];
  expect(alertButtons).toBeDefined();
  const confirmDeleteButton = alertButtons?.[1];
  expect(confirmDeleteButton?.onPress).toBeDefined();

  if (!confirmDeleteButton?.onPress) {
    throw new Error("Delete confirmation button missing");
  }

  await confirmDeleteButton.onPress();

  await waitFor(() => {
    expect(supabase.from).toHaveBeenCalledWith("assignments");
    expect(mockAssignmentDelete).toHaveBeenCalled();
    expect(mockAssignmentDeleteEq).toHaveBeenCalledWith("aId", "assignment-123");
    expect(router.back).toHaveBeenCalled();
  });
});
