import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { RoleProvider, useRole } from "./contexts/RoleContext";
import Login from "./pages/Login";
import DashboardWrapper from "./components/DashboardWrapper";
import CreateUser from "./pages/admin/CreateUser";
import UserManagement from "./pages/admin/UserManagement";
import UserView from "./pages/admin/UserView";
import UserEdit from "./pages/admin/UserEdit";
import ApplyLeave from "./pages/employee/ApplyLeave";
import Layout from "./components/Layout";
import Sidebar from "./components/Sidebar";
import Header from "./components/Header";

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

  // For manager routes, check if user is actually in manager view
  if (requiredRole === "manager") {
    const isInManagerView = originalRole === "manager" && activeRole === "manager";
    if (!isInManagerView) {
      return <Navigate to="/dashboard" replace />;
    }
  }

  // Role-based access
  if (requiredRole && originalRole !== requiredRole) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

// Main App Layout with Sidebar and Header
function AppLayout({ children }) {
  const { user } = useRole();
  
  return (
    <Layout user={user}>
      {children}
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
            <AppLayout>
              <CreateUser />
            </AppLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/users"
        element={
          <ProtectedRoute requiredRole="admin">
            <AppLayout>
              <UserManagement />
            </AppLayout>
          </ProtectedRoute>
        }
      />

      {/* User profile view route */}
      <Route
        path="/admin/users/view/:id"
        element={
          <ProtectedRoute requiredRole="admin">
            <AppLayout>
              <UserView />
            </AppLayout>
          </ProtectedRoute>
        }
      />

      {/* User edit route */}
      <Route
        path="/admin/users/edit/:id"
        element={
          <ProtectedRoute requiredRole="admin">
            <AppLayout>
              <UserEdit />
            </AppLayout>
          </ProtectedRoute>
        }
      />

      {/* Dashboard route - accessible to all authenticated users */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <AppLayout>
              <DashboardWrapper />
            </AppLayout>
          </ProtectedRoute>
        }
      />

      {/* Apply Leave route */}
      <Route
        path="/apply-leave"
        element={
          <ProtectedRoute>
            <AppLayout>
              <ApplyLeave />
            </AppLayout>
          </ProtectedRoute>
        }
      />

      {/* My Leaves route */}
      <Route
        path="/my-leaves"
        element={
          <ProtectedRoute>
            <AppLayout>
              <div className="max-w-4xl mx-auto">
                <h1 className="text-2xl font-bold mb-6">My Leave Applications</h1>
                {/* You'll need to create a MyLeaves component */}
                <div className="bg-white rounded-lg shadow p-6">
                  <p className="text-gray-600">My leaves component will go here</p>
                </div>
              </div>
            </AppLayout>
          </ProtectedRoute>
        }
      />

      {/* Manager routes */}
      <Route
        path="/manager/leaves"
        element={
          <ProtectedRoute requiredRole="manager">
            <AppLayout>
              <div className="max-w-6xl mx-auto">
                <h1 className="text-2xl font-bold mb-6">Leave Approvals</h1>
                {/* You'll need to create a ManagerLeaves component */}
                <div className="bg-white rounded-lg shadow p-6">
                  <p className="text-gray-600">Leave approvals component will go here</p>
                </div>
              </div>
            </AppLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/manager/team"
        element={
          <ProtectedRoute requiredRole="manager">
            <AppLayout>
              <div className="max-w-6xl mx-auto">
                <h1 className="text-2xl font-bold mb-6">My Team</h1>
                {/* You'll need to create a ManagerTeam component */}
                <div className="bg-white rounded-lg shadow p-6">
                  <p className="text-gray-600">Team management component will go here</p>
                </div>
              </div>
            </AppLayout>
          </ProtectedRoute>
        }
      />

      {/* Profile route */}
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <AppLayout>
              <div className="max-w-4xl mx-auto">
                <h1 className="text-2xl font-bold mb-6">My Profile</h1>
                {/* You'll need to create a Profile component */}
                <div className="bg-white rounded-lg shadow p-6">
                  <p className="text-gray-600">Profile component will go here</p>
                </div>
              </div>
            </AppLayout>
          </ProtectedRoute>
        }
      />

      {/* Catch-all: redirect unknown routes to dashboard */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
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