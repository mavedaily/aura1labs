# 🔐 AuraReach Authentication Setup Guide

## Google OAuth + Excel Backend Authentication System

This guide will help you set up the complete authentication system with Google OAuth and Excel database backend.

---

## 📋 Prerequisites

- Google Account with access to Google Apps Script
- Google Cloud Console access for OAuth setup
- Basic understanding of Google Sheets and Apps Script

---

## 🚀 Step 1: Create the Excel Database

### 1.1 Open Google Apps Script
1. Go to [Google Apps Script](https://script.google.com)
2. Open your existing `code.gs` file (or create a new project)

### 1.2 Run Database Setup
1. In the Apps Script editor, find the `setupDatabase()` function
2. Click the **Run** button (▶️) next to the function name
3. **Grant permissions** when prompted:
   - Allow access to Google Sheets
   - Allow access to Google Drive
   - Allow access to external URLs

### 1.3 Copy the Generated Information
After running `setupDatabase()`, you'll see output like this in the logs:
```
✅ Created new spreadsheet:
📊 Spreadsheet ID: 1ABC123DEF456GHI789JKL_EXAMPLE_ID
🔗 Spreadsheet URL: https://docs.google.com/spreadsheets/d/1ABC123DEF456GHI789JKL_EXAMPLE_ID/edit
```

**IMPORTANT:** Copy the Spreadsheet ID - you'll need it in Step 3!

---

## 🔧 Step 2: Set Up Google OAuth

### 2.1 Create Google Cloud Project
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select existing one
3. Name it something like "AuraReach Email Management"

### 2.2 Enable Required APIs
1. Go to **APIs & Services** > **Library**
2. Enable these APIs:
   - **Google+ API** (for user authentication)
   - **Gmail API** (for email sending)
   - **Google Sheets API** (for database access)

### 2.3 Configure OAuth Consent Screen
1. Go to **APIs & Services** > **OAuth consent screen**
2. Choose **External** user type
3. Fill in required information:
   - **App name:** AuraReach Email Management
   - **User support email:** Your email
   - **Developer contact:** Your email
4. Add scopes:
   - `userinfo.email`
   - `userinfo.profile`
   - `gmail.send`
   - `gmail.readonly`

### 2.4 Create OAuth Credentials
1. Go to **APIs & Services** > **Credentials**
2. Click **+ CREATE CREDENTIALS** > **OAuth client ID**
3. Choose **Web application**
4. Add authorized origins:
   - `http://localhost:8000` (for local development)
   - Your production domain (if applicable)
5. **Copy the Client ID** - you'll need it in Step 3!

---

## ⚙️ Step 3: Configure the Frontend

### 3.1 Update auth-config.js
Open `auth-config.js` and update these values:

```javascript
const AUTH_CONFIG = {
  // Paste your Spreadsheet ID from Step 1.3
  EXCEL_SHEET_ID: '1ABC123DEF456GHI789JKL_EXAMPLE_ID',
  
  // Paste your OAuth Client ID from Step 2.4
  GOOGLE_CLIENT_ID: 'YOUR_CLIENT_ID.apps.googleusercontent.com',
  
  // Your deployed Apps Script URL (see Step 4)
  APPS_SCRIPT_URL: 'YOUR_APPS_SCRIPT_WEB_APP_URL',
  
  // ... rest of the configuration
};
```

### 3.2 Update Default Admin Email
In `code.gs`, update the default admin email:

```javascript
DEFAULT_ADMIN: {
  email: 'your-email@domain.com', // Change this to your email
  name: 'Your Name',
  role: 'admin'
},
```

---

## 🌐 Step 4: Deploy Apps Script as Web App

### 4.1 Deploy the Script
1. In Google Apps Script, click **Deploy** > **New deployment**
2. Choose **Web app** as the type
3. Set configuration:
   - **Execute as:** Me
   - **Who has access:** Anyone
4. Click **Deploy**
5. **Copy the Web App URL** - you'll need it for Step 3.1!

### 4.2 Update Frontend Configuration
Go back to `auth-config.js` and paste the Web App URL:

```javascript
APPS_SCRIPT_URL: 'https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec',
```

---

## 🔗 Step 5: Integrate with Your Application

### 5.1 Add Authentication to HTML
Add this to your main HTML file (e.g., `index.html`):

```html
<!-- Add before closing </head> tag -->
<script src="auth-config.js"></script>

<!-- Add Google Sign-In button -->
<div id="google-signin-btn" class="google-signin-btn">
  <img src="https://developers.google.com/identity/images/g-logo.png" alt="Google">
  Continue with Google
</div>

<!-- User info display -->
<div id="user-info" style="display: none;">
  <img id="user-avatar" src="" alt="User Avatar">
  <span id="user-name"></span>
  <span id="user-email"></span>
  <button id="signout-btn">Sign Out</button>
</div>
```

### 5.2 Add Authentication Logic
Add this JavaScript to handle authentication:

```javascript
// Wait for auth manager to initialize
document.addEventListener('DOMContentLoaded', async () => {
  // Set up sign-in button
  document.getElementById('google-signin-btn').addEventListener('click', async () => {
    const result = await authManager.signIn();
    if (result.success) {
      showUserInfo(result.user);
    } else {
      alert('Sign in failed: ' + result.error);
    }
  });
  
  // Set up sign-out button
  document.getElementById('signout-btn').addEventListener('click', async () => {
    await authManager.signOut();
    hideUserInfo();
  });
  
  // Listen for auth state changes
  authManager.addAuthListener((event, data) => {
    if (event === 'signin') {
      showUserInfo(data);
    } else if (event === 'signout') {
      hideUserInfo();
    }
  });
});

function showUserInfo(user) {
  document.getElementById('google-signin-btn').style.display = 'none';
  document.getElementById('user-info').style.display = 'block';
  document.getElementById('user-avatar').src = user.picture;
  document.getElementById('user-name').textContent = user.name;
  document.getElementById('user-email').textContent = user.email;
}

function hideUserInfo() {
  document.getElementById('google-signin-btn').style.display = 'block';
  document.getElementById('user-info').style.display = 'none';
}
```

---

## 📊 Step 6: Managing User Limits

### 6.1 View Current Limits
```javascript
// Get user's current limits and usage
const limits = await authManager.getUserLimits();
if (limits.success) {
  console.log('Daily limit:', limits.limits.daily);
  console.log('Current usage:', limits.usage.daily);
  console.log('Remaining:', limits.remaining.daily);
}
```

### 6.2 Update Limits (Admin Only)
```javascript
// Update user limits (requires admin permission)
const updateResult = await authManager.updateUserLimits({
  daily: 1000,
  hourly: 100,
  monthly: 30000
});

if (updateResult.success) {
  console.log('Limits updated successfully!');
}
```

### 6.3 Real-time Limit Sync
The system automatically syncs limits between frontend and Excel backend:
- When you update limits in Excel, they're reflected in the frontend
- When you update limits via the frontend, they're saved to Excel
- Usage is tracked in real-time

---

## 🛡️ Step 7: Security Configuration

### 7.1 Protect Your Spreadsheet
1. Open your generated spreadsheet
2. Go to **Share** > **Restricted** 
3. Only share with necessary users
4. Consider using **View only** for most users

### 7.2 Set Up User Roles
In your Excel spreadsheet, you can manually edit user roles:
- **admin**: Full access to everything
- **manager**: Can manage users and view analytics
- **user**: Can send emails and view basic analytics
- **viewer**: Can only view analytics

### 7.3 Configure Rate Limits
Update `auth-config.js` to set appropriate rate limits:

```javascript
RATE_LIMITS: {
  loginAttempts: 5,
  lockoutDuration: 15 * 60 * 1000, // 15 minutes
  apiCallsPerMinute: 60
}
```

---

## 🧪 Step 8: Testing

### 8.1 Test Database Creation
1. Run `setupDatabase()` in Apps Script
2. Check that all sheets are created with proper headers
3. Verify default admin user is created

### 8.2 Test Authentication
1. Try signing in with Google
2. Check that user is created in Excel database
3. Verify permissions and limits are set correctly

### 8.3 Test Limit Updates
1. Update limits in Excel spreadsheet
2. Refresh frontend and check if limits are updated
3. Update limits via frontend and check Excel

---

## 🔧 Troubleshooting

### Common Issues:

**"Database not configured" error:**
- Make sure you've run `setupDatabase()` 
- Check that `EXCEL_SHEET_ID` is set in `auth-config.js`

**OAuth errors:**
- Verify OAuth Client ID is correct
- Check that authorized origins include your domain
- Ensure required APIs are enabled

**Permission errors:**
- Grant all requested permissions in Apps Script
- Check spreadsheet sharing settings
- Verify user has access to the spreadsheet

**Limits not syncing:**
- Check Apps Script execution logs
- Verify spreadsheet ID is correct
- Ensure user exists in both Users and Limits sheets

---

## 📞 Support

If you encounter issues:
1. Check the browser console for error messages
2. Review Apps Script execution logs
3. Verify all configuration values are correct
4. Test with a simple user first before adding complex permissions

---

## 🎉 You're All Set!

Your Google OAuth + Excel authentication system is now ready! Users can:
- Sign in with their Google accounts
- Have their data automatically stored in Excel
- Have limits managed dynamically
- Access features based on their role permissions

The system provides enterprise-level authentication with the simplicity of Excel-based user management.