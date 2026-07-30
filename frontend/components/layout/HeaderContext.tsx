"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";

interface HeaderConfig {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  hideNavbar?: boolean;
}

interface HeaderContextType {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  hideNavbar?: boolean;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  setHeader: (config: HeaderConfig) => void;
  clearHeader: () => void;
}

const HeaderContext = createContext<HeaderContextType | undefined>(undefined);

export function HeaderProvider({ children }: { children: React.ReactNode }) {
  const [title, setTitle] = useState<React.ReactNode>("");
  const [subtitle, setSubtitle] = useState<React.ReactNode>("");
  const [actions, setActions] = useState<React.ReactNode>(null);
  const [hideNavbar, setHideNavbar] = useState<boolean>(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const setHeader = useCallback((config: HeaderConfig) => {
    setTitle(config.title);
    setSubtitle(config.subtitle ?? "");
    setActions(config.actions ?? null);
    setHideNavbar(config.hideNavbar ?? false);
  }, []);

  const clearHeader = useCallback(() => {
    setTitle("");
    setSubtitle("");
    setActions(null);
    setHideNavbar(false);
  }, []);

  return (
    <HeaderContext.Provider
      value={{
        title,
        subtitle,
        actions,
        hideNavbar,
        sidebarOpen,
        setSidebarOpen,
        setHeader,
        clearHeader,
      }}
    >
      {children}
    </HeaderContext.Provider>
  );
}

export function useHeader() {
  const context = useContext(HeaderContext);
  if (!context) {
    throw new Error("useHeader must be used within a HeaderProvider");
  }
  return context;
}

interface HeaderSetterProps extends HeaderConfig {}

export function HeaderSetter({ title, subtitle, actions, hideNavbar }: HeaderSetterProps) {
  const { setHeader, clearHeader } = useHeader();

  useEffect(() => {
    setHeader({ title, subtitle, actions, hideNavbar });
    return () => {
      clearHeader();
    };
  }, [title, subtitle, actions, hideNavbar, setHeader, clearHeader]);

  return null;
}
