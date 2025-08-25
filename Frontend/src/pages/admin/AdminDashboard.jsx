import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useRole } from "../../contexts/RoleContext";
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';

const localizer = momentLocalizer(moment);

export default function AdminDashboard() {
  const { activeRole, token } = useRole();
  const [stats, setStats] = useState({
    totalEmployees: 0,
    totalLeavesThisWeek: 0,
    approvedLeavesThisWeek: 0,
    pendingLeavesThisWeek: 0
  });
  const [allLeaves, setAllLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('month');
  const [date, setDate] = useState(new Date());

  useEffect(() => {
    if (activeRole === 'admin') {
      fetchDashboardData();
    }
  }, [activeRole, token]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch all data in parallel
      const [employeesRes, leavesRes] = await Promise.all([
        fetch('/api/users/all', {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch('/api/leaves/all', {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      if (!employeesRes.ok || !leavesRes.ok) {
        throw new Error('Failed to fetch dashboard data');
      }

      const employees = await employeesRes.json();
      const leaves = await leavesRes.json();

      // Calculate current week range
      const startOfWeek = moment().startOf('week').toDate();
      const endOfWeek = moment().endOf('week').toDate();

      // Filter leaves for this week
      const leavesThisWeek = leaves.filter(leave => {
        const leaveDate = new Date(leave.start_date);
        return leaveDate >= startOfWeek && leaveDate <= endOfWeek;
      });

      // Calculate statistics
      setStats({
        totalEmployees: employees.length,
        totalLeavesThisWeek: leavesThisWeek.length,
        approvedLeavesThisWeek: leavesThisWeek.filter(leave => leave.status === 'approved').length,
        pendingLeavesThisWeek: leavesThisWeek.filter(leave => leave.status === 'pending').length
      });

      // Transform leaves for calendar - FIXED: Proper 1-day event handling
      const calendarEvents = leaves.map(leave => {
        const startDate = new Date(leave.start_date);
        const endDate = new Date(leave.end_date);
        
        // For single day leaves, end date should be the same as start date
        // For multi-day leaves, end date should be inclusive
        const isSingleDay = startDate.toDateString() === endDate.toDateString();
        const calendarEndDate = isSingleDay ? startDate : endDate;
        
        return {
          id: leave.id,
          title: `${leave.employee_name} - ${leave.leave_type}`,
          start: startDate,
          end: calendarEndDate,
          allDay: true,
          resource: {
            type: leave.leave_type,
            status: leave.status,
            days: leave.total_days,
            employee: leave.employee_name,
            employeeId: leave.user_id,
            isSingleDay: isSingleDay
          }
        };
      });

      setAllLeaves(calendarEvents);

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const eventStyleGetter = (event) => {
    let backgroundColor = '#e5e7eb';
    let borderColor = '#d1d5db';
    let textColor = '#374151';

    switch (event.resource.status) {
      case 'approved':
        backgroundColor = '#dcfce7';
        borderColor = '#86efac';
        textColor = '#166534';
        break;
      case 'pending':
        backgroundColor = '#fef3c7';
        borderColor = '#fcd34d';
        textColor = '#92400e';
        break;
      case 'rejected':
        backgroundColor = '#fee2e2';
        borderColor = '#fca5a5';
        textColor = '#991b1b';
        break;
    }

    return {
      style: {
        backgroundColor,
        border: `2px solid ${borderColor}`,
        borderRadius: '6px',
        color: textColor,
        fontWeight: '500',
        fontSize: '11px',
        padding: '2px 4px'
      }
    };
  };

  // Custom event component to handle single day display
  const CustomEvent = ({ event }) => {
    return (
      <div className="rbc-event-content">
        <div className="text-xs font-medium truncate">
          {event.resource.employee}
        </div>
        <div className="text-[10px] opacity-75">
          {event.resource.type} • {event.resource.status}
        </div>
      </div>
    );
  };

  const CustomToolbar = (toolbar) => {
    return (
      <div className="rbc-toolbar flex flex-col sm:flex-row items-center justify-between mb-4 gap-3">
        <div className="flex items-center gap-2">
          <span className="text-lg font-semibold text-gray-900">
            {moment(toolbar.date).format('MMMM YYYY')}
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => toolbar.onNavigate('PREV')}
            className="px-3 py-1 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 text-sm"
          >
            ‹
          </button>
          
          <button
            onClick={() => toolbar.onNavigate('TODAY')}
            className="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
          >
            Today
          </button>
          
          <button
            onClick={() => toolbar.onNavigate('NEXT')}
            className="px-3 py-1 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 text-sm"
          >
            ›
          </button>
        </div>
        
        <div className="flex items-center gap-1 bg-gray-100 rounded-md p-1">
          {['month', 'week', 'day'].map((viewName) => (
            <button
              key={viewName}
              onClick={() => toolbar.onView(viewName)}
              className={`px-3 py-1 rounded text-sm transition-colors ${
                toolbar.view === viewName
                  ? 'bg-white text-blue-600 shadow-sm font-medium'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {viewName.charAt(0).toUpperCase() + viewName.slice(1)}
            </button>
          ))}
        </div>
      </div>
    );
  };

  if (activeRole !== 'admin') {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-600">Access Denied</div>
          <p className="text-gray-500">Admin privileges required</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-600">Manage your team's leaves and activities</p>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Total Employees Card */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-3 bg-blue-100 rounded-lg">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <h3 className="text-sm font-medium text-gray-600">Total Employees</h3>
                <p className="text-2xl font-bold text-gray-900">{stats.totalEmployees}</p>
              </div>
            </div>
          </div>

          {/* Total Leaves This Week Card */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-3 bg-green-100 rounded-lg">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="ml-4">
                <h3 className="text-sm font-medium text-gray-600">Leaves This Week</h3>
                <p className="text-2xl font-bold text-gray-900">{stats.totalLeavesThisWeek}</p>
              </div>
            </div>
          </div>

          {/* Approved Leaves This Week Card */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-3 bg-green-100 rounded-lg">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div className="ml-4">
                <h3 className="text-sm font-medium text-gray-600">Approved This Week</h3>
                <p className="text-2xl font-bold text-gray-900">{stats.approvedLeavesThisWeek}</p>
              </div>
            </div>
          </div>

          {/* Pending Leaves This Week Card */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-3 bg-yellow-100 rounded-lg">
                <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <h3 className="text-sm font-medium text-gray-600">Pending This Week</h3>
                <p className="text-2xl font-bold text-gray-900">{stats.pendingLeavesThisWeek}</p>
              </div>
            </div>
          </div>
        </div>

        

        {/* Calendar Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Team Leave Calendar</h2>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-100 border-2 border-green-300 rounded"></div>
                <span className="text-xs text-gray-600">Approved</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-yellow-100 border-2 border-yellow-300 rounded"></div>
                <span className="text-xs text-gray-600">Pending</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-red-100 border-2 border-red-300 rounded"></div>
                <span className="text-xs text-gray-600">Rejected</span>
              </div>
            </div>
          </div>

          <div className="h-96 min-h-[400px] lg:h-[500px]">
            <Calendar
              localizer={localizer}
              events={allLeaves}
              startAccessor="start"
              endAccessor="end"
              style={{ height: '100%' }}
              view={view}
              date={date}
              onView={setView}
              onNavigate={setDate}
              eventPropGetter={eventStyleGetter}
              components={{
                toolbar: CustomToolbar,
                event: CustomEvent
              }}
              showMultiDayTimes
              step={60}
              formats={{
                dayFormat: 'ddd D',
                dayHeaderFormat: 'dddd, MMMM D',
                monthHeaderFormat: 'MMMM YYYY',
              }}
              messages={{
                noEventsInRange: "No leaves scheduled for this period"
              }}
            />
          </div>

          {/* Leave Summary */}
          {allLeaves.length > 0 && (
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <h4 className="text-sm font-medium text-gray-900 mb-3">Leave Summary</h4>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
                <div className="text-center p-2 bg-blue-50 rounded">
                  <div className="text-blue-800 font-semibold text-sm">
                    {allLeaves.length}
                  </div>
                  <div className="text-blue-600">Total Leaves</div>
                </div>
                <div className="text-center p-2 bg-green-50 rounded">
                  <div className="text-green-800 font-semibold text-sm">
                    {allLeaves.filter(e => e.resource.status === 'approved').length}
                  </div>
                  <div className="text-green-600">Approved</div>
                </div>
                <div className="text-center p-2 bg-yellow-50 rounded">
                  <div className="text-yellow-800 font-semibold text-sm">
                    {allLeaves.filter(e => e.resource.status === 'pending').length}
                  </div>
                  <div className="text-yellow-600">Pending</div>
                </div>
                <div className="text-center p-2 bg-red-50 rounded">
                  <div className="text-red-800 font-semibold text-sm">
                    {allLeaves.filter(e => e.resource.status === 'rejected').length}
                  </div>
                  <div className="text-red-600">Rejected</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}