// Gmail API Integration
class GmailAPI {
    constructor() {
        this.isAuthenticated = false;
        this.accessToken = null;
        this.clientId = (typeof AUTH_CONFIG !== 'undefined' && AUTH_CONFIG.GOOGLE_CLIENT_ID) ? AUTH_CONFIG.GOOGLE_CLIENT_ID : null;
        this.apiKey = null;
        this.discoveryDoc = 'https://www.googleapis.com/discovery/v1/apis/gmail/v1/rest';
        this.scopes = 'https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/gmail.readonly';
        this.gapi = null;
        this.tokenClient = null;
        
        this.initializeAPI();
    }

    // Initialize Google API
    async initializeAPI() {
        try {
            // Load Google API script if not already loaded
            if (!window.gapi) {
                await this.loadGoogleAPI();
            }
            
            this.gapi = window.gapi;
            
            // Initialize gapi
            await new Promise((resolve, reject) => {
                this.gapi.load('client', resolve);
            });

            // Load Google Identity Services
            if (!window.google) {
                await this.loadGoogleIdentity();
            }

            // Auto-setup credentials if AUTH_CONFIG is available
            if (this.clientId && typeof AUTH_CONFIG !== 'undefined') {
                // Use a default API key or get from AUTH_CONFIG if available
                const apiKey = AUTH_CONFIG.GOOGLE_API_KEY || 'AIzaSyDummy'; // You'll need to add your API key
                await this.setupCredentials(this.clientId, apiKey);
            }

            this.updateAuthStatus();
            
        } catch (error) {
            console.error('Failed to initialize Gmail API:', error);
            this.showError('Failed to initialize Gmail API. Please check your internet connection.');
        }
    }

