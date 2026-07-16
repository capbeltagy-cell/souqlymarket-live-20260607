import { supabase } from '@/integrations/supabase/client';

// Hook patch: call repair_agent_provisions_for_user on login to auto-repair missing marketer resources
export async function repairAgentProvisionOnLogin(userId: string | undefined | null) {
  if (!userId) return;
  try {
    await supabase.rpc('repair_agent_provisions_for_user', { _user: userId });
  } catch (e) {
    // silent
    console.error('repairAgentProvisionOnLogin failed', e);
  }
}
