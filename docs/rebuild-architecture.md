# TaskFlow Rebuild Architecture

This project is being simplified around the existing Option 2 stack:

- Frontend: React + Vite
- Backend: Node.js + Express
- Database: MongoDB
- Auth: JWT

## Rebuild Principles

1. Keep the current UI and styling intact wherever possible.
2. Centralize role-based access rules instead of scattering checks across pages.
3. Reuse stable existing modules first, then refactor brittle logic in place.
4. Introduce a cleaner folder structure incrementally to avoid breaking working screens.

## Frontend Direction

New structure introduced:

- `src/app/config`
  - shared roles and navigation configuration
- `src/app/routes`
  - centralized route definitions

Existing UI remains in:

- `src/pages`
- `src/components`
- `src/styles`

## Backend Direction

New structure introduced:

- `Backend/config`
  - environment, CORS, and database bootstrap
- `Backend/app.js`
  - express app composition

Existing business logic remains in:

- `Backend/routes`
- `Backend/controllers`
- `Backend/models`
- `Backend/middleware`

## Target Role Model

- `admin`
- `project_manager`
- `team_member`

Project-level roles can still exist internally where needed, but the application should treat the three global roles above as the top-level access model.
