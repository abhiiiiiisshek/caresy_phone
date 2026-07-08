'use client';

import React, { useState } from 'react';

export interface InputProps {
  label?: string;
  id?: string;
  name?: string;
  type?: string;
  placeholder?: string;
  value?: string | number;
  defaultValue?: string | number;
  onChange?: React.ChangeEventHandler<HTMLInputElement | HTMLTextAreaElement>;
  onBlur?: React.FocusEventHandler<HTMLInputElement | HTMLTextAreaElement>;
  multiline?: boolean;
  rows?: number;
  icon?: React.ReactNode;
  hint?: string;
  required?: boolean;
  disabled?: boolean;
  min?: number | string;
  max?: number | string;
  checked?: boolean;
  style?: React.CSSProperties;
  inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode'];
  pattern?: string;
  maxLength?: number;
  autoFocus?: boolean;
}

/**
 * Input — labelled text field. Warm, rounded, with clear focus ring. Also
 * handles textarea (multiline) and a leading icon slot.
 */
export function Input({
  label,
  id,
  name,
  type = 'text',
  placeholder = '',
  value,
  defaultValue,
  onChange,
  onBlur,
  multiline = false,
  rows = 4,
  icon = null,
  hint = '',
  required = false,
  style = {},
  ...rest
}: InputProps) {
  const [focused, setFocused] = useState(false);
  const fieldStyle: React.CSSProperties = {
    width: '100%',
    padding: icon ? '13px 14px 13px 42px' : '13px 14px',
    fontFamily: 'var(--font-sans, inherit)',
    fontSize: '0.95rem',
    color: 'var(--text, var(--ink))',
    background: 'var(--surface)',
    border: `1px solid ${focused ? 'var(--teal)' : 'var(--line)'}`,
    borderRadius: 'var(--radius-sm)',
    outline: 'none',
    boxShadow: focused ? '0 0 0 3px rgba(13,122,102,0.15)' : 'none',
    transition: 'border-color var(--dur) ease, box-shadow var(--dur) ease',
    resize: multiline ? 'vertical' : 'none',
  };
  return (
    <label style={{ display: 'block', ...style }}>
      {label && (
        <span style={{ display: 'block', marginBottom: 6, fontSize: '0.82rem', fontWeight: 700, color: 'var(--ink-teal)' }}>
          {label}{required && <span style={{ color: 'var(--terracotta)' }}> *</span>}
        </span>
      )}
      <span style={{ position: 'relative', display: 'block' }}>
        {icon && <span style={{ position: 'absolute', left: 14, top: multiline ? 15 : '50%', transform: multiline ? 'none' : 'translateY(-50%)', color: 'var(--text-muted, var(--muted))', display: 'inline-flex' }}>{icon}</span>}
        {multiline ? (
          <textarea
            id={id} name={name} rows={rows} placeholder={placeholder}
            value={value as string} defaultValue={defaultValue as string}
            onChange={onChange} onBlur={onBlur} required={required}
            onFocus={() => setFocused(true)} onBlurCapture={() => setFocused(false)}
            style={fieldStyle} {...rest}
          />
        ) : (
          <input
            id={id} name={name} type={type} placeholder={placeholder}
            value={value} defaultValue={defaultValue}
            onChange={onChange} onBlur={onBlur} required={required}
            onFocus={() => setFocused(true)} onBlurCapture={() => setFocused(false)}
            style={fieldStyle} {...rest}
          />
        )}
      </span>
      {hint && <span style={{ display: 'block', marginTop: 5, fontSize: '0.78rem', color: 'var(--text-muted, var(--muted))' }}>{hint}</span>}
    </label>
  );
}
