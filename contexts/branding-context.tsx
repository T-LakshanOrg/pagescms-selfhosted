"use client";

import { createContext, useContext } from "react";

// Fork addition: the site's name and logo from `branding` in .pages.yml.
type BrandingContextType = {
  name?: string;
  description?: string;
  website?: string;
  logo?: string | null;
};

const BrandingContext = createContext<BrandingContextType>({});

export const useBranding = () => useContext(BrandingContext);

export const BrandingProvider = ({
  value,
  children,
}: {
  value: BrandingContextType;
  children: React.ReactNode;
}) => (
  <BrandingContext.Provider value={value}>{children}</BrandingContext.Provider>
);
