'use client';

import React from 'react';

export default function LicenseGuard({ children }: { children: React.ReactNode }) {
  // Web Application Edition: Full access enabled without hardware lock
  return <>{children}</>;
}
