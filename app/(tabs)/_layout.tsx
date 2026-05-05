import { getSetupStatus } from "@/lib/setupStatus";
import { supabase } from "@/lib/supabase";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Session } from "@supabase/supabase-js";
import * as Notifications from 'expo-notifications';
import { Redirect, router, Tabs } from "expo-router";
import { useEffect, useState } from "react";

function UseNotificationObserver() {
  useEffect(() => {
    function redirect(notification: Notifications.Notification) {
      const aId = notification.request.content.data?.aId;

      if (typeof aId === 'string') {
        router.push({pathname: "/assignment/viewDetailsAssignment", params: { aId }});
      }
    }

    const response = Notifications.getLastNotificationResponse();
    if (response?.notification) {
      redirect(response.notification);
    }

    const subscription = Notifications.addNotificationResponseReceivedListener(response => {
      redirect(response.notification);
    });

    return () => {
      subscription.remove();
    };
  }, []);
}

export default function TabLayout() {
  const [session, SetSession] = useState<Session | null>(null)
  const [loading, SetLoading] = useState(true);
  const [setupChecked, setSetupChecked] = useState(false);
  const [needsSetup, setNeedsSetup] = useState(false);

    UseNotificationObserver();

  useEffect(() => {
    const loadSession = async () => {
      const { data } = await supabase.auth.getSession();
      SetSession(data.session ?? null);
      SetLoading(false);
    }
    loadSession();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      SetSession(newSession);
      SetLoading(false);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const checkSetupStatus = async () => {
      if (!session?.user.id) {
        setNeedsSetup(false);
        setSetupChecked(true);
        return;
      }

      try {
        const setupStatus = await getSetupStatus(session.user.id);
        setNeedsSetup(!setupStatus.isSetupComplete);
      } catch {
        setNeedsSetup(true);
      } finally {
        setSetupChecked(true);
      }
    };

    setSetupChecked(false);
    void checkSetupStatus();
  }, [session?.user.id]);

  if (loading || !setupChecked) {
    return null;
  }

  if (!session) {
    return <Redirect href="/login" />;
  }

  if (needsSetup) {
    return <Redirect href="/setup" />;
  }

  return (
    <Tabs
    screenOptions={{
      headerShown: true,
    }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarLabel: 'Dashboard',
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="dashboard" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="subjects"
        options={{
          title: "Subjects",
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="menu-book" color={color} size={size} />
          ),
        }}
      />
    </Tabs>
  );
}
