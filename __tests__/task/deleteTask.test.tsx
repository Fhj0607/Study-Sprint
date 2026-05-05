import ViewDetailsTask from "@/app/task/viewDetailsTask";
import { CheckAssignmentCompletion } from "@/lib/progress";
import { supabase } from "@/lib/supabase";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { router } from "expo-router";
import { Alert } from "react-native";

const mockTaskSingle = jest.fn();
const mockTaskSelectEq = jest.fn(() => ({ single: mockTaskSingle }));
const mockTaskSelect = jest.fn(() => ({ eq: mockTaskSelectEq }));
const mockTaskDeleteEq = jest.fn();
const mockTaskDelete = jest.fn(() => ({ eq: mockTaskDeleteEq }));

const mockAssignmentSingle = jest.fn();
const mockAssignmentSelectEq = jest.fn(() => ({ single: mockAssignmentSingle }));
const mockAssignmentSelect = jest.fn(() => ({ eq: mockAssignmentSelectEq }));

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
    tId: "task-123",
  }),
  useFocusEffect: (callback: () => void) => {
    const React = require("react");
    React.useEffect(callback, [callback]);
  },
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
      if (table === "tasks") {
        return {
          select: mockTaskSelect,
          delete: mockTaskDelete,
        };
      }

      if (table === "assignments") {
        return {
          select: mockAssignmentSelect,
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

test("deletes a task and navigates back", async () => {
  mockTaskSingle.mockResolvedValue({ 
    data: { 
      tId: "task-123",
      title: "Read chapter 4",
      uId: "user-123",
      aId: "assignment-123",
    },
    error: null,
  });
  mockAssignmentSingle.mockResolvedValue({
    data: { 
      aId: "assignment-123",
      title: "create a simple test",
      uId: "user-123",
      sId: "subject-123",
    },
    error: null,
  });
  mockSubjectSingle.mockResolvedValue({
    data: {
      sId: "subject-123",
      title: "ikt205g26v",
      color: "blue",
    },
    error: null,
  });
  mockTaskDeleteEq.mockResolvedValue({ error: null, });

  const screen = render(<ViewDetailsTask />);

  await screen.findByText("Read chapter 4");
  await screen.findByText("ikt205g26v");

  fireEvent.press(await screen.findByTestId("delete-task-button"));

  expect(alertSpy).toHaveBeenCalledWith(
    "Delete Task",
    "Are you sure you want to delete this task?",
    expect.any(Array),
  );

  const alertButtons = alertSpy.mock.calls[0][2];
  const confirmDeleteButton = alertButtons[1];

  await confirmDeleteButton.onPress();    

  await waitFor(() => {
    expect(supabase.from).toHaveBeenCalledWith("tasks");
    expect(mockTaskDelete).toHaveBeenCalled();
    expect(mockTaskDeleteEq).toHaveBeenCalledWith("tId", "task-123");
    expect(CheckAssignmentCompletion).toHaveBeenCalledWith("assignment-123");
    expect(router.back).toHaveBeenCalled();
  });
});
