'use client';

import React from 'react';
import { StateLayout, type StateSlotProps } from './StateLayout';

export type ErrorStateProps = StateSlotProps;

/**
 * ErrorState — something went wrong, kept gentle. Defaults to the `oops` spot
 * (never alarming). Pass a retry control as `action`.
 */
export function ErrorState(props: ErrorStateProps) {
  return <StateLayout defaultVariant="oops" defaultSize={140} {...props} />;
}
