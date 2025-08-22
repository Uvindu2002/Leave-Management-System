import { useState } from "react";
import Header from "../../components/Header";

export default function ManagerDashboard() {
  const [user, setUser] = useState({
    name: "Jane Smith",
    role: "manager",
    profileImage: "/default-avatar.png",
  });

  const handleSwitchRole = (newRole) => {
    setUser({ ...user, role: newRole });
  };

  const handleLogout = () => {
    console.log("Logged out");
  };

  return (
    <div>
      <Header user={user} onSwitchRole={handleSwitchRole} onLogout={handleLogout} />
      <div className="p-6">
        <h2 className="text-2xl font-bold">Manager Dashboard</h2>
        <p>Welcome, {user.name}! You are logged in as {user.role}.</p>
      </div>
    </div>
  );
}
