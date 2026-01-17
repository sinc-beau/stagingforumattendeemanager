import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, User as UserIcon, Shield } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { signOut } from '../services/authService';
import { getRoleBadgeColor, canManageUsers } from '../utils/permissions';

export function AppHeader() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  async function handleLogout() {
    const { error } = await signOut();
    if (error) {
      alert('Failed to log out: ' + error.message);
    } else {
      navigate('/login');
    }
  }

  if (!user) return null;

  return (
    <div className="bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-end h-16 gap-4">
          {canManageUsers(user.role) && (
            <button
              onClick={() => navigate('/users')}
              className="flex items-center gap-2 px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Shield className="w-4 h-4" />
              <span className="text-sm font-medium">Users</span>
            </button>
          )}

          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="flex items-center gap-3 px-3 py-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <div className="flex items-center gap-2">
                <div className="bg-blue-100 p-2 rounded-full">
                  <UserIcon className="w-4 h-4 text-blue-600" />
                </div>
                <div className="text-left">
                  <div className="text-sm font-medium text-gray-900">{user.email}</div>
                  <div className={`text-xs font-medium px-2 py-0.5 rounded inline-block ${getRoleBadgeColor(user.role)}`}>
                    {user.role}
                  </div>
                </div>
              </div>
            </button>

            {showDropdown && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                <div className="px-4 py-3 border-b border-gray-200">
                  <p className="text-sm font-medium text-gray-900">{user.email}</p>
                  <p className="text-xs text-gray-500 mt-1">Role: {user.role}</p>
                </div>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Log out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
