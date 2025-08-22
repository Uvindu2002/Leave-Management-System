import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { RoleProvider, useRole } from "./contexts/RoleContext";
import CreateUser from "./pages/admin/CreateUser";
import Login from "./pages/Login";
import DashboardWrapper from "./components/DashboardWrapper";

// ProtectedRoute component
function ProtectedRoute({ children, requiredRole }) {
  const { user, loading } = useRole();

  // While validating token, optionally show nothing (or a spinner)
  if (loading) return null;

  // Not logged in
  if (!user) return <Navigate to="/" replace />;

  // Role-based access
  if (requiredRole && user.role !== requiredRole) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public route */}
      <Route path="/" element={<Login />} />

      {/* Admin-only route */}
      <Route
        path="/admin/create-user"
        element={
          <ProtectedRoute requiredRole="admin">
            <CreateUser />
          </ProtectedRoute>
        }
      />

      {/* General protected route */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardWrapper />
          </ProtectedRoute>
        }
      />

      {/* Catch-all: redirect unknown routes to login */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <RoleProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </RoleProvider>
  );
}
