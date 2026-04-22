import { supabase } from "@/lib/supabase";
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

  if (loading) {
    return null;
  }

  if (!session) {
    return <Redirect href="/createUser" />;
  }

  return (
    <Tabs>
      <Tabs.Screen name="index" options={{title: "Index"}} />
      <Tabs.Screen name="tasks" options={{title: "Tasks"}} />
      <Tabs.Screen name="assignments" options={{title: "Assignments"}} />
      <Tabs.Screen name="subjects" options={{title: "Subjects"}} />
      <Tabs.Screen name="timer" options={{title: "Timer"}} />
    </Tabs>
  );
}