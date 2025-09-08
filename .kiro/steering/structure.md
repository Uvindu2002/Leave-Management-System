# Project Structure

## Root Layout
```
/Backend          # Express.js API server
/Frontend         # React + Vite application
/.kiro            # Kiro IDE configuration
/.vscode          # VS Code settings
```

## Backend Structure (`/Backend`)
```
controllers/      # Route handlers (userController, leaveController, managerController)
middleware/       # Auth middleware and other middleware
routes/          # Express route definitions
services/        # Business logic layer (userService, leaveAccrualService, managerService)
utils/           # Utility functions (roleHierarchy)
db.js            # Database connection setup
index.js         # Express app entry point
.env             # Environment variables
```

## Frontend Structure (`/Frontend/src`)
```
components/      # Reusable UI components
  - Layout.jsx         # Main app layout wrapper
  - Header.jsx         # Top navigation
  - Sidebar.jsx        # Side navigation
  - ProtectedRoute.jsx # Route protection
  - DashboardWrapper.jsx
  - UserCalendar.jsx

contexts/        # React context providers
  - RoleContext.jsx    # User authentication and role management

pages/           # Route-specific page components
  admin/         # Admin-only pages (UserManagement, CreateUser, etc.)
  employee/      # Employee pages (ApplyLeave, EmployeeDashboard)
  manager/       # Manager pages (ManagerDashboard, EmployeeDetailView)
  Login.jsx      # Authentication page

App.jsx          # Main app component with routing
main.jsx         # React app entry point
```

## Key Conventions

### File Naming
- **Components**: PascalCase (e.g., `UserManagement.jsx`)
- **Services**: camelCase with Service suffix (e.g., `userService.js`)
- **Controllers**: camelCase with Controller suffix (e.g., `userController.js`)

### Route Organization
- **API routes**: `/api/{resource}` (e.g., `/api/users`, `/api/leaves`)
- **Frontend routes**: Role-based prefixes (`/admin/*`, `/manager/*`)
- **Protected routes**: All authenticated routes use `ProtectedRoute` wrapper

### Authentication Flow
- JWT tokens stored in localStorage
- Role context manages user state and role switching
- Middleware validates tokens on API requests
- Frontend routes protected by role requirements