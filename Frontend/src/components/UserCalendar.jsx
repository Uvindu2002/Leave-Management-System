import { useState, useEffect } from "react";
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import { useRole } from "../contexts/RoleContext";
import 'react-big-calendar/lib/css/react-big-calendar.css';

const localizer = momentLocalizer(moment);

export default function UserCalendar({ userId }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [view, setView] = useState('month');
  const [date, setDate] = useState(new Date());
  const { token } = useRole();

  useEffect(() => {
    const fetchLeaves = async () => {
      try {
        setLoading(true);
        setError("");
        
        const res = await fetch(`/api/users/${userId}/leaves`, {
          headers: {
            Authorization: `Bearer ${token}`,
          }
        });
        
        if (!res.ok) {
          throw new Error(`Failed to fetch leaves: ${res.status}`);
        }
        
        const leaves = await res.json();
        
        // Transform leaves into calendar events - FIXED: Proper 1-day event handling
        const calendarEvents = leaves.map(leave => {
          const startDate = new Date(leave.start_date);
          const endDate = new Date(leave.end_date);
          
          // For single day leaves, end date should be the same as start date
          // For multi-day leaves, end date should be inclusive
          const isSingleDay = startDate.toDateString() === endDate.toDateString();
          const calendarEndDate = isSingleDay ? startDate : endDate;
          
          return {
            id: leave.id,
            title: `${leave.leave_type} - ${leave.status}`,
            start: startDate,
            end: calendarEndDate,
            allDay: true,
            resource: {
              type: leave.leave_type,
              status: leave.status,
              days: leave.total_days,
              leaveData: leave,
              isSingleDay: isSingleDay
            }
          };
        });
        
        setEvents(calendarEvents);
      } catch (err) {
        console.error('Fetch leaves error:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (userId && token) {
      fetchLeaves();
    }
  }, [userId, token]);

  // Custom event styles based on leave status
  const eventStyleGetter = (event) => {
    let backgroundColor = '#e5e7eb'; // gray - default
    let borderColor = '#d1d5db';
    let textColor = '#374151';

    switch (event.resource.status) {
      case 'approved':
        backgroundColor = '#dcfce7'; // green
        borderColor = '#86efac';
        textColor = '#166534';
        break;
      case 'pending':
        backgroundColor = '#fef3c7'; // yellow
        borderColor = '#fcd34d';
        textColor = '#92400e';
        break;
      case 'rejected':
        backgroundColor = '#fee2e2'; // red
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
        fontSize: '12px',
        padding: '2px 4px'
      }
    };
  };

  // Custom toolbar with Teams-like styling
  const CustomToolbar = (toolbar) => {
    const goToBack = () => {
      toolbar.onNavigate('PREV');
    };

    const goToNext = () => {
      toolbar.onNavigate('NEXT');
    };

    const goToCurrent = () => {
      toolbar.onNavigate('TODAY');
    };

    const changeView = (viewName) => {
      toolbar.onView(viewName);
    };

    return (
      <div className="rbc-toolbar flex flex-col sm:flex-row items-center justify-between mb-4 gap-3">
        <div className="flex items-center gap-2">
          <span className="text-lg font-semibold text-gray-900">
            {moment(toolbar.date).format('MMMM YYYY')}
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={goToBack}
            className="px-3 py-1 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 text-sm"
          >
            ‹
          </button>
          
          <button
            onClick={goToCurrent}
            className="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
          >
            Today
          </button>
          
          <button
            onClick={goToNext}
            className="px-3 py-1 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 text-sm"
          >
            ›
          </button>
        </div>
        
        <div className="flex items-center gap-1 bg-gray-100 rounded-md p-1">
          {['month', 'week', 'day'].map((viewName) => (
            <button
              key={viewName}
              onClick={() => changeView(viewName)}
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

  // Custom event component to handle single day display
  const CustomEvent = ({ event }) => {
    return (
      <div className="rbc-event-content">
        <div className="text-xs font-medium">
          {event.resource.type}
        </div>
        <div className="text-[10px] opacity-75">
          {event.resource.status}
          {event.resource.isSingleDay && ` • ${event.resource.days} day`}
          {!event.resource.isSingleDay && ` • ${event.resource.days} days`}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96 bg-white rounded-lg border border-gray-200">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-3 text-gray-600">Loading calendar...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-center mb-3">
          <svg className="w-5 h-5 text-red-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className="text-sm font-medium text-red-800">Error loading calendar</h3>
        </div>
        <p className="text-sm text-red-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      {/* Header with title and legend */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center">
          <svg className="w-5 h-5 text-gray-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          Leave Calendar
        </h3>
        
        {/* Status Legend */}
        <div className="flex flex-wrap gap-4">
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

      {/* Calendar Component */}
      <div className="h-96 min-h-[400px] lg:h-[500px]">
        <Calendar
          localizer={localizer}
          events={events}
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
            next: "Next",
            previous: "Previous",
            today: "Today",
            month: "Month",
            week: "Week",
            day: "Day",
            noEventsInRange: "No leaves in this period"
          }}
        />
      </div>

      {/* Leave Summary */}
      {events.length > 0 && (
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h4 className="text-sm font-medium text-gray-900 mb-3">Leave Summary</h4>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
            <div className="text-center p-2 bg-blue-50 rounded">
              <div className="text-blue-800 font-semibold text-sm">
                {events.length}
              </div>
              <div className="text-blue-600">Total Leaves</div>
            </div>
            <div className="text-center p-2 bg-green-50 rounded">
              <div className="text-green-800 font-semibold text-sm">
                {events.filter(e => e.resource.status === 'approved').length}
              </div>
              <div className="text-green-600">Approved</div>
            </div>
            <div className="text-center p-2 bg-yellow-50 rounded">
              <div className="text-yellow-800 font-semibold text-sm">
                {events.filter(e => e.resource.status === 'pending').length}
              </div>
              <div className="text-yellow-600">Pending</div>
            </div>
            <div className="text-center p-2 bg-red-50 rounded">
              <div className="text-red-800 font-semibold text-sm">
                {events.filter(e => e.resource.status === 'rejected').length}
              </div>
              <div className="text-red-600">Rejected</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}