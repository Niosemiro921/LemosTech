import { Outlet } from 'react-router-dom';
import { Header } from './Header';
import { BottomNav } from './BottomNav';
export function Layout() { return <><Header /><main><Outlet /></main><BottomNav /></>; }
