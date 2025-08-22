// ProtectedRoute.jsx
import { Navigate } from "react-router-dom";
import { useRole } from "../contexts/RoleContext";

export default function ProtectedRoute({ children, requiredRole }) {
  const { user, token, loading, activeRole } = useRole();

  // Show loading spinner while validating
  if (loading) {
    return <div>Loading...</div>; // Or your custom loading component
  }

  // Not logged in
  if (!user || !token) {
    return <Navigate to="/login" replace />;
  }

  // Role-based access - use activeRole instead of user.role
  if (requiredRole && activeRole !== requiredRole) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}