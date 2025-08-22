// DashboardWrapper.jsx
import { Navigate } from "react-router-dom";
import { useRole } from "../contexts/RoleContext";
import AdminDashboard from "../pages/admin/AdminDashboard";
import ManagerDashboard from "../pages/manager/ManagerDashboard";
import EmployeeDashboard from "../pages/employee/EmployeeDashboard";

export default function DashboardWrapper() {
  const { activeRole, loading } = useRole(); // Add loading

  if (loading) return <div>Loading...</div>; // Show loading while checking

  if (!activeRole) return <Navigate to="/" replace />;

  switch (activeRole) {
    case "admin":
      return <AdminDashboard />;
    case "manager":
      return <ManagerDashboard />;
    case "employee":
      return <EmployeeDashboard />;
    default:
      return <Navigate to="/" replace />;
  }
}