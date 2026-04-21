import { supabase } from "@/lib/supabase";
import { Session } from "@supabase/supabase-js";
import { Tabs } from "expo-router";
import { useEffect, useState } from "react";

export default function TabLayout() {
  const [session, SetSession] = useState<Session | null>(null)
  const [loading, SetLoading] = useState(true);

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

 //   if (!session) {
 //     return <Redirect href="/createUser" />;
 //   }

  return (
    <Tabs>
      <Tabs.Screen name="index" options={{title: "Today"}} />
      <Tabs.Screen name="tasks" options={{title: "Tasks"}} />
    </Tabs>
  );
}