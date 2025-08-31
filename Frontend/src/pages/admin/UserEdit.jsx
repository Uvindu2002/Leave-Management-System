import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useRole } from "../../contexts/RoleContext";

export default function UserEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    employee_id: "",
    role: "employee",
    employment_type: "confirmed",
    manager_id: "",
    remaining_annual: 0,
    remaining_casual: 0
  });
  const [showAdminAuth, setShowAdminAuth] = useState(false);
  const [adminAuth, setAdminAuth] = useState({ username: "", password: "" });
  const [adminError, setAdminError] = useState("");
  const [managers, setManagers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const { token } = useRole();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch user details
        const userRes = await fetch(`/api/users/${id}/details`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!userRes.ok) throw new Error('Failed to fetch user details');
        const userData = await userRes.json();
        
        // Fetch managers
        const managersRes = await fetch('/api/users/managers', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!managersRes.ok) throw new Error('Failed to fetch managers');
        const managersData = await managersRes.json();

        setUser(userData.user);
        setFormData({
          name: userData.user.name,
          email: userData.user.email,
          employee_id: userData.user.employee_id,
          role: userData.user.role,
          employment_type: userData.user.employment_type || "confirmed",
          manager_id: userData.user.manager_id || "",
          remaining_annual: userData.user.remaining_annual || 0,
          remaining_casual: userData.user.remaining_casual || 0
        });
        setManagers(managersData);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id, token]);

  const handleChange = (e) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };


  // Handler for admin auth input
  const handleAdminAuthChange = (e) => {
    setAdminAuth(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  // Handler for form submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setAdminError("");

    // If leave counts are changed, require admin auth
    if (
      user && (
        Number(formData.remaining_annual) !== Number(user.remaining_annual || 0) ||
        Number(formData.remaining_casual) !== Number(user.remaining_casual || 0)
      )
    ) {
      setShowAdminAuth(true);
      return;
    }
    await updateUser();
  };

  // Actual update logic
  const updateUser = async (adminCreds) => {
    setSaving(true);
    setError("");
    setAdminError("");
    try {
      let body = { ...formData };
      if (adminCreds) {
        body.admin_username = adminCreds.username;
        body.admin_password = adminCreds.password;
      }
      const res = await fetch(`/api/users/${id}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });
      if (res.ok) {
        setSuccess("User updated successfully");
        setTimeout(() => navigate('/admin/users'), 2000);
      } else {
        const data = await res.json();
        if (data.adminAuth === false) {
          setAdminError("Invalid admin credentials");
        } else {
          setError(data.message || 'Failed to update user');
        }
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
      setShowAdminAuth(false);
    }
  };

  // Handler for admin auth submit
  const handleAdminAuthSubmit = async (e) => {
    e.preventDefault();
    await updateUser(adminAuth);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded">
          User not found
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate('/admin/users')}
          className="text-blue-600 hover:text-blue-800 mb-4 inline-flex items-center"
        >
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to User Management
        </button>
        <h1 className="text-3xl font-bold text-gray-900">Edit User - {user.name}</h1>
        <p className="text-gray-600">Employee ID: {user.employee_id}</p>
      </div>

      {/* Messages */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-6">
          {success}
        </div>
      )}

      {/* Edit Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* ...existing code... */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Employee ID</label>
            <input
              type="text"
              name="employee_id"
              value={formData.employee_id}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
            <select
              name="role"
              value={formData.role}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="employee">Employee</option>
              <option value="manager">Manager</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Employment Type</label>
            <select
              name="employment_type"
              value={formData.employment_type}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="probation">Probation</option>
              <option value="confirmed">Confirmed</option>
              <option value="contract">Contract</option>
              <option value="internship">Internship</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Manager</label>
            <select
              name="manager_id"
              value={formData.manager_id}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">No Manager</option>
              {managers.map((manager) => (
                <option key={manager.id} value={manager.id}>
                  {manager.name} ({manager.employee_id})
                </option>
              ))}
            </select>
          </div>
          {/* New fields for leave counts */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Remaining Annual Leave</label>
            <input
              type="number"
              name="remaining_annual"
              value={formData.remaining_annual}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              min="0"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Remaining Casual Leave</label>
            <input
              type="number"
              name="remaining_casual"
              value={formData.remaining_casual}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              min="0"
            />
          </div>
        </div>
        <div className="flex justify-end space-x-3 mt-6">
          <button
            type="button"
            onClick={() => navigate('/admin/users')}
            className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>

      {/* Admin Auth Modal */}
      {showAdminAuth && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50">
          <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Admin Authentication Required</h2>
            <p className="mb-4 text-gray-600">To update leave counts, please enter admin username and password.</p>
            {adminError && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded mb-4">{adminError}</div>
            )}
            <form onSubmit={handleAdminAuthSubmit}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Admin Username</label>
                <input
                  type="text"
                  name="username"
                  value={adminAuth.username}
                  onChange={handleAdminAuthChange}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Admin Password</label>
                <input
                  type="password"
                  name="password"
                  value={adminAuth.password}
                  onChange={handleAdminAuthChange}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => { setShowAdminAuth(false); setAdminAuth({ username: "", password: "" }); }}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={saving}
                >
                  {saving ? 'Saving...' : 'Confirm'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}