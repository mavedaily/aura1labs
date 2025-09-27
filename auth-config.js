/**
 * AuraReach Authentication Configuration
 * This file manages Google OAuth settings and Excel database configuration
 * 
 * SETUP INSTRUCTIONS:
 * 1. Run the setupDatabase() function in Google Apps Script
 * 2. Copy the generated Spreadsheet ID to EXCEL_SHEET_ID below
 * 3. Set up Google OAuth in Google Cloud Console
 * 4. Update GOOGLE_CLIENT_ID with your OAuth client ID
 */

// Authentication Configuration
const AUTH_CONFIG = {
  // Excel Database Configuration
  EXCEL_SHEET_ID: '1VL88ifedvnqAyRowYP9VLVfllxfYTdEl8vlNYpYg1io', // PASTE YOUR SPREADSHEET ID HERE after running setupDatabase()
  EXCEL_SHEET_URL: 'https://docs.google.com/spreadsheets/d/1VL88ifedvnqAyRowYP9VLVfllxfYTdEl8vlNYpYg1io/edit', // Optional: Direct link to your spreadsheet
  
  // Google OAuth Configuration
  GOOGLE_CLIENT_ID: '262787244087-9gsvmohlae91ts15d3h065ebba84ltcq.apps.googleusercontent.com', // Replace with your OAuth Client ID
  GOOGLE_SCOPES: [
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/userinfo.profile',
    'https://www.googleapis.com/auth/gmail.send',
    'https://www.googleapis.com/auth/gmail.readonly'
  ],
  
  // Apps Script Configuration
  APPS_SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbzvrG5ZleQryrtGHjbyrs5BrVc2UeGeI5xzJ1aroHhoEtWamTZLeFyas7ZoEyU1YXxF/exec', // Replace with your deployed Apps Script URL
  
  // Authentication Settings
  AUTH_SETTINGS: {
    autoLogin: true, // Enable automatic login on page load
    rememberUser: true, // Remember user login state
    sessionTimeout: 24 * 60 * 60 * 1000, // 24 hours in milliseconds
    redirectAfterLogin: '/dashboard', // Where to redirect after successful login
    loginRequired: true // Require login to access the application
  },
  
  // User Role Configuration
  DEFAULT_USER_ROLE: 'user',
  ADMIN_PERMISSIONS: [
    'manage_accounts',
    'manage_users', 
    'view_analytics',
    'system_settings',
    'bulk_operations'
  ],
  
  // Rate Limiting Configuration
  RATE_LIMITS: {
    loginAttempts: 5, // Max login attempts before lockout
    lockoutDuration: 15 * 60 * 1000, // 15 minutes lockout
    apiCallsPerMinute: 60 // Max API calls per minute per user
  }
};

/**
 * Authentication Manager Class
 * Handles Google OAuth authentication and user session management
 */
class AuthManager {
  constructor() {
    this.currentUser = null;
    this.accessToken = null;
    this.isAuthenticated = false;
    this.authListeners = [];
    
    // Initialize Google API
    this.initializeGoogleAPI();
  }
  
  /**
   * Initialize Google API and OAuth
   */
  async initializeGoogleAPI() {
    try {
      // Load Google API
      await this.loadGoogleAPI();
      
      // Initialize OAuth with better error handling
      await new Promise((resolve, reject) => {
        gapi.load('auth2', {
          callback: () => {
            try {
              gapi.auth2.init({
                client_id: AUTH_CONFIG.GOOGLE_CLIENT_ID,
                scope: AUTH_CONFIG.GOOGLE_SCOPES.join(' '),
                ux_mode: 'popup',
                redirect_uri: window.location.origin
              }).then(() => {
                console.log('✅ Google OAuth initialized successfully');
                
                // Check if user is already signed in
                if (AUTH_CONFIG.AUTH_SETTINGS.autoLogin) {
                  setTimeout(() => this.checkExistingAuth(), 1500);
                }
                resolve();
              }).catch(error => {
                if (error.error === 'idpiframe_initialization_failed') {
                  console.warn('⚠️ Google OAuth iframe initialization failed - this is expected on some deployments');
                  console.log('📝 Authentication will still work via popup method');
                } else {
                  console.warn('⚠️ OAuth init warning:', error);
                }
                // Continue anyway as these errors are often non-critical
                resolve();
              });
            } catch (error) {
              console.warn('⚠️ OAuth setup warning:', error);
              resolve(); // Continue anyway
            }
          },
          onerror: (error) => {
            console.warn('⚠️ GAPI load warning:', error);
            resolve(); // Continue anyway
          }
        });
      });
      
    } catch (error) {
      console.warn('⚠️ Google API initialization warning:', error);
      // Don't throw - let the app continue to work
    }
  }
  
  /**
   * Load Google API script
   */
  loadGoogleAPI() {
    return new Promise((resolve, reject) => {
      if (window.gapi) {
        resolve();
        return;
      }
      
      const script = document.createElement('script');
      script.src = 'https://apis.google.com/js/api.js';
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load Google API'));
      document.head.appendChild(script);
    });
  }
  
  /**
   * Check for existing authentication
   */
  async checkExistingAuth() {
    try {
      // Add safety checks to prevent postMessage errors
      if (!window.gapi || !gapi.auth2) {
        console.log('Google API not ready yet, skipping auth check');
        return;
      }
      
      const authInstance = gapi.auth2.getAuthInstance();
      if (!authInstance) {
        console.log('Auth instance not available yet');
        return;
      }
      
      // Check if user is signed in with additional safety
      if (authInstance.isSignedIn && authInstance.isSignedIn.get()) {
        const currentUser = authInstance.currentUser;
        if (currentUser && currentUser.get()) {
          const user = currentUser.get();
          await this.handleAuthSuccess(user);
        }
      }
    } catch (error) {
      console.warn('⚠️ Auth check warning (non-critical):', error.message);
      // Don't throw - this is often just timing issues
    }
  }
  
