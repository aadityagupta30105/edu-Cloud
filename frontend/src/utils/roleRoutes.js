export const roleRoutes = {
  student: "/student",
  teacher: "/teacher",
  admin: "/admin"
};

export const getDashboardRoute = (role) => {
  return roleRoutes[role] || "/";
};