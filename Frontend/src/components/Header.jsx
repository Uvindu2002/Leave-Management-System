import { useState } from "react";
import { useRole } from "../contexts/RoleContext";

export default function Header({ user }) {
  const [open, setOpen] = useState(false);
  const { activeRole, originalRole, switchRole, logout } = useRole(); // Add logout here

  const handleRoleSwitch = async (newRole) => {
  const success = await switchRole(newRole);
  if (success) {
    setOpen(false);
    // 🆕 Optional: reload the page to ensure all components get the new role
    window.location.reload();
  } else {
    alert("Failed to switch role");
  }
};

  const handleLogout = () => {
    logout(); // Use the logout function from context
    window.location.href = "/";
  };

  return (
    <header className="bg-blue-600 text-white p-4 flex justify-between items-center shadow-md">
      <h1 className="text-xl font-bold">Leave Management System</h1>

      <div className="relative">
        {/* Profile Button */}
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
            <span className="text-sm">Active: {activeRole}</span>
          </div>
        </button>

        {/* Dropdown */}
        {open && (
          <div className="absolute right-0 mt-2 w-56 bg-white text-black rounded shadow-lg z-50">
            <div className="px-4 py-2 border-b">
              <p className="font-semibold">{user?.name}</p>
              <p className="text-sm text-gray-600">Base Role: {originalRole}</p>
              <p className="text-sm text-gray-600">
                Active Role: {activeRole}
              </p>
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
                Return to {originalRole.charAt(0).toUpperCase() +
                  originalRole.slice(1)}{" "}
                View
              </button>
            )}

            {/* Logout */}
            <button
              onClick={handleLogout}
              className="block w-full text-left px-4 py-2 hover:bg-gray-100 text-red-600"
            >
              Logout
            </button>
          </div>
        )}
      </div>
    </header>
  );
}