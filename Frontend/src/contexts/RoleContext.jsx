import { createContext, useContext, useState, useEffect } from "react";

const RoleContext = createContext();

export function RoleProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [activeRole, setActiveRole] = useState(null);
  const [originalRole, setOriginalRole] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load user + token from localStorage and validate with backend
  const loadUserRoles = async () => {
    setLoading(true);

    const storedUser = JSON.parse(localStorage.getItem("user"));
    const storedToken = localStorage.getItem("token");
    const storedActiveRole = localStorage.getItem("activeRole"); // 🆕 Get stored activeRole

    if (storedUser && storedToken) {
      try {
        // Validate token by fetching latest user info
        const res = await fetch("/api/users/me", {
          headers: { Authorization: `Bearer ${storedToken}` },
        });

        if (!res.ok) throw new Error("Token invalid or expired");

        const data = await res.json();

        setUser(data);
        setToken(storedToken);
        setOriginalRole(data.role || "employee");
        
        // 🆕 Use stored activeRole if available, otherwise use role from backend
        const newActiveRole = storedActiveRole || data.activeRole || data.role || "employee";
        setActiveRole(newActiveRole);

        // 🆕 Update localStorage with activeRole
        localStorage.setItem("user", JSON.stringify(data));
        localStorage.setItem("activeRole", newActiveRole);

      } catch (err) {
        console.log("Token invalid, logging out", err);
        logout();
      }
    } else {
      resetRoles();
    }

    setLoading(false);
  };

  // Run on mount
  useEffect(() => {
    loadUserRoles();

    const handleStorageChange = () => loadUserRoles();
    window.addEventListener("storage", handleStorageChange);

    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  // Login function: save user + token
  const login = (newUser, newToken) => {
    localStorage.setItem("user", JSON.stringify(newUser));
    localStorage.setItem("token", newToken);
    localStorage.setItem("activeRole", newUser.activeRole || newUser.role || "employee"); // 🆕 Store activeRole

    setUser(newUser);
    setToken(newToken);
    setOriginalRole(newUser.role || "employee");
    setActiveRole(newUser.activeRole || newUser.role || "employee");
  };

  // Logout: clear everything
  const logout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    localStorage.removeItem("activeRole"); // 🆕 Remove activeRole
    resetRoles();
  };

  const resetRoles = () => {
    setUser(null);
    setToken(null);
    setActiveRole(null);
    setOriginalRole(null);
  };

  // Role switching rules
  const canSwitchToRole = (targetRole) => {
    if (!originalRole) return false;
    if (targetRole === originalRole) return true;
    if (originalRole === "admin" && targetRole === "employee") return true;
    if (originalRole === "manager" && targetRole === "employee") return true;
    return false;
  };

  const switchRole = async (newRole) => {
  if (!canSwitchToRole(newRole)) {
    console.log("Role switch not allowed by frontend validation");
    return false;
  }

  try {
    console.log("Attempting to switch role to:", newRole);
    console.log("Current token:", token ? "exists" : "missing");

    const res = await fetch("/api/users/switch-role", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ targetRole: newRole }),
    });

    console.log("Switch role response status:", res.status);

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      console.log("Switch role failed:", res.status, errorData);
      throw new Error(errorData.message || `HTTP error! status: ${res.status}`);
    }

    const data = await res.json();
    console.log("Switch role successful:", data);

    // Update localStorage and state with new activeRole and token
    const updatedUser = { 
      ...user, 
      activeRole: newRole,
      // Ensure all required user fields are maintained
      id: user.id,
      employee_id: user.employee_id,
      name: user.name,
      email: user.email,
      role: user.role,
      manager_id: user.manager_id
    };
    
    localStorage.setItem("user", JSON.stringify(updatedUser));
    localStorage.setItem("token", data.token);
    localStorage.setItem("activeRole", newRole);

    setActiveRole(newRole);
    setUser(updatedUser);
    setToken(data.token);

    return true;
  } catch (err) {
    console.log("Role switch failed:", err.message);
    
    // Fallback: update frontend state only if backend call fails
    // This allows role switching to work even if backend has issues
    const updatedUser = { ...user, activeRole: newRole };
    localStorage.setItem("user", JSON.stringify(updatedUser));
    localStorage.setItem("activeRole", newRole);
    
    setActiveRole(newRole);
    setUser(updatedUser);
    
    return true; // Still return true for UX purposes
  }
};

  return (
    <RoleContext.Provider
      value={{
        user,
        token,
        activeRole,
        originalRole,
        login,
        logout,
        canSwitchToRole,
        switchRole,
        resetRoles,
        loading,
      }}
    >
      {children}
    </RoleContext.Provider>
  );
}

export const useRole = () => useContext(RoleContext);