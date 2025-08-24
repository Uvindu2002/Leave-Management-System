import { useState } from "react";
import Header from "../../components/Header";
import { useRole } from "../../contexts/RoleContext";

export default function EmployeeDashboard() {
  const { activeRole } = useRole();
  const [user, setUser] = useState({
    name: "Emily Brown",
    role: "employee",
    profileImage: "/default-avatar.png",
  });

  if (activeRole !== 'employee') {
    return null;
  }

  return (
    <div>
      <div className="p-6">
        <h2 className="text-2xl font-bold">Employee Dashboard</h2>
        <div className="mt-4 grid gap-4">
          {/* Employee-specific features */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-gray-100 rounded">
              <h3 className="font-bold">Leave Requests</h3>
              <button className="mt-2 px-4 py-2 bg-blue-500 text-white rounded">
                Apply for Leave
              </button>
            </div>
            <div className="p-4 bg-gray-100 rounded">
              <h3 className="font-bold">My Leave Balance</h3>
              {/* Add leave balance display */}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
