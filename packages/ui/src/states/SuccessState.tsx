'use client';

import React from 'react';
import { StateLayout, type StateSlotProps } from './StateLayout';

export type SuccessStateProps = StateSlotProps;

/**
 * SuccessState — a win worth a small celebration. Defaults to the `success`
 * spot. Pass a next-step as `action`.
 */
export function SuccessState(props: SuccessStateProps) {
  return <StateLayout defaultVariant="success" defaultSize={148} {...props} />;
}
