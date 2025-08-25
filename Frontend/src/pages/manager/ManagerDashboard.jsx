import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { useRole } from "../../contexts/RoleContext";
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';

const localizer = momentLocalizer(moment);

export default function ManagerDashboard() {
  const { user: currentUser, token } = useRole();
  const [teamLeaves, setTeamLeaves] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hoveredEvent, setHoveredEvent] = useState(null);
  const [popupPosition, setPopupPosition] = useState({ top: 0, left: 0 });
  const [view, setView] = useState('month');
  const [date, setDate] = useState(new Date());
  const [stats, setStats] = useState({
    totalTeamMembers: 0,
    pendingApprovals: 0,
    approvedThisMonth: 0,
    rejectedThisMonth: 0
  });
  const calendarRef = useRef(null);

  useEffect(() => {
    if (currentUser && currentUser.role === 'manager' && token) {
      fetchManagerData();
    }
  }, [currentUser, token]);

  const fetchManagerData = async () => {
    try {
      setLoading(true);
      
      // Fetch manager's team data and leaves
      const [teamRes, leavesRes] = await Promise.all([
        fetch('/api/manager/team', {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch('/api/manager/leaves', {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      if (!teamRes.ok || !leavesRes.ok) {
        throw new Error('Failed to fetch manager data');
      }

      const teamData = await teamRes.json();
      const leavesData = await leavesRes.json();

      setTeamMembers(teamData.members || []);
      setTeamLeaves(leavesData.leaves || []);

      // Calculate statistics
      const pending = leavesData.leaves.filter(leave => leave.status === 'pending').length;
      const approvedThisMonth = leavesData.leaves.filter(leave => 
        leave.status === 'approved' && 
        new Date(leave.start_date).getMonth() === new Date().getMonth()
      ).length;
      const rejectedThisMonth = leavesData.leaves.filter(leave => 
        leave.status === 'rejected' && 
        new Date(leave.start_date).getMonth() === new Date().getMonth()
      ).length;

      setStats({
        totalTeamMembers: teamData.members.length,
        pendingApprovals: pending,
        approvedThisMonth: approvedThisMonth,
        rejectedThisMonth: rejectedThisMonth
      });

    } catch (error) {
      console.error('Error fetching manager data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Transform leaves for calendar
  const calendarEvents = teamLeaves.map(leave => {
    const startDate = new Date(leave.start_date);
    const endDate = new Date(leave.end_date);
    
    const isSingleDay = startDate.toDateString() === endDate.toDateString();
    const calendarEndDate = isSingleDay ? startDate : endDate;
    
    return {
      id: leave.id,
      title: `${leave.employee_name} - ${leave.leave_type}`,
      start: startDate,
      end: calendarEndDate,
      allDay: true,
      resource: {
        ...leave,
        isSingleDay: isSingleDay
      }
    };
  });

  const handleEventMouseEnter = (event, e) => {
    if (calendarRef.current) {
      const calendarRect = calendarRef.current.getBoundingClientRect();
      const eventRect = e.target.getBoundingClientRect();
      
      // Calculate position relative to calendar container
      const top = eventRect.top - calendarRect.top - 180; // Position above the event
      const left = eventRect.left - calendarRect.left + (eventRect.width / 2);
      
      setPopupPosition({ top, left });
      setHoveredEvent(event);
    }
  };

  const handleEventMouseLeave = () => {
    setHoveredEvent(null);
  };

  const handleQuickAction = async (leaveId, action) => {
    try {
      const res = await fetch(`/api/manager/leaves/${leaveId}/review`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ action, comments: 'Quick action from dashboard' })
      });

      if (res.ok) {
        // Refresh data
        fetchManagerData();
        setHoveredEvent(null);
      }
    } catch (error) {
      console.error('Error performing quick action:', error);
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
        padding: '2px 4px',
        cursor: 'pointer'
      }
    };
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

  const CustomEvent = ({ event }) => {
    return (
      <div 
        className="rbc-event-content"
        onMouseEnter={(e) => handleEventMouseEnter(event, e)}
        onMouseLeave={handleEventMouseLeave}
      >
        <div className="text-xs font-medium truncate">
          {event.resource.employee_name}
        </div>
        <div className="text-[10px] opacity-75">
          {event.resource.leave_type}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Manager Dashboard</h1>
          <p className="text-gray-600">Manage your team's leaves and approvals</p>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Team Members Card */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-3 bg-blue-100 rounded-lg">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <h3 className="text-sm font-medium text-gray-600">Team Members</h3>
                <p className="text-2xl font-bold text-gray-900">{stats.totalTeamMembers}</p>
              </div>
            </div>
          </div>

          {/* Pending Approvals Card */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-3 bg-yellow-100 rounded-lg">
                <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <h3 className="text-sm font-medium text-gray-600">Pending Approvals</h3>
                <p className="text-2xl font-bold text-gray-900">{stats.pendingApprovals}</p>
              </div>
            </div>
          </div>

          {/* Approved This Month Card */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-3 bg-green-100 rounded-lg">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div className="ml-4">
                <h3 className="text-sm font-medium text-gray-600">Approved This Month</h3>
                <p className="text-2xl font-bold text-gray-900">{stats.approvedThisMonth}</p>
              </div>
            </div>
          </div>

          {/* Rejected This Month Card */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-3 bg-red-100 rounded-lg">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <div className="ml-4">
                <h3 className="text-sm font-medium text-gray-600">Rejected This Month</h3>
                <p className="text-2xl font-bold text-gray-900">{stats.rejectedThisMonth}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Link 
            to="/manager/approvals" 
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center">
              <div className="p-3 bg-blue-100 rounded-lg">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-semibold text-gray-900">Leave Approvals</h3>
                <p className="text-sm text-gray-600">Review pending leave requests</p>
              </div>
            </div>
          </Link>

          <Link 
            to="/manager/team" 
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center">
              <div className="p-3 bg-green-100 rounded-lg">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 极速4 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2极速4v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-semibold text极速4ray-900">My Team</h3>
                <p className="text-sm text-gray-600">View team members and details</p>
              </div>
            </div>
          </Link>

          <Link 
            to="/manager/reports" 
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center">
              <div className="p-3 bg-purple-100 rounded-lg">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 极速42v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2极速4h2a2 2 极速40 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-semibold text-gray-900">Reports</h3>
                <p className="text-sm text-gray-600">Generate team leave reports</p>
              </div>
            </div>
          </Link>
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
              <div className="flex items-center极速4 gap-2">
                <div className="w-3 h-3 bg-yellow-100 border-2 border-yellow-300 rounded"></div>
                <span className="text-xs text-gray-600">Pending</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-red-100 border-2 border-red-300 rounded"></div>
                <span className="text-xs text-gray-600">Rejected</span>
              </div>
            </div>
          </div>

          <div className="h-96 min-h-[400px] lg:h-[500px] relative" ref={calendarRef}>
            <Calendar
              localizer={localizer}
              events={calendarEvents}
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

            {/* Hover Popup */}
            {hoveredEvent && (
              <div 
                className="absolute bg-white border border-gray-200 rounded-lg shadow-lg p-4 z-50 transition-opacity duration-200 ease-in-out"
                style={{
                  top: `${popupPosition.top}px`,
                  left: `${popupPosition.left}px`,
                  minWidth: '250px',
                  transform: 'translateX(-50%)',
                  opacity: 1
                }}
                onMouseEnter={() => setHoveredEvent(hoveredEvent)}
                onMouseLeave={handleEventMouseLeave}
              >
                <div className="mb-3">
                  <h4 className="font-semibold text-gray-900">{hoveredEvent.resource.employee_name}</h4>
                  <p className="text-sm text-gray-600">{hoveredEvent.resource.leave_type} Leave</p>
                </div>
                
                <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                  <div>
                    <span className="font-medium">From:</span> {moment(hoveredEvent.start).format('MMM D, YYYY')}
                  </div>
                  <div>
                    <span className="font-medium">To:</span> {moment(hoveredEvent.end).format('MMM D, YYYY')}
                  </div>
                  <div>
                    <span className="font-medium">Days:</span> {hoveredEvent.resource.total_days}
                  </div>
                  <div>
                    <span className="font-medium">Status:</span> 
                    <span className={`ml-1 px-2 py-1 rounded-full text-xs ${
                      hoveredEvent.resource.status === 'approved' ? 'bg-green-100 text-green-800' :
                      hoveredEvent.resource.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {hoveredEvent.resource.status}
                    </span>
                  </div>
                </div>

                {hoveredEvent.resource.status === 'pending' && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleQuickAction(hoveredEvent.id, 'approve')}
                      className="flex-1 bg-green-600 text-white py-1 px-3 rounded text-sm hover:bg-green-700 transition-colors"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => handleQuickAction(hoveredEvent.id, 'reject')}
                      className="flex-1 bg-red-600 text-white py-1 px-3 rounded text极速4-sm hover:bg-red-700 transition-colors"
                    >
                      Reject
                    </button>
                  </div>
                )}

                <Link
                  to={`/manager/employee/${hoveredEvent.resource.user_id}`}
                  className="block mt-2 text-center text-blue-600 text-sm hover:text-blue-800 transition-colors"
                  onClick={() => setHoveredEvent(null)}
                >
                  View Employee Details →
                </Link>
              </div>
            )}
          </div>

          {/* Leave Summary */}
          {calendarEvents.length > 0 && (
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <h4 className="text-sm font-medium text-gray-900 mb-3">Team Leave Summary</h4>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
                <div className="text-center p-2 bg-blue-50 rounded">
                  <div className="text-blue-800 font-semibold text-sm">
                    {calendarEvents.length}
                  </div>
                  <div className="text-blue-600">Total Leaves</div>
                </div>
                <div className="text-center p-2 bg-green-50 rounded">
                  <div className="text-green-800 font-semibold text-sm">
                    {calendarEvents.filter(e => e.resource.status === 'approved').length}
                  </div>
                  <div className="text-green-600">Approved</div>
                </div>
                <div className="text-center p-2 bg-yellow-50 rounded">
                  <div className="text-yellow-800 font-semibold text-sm">
                    {calendarEvents.filter(e => e.resource.status === 'pending').length}
                  </div>
                  <div className="text-yellow-600">Pending</div>
                </div>
                <div className="text-center p-2 bg-red-50 rounded">
                  <div className="text-red-800 font-semibold text-sm">
                    {calendarEvents.filter(e => e.resource.status === 'rejected').length}
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