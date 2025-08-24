import { useState } from "react";
import { useRole } from "../contexts/RoleContext";

export default function Header({ user }) {
  const [open, setOpen] = useState(false);
  const { activeRole, originalRole, switchRole, logout } = useRole();

  const handleRoleSwitch = async (newRole) => {
    const success = await switchRole(newRole);
    if (success) setOpen(false);
  };

  const handleLogout = () => {
    logout();
    window.location.href = "/";
  };

  const isInAdminView = originalRole === "admin" && activeRole === "admin";
  const isInManagerView = originalRole === "manager" && activeRole === "manager";

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center shadow-sm">
      {/* Page Title - You can make this dynamic based on current route */}
      <h1 className="text-xl font-semibold text-gray-900">
        Leave Management System
      </h1>

      {/* User Profile with Role Switching */}
      <div className="relative">
        <button
          onClick={() => setOpen(!open)}
          className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <div className="text-right hidden sm:block">
            <div className="text-sm font-medium text-gray-900">{user?.name}</div>
            <div className="text-xs text-gray-500">
              {isInAdminView ? "Admin View" : 
               isInManagerView ? "Manager View" : 
               "Employee View"}
            </div>
          </div>
          <img
            src={user?.profileImage || "/default-avatar.png"}
            alt="Profile"
            className="w-8 h-8 rounded-full border-2 border-gray-300"
          />
          <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* Dropdown Menu */}
        {open && (
          <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
            <div className="p-4 border-b border-gray-100">
              <div className="font-medium text-gray-900">{user?.name}</div>
              <div className="text-sm text-gray-500">{user?.email}</div>
            </div>

            {/* Role Switching Section */}
            <div className="p-2 border-b border-gray-100">
              <div className="px-3 py-1 text-xs font-medium text-gray-500">Switch View</div>
              
              {originalRole === "admin" && activeRole === "admin" && (
                <button
                  onClick={() => handleRoleSwitch("employee")}
                  className="w-full text-left px-3 py-2 text-sm rounded hover:bg-gray-50 transition-colors"
                >
                  👤 Employee View
                </button>
              )}

              {originalRole === "manager" && activeRole === "manager" && (
                <button
                  onClick={() => handleRoleSwitch("employee")}
                  className="w-full text-left px-3 py-2 text-sm rounded hover:bg-gray-50 transition-colors"
                >
                  👤 Employee View
                </button>
              )}

              {activeRole === "employee" && originalRole !== "employee" && (
                <button
                  onClick={() => handleRoleSwitch(originalRole)}
                  className="w-full text-left px-3 py-2 text-sm rounded hover:bg-gray-50 transition-colors"
                >
                  {originalRole === "admin" ? "👑 Admin View" : "📋 Manager View"}
                </button>
              )}
            </div>

            {/* Quick Settings */}
            <div className="p-2 border-b border-gray-100">
              <button className="w-full text-left px-3 py-2 text-sm rounded hover:bg-gray-50 transition-colors">
                ⚙️ Settings
              </button>
              <button className="w-full text-left px-3 py-2 text-sm rounded hover:bg-gray-50 transition-colors">
                ❓ Help
              </button>
            </div>

            {/* Logout */}
            <div className="p-2">
              <button
                onClick={handleLogout}
                className="w-full text-left px-3 py-2 text-sm text-red-600 rounded hover:bg-red-50 transition-colors"
              >
                🚪 Logout
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}