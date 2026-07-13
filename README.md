# DINSANJ Ventures - Billing & Reimbursement Portal

This is the customized, enterprise-grade Accounts Receivable application tailored specifically for DINSANJ Ventures Limited. It features a React/Vite frontend and a serverless Google Apps Script relational database backend.

## Architecture
- **Frontend**: React 18, Vite, TailwindCSS v3, shadcn/ui components, Recharts for analytics.
- **Backend**: Google Apps Script acting as a secure REST API connecting to a structured Google Sheet.
- **Security**: SHA-256 salted password hashing entirely on the backend, JWT-style session tokens.

## Prerequisites
1. Node.js (v18+)
2. NPM (v9+)
3. A Google Account (to host the backend Google Sheet)

## Setup Instructions

### 1. Backend (Google Apps Script)
1. Go to [Google Sheets](https://sheets.google.com) and create a blank sheet.
2. Click **Extensions** -> **Apps Script**.
3. Copy the entire contents of the `backend/Code.gs` file from this repository and paste it into the Apps Script editor.
4. **Important**: Change the `SCRIPT_SECRET` constant at the top of the file to your own secret password.
5. In the Apps Script Editor, select the function `setupDatabase` from the top toolbar dropdown and click **Run**. This will generate all 8 database tables automatically.
6. Click **Deploy** -> **New Deployment**.
7. Select **Web app**.
   - Execute as: **Me**
   - Who has access: **Anyone**
8. Click **Deploy** and authorize the script.
9. Copy the resulting **Web app URL**.

### 2. Frontend Configuration
1. Open the project folder in your terminal.
2. Install the dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file in the root of the project (you can duplicate `.env.example` if it exists).
4. Add your Google Apps Script URL to the `.env` file:
   ```env
   VITE_API_URL=https://script.google.com/macros/s/.../exec
   ```

### 3. Running the App
Start the local development server:
```bash
npm run dev
```

Your app will be running at `http://localhost:5173`. 
You can log in using the default system admin credentials:
- **Email**: `admin@dinsanj.com`
- **Password**: `password123`

*(Note: Once logged in, go to Settings -> User Management to create your actual credentials, then delete the default admin from the Google Sheet!).*

## Deployment to Production
When you are ready to put this on the internet (via Vercel, Netlify, or Hostinger):
1. Ensure your `.env` variables are added to your hosting provider's dashboard.
2. Build the app:
   ```bash
   npm run build
   ```
3. Serve the `dist` folder.
