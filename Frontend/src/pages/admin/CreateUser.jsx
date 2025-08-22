import { useState, useEffect } from "react";

export default function CreateUser() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    employee_id: "",
    password: "",
    role: "employee", // default role
    manager_id: "",   // 🆕 added manager field
  });

  const [message, setMessage] = useState("");
  const [managers, setManagers] = useState([]); // 🆕 state for managers list
  const [loading, setLoading] = useState(true); // 🆕 loading state

  // 🆕 fetch managers list
  useEffect(() => {
    const fetchManagers = async () => {
      try {
        setLoading(true);
        const res = await fetch("/api/users/managers"); // ✅ Correct endpoint
        const data = await res.json();
        if (res.ok) {
          setManagers(data);
        } else {
          console.error("Failed to fetch managers:", data.message);
          setMessage("Failed to load managers list");
        }
      } catch (error) {
        console.error("Error fetching managers:", error);
        setMessage("Error loading managers list");
      } finally {
        setLoading(false);
      }
    };
    fetchManagers();
  }, []);

  const handleChange = (e) => {
    let { name, value } = e.target;

    // ensure manager_id is a number (or empty)
    if (name === "manager_id" && value !== "") {
      value = Number(value);
    }

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const res = await fetch("/api/users/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (res.ok) {
        setMessage(`✅ User (${formData.role}) created successfully: ${data.user?.name || ""}`);
        setFormData({
          name: "",
          email: "",
          employee_id: "",
          password: "",
          role: "employee",
          manager_id: "", // reset manager
        });
      } else {
        setMessage(`❌ Error: ${data.message || "Something went wrong"}`);
      }
    } catch (error) {
      console.error(error);
      setMessage("❌ Server error");
    }
  };

  return (
    <div style={{ padding: "20px", maxWidth: "500px", margin: "0 auto" }}>
      <h2>Create New User</h2>

      <form onSubmit={handleSubmit}>
        {/* Name */}
        <div style={{ marginBottom: "10px" }}>
          <label>Name:</label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
          />
        </div>

        {/* Email */}
        <div style={{ marginBottom: "10px" }}>
          <label>Email:</label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            required
          />
        </div>

        {/* Employee ID */}
        <div style={{ marginBottom: "10px" }}>
          <label>Employee ID:</label>
          <input
            type="text"
            name="employee_id"
            value={formData.employee_id}
            onChange={handleChange}
            required
          />
        </div>

        {/* Password */}
        <div style={{ marginBottom: "10px" }}>
          <label>Password:</label>
          <input
            type="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            required
          />
        </div>

        {/* Role */}
        <div style={{ marginBottom: "10px" }}>
          <label>Role:</label>
          <select name="role" value={formData.role} onChange={handleChange}>
            <option value="employee">Employee</option>
            <option value="manager">Manager</option>
            <option value="admin">Admin</option>
          </select>
        </div>

        {/* 🆕 Manager dropdown (show for all roles) */}
        <div style={{ marginBottom: "10px" }}>
          <label>Manager:</label>
          <select
            name="manager_id"
            value={formData.manager_id}
            onChange={handleChange}
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

        <button type="submit">Create User</button>
      </form>

      {message && <p style={{ marginTop: "15px" }}>{message}</p>}
    </div>
  );
}