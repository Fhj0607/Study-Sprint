import { supabase } from "@/lib/supabase";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { router } from "expo-router";
import CreateSubject from "../../app/subject/createSubject";

const mockInsert = jest.fn();

jest.mock("expo-router", () => ({
  router: {
    back: jest.fn(),
    replace: jest.fn(),
  },
  Stack: {
    Screen: () => null,
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

test("creates a subject and navigates back", async () => {
  mockInsert.mockResolvedValue({ error: null });

  const screen = render(<CreateSubject />);
  fireEvent.changeText(screen.getByTestId("subject-title-input"), "ikt205g26v");
  fireEvent.press(screen.getByTestId("create-subject-button"));

  await waitFor(() => {
    expect(supabase.from).toHaveBeenCalledWith("subjects");
    expect(mockInsert).toHaveBeenCalled();
    expect(router.back).toHaveBeenCalled();
  });
});