import UpsertSubject from "@/app/subject/upsertSubject";
import { supabase } from "@/lib/supabase";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { router } from "expo-router";

const mockSingle = jest.fn();
const mockSelect = jest.fn(() => ({ single: mockSingle }));
const mockInsert = jest.fn(() => ({ select: mockSelect }));

jest.mock("expo-router", () => ({
  router: {
    back: jest.fn(),
    replace: jest.fn(),
  },
  Stack: {
    Screen: () => null,
  },
  useLocalSearchParams: () => ({}),
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
    },
    from: jest.fn(() => ({
      insert: mockInsert,
    })),
  },
}));

test("creates a subject and navigates back", async () => {
  mockSingle.mockResolvedValue({
    data: {
      sId: "subject-123",
      title: "ikt205g26v",
      uId: "user-123",
    },
    error: null,
  });

  const screen = render(<UpsertSubject />);
  fireEvent.changeText(screen.getByTestId("subject-title-input"), "ikt205g26v");
  fireEvent.press(screen.getByTestId("upsert-subject-button"));

  await waitFor(() => {
    expect(supabase.from).toHaveBeenCalledWith("subjects");
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "ikt205g26v",
        uId: "user-123",
      })
    );
    expect(mockSelect).toHaveBeenCalled();
    expect(mockSingle).toHaveBeenCalled();
    expect(router.back).toHaveBeenCalled();
  });
});
