'use client';

import React from 'react';
import { StateLayout, type StateSlotProps } from './StateLayout';

export type EmptyStateProps = StateSlotProps;

/**
 * EmptyState — a slot for "nothing here yet". Defaults to the clipboard spot;
 * pass a more specific `variant` to fit the screen (e.g. `calendar` for empty
 * bookings).
 */
export function EmptyState(props: EmptyStateProps) {
  return <StateLayout defaultVariant="clipboard" defaultSize={148} {...props} />;
}
