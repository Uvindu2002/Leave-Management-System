import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { useRole } from "../../contexts/RoleContext";
import UserCalendar from "../../components/UserCalendar";

export default function UserView() {
  const { id } = useParams();
  const [userDetails, setUserDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const { token } = useRole();

  useEffect(() => {
    const fetchUserDetails = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/users/${id}/details`, {
          headers: {
            Authorization: `Bearer ${token}`,
          }
        });
        
        if (!res.ok) throw new Error('Failed to fetch user details');
        const data = await res.json();
        setUserDetails(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchUserDetails();
  }, [id, token]);

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString();
  };

  // Calculate non-paid leave statistics
  console.log(userDetails);
  const nonPaidStats = userDetails?.recent_leaves?.reduce((acc, leave) => {
    if (leave.is_non_paid && leave.status === 'approved') {
      console.log(leave);
      acc.nonPaid += Number(leave.non_paid_days) || 0;
    }else if (!leave.is_non_paid && leave.status === 'approved') {
      acc.Paid += Number(leave.total_days) || 0;
    }
    return acc;
  }, {  nonPaid: 0, Paid: 0 }) || {  nonPaid: 0, Paid: 0 };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
        <Link to="/admin/users" className="mt-4 inline-block text-blue-600 hover:text-blue-800">
          ← Back to User Management
        </Link>
      </div>
    );
  }

  if (!userDetails) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded">
          User not found
        </div>
        <Link to="/admin/users" className="mt-4 inline-block text-blue-600 hover:text-blue-800">
          ← Back to User Management
        </Link>
      </div>
    );
  }

  const { user, leave_entitlements, recent_leaves, leave_stats } = userDetails;

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <Link to="/admin/users" className="text-blue-600 hover:text-blue-800 mb-4 inline-block">
          ← Back to User Management
        </Link>
        <h1 className="text-3xl font-bold text-gray-900">User Details - {user.name}</h1>
        <p className="text-gray-600">Employee ID: {user.employee_id}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Personal Information */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Personal Information</h2>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="font-medium">Name:</span>
              <span>{user.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">Email:</span>
              <span>{user.email}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">Employee ID:</span>
              <span>{user.employee_id}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">Role:</span>
              <span className="capitalize">{user.role}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">Employment Type:</span>
              <span className="capitalize">{user.employment_type || '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">Manager:</span>
              <span>{user.manager_name || 'None'}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">Confirmation Date:</span>
              <span>{formatDate(user.confirmation_date)}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">Account Created:</span>
              <span>{formatDate(user.created_at)}</span>
            </div>
          </div>
        </div>

        {/* Leave Information */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Leave Information</h2>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="font-medium">Annual Leave:</span>
              <span>{leave_entitlements?.annual_leave_remaining || 0} / {leave_entitlements?.annual_leave_entitled || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">Casual Leave:</span>
              <span>{leave_entitlements?.casual_leave_remaining || 0} / {leave_entitlements?.casual_leave_entitled || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">Total Leaves Taken:</span>
              <span>{leave_stats?.total_leaves || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">Total Leave Days:</span>
              <span>{leave_stats?.total_days || 0} days</span>
            </div>
            {/* Non-paid leave statistics */}
            <div className="flex justify-between border-t pt-2 mt-2">
              <span className="font-medium text-red-700">Paid Leaves:</span>
              <span className="text-red-700">{nonPaidStats.Paid || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium text-red-700">Non-Paid Leaves:</span>
              <span className="text-red-700">{nonPaidStats.nonPaid || 0} days</span>
            </div>
          </div>
        </div>

        {/* Calendar View */}
        <div className="lg:col-span-2 bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Leave Calendar</h2>
          <UserCalendar userId={id} />
        </div>

        {/* Recent Leaves */}
        <div className="lg:col-span-2 bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Recent Leave Requests</h2>
          {recent_leaves?.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Dates</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Days</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Non-Paid</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Requested</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {recent_leaves.map((leave) => (
                    <tr key={leave.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 capitalize">
                        {leave.leave_type}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {formatDate(leave.start_date)} - {formatDate(leave.end_date)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          leave.status === 'approved' ? 'bg-green-100 text-green-800' :
                          leave.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {leave.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {leave.total_days}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {leave.is_non_paid ? (
                          <span className="text-red-600 font-medium">
                            {leave.non_paid_days || leave.total_days} days
                          </span>
                        ) : (
                          <span className="text-green-600">0 days</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {formatDate(leave.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-500">No leave requests found</p>
          )}
        </div>
      </div>
    </div>
  );
}