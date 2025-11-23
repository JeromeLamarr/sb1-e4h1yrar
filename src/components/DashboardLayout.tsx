import { ReactNode, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { NotificationCenter } from './NotificationCenter';
import {
  GraduationCap,
  LayoutDashboard,
  FileText,
  Users,
  Settings,
  LogOut,
  Menu,
  X,
  User as UserIcon,
  ClipboardList,
  Star,
  PieChart,
  UserCheck
} from 'lucide-react';
import type { UserRole } from '../lib/database.types';

interface DashboardLayoutProps {
  children: ReactNode;
}

interface NavItem {
  label: string;
  path: string;
  icon: typeof LayoutDashboard;
  roles: UserRole[];
}

const navItems: NavItem[] = [
  {
    label: 'Dashboard',
    path: '/dashboard',
    icon: LayoutDashboard,
    roles: ['applicant', 'supervisor', 'evaluator', 'admin'],
  },
  {
    label: 'My Submissions',
    path: '/dashboard/submissions',
    icon: FileText,
    roles: ['applicant'],
  },
  {
    label: 'New Submission',
    path: '/dashboard/submit',
    icon: ClipboardList,
    roles: ['applicant'],
  },
  {
    label: 'Review Queue',
    path: '/dashboard/review',
    icon: ClipboardList,
    roles: ['supervisor'],
  },
  {
    label: 'Evaluations',
    path: '/dashboard/evaluations',
    icon: Star,
    roles: ['evaluator'],
  },
  {
    label: 'Users',
    path: '/dashboard/users',
    icon: Users,
    roles: ['admin'],
  },
  {
    label: 'All Records',
    path: '/dashboard/records',
    icon: FileText,
    roles: ['admin'],
  },
  {
    label: 'Assignments',
    path: '/dashboard/assignments',
    icon: UserCheck,
    roles: ['admin'],
  },
  {
    label: 'Analytics',
    path: '/dashboard/analytics',
    icon: PieChart,
    roles: ['admin'],
  },
  {
    label: 'Settings',
    path: '/dashboard/settings',
    icon: Settings,
    roles: ['applicant', 'supervisor', 'evaluator', 'admin'],
  },
];

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const filteredNavItems = navItems.filter((item) =>
    profile ? item.roles.includes(profile.role) : false
  );

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="fixed top-0 left-0 right-0 bg-white border-b border-gray-200 z-30">
        <div className="flex items-center justify-between h-16 px-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden p-2 hover:bg-gray-100 rounded-lg"
            >
              {sidebarOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
            <Link to="/dashboard" className="flex items-center gap-2">
              <GraduationCap className="h-8 w-8 text-blue-600" />
              <span className="font-bold text-xl hidden sm:block">UCC IP Office</span>
            </Link>
          </div>

          <div className="flex items-center gap-4">
            <NotificationCenter />
            <div className="flex items-center gap-3 pl-4 border-l border-gray-200">
              <div className="text-right hidden sm:block">
                <div className="text-sm font-medium text-gray-900">{profile?.full_name}</div>
                <div className="text-xs text-gray-500 capitalize">{profile?.role}</div>
              </div>
              <div className="h-10 w-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold">
                {profile?.full_name.charAt(0).toUpperCase()}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div
        className={`fixed inset-y-0 left-0 z-20 w-64 bg-white border-r border-gray-200 transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } mt-16`}
      >
        <nav className="h-full flex flex-col p-4">
          <div className="flex-1 space-y-1">
            {filteredNavItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    active
                      ? 'bg-blue-50 text-blue-600 font-medium'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>

          <button
            onClick={handleSignOut}
            className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors w-full"
          >
            <LogOut className="h-5 w-5" />
            <span>Sign Out</span>
          </button>
        </nav>
      </div>

      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-10 lg:hidden mt-16"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <main className="lg:ml-64 pt-16">
        <div className="p-6 max-w-7xl mx-auto">{children}</div>
      </main>
    </div>
  );
}
