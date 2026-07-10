import { createClient } from '@caresy/auth/supabase/client';

// Single source of truth for "do we serve this pincode?" on the client.
// Mirrors the DB is_pincode_served() function used by the booking guard, so
// the UI check and the authoritative server check agree.

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

export async function checkPincodeServed(pincode: string): Promise<PincodeCheck> {
  const pin = pincode.trim();
  if (!isValidPincode(pin)) return { served: false, invalid: true };
  const supabase = createClient();
  const { data } = await supabase
    .from('service_areas')
    .select('pincode, area_name, city')
    .eq('pincode', pin)
    .eq('is_active', true)
    .maybeSingle();
  return { served: !!data, area: (data as ServiceArea) ?? undefined };
}
