import { createBrowserRouter } from 'react-router-dom';
import { AdminApp } from '../features/auth/components/AdminApp';
import { NavigationBoundary } from './navigation';
import { adminRouteContracts } from './route-contract';

export const router = createBrowserRouter([
  { element: <NavigationBoundary />, children: [{ element: <AdminApp />, children: adminRouteContracts }] },
], { basename: '/admin' });
