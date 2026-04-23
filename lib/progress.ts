import { supabase } from '@/lib/supabase';

export async function CheckAssignmentCompletion(aId: string) {
  const { data, error } = await supabase.from("tasks").select("tId, isCompleted").eq("aId", aId);

  if (error) throw error;

  const tasks = data ?? [];

  const allCompleted = tasks.length > 0 && tasks.every((task) => task.isCompleted === true);

  const { error: updateError } = await supabase.from("assignments").update({ isCompleted: allCompleted, lastChanged: new Date().toISOString()}).eq("aId", aId);

  if (updateError) throw updateError;
}