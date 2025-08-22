import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useRole } from "../contexts/RoleContext";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const navigate = useNavigate();
  const { login, user, loading } = useRole(); // Add loading

  // Use useEffect for navigation after render
  useEffect(() => {
    // Only redirect if not loading and user exists
    if (!loading && user) {
      navigate("/dashboard", { replace: true });
    }
  }, [user, loading, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");

    try {
      const res = await fetch("/api/users/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (res.ok && data.user && data.token) {
        login(data.user, data.token);
        navigate("/dashboard");
      } else {
        setMessage(data.message || data.error || "Login failed");
      }
    } catch (err) {
      console.error("Login error:", err);
      setMessage("Server error. Please try again later.");
    }
  };

  // Show loading while checking authentication state
  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div style={{ maxWidth: "400px", margin: "50px auto" }}>
      <h2>Login</h2>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: "10px" }}>
          <label>Email:</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="Enter your email"
          />
        </div>

        <div style={{ marginBottom: "10px" }}>
          <label>Password:</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            placeholder="Enter your password"
          />
        </div>

        <button type="submit">Login</button>
      </form>

      {message && <p style={{ marginTop: "10px", color: "red" }}>{message}</p>}
    </div>
  );
}
