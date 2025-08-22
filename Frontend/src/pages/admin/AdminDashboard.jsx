import { useState } from "react";
import { Link } from "react-router-dom";
import Header from "../../components/Header";
import { useRole } from "../../contexts/RoleContext";

export default function AdminDashboard() {
  const { activeRole } = useRole();
  const [user, setUser] = useState({
    name: "John Doe",
    role: "admin",
    profileImage: "/default-avatar.png",
  });

  const handleSwitchRole = (newRole) => {
    setUser({ ...user, role: newRole });
  };

  const handleLogout = () => {
    console.log("Logged out");
  };

  if (activeRole !== 'admin') {
    return null; // or some other fallback
  }

  return (
    <div>
      <Header user={user} onSwitchRole={handleSwitchRole} onLogout={handleLogout} />
      <div className="p-6">
        <h2 className="text-2xl font-bold">Admin Dashboard</h2>
        <div className="mt-4 grid gap-4">
          <Link 
            to="/admin/create-user" 
            className="p-4 bg-blue-500 text-white rounded"
          >
            Create New User
          </Link>
          {/* Admin-specific features */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-gray-100 rounded">
              <h3 className="font-bold">User Management</h3>
              {/* Add user management features */}
            </div>
            <div className="p-4 bg-gray-100 rounded">
              <h3 className="font-bold">System Settings</h3>
              {/* Add settings features */}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
