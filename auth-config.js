/**
 * AuraReach Authentication System with Google OAuth
 * Connects to Google Apps Script backend for user management
 */

// Configuration - Update these values with your actual credentials
const AUTH_CONFIG = {
  // Google OAuth Configuration
  GOOGLE_CLIENT_ID: '262787244087-9gsvmohlae91ts15d3h065ebba84ltcq.apps.googleusercontent.com',
  
  // Google Apps Script Web App URL (Deploy your code.gs as web app)
  APPS_SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbwQxQxQxQxQxQxQxQxQxQxQxQxQxQxQxQxQxQxQxQxQxQxQxQxQxQ/exec',
  
  // Excel Database Configuration (Auto-populated by setupDatabase() in code.gs)
  EXCEL_SHEET_ID: '1VL88ifedvnqAyRowYP9VLVfllxfYTdEl8vlNYpYg1io',
  
  // Authentication Settings
  REQUIRE_AUTH: true,
  ALLOW_REGISTRATION: true,
  
  // Rate Limiting
  RATE_LIMITS: {
    loginAttempts: 5,
    lockoutDuration: 15 * 60 * 1000, // 15 minutes
    apiCallsPerMinute: 60
  }
};

class AuthManager {
  constructor() {
    this.currentUser = null;
    this.isAuthenticated = false;
    this.authCallback = null;
    this.googleAuth = null;
    this.loginAttempts = 0;
    this.lastLoginAttempt = 0;
    
    console.log('🔐 AuraReach Authentication System Initialized');
    
    // Initialize Google Sign-In
    this.initializeGoogleAuth();
    
    // Check for existing authentication
    this.checkExistingAuth();
  }

  /**
   * Initialize Google Sign-In API
   */
  async initializeGoogleAuth() {
    try {
      // Load Google Sign-In API
      if (typeof gapi === 'undefined') {
        await this.loadGoogleAPI();
      }
      
      await gapi.load('auth2', async () => {
        this.googleAuth = await gapi.auth2.init({
          client_id: AUTH_CONFIG.GOOGLE_CLIENT_ID
        });
        console.log('✅ Google Auth initialized');
      });
    } catch (error) {
      console.error('❌ Failed to initialize Google Auth:', error);
    }
  }

