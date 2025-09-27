/**
 * AuraReach Authentication System - Google Apps Script Backend
 * Clean, focused authentication and user management system
 * 
 * SETUP INSTRUCTIONS:
 * 1. Run 'setupDatabase()' function once to create the Excel database
 * 2. Copy the generated Spreadsheet ID to your frontend auth-config.js
 * 3. Configure OAuth settings in Google Cloud Console
 * 4. Deploy as web app with execute permissions for "Anyone"
 */

// Configuration - Auto-populated when you run setupDatabase()
const CONFIG = {
  // Database Configuration
  SPREADSHEET_ID: '1VL88ifedvnqAyRowYP9VLVfllxfYTdEl8vlNYpYg1io', // Set by setupDatabase()
  SPREADSHEET_URL: 'https://docs.google.com/spreadsheets/d/1VL88ifedvnqAyRowYP9VLVfllxfYTdEl8vlNYpYg1io/edit', // Set by setupDatabase()
  
  // OAuth Configuration (Set these manually)
  OAUTH_CLIENT_ID: '262787244087-9gsvmohlae91ts15d3h065ebba84ltcq.apps.googleusercontent.com',
  OAUTH_CLIENT_SECRET: 'YOUR_GOOGLE_OAUTH_CLIENT_SECRET',
  
  // Default Admin User
  DEFAULT_ADMIN: {
    email: 'rareauramedia@gmail.com', // Change this to your email
    name: 'System Administrator',
    role: 'admin'
  },
  
  // User Roles and Permissions
  USER_ROLES: {
    admin: { 
      permissions: ['manage_accounts', 'manage_users', 'view_analytics', 'system_settings'],
      defaultLimit: 5000,
      canExceedLimits: true
    },
    manager: { 
      permissions: ['manage_users', 'view_analytics'],
      defaultLimit: 2000,
      canExceedLimits: false
    },
    user: { 
      permissions: ['send_emails', 'view_basic_analytics'],
      defaultLimit: 500,
      canExceedLimits: false
    },
    viewer: { 
      permissions: ['view_basic_analytics'],
      defaultLimit: 0,
      canExceedLimits: false
    }
  }
};

/**
 * MAIN SETUP FUNCTION - Run this once to create your database
 */
function setupDatabase() {
  try {
    console.log('🚀 Setting up AuraReach Authentication Database...');
    
    // Create new spreadsheet
    const spreadsheet = SpreadsheetApp.create('AuraReach Email Management Database');
    const spreadsheetId = spreadsheet.getId();
    const spreadsheetUrl = spreadsheet.getUrl();
    
    // Update CONFIG (you'll need to manually update this in your script)
    console.log('📊 Database created successfully!');
    console.log('📋 Spreadsheet ID: ' + spreadsheetId);
    console.log('🔗 Spreadsheet URL: ' + spreadsheetUrl);
    
    // Create sheets
    createUsersSheet(spreadsheet);
    createUserLimitsSheet(spreadsheet);
    createSessionsSheet(spreadsheet);
    createSettingsSheet(spreadsheet);
    
    // Create default admin
    createDefaultAdmin(spreadsheet);
    
    // Setup initial settings
    setupInitialSettings(spreadsheet);
    
    console.log('✅ Database setup completed!');
    console.log('');
    console.log('📝 NEXT STEPS:');
    console.log('1. Copy this Spreadsheet ID to your auth-config.js: ' + spreadsheetId);
    console.log('2. Update CONFIG.SPREADSHEET_ID in this script with: ' + spreadsheetId);
    console.log('3. Configure Google OAuth in Google Cloud Console');
    console.log('4. Deploy this script as a web app');
    console.log('5. Share the spreadsheet with your Apps Script service account');
    
    return {
      success: true,
      spreadsheetId: spreadsheetId,
      spreadsheetUrl: spreadsheetUrl,
      message: 'Database created successfully'
    };
    
  } catch (error) {
    console.error('❌ Database setup failed:', error);
    return {
      success: false,
      error: error.toString()
    };
  }
}

/**
 * Create Users sheet with proper structure
 */
