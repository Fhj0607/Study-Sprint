import { supabase } from "@/lib/supabase";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { router } from "expo-router";
import { Alert } from "react-native";
import ViewDetailsTask from "../../app/task/viewDetailsTask";

const mockSingleTask = jest.fn();
const mockSelectTaskEq = jest.fn(() => ({ single: mockSingleTask, }));
const mockSelectTask = jest.fn(() => ({ eq: mockSelectTaskEq, }));
const mockDeleteTaskEq = jest.fn();
const mockDeleteTask = jest.fn(() => ({ eq: mockDeleteTaskEq, }));

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
      from: jest.fn(() => {
        return {
          select: mockSelectTask,
          delete: mockDeleteTask,
        };
      }),
    },
  };
});

const alertSpy = jest.spyOn(Alert, "alert");

test("deletes a task and navigates back", async () => {
  mockSingleTask.mockResolvedValue({ 
    data: { 
      tId: "task-123",
      title: "Read chapter 4",
      uId: "user-123",
    },
    error: null,
  });
  mockDeleteTaskEq.mockResolvedValue({ error: null, });

  const screen = render(<ViewDetailsTask />);
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
    expect(mockDeleteTask).toHaveBeenCalled();
    expect(mockDeleteTaskEq).toHaveBeenCalledWith("tId", "task-123");
    expect(router.back).toHaveBeenCalled();
  });
});