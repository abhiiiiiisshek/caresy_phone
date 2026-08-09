import type { SupabaseClient } from '@supabase/supabase-js';

// Single source of truth for "do we serve this pincode?" on the client.
// Mirrors the DB is_pincode_served() function used by the booking guard, so
// the UI check and the authoritative server check agree.
//
// The caller passes its own Supabase client rather than this module building
// one: the web apps use the cookie-based @supabase/ssr client, React Native
// uses a SecureStore-backed one, and constructing either here would drag Next
// into a package that must stay platform-independent (ADR-0009).

export interface ServiceArea {
  pincode: string;
  area_name: string | null;
  city: string;
}

export interface PincodeCheck {
  served: boolean;
  area?: ServiceArea;
  invalid?: boolean; // not a 6-digit pincode
}

export function isValidPincode(pincode: string): boolean {
  return /^\d{6}$/.test(pincode.trim());
}

/**
 * Every pincode Caresy currently covers, for offering as quick-picks instead of
 * making someone type one and guess whether it is in area.
 *
 * Same table the authoritative check reads, so the list can never drift from
 * what enforce_service_area() will accept.
 */
export async function listServedAreas(supabase: SupabaseClient): Promise<ServiceArea[]> {
  const { data } = await supabase
    .from('service_areas')
    .select('pincode, area_name, city')
    .eq('is_active', true)
    .order('city')
    .order('pincode');
  return (data as ServiceArea[]) ?? [];
}

export async function checkPincodeServed(
  supabase: SupabaseClient,
  pincode: string
): Promise<PincodeCheck> {
  const pin = pincode.trim();
  if (!isValidPincode(pin)) return { served: false, invalid: true };
  const { data } = await supabase
    .from('service_areas')
    .select('pincode, area_name, city')
    .eq('pincode', pin)
    .eq('is_active', true)
    .maybeSingle();
  return { served: !!data, area: (data as ServiceArea) ?? undefined };
}
