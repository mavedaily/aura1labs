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
   * Initialize Google API with retry mechanism and complete error isolation
   */
  async initializeGoogleAPI() {
    return await this.executeWithErrorIsolation(async () => {
      try {
        // Load Google API
        await this.loadGoogleAPI();
        
        // Initialize OAuth with retry mechanism
        await this.initializeOAuthWithRetry();
        
      } catch (error) {
        console.warn('⚠️ Google API initialization warning:', error);
        // Continue anyway - authentication might still work
      }
    });
  }
  
  async initializeOAuthWithRetry(maxRetries = 3) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await new Promise((resolve, reject) => {
          gapi.load('auth2', {
            callback: () => {
              try {
                // Add delay before initialization to prevent race conditions
                setTimeout(() => {
                  gapi.auth2.init({
                    client_id: AUTH_CONFIG.GOOGLE_CLIENT_ID,
                    scope: AUTH_CONFIG.GOOGLE_SCOPES.join(' '),
                    ux_mode: 'popup',
                    redirect_uri: window.location.origin,
                    // Add additional configuration for better compatibility
                    hosted_domain: null,
                    fetch_basic_profile: true,
                    immediate: false
                  }).then(() => {
                    console.log('✅ Google OAuth initialized successfully');
                    
                    // Check if user is already signed in with longer delay
                    if (AUTH_CONFIG.AUTH_SETTINGS.autoLogin) {
                      setTimeout(() => this.checkExistingAuth(), 2000);
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
                }, 500); // 500ms delay before initialization
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
        
        // If we reach here, initialization was successful
        return;
        
      } catch (error) {
        console.warn(`⚠️ OAuth initialization attempt ${attempt} failed:`, error);
        
        if (attempt === maxRetries) {
          console.warn('⚠️ All OAuth initialization attempts failed, but continuing anyway');
          return; // Don't throw - let the app continue
        }
        
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
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
   * Sign in with Google - Final robust version
   */
  async signIn() {
    // Wrap everything in a global error handler
    return await this.executeWithErrorIsolation(async () => {
      try {
        // Enhanced safety checks
        if (!window.gapi) {
          throw new Error('Google API not loaded');
        }
        
        if (!gapi.auth2) {
          throw new Error('Google Auth2 not initialized');
        }
        
        const authInstance = gapi.auth2.getAuthInstance();
        if (!authInstance) {
          throw new Error('Auth instance not available');
        }
        
        // Check if already signed in with complete error isolation
        try {
          if (authInstance.isSignedIn && authInstance.isSignedIn.get()) {
            console.log('User already signed in, using existing session');
            const currentUser = authInstance.currentUser;
            if (currentUser && currentUser.get()) {
              const user = currentUser.get();
              await this.handleAuthSuccess(user);
              return { success: true, user: this.currentUser };
            }
          }
        } catch (checkError) {
          console.warn('Error checking existing auth, proceeding with fresh sign in:', checkError);
        }
        
        // Attempt sign in with complete error isolation
        console.log('Attempting Google sign in...');
        let user;
        
        // Try multiple sign-in approaches with complete error isolation
        const signInMethods = [
          () => authInstance.signIn({ prompt: 'select_account' }),
          () => authInstance.signIn({ ux_mode: 'popup', prompt: 'select_account' }),
          () => authInstance.signIn({ ux_mode: 'popup' }),
          () => authInstance.signIn()
        ];
        
        for (let i = 0; i < signInMethods.length; i++) {
          try {
            user = await this.executeWithErrorIsolation(signInMethods[i]);
            if (user) break;
          } catch (methodError) {
            console.warn(`Sign in method ${i + 1} failed:`, methodError);
            if (i === signInMethods.length - 1) {
              throw new Error('All sign in methods failed');
            }
          }
        }
        
        if (user) {
          await this.handleAuthSuccess(user);
          return { success: true, user: this.currentUser };
        } else {
          throw new Error('No user returned from sign in');
        }
        
      } catch (error) {
        console.error('Sign in failed:', error);
        
        // Show user-friendly error message
        const errorMessage = error.message || 'Authentication failed. Please try again.';
        
        // Try to show error in UI if available
        const errorElement = document.getElementById('auth-error');
        if (errorElement) {
          errorElement.textContent = errorMessage;
          errorElement.style.display = 'block';
        }
        
        return { success: false, error: errorMessage };
      }
    });
  }
  
  /**
   * Execute function with complete error isolation
   */
  async executeWithErrorIsolation(fn) {
    return new Promise(async (resolve, reject) => {
      // Set up temporary error handlers
      const originalOnError = window.onerror;
      const originalOnUnhandledRejection = window.onunhandledrejection;
      
      const errors = [];
      
      // Capture all errors during execution
      window.onerror = (message, source, lineno, colno, error) => {
        if (source && source.includes('gapi') || source && source.includes('google')) {
          errors.push({ type: 'script', message, source, error });
          return true; // Prevent default handling
        }
        return originalOnError ? originalOnError(message, source, lineno, colno, error) : false;
      };
      
      window.onunhandledrejection = (event) => {
        if (event.reason && (event.reason.toString().includes('gapi') || event.reason.toString().includes('google'))) {
          errors.push({ type: 'promise', reason: event.reason });
          event.preventDefault(); // Prevent default handling
          return;
        }
        return originalOnUnhandledRejection ? originalOnUnhandledRejection(event) : undefined;
      };
      
      try {
        const result = await fn();
        resolve(result);
      } catch (error) {
        reject(error);
      } finally {
        // Restore original error handlers
        window.onerror = originalOnError;
        window.onunhandledrejection = originalOnUnhandledRejection;
        
        // Log captured errors as warnings
        if (errors.length > 0) {
          console.warn('Captured and isolated Google API errors:', errors);
        }
      }
    });
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

// Global error handler for Google API internal errors
window.addEventListener('error', (event) => {
  if (event.filename && (event.filename.includes('gapi') || event.filename.includes('google'))) {
    console.warn('Suppressed Google API internal error:', event.error);
    event.preventDefault();
    return true;
  }
});

window.addEventListener('unhandledrejection', (event) => {
  if (event.reason && event.reason.toString && 
      (event.reason.toString().includes('gapi') || 
       event.reason.toString().includes('google') ||
       event.reason.toString().includes('postMessage') ||
       event.reason.toString().includes('iframe'))) {
    console.warn('Suppressed Google API internal promise rejection:', event.reason);
    event.preventDefault();
  }
});

// Create global auth manager instance
const authManager = new AuthManager();

// Export for use in other files
window.authManager = authManager;
window.AUTH_CONFIG = AUTH_CONFIG;

console.log('🔐 AuraReach Authentication System Loaded');