'use client';

import React from 'react';
import { StateLayout, type StateSlotProps } from './StateLayout';

export type LoadingStateProps = StateSlotProps;

/**
 * LoadingState — a calm waiting slot. The spot's gentle pulse carries the
 * "working…" feel, so there's no spinner by default. Defaults to the `waiting`
 * variant; pass copy like "Getting things ready…" as `title`.
 */
export function LoadingState(props: LoadingStateProps) {
  return <StateLayout defaultVariant="waiting" defaultSize={132} {...props} />;
}
