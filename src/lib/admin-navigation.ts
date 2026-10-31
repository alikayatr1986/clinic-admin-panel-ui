import { createContext, useContext } from 'react';
import type { AdminNavigation } from '../types/navigation.types';
export const AdminNavigationContext = createContext<AdminNavigation | null>(null);
export const useAdminNavigation = () => useContext(AdminNavigationContext);
