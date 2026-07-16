import { supabase } from '@/integrations/supabase/client';
import { useEffect, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';

export type AppRole = 'admin' | 'company' | 'agent';

// Wrap existing useAuth hook changes: call repair RPC and cart merge on login
export function useAuthEffects(session: Session | null | undefined) {
  useEffect(() => {
    const user = session?.user;
    if (!user) return;
    // attempt repair of agent provisioning
    try {
      supabase.rpc('repair_agent_provisions_for_user', { _user: user.id });
    } catch (e) {
      // ignore
      console.error('repair_agent_provisions_for_user failed', e);
    }

    // Merge client cart to server: read localStorage key and call merge RPC
    try {
      const raw = typeof window !== 'undefined' ? localStorage.getItem('souqly.cart.v1') : null;
      if (raw) {
        const arr = JSON.parse(raw);
        if (Array.isArray(arr) && arr.length > 0) {
          supabase.rpc('merge_guest_cart_to_user', { _user: user.id, _items: JSON.stringify(arr) });
        }
      }
    } catch (e) {
      // ignore
    }
  }, [session]);
}
