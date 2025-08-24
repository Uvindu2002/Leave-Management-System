import { useState } from "react";
import { useRole } from "../contexts/RoleContext";
import { Link } from "react-router-dom";

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

  // Check if user is currently in admin view (original role is admin AND active role is admin)
  const isInAdminView = originalRole === "admin" && activeRole === "admin";
  const isInManagerView = originalRole === "manager" && activeRole === "manager";
  const isEmployee = activeRole === "employee";

  return (
    <header className="bg-blue-600 text-white p-4 flex justify-between items-center shadow-md">
      {/* Logo and Navigation */}
      <div className="flex items-center space-x-6">
        <Link to="/dashboard" className="text-xl font-bold">
          Leave Management System
        </Link>
        
        {/* Navigation Links - Only show when in actual admin/manager view */}
        {user && isInAdminView && (
          <nav className="hidden md:flex space-x-4">
            <Link 
              to="/dashboard" 
              className="px-3 py-2 rounded hover:bg-blue-700 transition-colors"
            >
              Dashboard
            </Link>
            <Link 
              to="/admin/users" 
              className="px-3 py-2 rounded hover:bg-blue-700 transition-colors"
            >
              User Management
            </Link>
            <Link 
              to="/admin/create-user" 
              className="px-3 py-2 rounded hover:bg-blue-700 transition-colors"
            >
              Create User
            </Link>
          </nav>
        )}

        {user && isInManagerView && (
          <nav className="hidden md:flex space-x-4">
            <Link 
              to="/dashboard" 
              className="px-3 py-2 rounded hover:bg-blue-700 transition-colors"
            >
              Dashboard
            </Link>
            <Link 
              to="/manager/leaves" 
              className="px-3 py-2 rounded hover:bg-blue-700 transition-colors"
            >
              Leave Approvals
            </Link>
          </nav>
        )}

        {user && isEmployee && (
          <nav className="hidden md:flex space-x-4">
            <Link 
              to="/dashboard" 
              className="px-3 py-2 rounded hover:bg-blue-700 transition-colors"
            >
              Dashboard
            </Link>
            <Link 
              to="/apply-leave" 
              className="px-3 py-2 rounded hover:bg-blue-700 transition-colors"
            >
              Apply Leave
            </Link>
            <Link 
              to="/my-leaves" 
              className="px-3 py-2 rounded hover:bg-blue-700 transition-colors"
            >
              My Leaves
            </Link>
          </nav>
        )}
      </div>

      {/* User Profile */}
      <div className="relative">
        <button
          onClick={() => setOpen(!open)}
          className="flex items-center space-x-2"
        >
          <img
            src={user?.profileImage || "/default-avatar.png"}
            alt="Profile"
            className="w-10 h-10 rounded-full border"
          />
          <div className="text-left">
            <span className="block">{user?.name}</span>
            <span className="text-sm">
              {isInAdminView ? "Admin View" : 
               isInManagerView ? "Manager View" : 
               "Employee View"}
            </span>
          </div>
        </button>

        {/* Dropdown Menu */}
        {open && (
          <div className="absolute right-0 mt-2 w-56 bg-white text-black rounded shadow-lg z-50">
            <div className="px-4 py-2 border-b">
              <p className="font-semibold">{user?.name}</p>
              <p className="text-sm text-gray-600">Base Role: {originalRole}</p>
              <p className="text-sm text-gray-600">Active Role: {activeRole}</p>
            </div>

            {/* Role Switching Options */}
            {originalRole === "admin" && activeRole === "admin" && (
              <button
                onClick={() => handleRoleSwitch("employee")}
                className="block w-full text-left px-4 py-2 hover:bg-gray-100"
              >
                Switch to Employee View
              </button>
            )}

            {originalRole === "manager" && activeRole === "manager" && (
              <button
                onClick={() => handleRoleSwitch("employee")}
                className="block w-full text-left px-4 py-2 hover:bg-gray-100"
              >
                Switch to Employee View
              </button>
            )}

            {activeRole === "employee" && originalRole !== "employee" && (
              <button
                onClick={() => handleRoleSwitch(originalRole)}
                className="block w-full text-left px-4 py-2 hover:bg-gray-100"
              >
                Return to {originalRole.charAt(0).toUpperCase() + originalRole.slice(1)} View
              </button>
            )}

            {/* Navigation Links in Dropdown */}
            <div className="border-t">
              <Link 
                to="/dashboard" 
                className="block w-full text-left px-4 py-2 hover:bg-gray-100"
                onClick={() => setOpen(false)}
              >
                Dashboard
              </Link>
              
              {/* Employee Links */}
              {isEmployee && (
                <>
                  <Link 
                    to="/apply-leave" 
                    className="block w-full text-left px-4 py-2 hover:bg-gray-100"
                    onClick={() => setOpen(false)}
                  >
                    Apply Leave
                  </Link>
                  <Link 
                    to="/my-leaves" 
                    className="block w-full text-left px-4 py-2 hover:bg-gray-100"
                    onClick={() => setOpen(false)}
                  >
                    My Leaves
                  </Link>
                </>
              )}
              
              {/* Admin Links */}
              {isInAdminView && (
                <>
                  <Link 
                    to="/admin/users" 
                    className="block w-full text-left px-4 py-2 hover:bg-gray-100"
                    onClick={() => setOpen(false)}
                  >
                    User Management
                  </Link>
                  <Link 
                    to="/admin/create-user" 
                    className="block w-full text-left px-4 py-2 hover:bg-gray-100"
                    onClick={() => setOpen(false)}
                  >
                    Create User
                  </Link>
                </>
              )}

              {/* Manager Links */}
              {isInManagerView && (
                <Link 
                  to="/manager/leaves" 
                  className="block w-full text-left px-4 py-2 hover:bg-gray-100"
                  onClick={() => setOpen(false)}
                >
                  Leave Approvals
                </Link>
              )}
            </div>

            {/* Logout */}
            <button
              onClick={handleLogout}
              className="block w-full text-left px-4 py-2 hover:bg-gray-100 text-red-600 border-t"
            >
              Logout
            </button>
          </div>
        )}
      </div>
    </header>
  );
}