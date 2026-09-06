# Deployment Plan

- Project: website-kelas-ypk-fixed
- Status: Ready for Validation
- Mode: MODIFY
- Recipe: azd
- Target Azure Service: Azure App Service (Node.js)

## 1. Workspace Analysis
- Existing app is a full-stack Node.js project with Express backend and static frontend assets.
- Backend serves `/api/auth` routes and uploads under `/uploads`.
- Frontend is built with Vite and served via the Express app in local development.
- The app currently stores data in SQLite and static upload files in the local filesystem.

## 2. Requirements
- Deploy the existing app to Azure without rewriting the app architecture.
- Keep the current class website functionality: member directory, structure, gallery, announcements, dashboard, and profile management.
- Prefer a low-cost Microsoft-hosted deployment path suitable for a class site.
- Preserve the ability to serve local upload files and read/write SQLite data in Azure.

## 3. Codebase Scan
- Runtime: Node.js / Express
- Frontend: Vite-based static assets
- Data: SQLite database file on disk
- Storage: local uploads under `storage/uploads`
- Entry points: `server.js`, `auth.js`, `database.js`, `frontend/src/*`

## 4. Selected Recipe
- Use `azd` with Azure App Service deployment.
- This is the most direct path for an existing Node app that has already passed local QA and needs controlled Azure deployment.
- Infrastructure will include resource group, App Service plan, and App Service app, with app settings for runtime configuration.

## 5. Architecture
- Azure App Service hosts the Node.js Express app.
- The app continues to serve the frontend and backend from the same deployment.
- SQLite database remains in the app filesystem for the initial deployment, and the app will ensure the data path is writable.
- Uploads remain in a persistent app storage area or Azure Files if needed in a future hardening pass.

## 6. Deployment Steps
1. Confirm Azure subscription and location.
2. Generate `azure.yaml` and IaC files for the App Service deployment.
3. Configure runtime and app settings (PORT, session secret, upload path, database path).
4. Validate the generated plan and app configuration.
5. Run Azure deployment through `azd`.
6. Verify app health and the main public routes after deployment.

## 7. Risks / Notes
- SQLite on App Service is acceptable for a small class website but is not the most durable production pattern.
- A future production hardening pass may migrate the database and uploads to Azure Files / Azure Database.
- The current app must keep file-writing permissions enabled for the upload directory.

## 8. Validation Proof
- Pending execution after plan approval and Azure validation.