  /**
   * Sign in with Google
   */
  async signIn() {
    try {
      const authInstance = gapi.auth2.getAuthInstance();
      const user = await authInstance.signIn();
      await this.handleAuthSuccess(user);
      return { success: true, user: this.currentUser };
    } catch (error) {
      console.error('Sign in failed:', error);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Sign out user
   */
  async signOut() {
    try {
      const authInstance = gapi.auth2.getAuthInstance();
      await authInstance.signOut();
      
      this.currentUser = null;
      this.accessToken = null;
      this.isAuthenticated = false;
      
      // Clear stored session
      localStorage.removeItem('aurareach_user');
      localStorage.removeItem('aurareach_token');
      
      // Notify listeners
      this.notifyAuthListeners('signout');
      
      return { success: true };
    } catch (error) {
      console.error('Sign out failed:', error);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Handle successful authentication
   */
  async handleAuthSuccess(googleUser) {
    try {
      const profile = googleUser.getBasicProfile();
      const authResponse = googleUser.getAuthResponse();
      
      this.accessToken = authResponse.access_token;
      
      // Authenticate with backend
      const backendAuth = await this.authenticateWithBackend(this.accessToken);
      
      if (backendAuth.success) {
        this.currentUser = {
          id: profile.getId(),
          email: profile.getEmail(),
          name: profile.getName(),
          picture: profile.getImageUrl(),
          ...backendAuth.user
        };
        
        this.isAuthenticated = true;
        
        // Store session if remember user is enabled
        if (AUTH_CONFIG.AUTH_SETTINGS.rememberUser) {
          localStorage.setItem('aurareach_user', JSON.stringify(this.currentUser));
          localStorage.setItem('aurareach_token', this.accessToken);
        }
        
        // Notify listeners
        this.notifyAuthListeners('signin', this.currentUser);
        
        console.log('✅ User authenticated successfully:', this.currentUser.email);
      } else {
        throw new Error(backendAuth.error || 'Backend authentication failed');
      }
      
    } catch (error) {
      console.error('Authentication handling failed:', error);
      throw error;
    }
  }
  
  /**
   * Authenticate with backend (Google Apps Script)
   */
  async authenticateWithBackend(accessToken) {
    try {
      const response = await fetch(AUTH_CONFIG.APPS_SCRIPT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'authenticateUserOAuth',
          accessToken: accessToken
        })
      });
      
      const result = await response.json();
      return result;
      
    } catch (error) {
      console.error('Backend authentication failed:', error);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Get current user limits from backend
   */
  async getUserLimits() {
    if (!this.isAuthenticated) {
      return { success: false, error: 'User not authenticated' };
    }
    
    try {
      const response = await fetch(AUTH_CONFIG.APPS_SCRIPT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'getUserLimits',
          email: this.currentUser.email
        })
      });
      
      const result = await response.json();
      return result;
      
    } catch (error) {
      console.error('Failed to get user limits:', error);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Update user limits in backend
   */
  async updateUserLimits(limits) {
    if (!this.isAuthenticated) {
      return { success: false, error: 'User not authenticated' };
    }
    
    try {
      const response = await fetch(AUTH_CONFIG.APPS_SCRIPT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'updateUserLimits',
          email: this.currentUser.email,
          limits: limits
        })
      });
      
      const result = await response.json();
      return result;
      
    } catch (error) {
      console.error('Failed to update user limits:', error);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Add authentication event listener
   */
  addAuthListener(callback) {
    this.authListeners.push(callback);
  }
  
  /**
   * Remove authentication event listener
   */
  removeAuthListener(callback) {
    const index = this.authListeners.indexOf(callback);
    if (index > -1) {
      this.authListeners.splice(index, 1);
    }
  }
  
  /**
   * Notify all authentication listeners
   */
  notifyAuthListeners(event, data = null) {
    this.authListeners.forEach(callback => {
      try {
        callback(event, data);
      } catch (error) {
        console.error('Auth listener error:', error);
      }
    });
  }
  
  /**
   * Check if user has specific permission
   */
  hasPermission(permission) {
    if (!this.isAuthenticated || !this.currentUser) {
      return false;
    }
    
    return this.currentUser.permissions?.includes(permission) || 
           this.currentUser.role === 'admin';
  }
  
  /**
   * Get user's current usage and limits
   */
  async refreshUserData() {
    if (!this.isAuthenticated) {
      return { success: false, error: 'User not authenticated' };
    }
    
    try {
      const limitsResult = await this.getUserLimits();
      if (limitsResult.success) {
        this.currentUser.limits = limitsResult.limits;
        this.currentUser.usage = limitsResult.usage;
        this.currentUser.remaining = limitsResult.remaining;
        
        // Update stored user data
        if (AUTH_CONFIG.AUTH_SETTINGS.rememberUser) {
          localStorage.setItem('aurareach_user', JSON.stringify(this.currentUser));
        }
        
        // Notify listeners of data update
        this.notifyAuthListeners('dataRefresh', this.currentUser);
      }
      
      return limitsResult;
      
    } catch (error) {
      console.error('Failed to refresh user data:', error);
      return { success: false, error: error.message };
    }
  }
}

// Create global auth manager instance
const authManager = new AuthManager();

// Export for use in other files
window.authManager = authManager;
window.AUTH_CONFIG = AUTH_CONFIG;

console.log('🔐 AuraReach Authentication System Loaded');