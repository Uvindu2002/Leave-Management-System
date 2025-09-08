# Product Overview

This is a **Leave Management System** that allows employees to apply for leave, managers to approve/reject leave requests, and administrators to manage users and system settings.

## Key Features

- **Role-based access control** with three user types: Employee, Manager, Admin
- **Role switching** - Admins can view as employees, managers can view as employees
- **Leave application workflow** with approval/rejection system
- **User management** for administrators
- **Dashboard views** tailored to each role
- **Calendar integration** for leave visualization

## User Roles

- **Employee**: Apply for leave, view own leave history
- **Manager**: All employee features + approve/reject team leave requests, view team calendar
- **Admin**: All manager features + create/edit/delete users, system administration

## Authentication

Uses JWT-based authentication with role-based route protection and context management for role switching.