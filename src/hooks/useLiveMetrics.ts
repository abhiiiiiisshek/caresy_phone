'use client';

import { useState, useEffect } from 'react';

// Store values outside the component so they are shared and persistent
// across route changes during the same session.
let sharedCallbackMin: number | null = null;
let sharedDeskCompanions: number | null = null;

export function useLiveMetrics() {
  const [callbackMin, setCallbackMin] = useState<number>(4);
  const [deskCompanions, setDeskCompanions] = useState<number>(5);

  useEffect(() => {
    if (sharedCallbackMin === null) {
      sharedCallbackMin = 4 + Math.floor(Math.random() * 5); // 4-8 mins
    }
    if (sharedDeskCompanions === null) {
      sharedDeskCompanions = 5 + Math.floor(Math.random() * 7); // 5-11 companions
    }
    setCallbackMin(sharedCallbackMin);
    setDeskCompanions(sharedDeskCompanions);
  }, []);

  return { callbackMin, deskCompanions };
}
