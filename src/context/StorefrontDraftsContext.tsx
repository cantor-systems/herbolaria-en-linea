'use client';

import { createContext, useContext, useState, type ReactNode } from 'react';

interface StorefrontDrafts {
  searchDraft: string;
  setSearchDraft: (value: string) => void;
  couponDraft: string;
  setCouponDraft: (value: string) => void;
}

const StorefrontDraftsContext = createContext<StorefrontDrafts | null>(null);

export function StorefrontDraftsProvider({ children }: { children: ReactNode }) {
  const [searchDraft, setSearchDraft] = useState('');
  const [couponDraft, setCouponDraft] = useState('');

  return (
    <StorefrontDraftsContext.Provider value={{ searchDraft, setSearchDraft, couponDraft, setCouponDraft }}>
      {children}
    </StorefrontDraftsContext.Provider>
  );
}

export function useStorefrontDrafts() {
  const drafts = useContext(StorefrontDraftsContext);
  if (!drafts) throw new Error('useStorefrontDrafts requiere StorefrontDraftsProvider');
  return drafts;
}
