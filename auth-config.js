/**
 * Simplified Authentication System for AuraReach
 * Direct access without authentication
 */

class SimpleAuthManager {
  constructor() {
    this.currentUser = {
      email: 'user@aurareach.com',
      name: 'AuraReach User',
      role: 'admin',
      picture: ''
    };
    this.isAuthenticated = true;
    this.authCallback = null;
    
    console.log('🔐 AuraReach Authentication Bypassed - Direct Access Enabled');
    
    // Set user as authenticated immediately
    localStorage.setItem('aurareach_user', JSON.stringify(this.currentUser));
    this.updateUI();
  }

  /**
   * Always return authenticated
   */
  checkExistingAuth() {
    return true;
  }

  /**
   * Bypass authentication - always succeed
   */
  async authenticateWithEmail(email) {
    return { success: true, user: this.currentUser };
  }

  /**
   * Quick auth - always authenticated
   */
  async quickAuth() {
    return { success: true, user: this.currentUser };
  }

  /**
   * Sign out (optional - can be disabled)
   */
  signOut() {
    console.log('Sign out disabled in direct access mode');
  }

  /**
   * Always valid email
   */
  isValidEmail(email) {
    return true;
  }

  /**
   * Update UI with default user
   */
  updateUI() {
    // Update user info in the dashboard
    const userAvatar = document.querySelector('.user-avatar img');
    const userName = document.querySelector('.user-name');
    const userEmail = document.querySelector('.user-email');
    
    if (userAvatar) userAvatar.src = this.currentUser.picture || '';
    if (userName) userName.textContent = this.currentUser.name;
    if (userEmail) userEmail.textContent = this.currentUser.email;
  }

  /**
   * No auth modal needed
   */
  showAuthModal() {
    console.log('Authentication modal disabled - direct access enabled');
  }

  /**
   * No auth modal to hide
   */
  hideAuthModal() {
    // Nothing to hide
  }

  /**
   * No email auth needed
   */
  async handleEmailAuth() {
    return { success: true, user: this.currentUser };
  }

  /**
   * No user menu needed
   */
  showUserMenu() {
    console.log('User menu functionality can be added if needed');
  }

  /**
   * Always return current user
   */
  getCurrentUser() {
    return this.currentUser;
  }

  /**
   * Always authenticated
   */
  isUserAuthenticated() {
    return true;
  }

  /**
   * Add auth listener (for compatibility)
   */
  addAuthListener(callback) {
    this.authCallback = callback;
    // Immediately trigger with authenticated state
    if (callback) {
      callback('authenticated', this.currentUser);
    }
  }

  /**
   * Trigger auth listeners (for compatibility)
   */
  triggerAuthListeners(event, data) {
    if (this.authCallback) {
      this.authCallback(event, data);
    }
  }

  /**
   * No auto authentication needed - always authenticated
   */
  async tryAutoAuthentication() {
    console.log('🔐 Direct access enabled - skipping authentication');
    return { success: true, user: this.currentUser };
  }

  /**
   * Always valid email
   */
  isValidEmail(email) {
    return true;
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  console.log('🚀 AuraReach Direct Access Mode Initialized');
});

// Create global auth manager instance
const authManager = new SimpleAuthManager();