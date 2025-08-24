import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useRole } from "../contexts/RoleContext";

export default function Sidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const location = useLocation();
  const { activeRole, originalRole } = useRole();

  const isInAdminView = originalRole === "admin" && activeRole === "admin";
  const isInManagerView = originalRole === "manager" && activeRole === "manager";
  const isEmployee = activeRole === "employee";

  const isActiveLink = (path) => {
    return location.pathname === path;
  };

  const navItems = {
    admin: [
      { path: "/dashboard", label: "Dashboard", icon: "📊" },
      { path: "/admin/users", label: "User Management", icon: "👥" },
      { path: "/admin/create-user", label: "Create User", icon: "➕" },
      { path: "/admin/leaves", label: "Leave Approvals", icon: "✅" },
      { path: "/admin/reports", label: "Reports", icon: "📈" }
    ],
    manager: [
      { path: "/dashboard", label: "Dashboard", icon: "📊" },
      { path: "/manager/leaves", label: "Leave Approvals", icon: "✅" },
      { path: "/manager/team", label: "My Team", icon: "👥" },
      { path: "/manager/reports", label: "Team Reports", icon: "📈" }
    ],
    employee: [
      { path: "/dashboard", label: "Dashboard", icon: "📊" },
      { path: "/apply-leave", label: "Apply Leave", icon: "📝" },
      { path: "/my-leaves", label: "My Leaves", icon: "📅" },
      { path: "/profile", label: "Profile", icon: "👤" }
    ]
  };

  const getCurrentNavItems = () => {
    if (isInAdminView) return navItems.admin;
    if (isInManagerView) return navItems.manager;
    if (isEmployee) return navItems.employee;
    return navItems.employee; // default
  };

  return (
    <div className={`bg-gray-900 text-white transition-all duration-300 ${isCollapsed ? 'w-16' : 'w-64'} h-full flex flex-col`}>
      {/* Logo */}
      <div className="p-4 border-b border-gray-700 flex items-center justify-between">
        {!isCollapsed && (
          <h1 className="text-xl font-bold">LMS</h1>
        )}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-2 rounded hover:bg-gray-800 transition-colors"
        >
          {isCollapsed ? "→" : "←"}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {getCurrentNavItems().map((item) => (
            <li key={item.path}>
              <Link
                to={item.path}
                className={`flex items-center p-3 rounded-lg transition-colors ${
                  isActiveLink(item.path)
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                }`}
              >
                <span className="text-lg mr-3">{item.icon}</span>
                {!isCollapsed && (
                  <span className="font-medium">{item.label}</span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {/* Current Role Indicator */}
      {!isCollapsed && (
        <div className="p-4 border-t border-gray-700">
          <div className="text-xs text-gray-400 mb-1">Current View</div>
          <div className="text-sm font-medium text-blue-400">
            {isInAdminView ? "Administrator" : 
             isInManagerView ? "Manager" : 
             "Employee"}
          </div>
        </div>
      )}
    </div>
  );
}