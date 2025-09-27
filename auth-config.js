/**
 * Simple Sheet-Based Authentication System for AuraReach
 * No Google OAuth - Direct sheet verification
 */

class SimpleAuthManager {
  constructor() {
    this.currentUser = null;
    this.isAuthenticated = false;
    this.userDatabase = [
      // Add authorized users here
      { email: 'mananvermabusiness@gmail.com', name: 'Manan Verma', role: 'admin' },
      { email: 'rareauramedia@gmail.com', name: 'Rare Aura Media', role: 'admin' },
      { email: 'admin@aurareachmedia.com', name: 'Admin User', role: 'admin' },
      { email: 'user@aurareachmedia.com', name: 'Regular User', role: 'user' },
      // Add more users as needed
    ];
    
    console.log('🔐 Simple Authentication System Loaded');
    this.checkExistingAuth();
  }

  /**
   * Check if user is already authenticated
   */
  checkExistingAuth() {
    const savedUser = localStorage.getItem('aurareach_user');
    if (savedUser) {
      try {
        this.currentUser = JSON.parse(savedUser);
        this.isAuthenticated = true;
        this.updateUI();
        console.log('✅ User already authenticated:', this.currentUser.email);
      } catch (error) {
        console.warn('Invalid saved user data, clearing...');
        localStorage.removeItem('aurareach_user');
      }
    }
  }

