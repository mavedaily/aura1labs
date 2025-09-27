# 🔧 Google Apps Script Deployment Guide

## 📋 Overview

The `code.gs` file contains Google Apps Script backend code that provides:
- Server-side functionality
- Google Workspace integration
- User authentication
- Database operations
- Advanced email processing

## 🎯 When to Use Google Apps Script

### ✅ Use Google Apps Script if you need:
- **Server-side processing** for sensitive operations
- **Google Workspace integration** (Gmail, Sheets, Drive)
- **User authentication** and authorization
- **Database functionality** with Google Sheets
- **Scheduled email sending** with server-side triggers
- **Advanced security** for API keys and credentials

### ❌ Skip Google Apps Script if you only need:
- Basic email composition and sending
- Template management
- Contact management
- Simple analytics
- Static web hosting

## 🚀 Step-by-Step Deployment

### Step 1: Access Google Apps Script
1. Go to [script.google.com](https://script.google.com)
2. Sign in with your Google account
3. Click "New Project"

### Step 2: Set Up the Project
1. **Rename the project**: Click "Untitled project" → "AuraReach Email System"
2. **Delete default code**: Remove the existing `myFunction()` code
3. **Copy backend code**: Copy all content from `code.gs` and paste it

### Step 3: Add HTML Files
1. **Add main HTML file**:
   - Click "+" → "HTML file"
   - Name it "gmail-sender"
   - Copy content from `gmail-sender.html`

2. **Add alternative HTML file** (optional):
   - Click "+" → "HTML file"  
   - Name it "index3"
   - Copy content from `index3.html`

### Step 4: Add CSS Files
For each CSS file, create an HTML file and wrap the CSS in `<style>` tags:

1. **Create HTML file**: Click "+" → "HTML file"
2. **Name it**: Use the CSS filename (e.g., "email-composer-css")
3. **Add CSS content**:
```html
<style>
/* Paste CSS content here */
</style>
```

**Required CSS files to add**:
- email-composer-css
- contact-manager-css
- email-scheduler-css
- gmail-api-css
- template-manager-css
- email-analytics-css
- bulk-email-sender-css

### Step 5: Add JavaScript Files
For each JS file, create an HTML file and wrap the JS in `<script>` tags:

1. **Create HTML file**: Click "+" → "HTML file"
2. **Name it**: Use the JS filename (e.g., "email-composer-js")
3. **Add JS content**:
```html
<script>
/* Paste JavaScript content here */
</script>
```

**Required JS files to add**:
- email-composer-js
- contact-manager-js
- email-scheduler-js
- gmail-api-js
- template-manager-js
- email-analytics-js
- bulk-email-sender-js

### Step 6: Configure the Project

#### Update doGet() Function
Modify the `doGet()` function in `code.gs` to serve your main HTML file:

```javascript
function doGet(e) {
  try {
    // Initialize database if needed
    initializeDatabaseIfNeeded();
    
    // Create and return the HTML output
    const htmlOutput = HtmlService.createTemplateFromFile('gmail-sender');
    
    const output = htmlOutput.evaluate()
      .setTitle('AuraReach Email Management System')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
      .addMetaTag('viewport', 'width=device-width, initial-scale=1.0');
    
    return output;
  } catch (error) {
    console.error('Error in doGet:', error);
    return HtmlService.createHtmlOutput('Error loading application');
  }
}
```

#### Add Include Function
Add this function to include CSS/JS files:

```javascript
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}
```

### Step 7: Update HTML File References
In your main HTML file (`gmail-sender`), update the CSS and JS includes:

```html
<!-- Replace CSS links with -->
<?!= include('email-composer-css') ?>
<?!= include('contact-manager-css') ?>
<?!= include('email-scheduler-css') ?>
<?!= include('gmail-api-css') ?>
<?!= include('template-manager-css') ?>
<?!= include('email-analytics-css') ?>
<?!= include('bulk-email-sender-css') ?>

<!-- Replace JS script tags with -->
<?!= include('email-composer-js') ?>
<?!= include('contact-manager-js') ?>
<?!= include('email-scheduler-js') ?>
<?!= include('gmail-api-js') ?>
<?!= include('template-manager-js') ?>
<?!= include('email-analytics-js') ?>
<?!= include('bulk-email-sender-js') ?>
```

### Step 8: Enable Required APIs
1. **Click "Services" (+)** in the left sidebar
2. **Add Gmail API**:
   - Search for "Gmail API"
   - Click "Add"
   - Set identifier as "Gmail"

3. **Add Google Sheets API** (if using database features):
   - Search for "Google Sheets API"
   - Click "Add"
   - Set identifier as "Sheets"

### Step 9: Deploy as Web App
1. **Click "Deploy"** → "New deployment"
2. **Choose type**: Select "Web app"
3. **Configure settings**:
   - Description: "AuraReach Email Management System"
   - Execute as: "Me"
   - Who has access: Choose based on your needs:
     - "Only myself" - Private use
     - "Anyone with Google account" - Restricted access
     - "Anyone" - Public access

4. **Click "Deploy"**
5. **Copy the web app URL** - this is your deployed application

### Step 10: Set Up Permissions
1. **Review permissions**: Click "Review permissions"
2. **Grant access**: Allow the script to access Gmail and other services
3. **Verify deployment**: Visit the web app URL to test

## 🔧 Configuration

### Environment Variables
Update these in `code.gs`:

```javascript
const CONFIG = {
  SPREADSHEET_NAME: 'Your_Database_Name',
  VERSION: '1.0',
  AUTHORIZED_USERS: [
    'your-email@gmail.com'
  ],
  ADMIN_USERS: [
    'your-email@gmail.com'
  ]
};
```

### Gmail API Setup
1. **Go to** [Google Cloud Console](https://console.cloud.google.com)
2. **Create/select project**
3. **Enable Gmail API**
4. **Create OAuth 2.0 credentials**
5. **Add authorized domains**:
   - `script.google.com`
   - `script.googleusercontent.com`

## 🔒 Security Considerations

### Best Practices
- **Limit access**: Use "Only myself" or specific users
- **Review permissions**: Regularly check who has access
- **Secure credentials**: Store API keys in script properties
- **Monitor usage**: Check execution logs regularly

### Script Properties (for API keys)
```javascript
// Store sensitive data in script properties
function storeApiKey() {
  PropertiesService.getScriptProperties().setProperties({
    'GMAIL_CLIENT_ID': 'your-client-id',
    'GMAIL_CLIENT_SECRET': 'your-client-secret'
  });
}

// Retrieve in your code
const clientId = PropertiesService.getScriptProperties().getProperty('GMAIL_CLIENT_ID');
```

## 🚨 Troubleshooting

### Common Issues

#### "Script function not found"
- Check function names match exactly
- Verify all files are uploaded correctly
- Ensure proper syntax in all files

#### "Permission denied"
- Review and grant all required permissions
- Check user authorization settings
- Verify OAuth consent screen configuration

#### "Quota exceeded"
- Monitor daily execution limits
- Optimize code for efficiency
- Consider upgrading to Google Workspace

#### "HTML not rendering"
- Check HTML file names match includes
- Verify CSS/JS wrapper tags are correct
- Test individual files for syntax errors

### Debugging Tips
1. **Use console.log()**: Add logging to track execution
2. **Check execution logs**: View in Apps Script editor
3. **Test functions individually**: Run functions manually
4. **Validate HTML**: Check for syntax errors

## 📊 Monitoring & Maintenance

### Regular Tasks
- **Check execution logs** for errors
- **Monitor quota usage** 
- **Update permissions** as needed
- **Backup project** regularly

### Performance Optimization
- **Minimize API calls** in loops
- **Use batch operations** when possible
- **Cache frequently used data**
- **Optimize HTML/CSS/JS** file sizes

## 🔄 Updates & Versioning

### Updating the Application
1. **Create new deployment** for major updates
2. **Update existing deployment** for minor fixes
3. **Test thoroughly** before deploying
4. **Keep backup** of working version

### Version Control
- **Document changes** in deployment description
- **Tag versions** with meaningful names
- **Maintain changelog** for major updates

---

## 🎯 Quick Deployment Checklist

- [ ] Create new Google Apps Script project
- [ ] Copy `code.gs` content
- [ ] Add all HTML files (wrapped CSS/JS)
- [ ] Update file references in main HTML
- [ ] Enable required APIs (Gmail, Sheets)
- [ ] Configure authorization settings
- [ ] Deploy as web app
- [ ] Test all functionality
- [ ] Set up monitoring and backups

**Your Google Apps Script deployment is complete! 🚀**

**Web App URL**: Use the deployment URL to access your application anywhere.