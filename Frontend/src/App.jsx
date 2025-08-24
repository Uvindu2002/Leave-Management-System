import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { RoleProvider, useRole } from "./contexts/RoleContext";
import Login from "./pages/Login";
import DashboardWrapper from "./components/DashboardWrapper";
import CreateUser from "./pages/admin/CreateUser";
import UserManagement from "./pages/admin/UserManagement";
import UserView from "./pages/admin/UserView"; // ✅ Add missing import
import UserEdit from "./pages/admin/UserEdit"; // ✅ Add missing import
import Header from "./components/Header";
import Layout from "./components/Layout";
import ApplyLeave from "./pages/employee/ApplyLeave";

// ProtectedRoute component
function ProtectedRoute({ children, requiredRole }) {
  const { user, loading, activeRole, originalRole } = useRole();

  // Show loading spinner while validating
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Not logged in
  if (!user) return <Navigate to="/" replace />;

  // For admin routes, check if user is actually in admin view (not switched to employee view)
  if (requiredRole === "admin") {
    const isInAdminView = originalRole === "admin" && activeRole === "admin";
    if (!isInAdminView) {
      return <Navigate to="/dashboard" replace />;
    }
  }

  // Role-based access
  if (requiredRole && user.role !== requiredRole) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

// Layout wrapper for protected routes
function ProtectedLayout({ children }) {
  const { user } = useRole();

  return (
    <Layout>
      <Header user={user} />
      <main className="flex-1 p-4">
        {children}
      </main>
    </Layout>
  );
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public route */}
      <Route path="/" element={<Login />} />

      {/* Admin-only routes */}
      <Route
        path="/admin/create-user"
        element={
          <ProtectedRoute requiredRole="admin">
            <ProtectedLayout>
              <CreateUser />
            </ProtectedLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/users"
        element={
          <ProtectedRoute requiredRole="admin">
            <ProtectedLayout>
              <UserManagement />
            </ProtectedLayout>
          </ProtectedRoute>
        }
      />

      {/* User profile view route */}
      <Route
        path="/admin/users/view/:id"
        element={
          <ProtectedRoute requiredRole="admin">
            <ProtectedLayout>
              <UserView />
            </ProtectedLayout>
          </ProtectedRoute>
        }
      />

      {/* User edit route */}
      <Route
        path="/admin/users/edit/:id"
        element={
          <ProtectedRoute requiredRole="admin">
            <ProtectedLayout>
              <UserEdit />
            </ProtectedLayout>
          </ProtectedRoute>
        }
      />

      {/* Dashboard route - accessible to all authenticated users */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <ProtectedLayout>
              <DashboardWrapper />
            </ProtectedLayout>
          </ProtectedRoute>
        }
      />

      {/* Employee dashboard route */}
      <Route
        path="/employee/dashboard"
        element={
          <ProtectedRoute>
            <ProtectedLayout>
              <DashboardWrapper />
            </ProtectedLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/apply-leave"
        element={
          <ProtectedRoute>
            <ProtectedLayout>
              <ApplyLeave />
            </ProtectedLayout>
          </ProtectedRoute>
        }
      />

      {/* Manager dashboard route */}
      <Route
        path="/manager/dashboard"
        element={
          <ProtectedRoute requiredRole="manager">
            <ProtectedLayout>
              <DashboardWrapper />
            </ProtectedLayout>
          </ProtectedRoute>
        }
      />

      {/* Catch-all: redirect unknown routes to appropriate pages */}
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