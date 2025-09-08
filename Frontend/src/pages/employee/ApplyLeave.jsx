import { useState, useEffect } from "react";
import { useRole } from "../../contexts/RoleContext";

export default function ApplyLeave() {
    const [formData, setFormData] = useState({
        leave_type: "casual",
        start_date: "",
        end_date: "",
        casual_leave_type: "full_day",
        which_half: "first",
        short_leave_out_time: "",
        short_leave_in_time: "",
        other_leave_type: "",
        has_attended_bots: false,
        attended_bots_count: 0,
        bots_monitor: "",
        email_autoforward: false,
        has_client_calls: false,
        call_leader: "",
        passwords_on_lastpass: false,
        passwords_shared: false,
        projects: "",
        comments: "",
        job_handover_person: ""
    });

    const [loading, setLoading] = useState(false);
    const [balanceLoading, setBalanceLoading] = useState(true);
    const [message, setMessage] = useState("");
    const [leaveBalance, setLeaveBalance] = useState(null);
    const { user, token } = useRole();
    const [pastCasualLeaves, setPastCasualLeaves] = useState(0);

    // Fetch leave balance
    useEffect(() => {
        const fetchLeaveBalance = async () => {
            try {
                setBalanceLoading(true);
                const res = await fetch("/api/leaves/balance", {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    }
                });
                
                if (res.ok) {
                    const data = await res.json();
                    setLeaveBalance(data);
                    setPastCasualLeaves(data.casual_leaves_history || 0);
                    console.log(pastCasualLeaves);
                } else {
                    console.warn("Failed to fetch leave balance:", res.status);
                    // Don't show error to user - it's not critical for form submission
                }
            } catch (error) {
                console.error("Error fetching leave balance:", error);
            } finally {
                setBalanceLoading(false);
            }
        };

        if (token && user) {
            fetchLeaveBalance();
        }
    }, [token, user]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const calculateTotalDays = () => {
        if (!formData.start_date || !formData.end_date) return 0;

        const start = new Date(formData.start_date);
        const end = new Date(formData.end_date);
        
        // Handle same day leave
        if (start.toDateString() === end.toDateString()) {
            if (formData.leave_type === "casual" && formData.casual_leave_type === "half_day") {
                return 0.5;
            }
            if (formData.leave_type === "casual" && formData.casual_leave_type === "short_leave") {
                return 0.5; // Short leave is typically half day
            }
            return 1;
        }

        const diffTime = Math.abs(end - start);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

        return diffDays;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage("");

        // Validate required fields
        if (!formData.job_handover_person) {
            setMessage("❌ Please specify who will handle your job responsibilities");
            setLoading(false);
            return;
        }

        if (!formData.start_date || !formData.end_date) {
            setMessage("❌ Please select start and end dates");
            setLoading(false);
            return;
        }

        try {
            const totalDays = calculateTotalDays();
            const submitData = {
                ...formData,
                total_days: totalDays,
                status: "pending"
            };

            console.log('Submitting leave application:', submitData);

            const res = await fetch("/api/leaves/apply", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(submitData),
            });

            const data = await res.json();

            if (res.ok) {
                setMessage("✅ Leave application submitted successfully!");
                // Reset form
                setFormData({
                    leave_type: "casual",
                    start_date: "",
                    end_date: "",
                    casual_leave_type: "full_day",
                    which_half: "first",
                    short_leave_out_time: "",
                    short_leave_in_time: "",
                    other_leave_type: "",
                    has_attended_bots: false,
                    attended_bots_count: 0,
                    bots_monitor: "",
                    email_autoforward: false,
                    has_client_calls: false,
                    call_leader: "",
                    passwords_on_lastpass: false,
                    passwords_shared: false,
                    projects: "",
                    comments: "",
                    job_handover_person: ""
                });
                
                // Refresh leave balance
                const balanceRes = await fetch("/api/leaves/balance", {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (balanceRes.ok) {
                    const balanceData = await balanceRes.json();
                    setLeaveBalance(balanceData);
                }
            } else {
                setMessage(`❌ Error: ${data.message || "Failed to submit leave application"}`);
                console.error('Server error response:', data);
            }
        } catch (error) {
            console.error('Network error:', error);
            setMessage("❌ Network error. Please check your connection and try again.");
        } finally {
            setLoading(false);
        }
    };

    const renderLeaveTypeFields = () => {
        switch (formData.leave_type) {
            case "casual":
                return (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Casual Leave Type
                            </label>
                            <select
                                name="casual_leave_type"
                                value={formData.casual_leave_type}
                                onChange={handleChange}
                                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                required
                            >
                                <option value="full_day">Full Day</option>
                                <option value="half_day">Half Day</option>
                                <option value="short_leave">Short Leave</option>
                            </select>
                        </div>

                        {formData.casual_leave_type === "half_day" && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Which Half?
                                </label>
                                <select
                                    name="which_half"
                                    value={formData.which_half}
                                    onChange={handleChange}
                                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    required
                                >
                                    <option value="first">First Half</option>
                                    <option value="second">Second Half</option>
                                </select>
                            </div>
                        )}

                        {formData.casual_leave_type === "short_leave" && (
                            <>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Out Time
                                    </label>
                                    <input
                                        type="time"
                                        name="short_leave_out_time"
                                        value={formData.short_leave_out_time}
                                        onChange={handleChange}
                                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        In Time
                                    </label>
                                    <input
                                        type="time"
                                        name="short_leave_in_time"
                                        value={formData.short_leave_in_time}
                                        onChange={handleChange}
                                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        required
                                    />
                                </div>
                            </>
                        )}
                    </div>
                );

            case "other":
                return (
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Other Leave Type
                        </label>
                        <input
                            type="text"
                            name="other_leave_type"
                            value={formData.other_leave_type}
                            onChange={handleChange}
                            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            required
                            placeholder="Specify leave type"
                        />
                    </div>
                );

            default:
                return null;
        }
    };

    // Get today's date in YYYY-MM-DD format for min date
    const today = new Date().toISOString().split('T')[0];

    return (
        <div className="max-w-4xl mx-auto p-6">
            <div className="bg-white rounded-lg shadow-lg p-6">
                {/* Header */}
                <div className="mb-6">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">Apply for Leave</h1>
                    <p className="text-gray-600">Fill out the form below to submit your leave request</p>
                </div>

                {/* Leave Balance */}
                {balanceLoading ? (
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
                        <div className="animate-pulse">
                            <div className="h-6 bg-gray-300 rounded w-1/4 mb-2"></div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {[1, 2, 3, 4].map(i => (
                                    <div key={i} className="text-center">
                                        <div className="h-8 bg-gray-300 rounded mx-auto w-3/4 mb-2"></div>
                                        <div className="h-4 bg-gray-300 rounded mx-auto w-1/2"></div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                ) : leaveBalance ? (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                        <h3 className="text-lg font-semibold text-blue-800 mb-2">Your Leave Balance</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="text-center">
                                <div className="text-2xl font-bold text-blue-600">{leaveBalance.casual_leave_remaining || 0}</div>
                                <div className="text-sm text-blue-800">Casual Leaves</div>
                            </div>
                            <div className="text-center">
                                <div className="text-2xl font-bold text-green-600">{leaveBalance.annual_leave_remaining || 0}</div>
                                <div className="text-sm text-green-800">Annual Leaves</div>
                            </div>
                            <div className="text-center">
                                <div className="text-2xl font-bold text-purple-600">{leaveBalance.birthday_leave_remaining || 0}</div>
                                <div className="text-sm text-purple-800">Birthday Leaves</div>
                            </div>
                            <div className="text-center">
                                <div className="text-2xl font-bold text-orange-600">{leaveBalance.maternity_leave_remaining || 0}</div>
                                <div className="text-sm text-orange-800">Maternity Leaves</div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                        <p className="text-yellow-800">Leave balance information is currently unavailable.</p>
                    </div>
                )}

                {/* Messages */}
                {message && (
                    <div className={`mb-6 p-4 rounded-lg ${
                        message.includes("✅") 
                            ? "bg-green-100 border border-green-400 text-green-700" 
                            : "bg-red-100 border border-red-400 text-red-700"
                    }`}>
                        {message}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Leave Type and Dates */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Leave Type *
                            </label>
                            <select
                                name="leave_type"
                                value={formData.leave_type}
                                onChange={handleChange}
                                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                required
                            >
                                <option value="casual">Casual Leave</option>
                                <option value="annual">Annual Leave</option>
                                <option value="maternity">Maternity Leave</option>
                                <option value="paternity">Paternity Leave</option>
                                <option value="birthday">Birthday Leave</option>
                                <option value="other">Other Leave</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Start Date *
                            </label>
                            <input
                                type="date"
                                name="start_date"
                                value={formData.start_date}
                                onChange={handleChange}
                                min={today}
                                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                End Date *
                            </label>
                            <input
                                type="date"
                                name="end_date"
                                value={formData.end_date}
                                onChange={handleChange}
                                min={formData.start_date || today}
                                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Total Days
                            </label>
                            <div className="w-full border border-gray-300 rounded-md px-3 py-2 bg-gray-50">
                                {calculateTotalDays()} day{calculateTotalDays() !== 1 ? 's' : ''}
                            </div>
                        </div>
                    </div>

                    {/* Leave Type Specific Fields */}
                    {renderLeaveTypeFields()}

                    {/* Work Handover Section */}
                    <div className="border-t pt-6">
                        <h3 className="text-xl font-semibold text-gray-900 mb-4">Work Handover Information</h3>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Job handover to *
                                </label>
                                <input
                                    type="text"
                                    name="job_handover_person"
                                    value={formData.job_handover_person}
                                    onChange={handleChange}
                                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="Enter person's name"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Have you attended bots?
                                </label>
                                <select
                                    name="has_attended_bots"
                                    value={formData.has_attended_bots}
                                    onChange={(e) => setFormData(prev => ({ ...prev, has_attended_bots: e.target.value === 'true' }))}
                                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="false">No</option>
                                    <option value="true">Yes</option>
                                </select>
                            </div>

                            {formData.has_attended_bots && (
                                <>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            How many attended bots?
                                        </label>
                                        <input
                                            type="number"
                                            name="attended_bots_count"
                                            value={formData.attended_bots_count}
                                            onChange={handleChange}
                                            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            min="0"
                                        />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Who will monitor those bots?
                                        </label>
                                        <input
                                            type="text"
                                            name="bots_monitor"
                                            value={formData.bots_monitor}
                                            onChange={handleChange}
                                            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            placeholder="Enter person's name"
                                        />
                                    </div>
                                </>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Email auto-forward enabled?
                                </label>
                                <select
                                    name="email_autoforward"
                                    value={formData.email_autoforward}
                                    onChange={(e) => setFormData(prev => ({ ...prev, email_autoforward: e.target.value === 'true' }))}
                                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="false">No</option>
                                    <option value="true">Yes</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Client calls scheduled?
                                </label>
                                <select
                                    name="has_client_calls"
                                    value={formData.has_client_calls}
                                    onChange={(e) => setFormData(prev => ({ ...prev, has_client_calls: e.target.value === 'true' }))}
                                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="false">No</option>
                                    <option value="true">Yes</option>
                                </select>
                            </div>

                            {formData.has_client_calls && (
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Who will lead the calls?
                                    </label>
                                    <input
                                        type="text"
                                        name="call_leader"
                                        value={formData.call_leader}
                                        onChange={handleChange}
                                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="Enter person's name"
                                    />
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Passwords on LastPass?
                                </label>
                                <select
                                    name="passwords_on_lastpass"
                                    value={formData.passwords_on_lastpass}
                                    onChange={(e) => setFormData(prev => ({ ...prev, passwords_on_lastpass: e.target.value === 'true' }))}
                                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="false">No</option>
                                    <option value="true">Yes</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Passwords shared?
                                </label>
                                <select
                                    name="passwords_shared"
                                    value={formData.passwords_shared}
                                    onChange={(e) => setFormData(prev => ({ ...prev, passwords_shared: e.target.value === 'true' }))}
                                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="false">No</option>
                                    <option value="true">Yes</option>
                                </select>
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Projects you're working on
                                </label>
                                <textarea
                                    name="projects"
                                    value={formData.projects}
                                    onChange={handleChange}
                                    rows={3}
                                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="List all projects you're currently working on"
                                />
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Additional comments
                                </label>
                                <textarea
                                    name="comments"
                                    value={formData.comments}
                                    onChange={handleChange}
                                    rows={3}
                                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="Any additional information or comments"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Submit Button */}
                    <div className="flex justify-end pt-6">
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            {loading ? (
                                <span className="flex items-center">
                                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Submitting...
                                </span>
                            ) : (
                                "Submit Leave Application"
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}