  /**
   * Load Google API dynamically
   */
  loadGoogleAPI() {
    return new Promise((resolve, reject) => {
      if (document.getElementById('google-api-script')) {
        resolve();
        return;
      }
      
      const script = document.createElement('script');
      script.id = 'google-api-script';
      script.src = 'https://apis.google.com/js/api.js';
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  /**
   * Check for existing authentication
   */
  checkExistingAuth() {
    const savedUser = localStorage.getItem('aurareach_user');
    const savedToken = localStorage.getItem('aurareach_token');
    
    if (savedUser && savedToken) {
      try {
        this.currentUser = JSON.parse(savedUser);
        this.isAuthenticated = true;
        this.updateUI();
        console.log('✅ Existing authentication found');
        return true;
      } catch (error) {
        console.error('❌ Invalid saved user data');
        this.clearAuth();
      }
    }
    
    if (!AUTH_CONFIG.REQUIRE_AUTH) {
      // Fallback to demo mode if auth not required
      this.currentUser = {
        email: 'demo@aurareach.com',
        name: 'Demo User',
        role: 'user',
        picture: ''
      };
      this.isAuthenticated = true;
      this.updateUI();
      return true;
    }
    
    return false;
  }

  /**
   * Authenticate with email (Google OAuth)
   */
  async authenticateWithEmail(email) {
    try {
      if (this.isRateLimited()) {
        throw new Error('Too many login attempts. Please try again later.');
      }

      // Validate email format
      if (!this.isValidEmail(email)) {
        throw new Error('Please enter a valid email address');
      }

      // Authenticate with Google
      const googleUser = await this.signInWithGoogle();
      
      if (googleUser.getBasicProfile().getEmail() !== email) {
        throw new Error('Email mismatch. Please sign in with the correct Google account.');
      }

      // Authenticate with backend
      const result = await this.authenticateWithBackend(googleUser);
      
      if (result.success) {
        this.currentUser = result.user;
        this.isAuthenticated = true;
        this.saveAuthData(googleUser.getAuthResponse().access_token);
        this.updateUI();
        this.resetLoginAttempts();
        
        console.log('✅ Authentication successful');
        return { success: true, user: this.currentUser };
      } else {
        throw new Error(result.error || 'Authentication failed');
      }
      
    } catch (error) {
      this.recordLoginAttempt();
      console.error('❌ Authentication failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Quick authentication (Google Sign-In)
   */
  async quickAuth() {
    try {
      if (this.isRateLimited()) {
        throw new Error('Too many login attempts. Please try again later.');
      }

      const googleUser = await this.signInWithGoogle();
      const result = await this.authenticateWithBackend(googleUser);
      
      if (result.success) {
        this.currentUser = result.user;
        this.isAuthenticated = true;
        this.saveAuthData(googleUser.getAuthResponse().access_token);
        this.updateUI();
        this.resetLoginAttempts();
        
        console.log('✅ Quick authentication successful');
        return { success: true, user: this.currentUser };
      } else {
        throw new Error(result.error || 'Authentication failed');
      }
      
    } catch (error) {
      this.recordLoginAttempt();
      console.error('❌ Quick authentication failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Sign out user
   */
  async signOut() {
    try {
      if (this.googleAuth) {
        await this.googleAuth.signOut();
      }
      
      this.clearAuth();
      console.log('✅ Signed out successfully');
      
      // Redirect to login or refresh page
      if (AUTH_CONFIG.REQUIRE_AUTH) {
        window.location.reload();
      }
    } catch (error) {
      console.error('❌ Sign out failed:', error);
    }
  }

  /**
   * Validate email format
   */
  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Sign in with Google
   */
  async signInWithGoogle() {
    if (!this.googleAuth) {
      throw new Error('Google Auth not initialized');
    }
    
    return await this.googleAuth.signIn({
      scope: 'email profile'
    });
  }

  /**
   * Authenticate with backend (Google Apps Script)
   */
  async authenticateWithBackend(googleUser) {
    try {
      const profile = googleUser.getBasicProfile();
      const authResponse = googleUser.getAuthResponse();
      
      const response = await fetch(AUTH_CONFIG.APPS_SCRIPT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'authenticate',
          email: profile.getEmail(),
          name: profile.getName(),
          picture: profile.getImageUrl(),
          accessToken: authResponse.access_token
        })
      });
      
      const result = await response.json();
      return result;
      
    } catch (error) {
      console.error('❌ Backend authentication failed:', error);
      return { success: false, error: 'Backend authentication failed' };
    }
  }

  /**
   * Test database connection
   */
  async testDatabaseConnection() {
    try {
      const response = await fetch(AUTH_CONFIG.APPS_SCRIPT_URL + '?test=database');
      const result = await response.json();
      return result;
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Save authentication data
   */
  saveAuthData(accessToken) {
    localStorage.setItem('aurareach_user', JSON.stringify(this.currentUser));
    localStorage.setItem('aurareach_token', accessToken);
    localStorage.setItem('aurareach_auth_time', Date.now().toString());
  }

  /**
   * Clear authentication data
   */
  clearAuth() {
    this.currentUser = null;
    this.isAuthenticated = false;
    localStorage.removeItem('aurareach_user');
    localStorage.removeItem('aurareach_token');
    localStorage.removeItem('aurareach_auth_time');
    this.updateUI();
  }

  /**
   * Check if rate limited
   */
  isRateLimited() {
    const now = Date.now();
    const timeSinceLastAttempt = now - this.lastLoginAttempt;
    
    if (this.loginAttempts >= AUTH_CONFIG.RATE_LIMITS.loginAttempts) {
      if (timeSinceLastAttempt < AUTH_CONFIG.RATE_LIMITS.lockoutDuration) {
        return true;
      } else {
        // Reset attempts after lockout period
        this.resetLoginAttempts();
      }
    }
    
    return false;
  }

  /**
   * Record login attempt
   */
  recordLoginAttempt() {
    this.loginAttempts++;
    this.lastLoginAttempt = Date.now();
  }

  /**
   * Reset login attempts
   */
  resetLoginAttempts() {
    this.loginAttempts = 0;
    this.lastLoginAttempt = 0;
  }

  /**
   * Update UI with user information
   */
  updateUI() {
    // Update user info in the dashboard
    const userAvatar = document.querySelector('.user-avatar img');
    const userName = document.querySelector('.user-name');
    const userEmail = document.querySelector('.user-email');
    
    if (this.currentUser) {
      if (userAvatar) userAvatar.src = this.currentUser.picture || '';
      if (userName) userName.textContent = this.currentUser.name || 'User';
      if (userEmail) userEmail.textContent = this.currentUser.email || '';
    } else {
      if (userAvatar) userAvatar.src = '';
      if (userName) userName.textContent = 'Not signed in';
      if (userEmail) userEmail.textContent = '';
    }

    // Show/hide authentication elements
    const authElements = document.querySelectorAll('.auth-required');
    const noAuthElements = document.querySelectorAll('.no-auth');
    
    authElements.forEach(el => {
      el.style.display = this.isAuthenticated ? 'block' : 'none';
    });
    
    noAuthElements.forEach(el => {
      el.style.display = this.isAuthenticated ? 'none' : 'block';
    });
  }

  /**
   * Show authentication modal
   */
  showAuthModal() {
    const modal = document.getElementById('authModal');
    if (modal) {
      modal.style.display = 'flex';
    }
  }

  /**
   * Hide authentication modal
   */
  hideAuthModal() {
    const modal = document.getElementById('authModal');
    if (modal) {
      modal.style.display = 'none';
    }
  }

  /**
   * Handle email authentication
   */
  async handleEmailAuth() {
    const emailInput = document.getElementById('authEmail');
    if (!emailInput) return { success: false, error: 'Email input not found' };
    
    const email = emailInput.value.trim();
    return await this.authenticateWithEmail(email);
  }

  /**
   * Show user menu
   */
  showUserMenu() {
    const menu = document.getElementById('userMenu');
    if (menu) {
      menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
    }
  }

  /**
   * Get current user
   */
  getCurrentUser() {
    return this.currentUser;
  }

  /**
   * Check if user is authenticated
   */
  isUserAuthenticated() {
    return this.isAuthenticated;
  }

  /**
   * Add authentication listener
   */
  addAuthListener(callback) {
    this.authCallback = callback;
    
    // Immediately trigger if already authenticated
    if (this.isAuthenticated && callback) {
      callback('authenticated', this.currentUser);
    }
  }

  /**
   * Trigger authentication listeners
   */
  triggerAuthListeners(event, data) {
    if (this.authCallback) {
      this.authCallback(event, data);
    }
  }

  /**
   * Try automatic authentication
   */
  async tryAutoAuthentication() {
    if (this.checkExistingAuth()) {
      console.log('✅ Auto authentication successful');
      return { success: true, user: this.currentUser };
    }
    
    console.log('❌ Auto authentication failed - manual login required');
    return { success: false, error: 'Manual authentication required' };
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  console.log('🚀 AuraReach Authentication System Ready');
});

// Create global auth manager instance
const authManager = new AuthManager();

// Make it globally available
window.authManager = authManager;