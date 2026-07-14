import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet, Link, useLocation } from 'react-router-dom';
import { useStore } from './store';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Records from './pages/Records';
import CreateRequest from './pages/CreateRequest';
import SettingsPage from './pages/SettingsPage';
import ClientsList from './pages/ClientsList';
import ClientDashboard from './pages/ClientDashboard';
import { LayoutDashboard, FileText, PlusCircle, Settings, LogOut, Users } from 'lucide-react';

function PrivateLayout() {
  const { user, logout } = useStore();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="flex h-screen w-full bg-slate-50 overflow-hidden text-slate-900 print:h-auto print:overflow-visible print:bg-white">
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col print:hidden">
        <div className="h-16 flex items-center px-6 border-b border-slate-200">
          <h1 className="font-bold text-xl text-primary">DINSANJ Portal</h1>
        </div>
        
        <nav className="flex-1 p-4 space-y-1">
          <NavLink to="/" icon={<LayoutDashboard size={20} />} label="Dashboard" />
          <NavLink to="/clients" icon={<Users size={20} />} label="Client Hub" />
          <NavLink to="/records" icon={<FileText size={20} />} label="Live Records" />
          <NavLink to="/create" icon={<PlusCircle size={20} />} label="New Request" />
          {user.role === 'Admin' && (
            <NavLink to="/settings" icon={<Settings size={20} />} label="Settings" />
          )}
        </nav>
        
        <div className="p-4 border-t border-slate-200">
          <div className="flex items-center gap-3 px-2 py-2 mb-2">
            <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold">
              {user.name.charAt(0)}
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-medium truncate">{user.name}</p>
              <p className="text-xs text-slate-500 truncate">{user.role}</p>
            </div>
          </div>
          <button 
            onClick={logout}
            className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-slate-600 rounded-md hover:bg-slate-100 transition-colors"
          >
            <LogOut size={18} />
            Logout
          </button>
        </div>
      </aside>
      
      <main className="flex-1 overflow-y-auto p-8 print:overflow-visible print:p-0">
        <div className="mx-auto max-w-6xl print:max-w-none print:mx-0">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

// Custom NavLink to handle active states without full page reload
function NavLink({ to, icon, label }) {
  const location = useLocation();
  const isActive = location.pathname === to;
  return (
    <Link 
      to={to} 
      className={`flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
        isActive 
          ? 'bg-primary/10 text-primary' 
          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
      }`}
    >
      {icon}
      {label}
    </Link>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        
        <Route element={<PrivateLayout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/clients" element={<ClientsList />} />
          <Route path="/clients/:id" element={<ClientDashboard />} />
          <Route path="/records" element={<Records />} />
          <Route path="/create" element={<CreateRequest />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
