import React from 'react';
import { useNavigate, NavLink } from 'react-router-dom';

const linkBase =
  'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors';
const linkInactive = 'text-slate-600 hover:bg-slate-100';
const linkActive = 'bg-primary-100 text-primary-800';

const AdminManageHeader = ({ user, onLogout, onOpenProfile, activeSection }) => {
  const navigate = useNavigate();

  const btnSecondary =
    'px-4 py-2 rounded-lg font-medium text-slate-700 bg-slate-200 hover:bg-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 transition-colors';

  return (
    <header className="bg-white border-b border-slate-200 shadow-sm">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
            <h1 className="text-xl font-semibold text-slate-800">
              {activeSection === 'users' ? 'Manage Users' : 'Manage Tasks'}
            </h1>
            <nav className="flex items-center gap-1 flex-wrap" aria-label="Admin sections">
              <NavLink
                to="/admin/users"
                className={({ isActive }) => `${linkBase} ${isActive ? linkActive : linkInactive}`}
              >
                Users
              </NavLink>
              <NavLink
                to="/admin/tasks"
                className={({ isActive }) => `${linkBase} ${isActive ? linkActive : linkInactive}`}
              >
                Tasks
              </NavLink>
              <NavLink
                to="/tasks"
                className={({ isActive }) => `${linkBase} ${isActive ? linkActive : linkInactive}`}
              >
                Find tasks
              </NavLink>
            </nav>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <span className="text-sm text-slate-600">Welcome, {user.email}</span>
            <button type="button" onClick={() => navigate('/admin')} className={btnSecondary}>
              Back to Summary
            </button>
            <button type="button" onClick={onOpenProfile} className={btnSecondary}>My Profile</button>
            <button type="button" onClick={onLogout} className={btnSecondary}>Logout</button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default AdminManageHeader;