function createUsersSheet(spreadsheet) {
  const sheet = spreadsheet.insertSheet('Users');
  
  // Headers
  const headers = ['Email', 'Name', 'Role', 'Status', 'Created', 'Last Login', 'Picture URL'];
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  
  // Format headers
  const headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setBackground('#1a73e8');
  headerRange.setFontColor('white');
  headerRange.setFontWeight('bold');
  
  // Set column widths
  sheet.setColumnWidth(1, 200); // Email
  sheet.setColumnWidth(2, 150); // Name
  sheet.setColumnWidth(3, 100); // Role
  sheet.setColumnWidth(4, 100); // Status
  sheet.setColumnWidth(5, 120); // Created
  sheet.setColumnWidth(6, 120); // Last Login
  sheet.setColumnWidth(7, 200); // Picture URL
  
  console.log('✅ Users sheet created');
}

/**
 * Create User Limits sheet
 */
function createUserLimitsSheet(spreadsheet) {
  const sheet = spreadsheet.insertSheet('User_Limits');
  
  // Headers
  const headers = ['Email', 'Daily Limit', 'Hourly Limit', 'Used Today', 'Used This Hour', 'Last Reset'];
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  
  // Format headers
  const headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setBackground('#1a73e8');
  headerRange.setFontColor('white');
  headerRange.setFontWeight('bold');
  
  // Set column widths
  sheet.setColumnWidth(1, 200); // Email
  sheet.setColumnWidth(2, 100); // Daily Limit
  sheet.setColumnWidth(3, 100); // Hourly Limit
  sheet.setColumnWidth(4, 100); // Used Today
  sheet.setColumnWidth(5, 100); // Used This Hour
  sheet.setColumnWidth(6, 120); // Last Reset
  
  console.log('✅ User Limits sheet created');
}

/**
 * Create Sessions sheet for tracking user sessions
 */
function createSessionsSheet(spreadsheet) {
  const sheet = spreadsheet.insertSheet('Sessions');
  
  // Headers
  const headers = ['Session ID', 'Email', 'Created', 'Last Activity', 'IP Address', 'User Agent', 'Status'];
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  
  // Format headers
  const headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setBackground('#1a73e8');
  headerRange.setFontColor('white');
  headerRange.setFontWeight('bold');
  
  console.log('✅ Sessions sheet created');
}

/**
 * Create Settings sheet
 */
function createSettingsSheet(spreadsheet) {
  const sheet = spreadsheet.insertSheet('Settings');
  
  // Headers
  const headers = ['Setting', 'Value', 'Description', 'Last Updated'];
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  
  // Format headers
  const headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setBackground('#1a73e8');
  headerRange.setFontColor('white');
  headerRange.setFontWeight('bold');
  
  // Add default settings
  const defaultSettings = [
    ['system_name', 'AuraReach', 'System name', new Date()],
    ['max_session_duration', '480', 'Max session duration in minutes', new Date()],
    ['auto_logout_enabled', 'true', 'Enable automatic logout', new Date()],
    ['registration_enabled', 'false', 'Allow new user registration', new Date()],
    ['default_user_role', 'user', 'Default role for new users', new Date()]
  ];
  
  sheet.getRange(2, 1, defaultSettings.length, 4).setValues(defaultSettings);
  
  console.log('✅ Settings sheet created');
}

/**
 * Create default admin user
 */
function createDefaultAdmin(spreadsheet) {
  const usersSheet = spreadsheet.getSheetByName('Users');
  const limitsSheet = spreadsheet.getSheetByName('User_Limits');
  
  const now = new Date();
  
  // Add admin user
  const adminData = [
    CONFIG.DEFAULT_ADMIN.email,
    CONFIG.DEFAULT_ADMIN.name,
    'admin',
    'active',
    now,
    '',
    ''
  ];
  
  usersSheet.getRange(2, 1, 1, adminData.length).setValues([adminData]);
  
  // Add admin limits
  const adminLimits = [
    CONFIG.DEFAULT_ADMIN.email,
    5000, // Daily limit
    500,  // Hourly limit
    0,    // Used today
    0,    // Used this hour
    now   // Last reset
  ];
  
  limitsSheet.getRange(2, 1, 1, adminLimits.length).setValues([adminLimits]);
  
  console.log('✅ Default admin user created: ' + CONFIG.DEFAULT_ADMIN.email);
}

/**
 * Setup initial data validation and formatting
 */
