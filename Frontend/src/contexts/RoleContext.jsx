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
    const storedActiveRole = localStorage.getItem("activeRole");

    console.log('Loading user roles from storage:', {
      hasStoredUser: !!storedUser,
      hasStoredToken: !!storedToken,
      storedActiveRole
    });

    if (storedUser && storedToken) {
      try {
        // Validate token by fetching latest user info
        const res = await fetch("/api/users/me", {
          headers: { 
            Authorization: `Bearer ${storedToken}`,
            'Content-Type': 'application/json'
          },
        });

        console.log('Token validation response status:', res.status);

        if (!res.ok) {
          if (res.status === 401) {
            throw new Error("Token invalid or expired");
          }
          throw new Error(`Server error: ${res.status}`);
        }

        const data = await res.json();
        console.log('User data from /me endpoint:', data);

        // Use stored activeRole if available, otherwise use role from backend
        const newActiveRole = storedActiveRole || data.activeRole || data.role || "employee";
        
        setUser(data);
        setToken(storedToken);
        setOriginalRole(data.role || "employee");
        setActiveRole(newActiveRole);

        // Update localStorage
        localStorage.setItem("user", JSON.stringify(data));
        localStorage.setItem("activeRole", newActiveRole);

      } catch (err) {
        console.log("Token validation failed, logging out", err);
        logout();
      }
    } else {
      console.log('No stored user or token, resetting roles');
      resetRoles();
    }

    setLoading(false);
  };

  // Run on mount
  useEffect(() => {
    loadUserRoles();

    const handleStorageChange = () => {
      console.log('Storage changed, reloading user roles');
      loadUserRoles();
    };
    
    window.addEventListener("storage", handleStorageChange);

    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  // Login function: save user + token
  const login = (newUser, newToken) => {
    console.log('Logging in user:', newUser.id);
    
    localStorage.setItem("user", JSON.stringify(newUser));
    localStorage.setItem("token", newToken);
    localStorage.setItem("activeRole", newUser.activeRole || newUser.role || "employee");

    setUser(newUser);
    setToken(newToken);
    setOriginalRole(newUser.role || "employee");
    setActiveRole(newUser.activeRole || newUser.role || "employee");
  };

  // Logout: clear everything
  const logout = () => {
    console.log('Logging out user');
    
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    localStorage.removeItem("activeRole");
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
    console.log('Attempting to switch role to:', newRole);
    
    if (!canSwitchToRole(newRole)) {
      console.log('Role switch not allowed by frontend validation');
      return false;
    }

    try {
      const res = await fetch("/api/users/switch-role", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ targetRole: newRole }),
      });

      console.log('Role switch response status:', res.status);

      if (res.ok) {
        const data = await res.json();
        console.log('Role switch successful:', data);

        // Update state and localStorage
        const updatedUser = { ...user, activeRole: newRole };
        localStorage.setItem("user", JSON.stringify(updatedUser));
        localStorage.setItem("token", data.token);
        localStorage.setItem("activeRole", newRole);

        setActiveRole(newRole);
        setUser(updatedUser);
        setToken(data.token);

        return true;
      } else {
        console.log('Role switch failed with status:', res.status);
        // Fallback to frontend-only update
        const updatedUser = { ...user, activeRole: newRole };
        localStorage.setItem("user", JSON.stringify(updatedUser));
        localStorage.setItem("activeRole", newRole);
        setActiveRole(newRole);
        setUser(updatedUser);
        return true;
      }
    } catch (err) {
      console.log("Role switch failed, using frontend fallback:", err);
      // Frontend-only fallback
      const updatedUser = { ...user, activeRole: newRole };
      localStorage.setItem("user", JSON.stringify(updatedUser));
      localStorage.setItem("activeRole", newRole);
      setActiveRole(newRole);
      setUser(updatedUser);
      return true;
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