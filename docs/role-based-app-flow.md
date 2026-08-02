# TaskFlow Role-Based Application Flow

This document explains the current end-to-end application flow using the role-based model implemented in the codebase.

## Roles

- `admin`: manages users, teams, projects, and system-wide access
- `project_manager`: manages assigned projects, members, and project tasks
- `team_member`: works on assigned tasks and participates in project collaboration

## End-to-End Flow

```mermaid
flowchart TD
    A[User visits app] --> B{Authenticated?}
    B -- No --> C[Login / Signup / Reset Password]
    C --> D[Backend auth routes validate user]
    D --> E[JWT token + user profile stored in session]
    E --> F[Dashboard]
    B -- Yes --> F[Dashboard]

    F --> G{User role}

    G -- Admin --> H[Admin navigation]
    H --> H1[Create Project]
    H --> H2[Manage Users]
    H --> H3[Manage Teams]
    H --> H4[View Reports / Progress / Messages]

    G -- Project Manager --> I[Project Manager navigation]
    I --> I1[View assigned projects]
    I --> I2[Manage project members]
    I --> I3[Create and manage project tasks]
    I --> I4[Use reports / progress / messages]

    G -- Team Member --> J[Team Member navigation]
    J --> J1[View assigned projects]
    J --> J2[Update own task status / progress]
    J --> J3[Use messages and progress views]

    H1 --> K[Project created]
    I2 --> L[Members assigned project roles]
    H2 --> M[Users created or promoted]
    K --> N[Tasks added to project]
    L --> N
    N --> O[Task updates, notifications, reporting]
    O --> P[Progress dashboard and reports]
```

## Access Summary

- Admins can access `/users` and `/teams`
- Admins can create projects from the dashboard and project workflows
- Project managers can manage project-level membership and task operations where assigned
- Team members have limited edit access and are restricted to their own assigned work updates

## Shared Configuration

The shared branding config now lives in [`shared/projectConfig.json`](../shared/projectConfig.json) and is consumed by frontend config helpers and backend admin seeding logic.