function setupInitialSettings(spreadsheet) {
  const usersSheet = spreadsheet.getSheetByName('Users');
  
  // Role validation
  const roleRange = usersSheet.getRange('C:C');
  const roleValidation = SpreadsheetApp.newDataValidation()
    .requireValueInList(['admin', 'manager', 'user', 'viewer'])
    .build();
  roleRange.setDataValidation(roleValidation);
  
  // Status validation
  const statusRange = usersSheet.getRange('D:D');
  const statusValidation = SpreadsheetApp.newDataValidation()
    .requireValueInList(['active', 'inactive', 'suspended'])
    .build();
  statusRange.setDataValidation(statusValidation);
  
  console.log('✅ Initial settings configured');
}

/**
 * WEB APP HANDLERS
 */

/**
 * Handle GET requests
 */
function doGet(e) {
  return HtmlService.createHtmlOutput('AuraReach Authentication API is running');
}

/**
 * Handle POST requests for authentication
 */
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const action = data.action;
    
    switch (action) {
      case 'authenticate':
        return ContentService.createTextOutput(JSON.stringify(authenticateUser(data.email, data.accessToken)));
      
      case 'getUserLimits':
        return ContentService.createTextOutput(JSON.stringify(getUserLimits(data.email)));
      
      case 'updateUserLimits':
        return ContentService.createTextOutput(JSON.stringify(updateUserLimits(data.email, data.limits)));
      
      case 'checkPermission':
        return ContentService.createTextOutput(JSON.stringify(checkUserPermission(data.email, data.permission)));
      
      case 'getUsers':
        return ContentService.createTextOutput(JSON.stringify(getAllUsers()));
      
      case 'testConnection':
        return ContentService.createTextOutput(JSON.stringify(testConnection()));
      
      case 'setupDatabase':
        return ContentService.createTextOutput(JSON.stringify(setupDatabase()));
      
      default:
        return ContentService.createTextOutput(JSON.stringify({
          success: false,
          error: 'Unknown action: ' + action
        }));
    }
    
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.toString()
    }));
  }
}

/**
 * AUTHENTICATION FUNCTIONS
 */

/**
 * Authenticate user with Google OAuth
 */
function authenticateUser(email, accessToken = null) {
  try {
    if (!CONFIG.SPREADSHEET_ID) {
      throw new Error('Database not configured. Run setupDatabase() first.');
    }
    
    const spreadsheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    const usersSheet = spreadsheet.getSheetByName('Users');
    
    // Find user
    const userData = getUserFromDatabase(email);
    
    if (!userData) {
      // Create new user if registration is enabled
      const settingsSheet = spreadsheet.getSheetByName('Settings');
      const settings = getSettings(settingsSheet);
      
      if (settings.registration_enabled === 'true') {
        return createNewUser(email);
      } else {
        return {
          success: false,
          error: 'User not found and registration is disabled'
        };
      }
    }
    
    // Check if user is active
    if (userData.status !== 'active') {
      return {
        success: false,
        error: 'User account is ' + userData.status
      };
    }
    
    // Update last login
    updateUserLastLogin(email);
    
    // Get user limits
    const limits = getUserLimits(email);
    
    return {
      success: true,
      user: {
        email: userData.email,
        name: userData.name,
        role: userData.role,
        picture: userData.picture || '',
        limits: limits.limits || {}
      }
    };
    
  } catch (error) {
    return {
      success: false,
      error: error.toString()
    };
  }
}

/**
 * Get user from database
 */
function getUserFromDatabase(email) {
  try {
    const spreadsheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    const usersSheet = spreadsheet.getSheetByName('Users');
    const data = usersSheet.getDataRange().getValues();
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === email) {
        return {
          email: data[i][0],
          name: data[i][1],
          role: data[i][2],
          status: data[i][3],
          created: data[i][4],
          lastLogin: data[i][5],
          picture: data[i][6]
        };
      }
    }
    
    return null;
  } catch (error) {
    throw new Error('Failed to get user from database: ' + error.toString());
  }
}

/**
 * Create new user
 */
function createNewUser(email) {
  try {
    const spreadsheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    const usersSheet = spreadsheet.getSheetByName('Users');
    const limitsSheet = spreadsheet.getSheetByName('User_Limits');
    
    const now = new Date();
    const defaultRole = 'user';
    
    // Add to users sheet
    const userData = [email, email.split('@')[0], defaultRole, 'active', now, '', ''];
    usersSheet.appendRow(userData);
    
    // Add to limits sheet
    const userLimits = [email, 500, 50, 0, 0, now];
    limitsSheet.appendRow(userLimits);
    
    return {
      success: true,
      user: {
        email: email,
        name: email.split('@')[0],
        role: defaultRole,
        picture: '',
        limits: {
          daily: 500,
          hourly: 50,
          usedToday: 0,
          usedThisHour: 0
        }
      }
    };
    
  } catch (error) {
    return {
      success: false,
      error: 'Failed to create user: ' + error.toString()
    };
  }
}

