import ViewDetailsSubject from "@/app/subject/viewDetailsSubject";
import { supabase } from "@/lib/supabase";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { router } from "expo-router";
import { Alert } from "react-native";

const mockSubjectSingle = jest.fn();
const mockSubjectSelectEq = jest.fn(() => ({ single: mockSubjectSingle }));
const mockSubjectSelect = jest.fn(() => ({ eq: mockSubjectSelectEq }));
const mockSubjectDeleteEq = jest.fn();
const mockSubjectDelete = jest.fn(() => ({ eq: mockSubjectDeleteEq }));

const mockAssignmentsOrder = jest.fn();
const mockAssignmentsEq = jest.fn(() => ({ order: mockAssignmentsOrder }));
const mockAssignmentsSelect = jest.fn(() => ({ eq: mockAssignmentsEq }));

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
    from: jest.fn((table) => {
      if (table === "subjects") {
        return {
          select: mockSubjectSelect,
          delete: mockSubjectDelete,
        };
      }

      if (table === "assignments") {
        return {
          select: mockAssignmentsSelect,
        };
      }

      return {};
    }),
  },
}));

const alertSpy = jest.spyOn(Alert, "alert");

test("deletes a subject and navigates back", async () => {
  mockSubjectSingle.mockResolvedValue({ 
    data: { 
      sId: "subject-123",
      title: "ikt205g26v",
      uId: "user-123",
    },
    error: null,
  });
  mockAssignmentsOrder.mockResolvedValue({ data: [], error: null, })
  mockSubjectDeleteEq.mockResolvedValue({ error: null, });

  const screen = render(<ViewDetailsSubject />);

  await screen.findByText("ikt205g26v");

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
    expect(mockSubjectDelete).toHaveBeenCalled();
    expect(mockSubjectDeleteEq).toHaveBeenCalledWith("sId", "subject-123");
    expect(router.back).toHaveBeenCalled();
  });
});
