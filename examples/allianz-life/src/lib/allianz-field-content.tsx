'use client';

import { withFieldMetadata } from '@sitecore-content-sdk/nextjs';
import type { ReactNode } from 'react';

interface AllianzFieldContentProps {
  field?: { value?: unknown; metadata?: { [key: string]: unknown } };
  editable?: boolean;
  children: ReactNode;
}

/** Native field chrome around the same visual content shown to visitors. */
const FieldContent = ({ children }: AllianzFieldContentProps) => <>{children}</>;

export const AllianzFieldContent = withFieldMetadata(FieldContent);