/**
 * Update user last login
 */
function updateUserLastLogin(email) {
  try {
    const spreadsheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    const usersSheet = spreadsheet.getSheetByName('Users');
    const data = usersSheet.getDataRange().getValues();
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === email) {
        usersSheet.getRange(i + 1, 6).setValue(new Date());
        break;
      }
    }
  } catch (error) {
    console.error('Failed to update last login:', error);
  }
}

/**
 * Get user limits
 */
function getUserLimits(email) {
  try {
    const spreadsheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    const limitsSheet = spreadsheet.getSheetByName('User_Limits');
    const data = limitsSheet.getDataRange().getValues();
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === email) {
        return {
          success: true,
          limits: {
            daily: data[i][1],
            hourly: data[i][2],
            usedToday: data[i][3],
            usedThisHour: data[i][4],
            lastReset: data[i][5]
          }
        };
      }
    }
    
    return {
      success: false,
      error: 'User limits not found'
    };
    
  } catch (error) {
    return {
      success: false,
      error: error.toString()
    };
  }
}

/**
 * Update user limits
 */
function updateUserLimits(email, limits) {
  try {
    const spreadsheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    const limitsSheet = spreadsheet.getSheetByName('User_Limits');
    const data = limitsSheet.getDataRange().getValues();
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === email) {
        if (limits.daily !== undefined) limitsSheet.getRange(i + 1, 2).setValue(limits.daily);
        if (limits.hourly !== undefined) limitsSheet.getRange(i + 1, 3).setValue(limits.hourly);
        if (limits.usedToday !== undefined) limitsSheet.getRange(i + 1, 4).setValue(limits.usedToday);
        if (limits.usedThisHour !== undefined) limitsSheet.getRange(i + 1, 5).setValue(limits.usedThisHour);
        limitsSheet.getRange(i + 1, 6).setValue(new Date());
        
        return { success: true };
      }
    }
    
    return {
      success: false,
      error: 'User not found'
    };
    
  } catch (error) {
    return {
      success: false,
      error: error.toString()
    };
  }
}

/**
 * Check user permission
 */
function checkUserPermission(email, permission) {
  try {
    const userData = getUserFromDatabase(email);
    if (!userData) {
      return { success: false, hasPermission: false };
    }
    
    const rolePermissions = CONFIG.USER_ROLES[userData.role]?.permissions || [];
    const hasPermission = rolePermissions.includes(permission);
    
    return {
      success: true,
      hasPermission: hasPermission
    };
    
  } catch (error) {
    return {
      success: false,
      error: error.toString()
    };
  }
}

/**
 * Get all users (admin only)
 */
function getAllUsers() {
  try {
    const spreadsheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    const usersSheet = spreadsheet.getSheetByName('Users');
    const data = usersSheet.getDataRange().getValues();
    
    const users = [];
    for (let i = 1; i < data.length; i++) {
      users.push({
        email: data[i][0],
        name: data[i][1],
        role: data[i][2],
        status: data[i][3],
        created: data[i][4],
        lastLogin: data[i][5]
      });
    }
    
    return {
      success: true,
      users: users
    };
    
  } catch (error) {
    return {
      success: false,
      error: error.toString()
    };
  }
}

/**
 * Get settings from settings sheet
 */
function getSettings(settingsSheet) {
  const data = settingsSheet.getDataRange().getValues();
  const settings = {};
  
  for (let i = 1; i < data.length; i++) {
    settings[data[i][0]] = data[i][1];
  }
  
  return settings;
}

/**
 * Test database connection
 */
function testConnection() {
  try {
    if (!CONFIG.SPREADSHEET_ID) {
      return {
        success: false,
        error: 'SPREADSHEET_ID not configured'
      };
    }
    
    const spreadsheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    const sheets = spreadsheet.getSheets().map(sheet => sheet.getName());
    
    return {
      success: true,
      message: 'Database connection successful',
      sheets: sheets
    };
    
  } catch (error) {
    return {
      success: false,
      error: error.toString()
    };
  }
}

/**
 * Test function for deployment
 */
function test() {
  return 'AuraReach Authentication API is working!';
}