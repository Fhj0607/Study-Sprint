import { supabase } from "@/lib/supabase";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { router } from "expo-router";
import { Alert } from "react-native";
import ViewDetailsSubject from "../../app/subject/viewDetailsSubject";

const mockSingleSubject = jest.fn();
const mockSelectSubjectEq = jest.fn(() => ({ single: mockSingleSubject, }));
const mockSelectSubject = jest.fn(() => ({ eq: mockSelectSubjectEq, }));
const mockOrderAssignments = jest.fn();
const mockSelectAssignmentsEq = jest.fn(() => ({ order: mockOrderAssignments }));
const mockSelectAssignments = jest.fn(() => ({ eq: mockSelectAssignmentsEq }));
const mockDeleteSubjectEq = jest.fn();
const mockDeleteSubject = jest.fn(() => ({ eq: mockDeleteSubjectEq, }));

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
        if (table === "subjects") {
          return {
            select: mockSelectSubject,
            delete: mockDeleteSubject,
          };
        }

        if (table === "assignments") {
          return {
            select: mockSelectAssignments,
          };
        }

        return {};
      }),
    },
  };
});

const alertSpy = jest.spyOn(Alert, "alert");

test("deletes a subject and navigates back", async () => {
  mockSingleSubject.mockResolvedValue({ 
    data: { 
      sId: "subject-123",
      title: "ikt205g26v",
      uId: "user-123",
    },
    error: null,
  });
  mockOrderAssignments.mockResolvedValue({ data: [], error: null, })
  mockDeleteSubjectEq.mockResolvedValue({ error: null, });

  const screen = render(<ViewDetailsSubject />);
  fireEvent.press(await screen.findByTestId("delete-subject-button"));

  expect(alertSpy).toHaveBeenCalledWith(
    "Delete Subject",
    "Are you sure you want to delete this subject?",
    expect.any(Array),
  );

  const alertButtons = alertSpy.mock.calls[0][2];
  const confirmDeleteButton = alertButtons[1];

  await confirmDeleteButton.onPress();    

  await waitFor(() => {
    expect(supabase.from).toHaveBeenCalledWith("subjects");
    expect(mockDeleteSubject).toHaveBeenCalled();
    expect(mockDeleteSubjectEq).toHaveBeenCalledWith("sId", "subject-123");
    expect(router.back).toHaveBeenCalled();
  });
});