  /**
   * Simple email-based authentication
   */
  async authenticateWithEmail(email) {
    try {
      // Validate email format
      if (!this.isValidEmail(email)) {
        throw new Error('Please enter a valid email address');
      }

      // Check if user exists in our database
      const user = this.userDatabase.find(u => u.email.toLowerCase() === email.toLowerCase());
      
      if (!user) {
        throw new Error('Email not authorized. Please contact admin for access.');
      }

      // Authenticate user
      this.currentUser = user;
      this.isAuthenticated = true;
      
      // Save to localStorage
      localStorage.setItem('aurareach_user', JSON.stringify(user));
      
      // Update UI
      this.updateUI();
      
      // Trigger auth listeners
      this.triggerAuthListeners('signin', user);
      
      console.log('✅ Authentication successful:', user.email);
      return { success: true, user: user };
      
    } catch (error) {
      console.error('❌ Authentication failed:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Quick authentication (auto-login for returning users)
   */
  async quickAuth() {
    const savedUser = localStorage.getItem('aurareach_user');
    if (savedUser) {
      try {
        const user = JSON.parse(savedUser);
        this.currentUser = user;
        this.isAuthenticated = true;
        this.updateUI();
        return { success: true, user: user };
      } catch (error) {
        localStorage.removeItem('aurareach_user');
      }
    }
    return { success: false, error: 'No saved authentication found' };
  }

  /**
   * Sign out user
   */
  signOut() {
    this.currentUser = null;
    this.isAuthenticated = false;
    localStorage.removeItem('aurareach_user');
    this.updateUI();
    
    // Trigger auth listeners
    this.triggerAuthListeners('signout', null);
    
    console.log('👋 User signed out');
  }

  /**
   * Validate email format
   */
  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Update UI based on authentication state
   */
  updateUI() {
    // Update auth button
    const authBtn = document.getElementById('auth-btn');
    const userInfo = document.getElementById('user-info');
    const authError = document.getElementById('auth-error');
    
    if (authError) {
      authError.style.display = 'none';
    }

    if (this.isAuthenticated && this.currentUser) {
      // User is authenticated
      if (authBtn) {
        authBtn.innerHTML = `
          <i class="fas fa-user-circle"></i>
          <span>${this.currentUser.name}</span>
          <i class="fas fa-chevron-down"></i>
        `;
        authBtn.onclick = () => this.showUserMenu();
      }
      
      if (userInfo) {
        userInfo.innerHTML = `
          <div class="user-details">
            <span class="user-name">${this.currentUser.name}</span>
            <span class="user-email">${this.currentUser.email}</span>
            <span class="user-role">${this.currentUser.role}</span>
          </div>
        `;
        userInfo.style.display = 'block';
      }
      
      // Hide auth modal if open
      const authModal = document.getElementById('auth-modal');
      if (authModal) {
        authModal.style.display = 'none';
      }
      
    } else {
      // User is not authenticated
      if (authBtn) {
        authBtn.innerHTML = `
          <i class="fas fa-sign-in-alt"></i>
          <span>Sign In</span>
        `;
        authBtn.onclick = () => this.showAuthModal();
      }
      
      if (userInfo) {
        userInfo.style.display = 'none';
      }
    }
  }

  /**
   * Show authentication modal
   */
  showAuthModal() {
    let authModal = document.getElementById('auth-modal');
    
    if (!authModal) {
      // Create auth modal
      authModal = document.createElement('div');
      authModal.id = 'auth-modal';
      authModal.innerHTML = `
        <div class="modal-overlay">
          <div class="modal-content">
            <div class="modal-header">
              <h3><i class="fas fa-sign-in-alt"></i> Sign In to AuraReach</h3>
              <button class="close-btn" onclick="authManager.hideAuthModal()">
                <i class="fas fa-times"></i>
              </button>
            </div>
            <div class="modal-body">
              <div class="auth-form">
                <div class="form-group">
                  <label for="auth-email">Email Address</label>
                  <input type="email" id="auth-email" placeholder="Enter your email address" />
                </div>
                <div id="auth-error" class="error-message" style="display: none;"></div>
                <button id="auth-submit-btn" class="auth-btn primary" onclick="authManager.handleEmailAuth()">
                  <i class="fas fa-sign-in-alt"></i>
                  Sign In
                </button>
                <div class="auth-info">
                  <p><i class="fas fa-info-circle"></i> Enter your authorized email address to access AuraReach</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      `;
      
      // Add styles
      authModal.innerHTML += `
        <style>
          #auth-modal {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            z-index: 10000;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          
          .modal-overlay {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            backdrop-filter: blur(5px);
          }
          
          .modal-content {
            position: relative;
            background: white;
            border-radius: 12px;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
            max-width: 400px;
            width: 90%;
            max-height: 90vh;
            overflow-y: auto;
          }
          
          .modal-header {
            padding: 24px 24px 0;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          
          .modal-header h3 {
            margin: 0;
            color: #1a1a1a;
            font-size: 20px;
            font-weight: 600;
          }
          
          .close-btn {
            background: none;
            border: none;
            font-size: 18px;
            color: #666;
            cursor: pointer;
            padding: 8px;
            border-radius: 6px;
            transition: all 0.2s;
          }
          
          .close-btn:hover {
            background: #f5f5f5;
            color: #333;
          }
          
          .modal-body {
            padding: 24px;
          }
          
          .form-group {
            margin-bottom: 20px;
          }
          
          .form-group label {
            display: block;
            margin-bottom: 8px;
            font-weight: 500;
            color: #333;
          }
          
          .form-group input {
            width: 100%;
            padding: 12px 16px;
            border: 2px solid #e1e5e9;
            border-radius: 8px;
            font-size: 16px;
            transition: border-color 0.2s;
            box-sizing: border-box;
          }
          
          .form-group input:focus {
            outline: none;
            border-color: #4f46e5;
          }
          
          .auth-btn {
            width: 100%;
            padding: 12px 24px;
            border: none;
            border-radius: 8px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
          }
          
          .auth-btn.primary {
            background: #4f46e5;
            color: white;
          }
          
          .auth-btn.primary:hover {
            background: #4338ca;
          }
          
          .error-message {
            background: #fef2f2;
            color: #dc2626;
            padding: 12px;
            border-radius: 6px;
            margin-bottom: 16px;
            font-size: 14px;
          }
          
          .auth-info {
            margin-top: 20px;
            padding: 16px;
            background: #f8fafc;
            border-radius: 8px;
          }
          
          .auth-info p {
            margin: 0;
            font-size: 14px;
            color: #64748b;
          }
        </style>
      `;
      
      document.body.appendChild(authModal);
    }
    
    authModal.style.display = 'flex';
    
    // Focus on email input
    setTimeout(() => {
      const emailInput = document.getElementById('auth-email');
      if (emailInput) emailInput.focus();
    }, 100);
  }

  /**
   * Hide authentication modal
   */
  hideAuthModal() {
    const authModal = document.getElementById('auth-modal');
    if (authModal) {
      authModal.style.display = 'none';
    }
  }

  /**
   * Handle email authentication
   */
  async handleEmailAuth() {
    const emailInput = document.getElementById('auth-email');
    const errorDiv = document.getElementById('auth-error');
    const submitBtn = document.getElementById('auth-submit-btn');
    
    if (!emailInput) return;
    
    const email = emailInput.value.trim();
    
    // Clear previous errors
    if (errorDiv) {
      errorDiv.style.display = 'none';
    }
    
    // Show loading state
    if (submitBtn) {
      submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Signing In...';
      submitBtn.disabled = true;
    }
    
    try {
      const result = await this.authenticateWithEmail(email);
      
      if (result.success) {
        this.hideAuthModal();
      } else {
        throw new Error(result.error);
      }
      
    } catch (error) {
      if (errorDiv) {
        errorDiv.textContent = error.message;
        errorDiv.style.display = 'block';
      }
    } finally {
      // Reset button
      if (submitBtn) {
        submitBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Sign In';
        submitBtn.disabled = false;
      }
    }
  }

  /**
   * Show user menu
   */
  showUserMenu() {
    // Simple implementation - just sign out for now
    if (confirm('Sign out of AuraReach?')) {
      this.signOut();
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
   * Add authentication listener (for compatibility with existing code)
   */
  addAuthListener(callback) {
    // Store the callback for future use
    this.authCallback = callback;
    
    // If already authenticated, trigger callback immediately
    if (this.isAuthenticated && this.currentUser) {
      callback('signin', this.currentUser);
    }
  }

  /**
   * Trigger auth listeners when authentication state changes
   */
  triggerAuthListeners(event, data) {
    if (this.authCallback) {
      this.authCallback(event, data);
    }
  }
}

// Initialize authentication when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.authManager = new SimpleAuthManager();
  
  // Handle Enter key in auth modal
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const authModal = document.getElementById('auth-modal');
      if (authModal && authModal.style.display !== 'none') {
        window.authManager.handleEmailAuth();
      }
    }
  });
});

// Create global auth manager instance
const authManager = new SimpleAuthManager();