import TabLayout from "@/app/(tabs)/_layout";
import { supabase } from "@/lib/supabase";
import { render, waitFor } from "@testing-library/react-native";

jest.mock("expo-router", () => {
  const React = require("react");
  const { Text, View } = require("react-native");

  const MockTabs = ({ children }: { children?: React.ReactNode }) => (
    <View>
      <Text>tabs</Text>
      {children}
    </View>
  );

  MockTabs.Screen = () => null;

  return {
    Redirect: ({ href }: { href: string }) => <Text>redirect:{href}</Text>,
    Tabs: MockTabs,
    router: {
      push: jest.fn(),
    },
  };
});

jest.mock("expo-notifications", () => ({
  getLastNotificationResponse: jest.fn(() => null),
  addNotificationResponseReceivedListener: jest.fn(() => ({
    remove: jest.fn(),
  })),
}));

jest.mock("@/lib/supabase", () => ({
  supabase: {
    auth: {
      getSession: jest.fn(),
      onAuthStateChange: jest.fn(() => ({
        data: {
          subscription: {
            unsubscribe: jest.fn(),
          },
        },
      })),
    },
  },
}));

beforeEach(() => {
  jest.clearAllMocks();
});

test("redirects to login if there is no session", async () => {
  (supabase.auth.getSession as jest.Mock).mockResolvedValue({
    data: { session: null },
  });

  const screen = render(<TabLayout />);

  await waitFor(() => {
    expect(screen.getByText("redirect:/login")).toBeTruthy();
  });
});

test("renders tabs when session exists", async () => {
  (supabase.auth.getSession as jest.Mock).mockResolvedValue({
    data: {
      session: {
        user: { id: "user-123" },
      },
    },
  });

  const screen = render(<TabLayout />);

  await waitFor(() => {
    expect(screen.getByText("tabs")).toBeTruthy();
  });
});