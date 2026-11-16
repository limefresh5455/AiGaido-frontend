import type { ReactNode } from 'react';

export interface AdminLayoutProps {
  children: ReactNode;
}

export interface SidebarProps {
  isOpen: boolean;
  toggleSidebar: () => void;
}
