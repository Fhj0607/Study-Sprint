import {
  GetActiveSession,
  RemoveActiveSession,
  RemoveStudyCycle,
  type ActiveSession,
} from '@/lib/asyncStorage';
import { supabase } from '@/lib/supabase';

export type FinalSessionStatus = 'completed' | 'cancelled' | 'expired';

export async function finalizeStoredSession(
  finalStatus: FinalSessionStatus,
  activeSessionOverride?: ActiveSession | null
) {
  const activeSession = activeSessionOverride ?? await GetActiveSession();

  if (!activeSession) {
    return null;
  }

  await RemoveActiveSession();

  if (finalStatus !== 'completed') {
    await RemoveStudyCycle();
  }

  const { error } = await supabase.rpc('finalize_sprint_session', {
    p_session_id: activeSession.sessionId,
    p_final_status: finalStatus,
    p_ended_at: new Date().toISOString(),
  });

  return {
    activeSession,
    error,
  };
}
