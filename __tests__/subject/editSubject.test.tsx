import { supabase } from "@/lib/supabase";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { router } from "expo-router";
import EditSubject from "../../app/subject/editSubject";

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

test("updates a subject and navigates back", async () => {
  mockSingle.mockResolvedValue({ 
    data: { 
        sId: "subject-123",
        title: "ikt205g26v",
        uId: "user-123",
    },
    error: null,
  });
  mockUpdateEq.mockResolvedValue({ error: null, });

  const screen = render(<EditSubject />);
  fireEvent.changeText(await screen.findByTestId("subject-title-input"), "ikt206g26v");
  fireEvent.press(screen.getByTestId("edit-subject-button"));

  await waitFor(() => {
    expect(supabase.from).toHaveBeenCalledWith("subjects");
    expect(mockSelect).toHaveBeenCalled();
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "ikt206g26v",
        uId: "user-123",
      })
    );
    expect(mockUpdateEq).toHaveBeenCalledWith("sId", "subject-123");
    expect(router.back).toHaveBeenCalled();
  });
});