    // Load Google API script
    loadGoogleAPI() {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://apis.google.com/js/api.js';
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    // Load Google Identity Services
    loadGoogleIdentity() {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://accounts.google.com/gsi/client';
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    // Setup API credentials
    async setupCredentials(clientId, apiKey) {
        try {
            this.clientId = clientId;
            this.apiKey = apiKey;

            // Initialize the API client
            await this.gapi.client.init({
                apiKey: this.apiKey,
                discoveryDocs: [this.discoveryDoc],
            });

            // Initialize the token client
            this.tokenClient = window.google.accounts.oauth2.initTokenClient({
                client_id: this.clientId,
                scope: this.scopes,
                callback: (tokenResponse) => {
                    this.handleAuthResponse(tokenResponse);
                },
            });

            this.updateAuthStatus();
            this.showSuccess('Gmail API credentials configured successfully!');
            
        } catch (error) {
            console.error('Failed to setup credentials:', error);
            this.showError('Failed to setup Gmail API credentials. Please check your Client ID and API Key.');
        }
    }

    // Handle authentication response
    handleAuthResponse(tokenResponse) {
        if (tokenResponse.error) {
            console.error('Authentication error:', tokenResponse.error);
            this.showError('Authentication failed: ' + tokenResponse.error);
            return;
        }

        this.accessToken = tokenResponse.access_token;
        this.isAuthenticated = true;
        this.gapi.client.setToken({access_token: this.accessToken});
        
        this.updateAuthStatus();
        this.showSuccess('Successfully authenticated with Gmail!');
        
        // Store token securely (consider encryption in production)
        this.storeToken(tokenResponse);
    }

    // Store authentication token
    storeToken(tokenResponse) {
        const tokenData = {
            access_token: tokenResponse.access_token,
            expires_at: Date.now() + (tokenResponse.expires_in * 1000),
            scope: tokenResponse.scope
        };
        
        localStorage.setItem('gmail_token', JSON.stringify(tokenData));
    }

    // Load stored token
    loadStoredToken() {
        try {
            const storedToken = localStorage.getItem('gmail_token');
            if (!storedToken) return false;

            const tokenData = JSON.parse(storedToken);
            
            // Check if token is expired
            if (Date.now() >= tokenData.expires_at) {
                localStorage.removeItem('gmail_token');
                return false;
            }

            this.accessToken = tokenData.access_token;
            this.isAuthenticated = true;
            this.gapi.client.setToken({access_token: this.accessToken});
            
            return true;
        } catch (error) {
            console.error('Failed to load stored token:', error);
            localStorage.removeItem('gmail_token');
            return false;
        }
    }

    // Authenticate user
    async authenticate() {
        if (!this.tokenClient) {
            this.showError('Gmail API not properly configured. Please setup credentials first.');
            return false;
        }

        try {
            // Check for stored valid token first
            if (this.loadStoredToken()) {
                this.updateAuthStatus();
                return true;
            }

            // Request new token
            this.tokenClient.requestAccessToken({prompt: 'consent'});
            return true;
            
        } catch (error) {
            console.error('Authentication failed:', error);
            this.showError('Authentication failed. Please try again.');
            return false;
        }
    }

    // Sign out
    signOut() {
        if (this.accessToken) {
            window.google.accounts.oauth2.revoke(this.accessToken);
        }
        
        this.isAuthenticated = false;
        this.accessToken = null;
        this.gapi.client.setToken(null);
        
        localStorage.removeItem('gmail_token');
        this.updateAuthStatus();
        this.showSuccess('Successfully signed out from Gmail.');
    }

    // Send email
    async sendEmail(emailData) {
        if (!this.isAuthenticated) {
            this.showError('Please authenticate with Gmail first.');
            return false;
        }

        try {
            const email = this.createEmailMessage(emailData);
            
            const response = await this.gapi.client.gmail.users.messages.send({
                userId: 'me',
                resource: {
                    raw: email
                }
            });

            if (response.status === 200) {
                this.showSuccess('Email sent successfully!');
                return {
                    success: true,
                    messageId: response.result.id,
                    threadId: response.result.threadId
                };
            } else {
                throw new Error('Failed to send email');
            }
            
        } catch (error) {
            console.error('Failed to send email:', error);
            this.showError('Failed to send email: ' + error.message);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Create email message in RFC 2822 format
    createEmailMessage(emailData) {
        const { to, cc, bcc, subject, body, attachments = [] } = emailData;
        
        let email = '';
        email += `To: ${to}\r\n`;
        if (cc) email += `Cc: ${cc}\r\n`;
        if (bcc) email += `Bcc: ${bcc}\r\n`;
        email += `Subject: ${subject}\r\n`;
        email += `Content-Type: text/html; charset=utf-8\r\n`;
        email += `\r\n`;
        email += body;

        // Base64 encode the email
        return btoa(unescape(encodeURIComponent(email)))
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=+$/, '');
    }

    // Send bulk emails
    async sendBulkEmails(emailList, progressCallback) {
        if (!this.isAuthenticated) {
            this.showError('Please authenticate with Gmail first.');
            return false;
        }

        const results = {
            total: emailList.length,
            sent: 0,
            failed: 0,
            errors: []
        };

        for (let i = 0; i < emailList.length; i++) {
            const emailData = emailList[i];
            
            try {
                const result = await this.sendEmail(emailData);
                
                if (result.success) {
                    results.sent++;
                } else {
                    results.failed++;
                    results.errors.push({
                        email: emailData.to,
                        error: result.error
                    });
                }
                
                // Update progress
                if (progressCallback) {
                    progressCallback({
                        current: i + 1,
                        total: emailList.length,
                        sent: results.sent,
                        failed: results.failed,
                        percentage: Math.round(((i + 1) / emailList.length) * 100)
                    });
                }

                // Add delay to avoid rate limiting
                if (i < emailList.length - 1) {
                    await this.delay(1000); // 1 second delay between emails
                }
                
            } catch (error) {
                results.failed++;
                results.errors.push({
                    email: emailData.to,
                    error: error.message
                });
            }
        }

        return results;
    }

    // Get user profile
    async getUserProfile() {
        if (!this.isAuthenticated) {
            return null;
        }

        try {
            const response = await this.gapi.client.gmail.users.getProfile({
                userId: 'me'
            });

            return response.result;
        } catch (error) {
            console.error('Failed to get user profile:', error);
            return null;
        }
    }

    // Get email quota information
    async getQuotaInfo() {
        if (!this.isAuthenticated) {
            return null;
        }

        try {
            const profile = await this.getUserProfile();
            if (profile) {
                return {
                    emailAddress: profile.emailAddress,
                    messagesTotal: profile.messagesTotal,
                    threadsTotal: profile.threadsTotal,
                    historyId: profile.historyId
                };
            }
        } catch (error) {
            console.error('Failed to get quota info:', error);
        }
        
        return null;
    }

    // Update authentication status in UI
    updateAuthStatus() {
        const authStatus = document.getElementById('authStatus');
        const authButton = document.getElementById('authButton');
        const userInfo = document.getElementById('userInfo');

        if (authStatus) {
            if (this.isAuthenticated) {
                authStatus.textContent = 'Connected to Gmail';
                authStatus.className = 'auth-status connected';
            } else {
                authStatus.textContent = 'Not connected to Gmail';
                authStatus.className = 'auth-status disconnected';
            }
        }

        if (authButton) {
            if (this.isAuthenticated) {
                authButton.textContent = 'Sign Out';
                authButton.onclick = () => this.signOut();
            } else {
                authButton.textContent = 'Connect Gmail';
                authButton.onclick = () => this.authenticate();
            }
        }

        // Update user info
        if (this.isAuthenticated && userInfo) {
            this.getUserProfile().then(profile => {
                if (profile) {
                    userInfo.innerHTML = `
                        <div class="user-email">${profile.emailAddress}</div>
                        <div class="user-stats">
                            Messages: ${profile.messagesTotal || 0} | 
                            Threads: ${profile.threadsTotal || 0}
                        </div>
                    `;
                }
            });
        } else if (userInfo) {
            userInfo.innerHTML = '';
        }
    }

    // Utility functions
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    showSuccess(message) {
        this.showNotification(message, 'success');
    }

    showError(message) {
        this.showNotification(message, 'error');
    }

    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <span class="notification-message">${message}</span>
                <button class="notification-close" onclick="this.parentElement.parentElement.remove()">×</button>
            </div>
        `;

        // Add to page
        document.body.appendChild(notification);

        // Auto remove after 5 seconds
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 5000);
    }

    // Validate email address
    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    // Parse email list
    parseEmailList(emailString) {
        return emailString
            .split(/[,;\n]/)
            .map(email => email.trim())
            .filter(email => email && this.isValidEmail(email));
    }
}

// Initialize Gmail API instance
const gmailAPI = new GmailAPI();

// Setup credentials form handler
function setupGmailCredentials() {
    const clientId = document.getElementById('clientId')?.value;
    const apiKey = document.getElementById('apiKey')?.value;

    if (!clientId || !apiKey) {
        gmailAPI.showError('Please enter both Client ID and API Key.');
        return;
    }

    gmailAPI.setupCredentials(clientId, apiKey);
}

// Test email sending
async function testEmailSending() {
    if (!gmailAPI.isAuthenticated) {
        gmailAPI.showError('Please authenticate with Gmail first.');
        return;
    }

    const testEmail = {
        to: 'test@example.com',
        subject: 'Test Email from Gmail Auto Sender',
        body: '<h1>Test Email</h1><p>This is a test email sent from the Gmail Auto Sender application.</p>'
    };

    const result = await gmailAPI.sendEmail(testEmail);
    
    if (result.success) {
        gmailAPI.showSuccess('Test email sent successfully!');
    }
}

// Export for use in other modules
window.gmailAPI = gmailAPI;