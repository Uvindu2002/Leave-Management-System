const roleHierarchy = {
  admin: ['admin', 'employee'],
  manager: ['manager', 'employee'],
  employee: ['employee']
};

export const canSwitchToRole = (currentRole, targetRole) => {
  return roleHierarchy[currentRole]?.includes(targetRole) || false;
};

export const getInheritedPermissions = (role) => {
  return roleHierarchy[role] || [];
};
