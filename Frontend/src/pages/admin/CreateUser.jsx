import { useState, useEffect } from "react";
import { useRole } from "../../contexts/RoleContext";

export default function CreateUser() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    employee_id: "",
    password: "",
    role: "employee",
    manager_id: "",
    employment_type: "confirmed",
    confirmation_date: "",
  });

  const [message, setMessage] = useState("");
  const [managers, setManagers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const { user: currentUser, token } = useRole(); // ✅ Get token from context

  // Fetch managers list (only admins and managers)
  useEffect(() => {
    const fetchManagers = async () => {
      if (!currentUser || (currentUser.role !== "admin" && currentUser.role !== "manager")) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const res = await fetch("/api/users/managers", {
          headers: {
            Authorization: `Bearer ${token}`, // ✅ Add authorization header
            'Content-Type': 'application/json'
          }
        });
        
        console.log('Managers fetch response status:', res.status);
        
        const data = await res.json();
        if (res.ok) {
          setManagers(data);
          console.log('Managers loaded successfully:', data.length);
        } else {
          setMessage("Failed to load managers list: " + (data.message || 'Unknown error'));
          console.error('Managers fetch failed:', data);
        }
      } catch (error) {
        setMessage("Error loading managers list: " + error.message);
        console.error('Managers fetch error:', error);
      } finally {
        setLoading(false);
      }
    };
    
    if (currentUser && token) {
      fetchManagers();
    }
  }, [currentUser, token]); // ✅ Add token to dependency array

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage("");

    try {
      const res = await fetch("/api/users/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`, // ✅ Use token from context
        },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (res.ok) {
        setMessage(`✅ User (${formData.role}) created successfully!`);
        setFormData({
          name: "",
          email: "",
          employee_id: "",
          password: "",
          role: "employee",
          manager_id: "",
          employment_type: "confirmed",
          confirmation_date: "",
        });
        
        // Refresh managers list after creating a new user
        const managersRes = await fetch("/api/users/managers", {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        if (managersRes.ok) {
          const managersData = await managersRes.json();
          setManagers(managersData);
        }
      } else {
        setMessage(`❌ Error: ${data.message || "Something went wrong"}`);
      }
    } catch (error) {
      setMessage("❌ Server error: " + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Only allow admins to create users
  if (!currentUser || currentUser.role !== "admin") {
    return (
      <div style={{ padding: "20px", textAlign: "center" }}>
        <h2>Access Denied</h2>
        <p>Only administrators can create new users.</p>
      </div>
    );
  }

  // Show loading while checking authentication
  if (!currentUser || !token) {
    return (
      <div style={{ padding: "20px", textAlign: "center" }}>
        <h2>Loading...</h2>
        <p>Please wait while we verify your authentication.</p>
      </div>
    );
  }

  return (
    <div style={{ padding: "20px", maxWidth: "600px", margin: "0 auto" }}>
      <h2>Create New User</h2>

      {message && (
        <div style={{
          marginBottom: "15px",
          padding: "10px",
          backgroundColor: message.includes("✅") ? "#d4edda" : "#f8d7da",
          border: `1px solid ${message.includes("✅") ? "#c3e6cb" : "#f5c6cb"}`,
          borderRadius: "4px",
          color: message.includes("✅") ? "#155724" : "#721c24"
        }}>
          {message}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* Basic Information */}
        <div style={{ marginBottom: "15px", padding: "15px", border: "1px solid #ddd", borderRadius: "5px" }}>
          <h3 style={{ marginTop: 0 }}>Basic Information</h3>
          
          <div style={{ marginBottom: "10px" }}>
            <label>Name:</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              style={{ width: "100%", padding: "8px" }}
            />
          </div>

          <div style={{ marginBottom: "10px" }}>
            <label>Email:</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              style={{ width: "100%", padding: "8px" }}
            />
          </div>

          <div style={{ marginBottom: "10px" }}>
            <label>Employee ID:</label>
            <input
              type="text"
              name="employee_id"
              value={formData.employee_id}
              onChange={handleChange}
              required
              style={{ width: "100%", padding: "8px" }}
            />
          </div>

          <div style={{ marginBottom: "10px" }}>
            <label>Password:</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              minLength="6"
              style={{ width: "100%", padding: "8px" }}
            />
          </div>
        </div>

        {/* Role and Employment Details */}
        <div style={{ marginBottom: "15px", padding: "15px", border: "1px solid #ddd", borderRadius: "5px" }}>
          <h3>Role & Employment</h3>
          
          <div style={{ marginBottom: "10px" }}>
            <label>Role:</label>
            <select 
              name="role" 
              value={formData.role} 
              onChange={handleChange}
              style={{ width: "100%", padding: "8px" }}
            >
              <option value="employee">Employee</option>
              <option value="manager">Manager</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          <div style={{ marginBottom: "10px" }}>
            <label>Employment Type:</label>
            <select 
              name="employment_type" 
              value={formData.employment_type} 
              onChange={handleChange}
              style={{ width: "100%", padding: "8px" }}
            >
              <option value="probation">Probation</option>
              <option value="confirmed">Confirmed</option>
              <option value="contract">Contract</option>
              <option value="internship">Internship</option>
            </select>
          </div>

          <div style={{ marginBottom: "10px" }}>
            <label>Confirmation Date:</label>
            <input
              type="date"
              name="confirmation_date"
              value={formData.confirmation_date}
              onChange={handleChange}
              style={{ width: "100%", padding: "8px" }}
            />
          </div>

          <div style={{ marginBottom: "10px" }}>
            <label>Manager:</label>
            <select
              name="manager_id"
              value={formData.manager_id}
              onChange={handleChange}
              style={{ width: "100%", padding: "8px" }}
              disabled={loading}
            >
              <option value="">-- Select Manager --</option>
              {loading ? (
                <option value="" disabled>Loading managers...</option>
              ) : (
                managers.map((mgr) => (
                  <option key={mgr.id} value={mgr.id}>
                    {mgr.name} ({mgr.employee_id})
                  </option>
                ))
              )}
            </select>
            <small style={{ display: "block", color: "#666", marginTop: "5px" }}>
              {formData.role === "admin" 
                ? "Admins can have managers for reporting purposes" 
                : formData.role === "manager" 
                ? "Managers can also report to other managers" 
                : "Select the manager for this employee"}
            </small>
          </div>
        </div>

        <button 
          type="submit" 
          disabled={submitting || loading}
          style={{
            padding: "10px 20px",
            backgroundColor: (submitting || loading) ? "#ccc" : "#007bff",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: (submitting || loading) ? "not-allowed" : "pointer"
          }}
        >
          {submitting ? "Creating..." : loading ? "Loading..." : "Create User"}
        </button>
      </form>
    </div>
  );
}