// AuraReach Email Sender - Enhanced JavaScript with Multi-Account Rotation and Safety Features

class EmailSender {
    constructor() {
        this.multiGmailManager = null;
        this.currentUser = null;
        this.isInitialized = false;
        this.tutorialActive = false;
        this.sendingInProgress = false;
        this.safetyBuffer = 0.8; // 80% of limit before warning
        this.criticalBuffer = 0.95; // 95% of limit before blocking
        
        // Initialize when DOM is ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.init());
        } else {
            this.init();
        }
    }

    async init() {
        try {
            // Initialize Multi-Gmail Manager
            this.multiGmailManager = new MultiGmailManager();
            
            // Set up event listeners
            this.setupEventListeners();
            
            // Initialize UI components
            this.initializeUI();
            
            // Load user data
            await this.loadUserData();
            
            // Update status display
            this.updateStatusDisplay();
            
            // Start auto-refresh
            this.startAutoRefresh();
            
            this.isInitialized = true;
            this.showNotification('System initialized successfully', 'success');
            
        } catch (error) {
            console.error('Initialization error:', error);
            this.showNotification('Failed to initialize system', 'error');
        }
    }

    setupEventListeners() {
        // Form submission
        const emailForm = document.getElementById('emailForm');
        if (emailForm) {
            emailForm.addEventListener('submit', (e) => this.handleFormSubmit(e));
        }

        // Recipient management
        const recipientTextarea = document.getElementById('recipients');
        if (recipientTextarea) {
            recipientTextarea.addEventListener('input', () => this.updateRecipientCount());
            recipientTextarea.addEventListener('paste', (e) => this.handleRecipientPaste(e));
        }

        // CSV import
        const csvImportBtn = document.getElementById('csvImportBtn');
        const csvFileInput = document.getElementById('csvFileInput');
        if (csvImportBtn && csvFileInput) {
            csvImportBtn.addEventListener('click', () => csvFileInput.click());
            csvFileInput.addEventListener('change', (e) => this.handleCSVImport(e));
        }

        // Email validation
        const validateBtn = document.getElementById('validateEmailsBtn');
        if (validateBtn) {
            validateBtn.addEventListener('click', () => this.validateEmails());
        }

        // Clear recipients
        const clearBtn = document.getElementById('clearRecipientsBtn');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => this.clearRecipients());
        }

        // Advanced options toggle
        const advancedToggle = document.getElementById('advancedOptionsToggle');
        if (advancedToggle) {
            advancedToggle.addEventListener('click', () => this.toggleAdvancedOptions());
        }

        // Send buttons
        const sendNowBtn = document.getElementById('sendNowBtn');
        const scheduleBtn = document.getElementById('scheduleBtn');
        const previewBtn = document.getElementById('previewBtn');
        
        if (sendNowBtn) sendNowBtn.addEventListener('click', () => this.sendEmails('now'));
        if (scheduleBtn) scheduleBtn.addEventListener('click', () => this.showScheduleModal());
        if (previewBtn) previewBtn.addEventListener('click', () => this.showPreviewModal());

        // Template selection
        const templateBtn = document.getElementById('templateBtn');
        if (templateBtn) {
            templateBtn.addEventListener('click', () => this.showTemplateModal());
        }

        // Modal close buttons
        document.querySelectorAll('.close, [data-dismiss="modal"]').forEach(btn => {
            btn.addEventListener('click', (e) => this.closeModal(e.target.closest('.modal')));
        });

        // Tutorial
        const tutorialBtn = document.getElementById('tutorialBtn');
        if (tutorialBtn) {
            tutorialBtn.addEventListener('click', () => this.startTutorial());
        }

        // Toolbar buttons
        this.setupToolbarButtons();

        // Real-time safety monitoring
        setInterval(() => this.checkSafetyLimits(), 30000); // Check every 30 seconds
    }

    setupToolbarButtons() {
        const toolbar = document.querySelector('.editor-toolbar');
        if (!toolbar) return;

        toolbar.addEventListener('click', (e) => {
            if (e.target.classList.contains('toolbar-btn')) {
                const action = e.target.dataset.action;
                this.handleToolbarAction(action);
            }
        });
    }

    handleToolbarAction(action) {
        const textarea = document.getElementById('message');
        if (!textarea) return;

        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const selectedText = textarea.value.substring(start, end);

        let replacement = '';
        switch (action) {
            case 'bold':
                replacement = `**${selectedText || 'Bold text'}**`;
                break;
            case 'italic':
                replacement = `*${selectedText || 'Italic text'}*`;
                break;
            case 'underline':
                replacement = `__${selectedText || 'Underlined text'}__`;
                break;
            case 'link':
                const url = prompt('Enter URL:');
                if (url) {
                    replacement = `[${selectedText || 'Link text'}](${url})`;
                }
                break;
            case 'list':
                replacement = `\n• ${selectedText || 'List item'}`;
                break;
            case 'code':
                replacement = `\`${selectedText || 'Code'}\``;
                break;
        }

        if (replacement) {
            textarea.setRangeText(replacement, start, end, 'end');
            textarea.focus();
        }
    }

    initializeUI() {
        // Initialize rich text editor
        this.initializeRichTextEditor();
        
        // Set up drag and drop for CSV files
        this.setupDragAndDrop();
        
        // Initialize tooltips
        this.initializeTooltips();
        
        // Set default values
        this.setDefaultValues();
    }

    initializeRichTextEditor() {
        const messageTextarea = document.getElementById('message');
        if (messageTextarea) {
            // Add placeholder text
            messageTextarea.placeholder = 'Compose your email message here...\n\nYou can use:\n• **Bold text**\n• *Italic text*\n• [Links](http://example.com)\n• Lists and more';
        }
    }

    setupDragAndDrop() {
        const recipientContainer = document.querySelector('.recipient-input-container');
        if (!recipientContainer) return;

        recipientContainer.addEventListener('dragover', (e) => {
            e.preventDefault();
            recipientContainer.classList.add('drag-over');
        });

        recipientContainer.addEventListener('dragleave', () => {
            recipientContainer.classList.remove('drag-over');
        });

        recipientContainer.addEventListener('drop', (e) => {
            e.preventDefault();
            recipientContainer.classList.remove('drag-over');
            
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                this.handleCSVImport({ target: { files } });
            }
        });
    }

    initializeTooltips() {
        // Add tooltips to buttons and form elements
        const tooltipElements = document.querySelectorAll('[data-tooltip]');
        tooltipElements.forEach(element => {
            element.addEventListener('mouseenter', (e) => this.showTooltip(e));
            element.addEventListener('mouseleave', () => this.hideTooltip());
        });
    }

    setDefaultValues() {
        // Set default delay
        const delayInput = document.getElementById('emailDelay');
        if (delayInput && !delayInput.value) {
            delayInput.value = '30';
        }

        // Set default priority
        const prioritySelect = document.getElementById('emailPriority');
        if (prioritySelect && !prioritySelect.value) {
            prioritySelect.value = 'normal';
        }
    }

    async loadUserData() {
        try {
            // Load current user from localStorage or API
            const userData = localStorage.getItem('currentUser');
            if (userData) {
                this.currentUser = JSON.parse(userData);
            } else {
                // Default user for demo
                this.currentUser = {
                    id: 'demo-user',
                    name: 'Demo User',
                    email: 'demo@example.com',
                    role: 'user',
                    dailyLimit: 400,
                    accountType: 'personal'
                };
            }

            // Update user info in header
            this.updateUserInfo();
            
        } catch (error) {
            console.error('Error loading user data:', error);
        }
    }

    updateUserInfo() {
        const userNameElement = document.querySelector('.user-name');
        const userEmailElement = document.querySelector('.user-email');
        const userAvatarElement = document.querySelector('.user-avatar');

        if (userNameElement) userNameElement.textContent = this.currentUser.name;
        if (userEmailElement) userEmailElement.textContent = this.currentUser.email;
        if (userAvatarElement) {
            userAvatarElement.textContent = this.currentUser.name.charAt(0).toUpperCase();
        }
    }

    async updateStatusDisplay() {
        try {
            const accounts = await this.multiGmailManager.getAccountsStatus();
            const totalSent = accounts.reduce((sum, acc) => sum + acc.dailySent, 0);
            const totalLimit = accounts.reduce((sum, acc) => sum + acc.dailyLimit, 0);
            const activeAccounts = accounts.filter(acc => acc.status === 'active').length;

            // Update status items
            this.updateStatusItem('activeAccounts', activeAccounts);
            this.updateStatusItem('dailyUsage', `${totalSent}/${totalLimit}`);
            this.updateStatusItem('remainingLimit', totalLimit - totalSent);
            this.updateStatusItem('bufferStatus', this.getBufferStatus(totalSent, totalLimit));

            // Update progress bars if they exist
            this.updateProgressBars(totalSent, totalLimit);

            // Check for safety alerts
            this.checkSafetyLimits();

        } catch (error) {
            console.error('Error updating status display:', error);
        }
    }

    updateStatusItem(id, value) {
        const element = document.getElementById(id);
        if (element) {
            const valueElement = element.querySelector('.status-value');
            if (valueElement) {
                valueElement.textContent = value;
                
                // Add status classes
                if (id === 'activeAccounts' && value > 0) {
                    valueElement.classList.add('status-active');
                }
            }
        }
    }

    updateProgressBars(sent, total) {
        const progressFill = document.querySelector('.progress-fill');
        const progressText = document.querySelector('.progress-text');
        
        if (progressFill && progressText) {
            const percentage = total > 0 ? (sent / total) * 100 : 0;
            progressFill.style.width = `${percentage}%`;
            progressText.textContent = `${sent} / ${total} emails sent (${percentage.toFixed(1)}%)`;
        }
    }

    getBufferStatus(sent, total) {
        if (total === 0) return 'No Limit';
        
        const percentage = sent / total;
        if (percentage >= this.criticalBuffer) return 'Critical';
        if (percentage >= this.safetyBuffer) return 'Warning';
        return 'Safe';
    }

    async checkSafetyLimits() {
        try {
            const accounts = await this.multiGmailManager.getAccountsStatus();
            const totalSent = accounts.reduce((sum, acc) => sum + acc.dailySent, 0);
            const totalLimit = accounts.reduce((sum, acc) => sum + acc.dailyLimit, 0);
            
            const percentage = totalLimit > 0 ? totalSent / totalLimit : 0;
            
            // Clear existing alerts
            this.clearSafetyAlerts();
            
            if (percentage >= this.criticalBuffer) {
                this.showSafetyAlert('danger', 'Critical Limit Reached', 
                    'You have reached 95% of your daily email limit. Sending is now blocked to protect your accounts.');
                this.disableSending(true);
            } else if (percentage >= this.safetyBuffer) {
                this.showSafetyAlert('warning', 'Approaching Daily Limit', 
                    'You have used 80% of your daily email limit. Consider reducing sending volume.');
                this.disableSending(false);
            } else {
                this.disableSending(false);
            }

            // Check individual account limits
            accounts.forEach(account => {
                const accPercentage = account.dailyLimit > 0 ? account.dailySent / account.dailyLimit : 0;
                if (accPercentage >= 0.9) {
                    this.showSafetyAlert('info', `Account ${account.email} Near Limit`, 
                        `This account has used ${(accPercentage * 100).toFixed(1)}% of its daily limit.`);
                }
            });

        } catch (error) {
            console.error('Error checking safety limits:', error);
        }
    }

    showSafetyAlert(type, title, message) {
        const alertsContainer = document.querySelector('.safety-alerts');
        if (!alertsContainer) return;

        const alertElement = document.createElement('div');
        alertElement.className = `safety-alert ${type} fade-in`;
        alertElement.innerHTML = `
            <div class="safety-alert-icon">
                ${type === 'danger' ? '🚨' : type === 'warning' ? '⚠️' : 'ℹ️'}
            </div>
            <div class="safety-alert-content">
                <h4>${title}</h4>
                <p>${message}</p>
                <div class="safety-alert-actions">
                    <button class="btn btn-sm btn-outline" onclick="this.parentElement.parentElement.parentElement.remove()">
                        Dismiss
                    </button>
                </div>
            </div>
        `;

        alertsContainer.appendChild(alertElement);
    }

    clearSafetyAlerts() {
        const alertsContainer = document.querySelector('.safety-alerts');
        if (alertsContainer) {
            alertsContainer.innerHTML = '';
        }
    }

    disableSending(disable) {
        const sendButtons = document.querySelectorAll('#sendNowBtn, #scheduleBtn');
        sendButtons.forEach(btn => {
            btn.disabled = disable;
            if (disable) {
                btn.classList.add('btn-disabled');
                btn.title = 'Sending disabled due to safety limits';
            } else {
                btn.classList.remove('btn-disabled');
                btn.title = '';
            }
        });
    }

    updateRecipientCount() {
        const textarea = document.getElementById('recipients');
        const countElement = document.querySelector('.recipient-count');
        
        if (textarea && countElement) {
            const emails = this.extractEmails(textarea.value);
            countElement.textContent = `${emails.length} recipients`;
            
            // Update send estimate
            this.updateSendEstimate(emails.length);
        }
    }

    extractEmails(text) {
        const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
        return text.match(emailRegex) || [];
    }

    async updateSendEstimate(recipientCount) {
        const estimateElement = document.querySelector('.send-estimate');
        const rotationElement = document.querySelector('.account-rotation');
        
        if (!estimateElement || !rotationElement) return;

        try {
            const delayInput = document.getElementById('emailDelay');
            const delay = parseInt(delayInput?.value || '30');
            
            const totalTime = (recipientCount * delay) / 60; // in minutes
            const accounts = await this.multiGmailManager.getAccountsStatus();
            const activeAccounts = accounts.filter(acc => acc.status === 'active').length;
            
            estimateElement.innerHTML = `
                <i class="fas fa-clock"></i>
                Estimated time: ${totalTime.toFixed(1)} minutes
            `;
            
            rotationElement.innerHTML = `
                <i class="fas fa-sync-alt"></i>
                Using ${activeAccounts} account${activeAccounts !== 1 ? 's' : ''}
            `;
            
        } catch (error) {
            console.error('Error updating send estimate:', error);
        }
    }

    handleRecipientPaste(e) {
        setTimeout(() => {
            this.updateRecipientCount();
            this.validateEmails();
        }, 100);
    }

    async handleCSVImport(e) {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        const file = files[0];
        if (!file.name.toLowerCase().endsWith('.csv')) {
            this.showNotification('Please select a CSV file', 'error');
            return;
        }

        try {
            const text = await this.readFileAsText(file);
            const emails = this.parseCSV(text);
            
            if (emails.length === 0) {
                this.showNotification('No valid emails found in CSV file', 'warning');
                return;
            }

            const textarea = document.getElementById('recipients');
            if (textarea) {
                const existingEmails = this.extractEmails(textarea.value);
                const newEmails = emails.filter(email => !existingEmails.includes(email));
                
                if (newEmails.length > 0) {
                    textarea.value += (textarea.value ? '\n' : '') + newEmails.join('\n');
                    this.updateRecipientCount();
                    this.showNotification(`Imported ${newEmails.length} new email addresses`, 'success');
                } else {
                    this.showNotification('All emails from CSV already exist', 'info');
                }
            }

        } catch (error) {
            console.error('CSV import error:', error);
            this.showNotification('Error importing CSV file', 'error');
        }

        // Clear file input
        e.target.value = '';
    }

    readFileAsText(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = e => resolve(e.target.result);
            reader.onerror = reject;
            reader.readAsText(file);
        });
    }

    parseCSV(text) {
        const lines = text.split('\n');
        const emails = [];
        
        lines.forEach(line => {
            const columns = line.split(',');
            columns.forEach(column => {
                const email = column.trim().replace(/['"]/g, '');
                if (this.isValidEmail(email)) {
                    emails.push(email);
                }
            });
        });
        
        return [...new Set(emails)]; // Remove duplicates
    }

    isValidEmail(email) {
        const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        return emailRegex.test(email);
    }

    validateEmails() {
        const textarea = document.getElementById('recipients');
        if (!textarea) return;

        const emails = this.extractEmails(textarea.value);
        const validEmails = emails.filter(email => this.isValidEmail(email));
        const invalidEmails = emails.filter(email => !this.isValidEmail(email));

        if (invalidEmails.length > 0) {
            this.showNotification(`Found ${invalidEmails.length} invalid email addresses`, 'warning');
            console.log('Invalid emails:', invalidEmails);
        } else {
            this.showNotification(`All ${validEmails.length} email addresses are valid`, 'success');
        }

        // Update textarea with only valid emails
        textarea.value = validEmails.join('\n');
        this.updateRecipientCount();
    }

    clearRecipients() {
        const textarea = document.getElementById('recipients');
        if (textarea) {
            textarea.value = '';
            this.updateRecipientCount();
            this.showNotification('Recipients cleared', 'info');
        }
    }

    toggleAdvancedOptions() {
        const options = document.querySelector('.advanced-options');
        const icon = document.querySelector('.toggle-icon');
        
        if (options && icon) {
            options.classList.toggle('show');
            icon.classList.toggle('rotated');
        }
    }

    async handleFormSubmit(e) {
        e.preventDefault();
        
        if (this.sendingInProgress) {
            this.showNotification('Email sending already in progress', 'warning');
            return;
        }

        await this.sendEmails('now');
    }

    async sendEmails(mode = 'now') {
        if (!this.isInitialized) {
            this.showNotification('System not initialized', 'error');
            return;
        }

        try {
            // Validate form
            const validation = this.validateForm();
            if (!validation.valid) {
                this.showNotification(validation.message, 'error');
                return;
            }

            // Check safety limits
            const safetyCheck = await this.checkSendingSafety(validation.recipients.length);
            if (!safetyCheck.safe) {
                this.showBufferWarningModal(safetyCheck);
                return;
            }

            // Prepare email data
            const emailData = this.prepareEmailData(validation);
            
            // Start sending process
            this.sendingInProgress = true;
            this.showProgressSection();
            this.updateSendingUI(true);

            if (mode === 'now') {
                await this.sendEmailsNow(emailData);
            } else if (mode === 'scheduled') {
                await this.scheduleEmails(emailData);
            }

        } catch (error) {
            console.error('Send emails error:', error);
            this.showNotification('Failed to send emails', 'error');
        } finally {
            this.sendingInProgress = false;
            this.updateSendingUI(false);
        }
    }

    validateForm() {
        const recipients = document.getElementById('recipients').value.trim();
        const subject = document.getElementById('subject').value.trim();
        const message = document.getElementById('message').value.trim();

        if (!recipients) {
            return { valid: false, message: 'Please enter recipient email addresses' };
        }

        if (!subject) {
            return { valid: false, message: 'Please enter email subject' };
        }

        if (!message) {
            return { valid: false, message: 'Please enter email message' };
        }

        const emailList = this.extractEmails(recipients);
        if (emailList.length === 0) {
            return { valid: false, message: 'No valid email addresses found' };
        }

        const invalidEmails = emailList.filter(email => !this.isValidEmail(email));
        if (invalidEmails.length > 0) {
            return { valid: false, message: `Found ${invalidEmails.length} invalid email addresses` };
        }

        return {
            valid: true,
            recipients: emailList,
            subject,
            message
        };
    }

    async checkSendingSafety(recipientCount) {
        try {
            const accounts = await this.multiGmailManager.getAccountsStatus();
            const totalSent = accounts.reduce((sum, acc) => sum + acc.dailySent, 0);
            const totalLimit = accounts.reduce((sum, acc) => sum + acc.dailyLimit, 0);
            
            const afterSending = totalSent + recipientCount;
            const percentage = totalLimit > 0 ? afterSending / totalLimit : 0;

            if (percentage > 1) {
                return {
                    safe: false,
                    reason: 'exceeds_limit',
                    message: 'This send would exceed your daily email limit',
                    currentSent: totalSent,
                    totalLimit: totalLimit,
                    requestedSend: recipientCount,
                    maxAllowed: totalLimit - totalSent
                };
            }

            if (percentage >= this.criticalBuffer) {
                return {
                    safe: false,
                    reason: 'critical_buffer',
                    message: 'This send would exceed the safety buffer',
                    currentSent: totalSent,
                    totalLimit: totalLimit,
                    requestedSend: recipientCount,
                    bufferPercentage: this.criticalBuffer * 100
                };
            }

            return { safe: true };

        } catch (error) {
            console.error('Safety check error:', error);
            return {
                safe: false,
                reason: 'error',
                message: 'Unable to verify safety limits'
            };
        }
    }

    prepareEmailData(validation) {
        const delay = parseInt(document.getElementById('emailDelay')?.value || '30');
        const priority = document.getElementById('emailPriority')?.value || 'normal';
        const trackOpens = document.getElementById('trackOpens')?.checked || false;
        const trackClicks = document.getElementById('trackClicks')?.checked || false;

        return {
            recipients: validation.recipients,
            subject: validation.subject,
            message: validation.message,
            delay: delay,
            priority: priority,
            tracking: {
                opens: trackOpens,
                clicks: trackClicks
            },
            sender: this.currentUser
        };
    }

    async sendEmailsNow(emailData) {
        try {
            const progressStats = document.querySelector('.progress-stats');
            const currentAction = document.querySelector('.current-action');
            const progressFill = document.querySelector('.progress-fill');
            const progressText = document.querySelector('.progress-text');

            let sent = 0;
            let failed = 0;
            const total = emailData.recipients.length;

            // Update initial stats
            this.updateProgressStats(sent, failed, total);

            for (let i = 0; i < emailData.recipients.length; i++) {
                const recipient = emailData.recipients[i];
                
                try {
                    // Update current action
                    if (currentAction) {
                        currentAction.textContent = `Sending to ${recipient}...`;
                    }

                    // Send email using multi-account manager
                    await this.multiGmailManager.sendEmail({
                        to: recipient,
                        subject: emailData.subject,
                        body: emailData.message,
                        priority: emailData.priority,
                        tracking: emailData.tracking
                    });

                    sent++;
                    this.showNotification(`Email sent to ${recipient}`, 'success');

                } catch (error) {
                    failed++;
                    console.error(`Failed to send to ${recipient}:`, error);
                    this.showNotification(`Failed to send to ${recipient}`, 'error');
                }

                // Update progress
                const progress = ((i + 1) / total) * 100;
                if (progressFill) progressFill.style.width = `${progress}%`;
                if (progressText) progressText.textContent = `${i + 1} / ${total} emails processed`;
                
                this.updateProgressStats(sent, failed, total);

                // Delay between emails
                if (i < emailData.recipients.length - 1) {
                    if (currentAction) {
                        currentAction.textContent = `Waiting ${emailData.delay} seconds...`;
                    }
                    await this.delay(emailData.delay * 1000);
                }
            }

            // Final update
            if (currentAction) {
                currentAction.textContent = `Completed: ${sent} sent, ${failed} failed`;
            }

            this.showNotification(`Email sending completed: ${sent} sent, ${failed} failed`, 
                failed === 0 ? 'success' : 'warning');

            // Update status display
            await this.updateStatusDisplay();

        } catch (error) {
            console.error('Send emails now error:', error);
            throw error;
        }
    }

    updateProgressStats(sent, failed, total) {
        const stats = document.querySelector('.progress-stats');
        if (!stats) return;

        const sentStat = stats.querySelector('.stat:nth-child(1) .stat-value');
        const failedStat = stats.querySelector('.stat:nth-child(2) .stat-value');
        const remainingStat = stats.querySelector('.stat:nth-child(3) .stat-value');

        if (sentStat) sentStat.textContent = sent;
        if (failedStat) failedStat.textContent = failed;
        if (remainingStat) remainingStat.textContent = total - sent - failed;
    }

    showProgressSection() {
        const progressSection = document.querySelector('.progress-section');
        if (progressSection) {
            progressSection.style.display = 'block';
            progressSection.classList.add('fade-in');
        }
    }

    hideProgressSection() {
        const progressSection = document.querySelector('.progress-section');
        if (progressSection) {
            progressSection.style.display = 'none';
        }
    }

    updateSendingUI(sending) {
        const sendButtons = document.querySelectorAll('#sendNowBtn, #scheduleBtn');
        const form = document.getElementById('emailForm');

        sendButtons.forEach(btn => {
            btn.disabled = sending;
            if (sending) {
                btn.classList.add('loading');
                btn.textContent = 'Sending...';
            } else {
                btn.classList.remove('loading');
                btn.textContent = btn.id === 'sendNowBtn' ? 'Send Now' : 'Schedule';
            }
        });

        if (form) {
            form.style.pointerEvents = sending ? 'none' : 'auto';
            form.style.opacity = sending ? '0.7' : '1';
        }

        if (!sending) {
            this.hideProgressSection();
        }
    }

    showBufferWarningModal(safetyCheck) {
        const modal = document.getElementById('bufferWarningModal');
        if (!modal) return;

        // Update modal content
        const messageElement = modal.querySelector('.warning-message p');
        const statsContainer = modal.querySelector('.buffer-stats');
        
        if (messageElement) {
            messageElement.textContent = safetyCheck.message;
        }

        if (statsContainer) {
            statsContainer.innerHTML = `
                <div class="buffer-stat">
                    <span>Current Sent:</span>
                    <span>${safetyCheck.currentSent}</span>
                </div>
                <div class="buffer-stat">
                    <span>Daily Limit:</span>
                    <span>${safetyCheck.totalLimit}</span>
                </div>
                <div class="buffer-stat">
                    <span>Requested Send:</span>
                    <span>${safetyCheck.requestedSend}</span>
                </div>
                <div class="buffer-stat">
                    <span>Max Allowed:</span>
                    <span>${safetyCheck.maxAllowed || 0}</span>
                </div>
            `;
        }

        this.showModal(modal);
    }

    showScheduleModal() {
        const modal = document.getElementById('scheduleModal');
        if (modal) {
            // Set default schedule time to 1 hour from now
            const scheduleTime = modal.querySelector('#scheduleTime');
            if (scheduleTime) {
                const now = new Date();
                now.setHours(now.getHours() + 1);
                scheduleTime.value = now.toISOString().slice(0, 16);
            }
            
            this.showModal(modal);
        }
    }

    showPreviewModal() {
        const modal = document.getElementById('previewModal');
        if (!modal) return;

        const subject = document.getElementById('subject').value;
        const message = document.getElementById('message').value;
        const recipients = this.extractEmails(document.getElementById('recipients').value);

        const previewContainer = modal.querySelector('.preview-container');
        if (previewContainer) {
            previewContainer.innerHTML = `
                <div style="border: 1px solid #ddd; padding: 20px; border-radius: 8px; background: white;">
                    <div style="border-bottom: 1px solid #eee; padding-bottom: 10px; margin-bottom: 15px;">
                        <strong>To:</strong> ${recipients.slice(0, 3).join(', ')}${recipients.length > 3 ? ` and ${recipients.length - 3} more` : ''}<br>
                        <strong>Subject:</strong> ${subject}
                    </div>
                    <div style="white-space: pre-wrap; line-height: 1.6;">
                        ${this.formatMessagePreview(message)}
                    </div>
                </div>
            `;
        }

        this.showModal(modal);
    }

    formatMessagePreview(message) {
        return message
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/__(.*?)__/g, '<u>$1</u>')
            .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" style="color: #2563eb;">$1</a>')
            .replace(/`(.*?)`/g, '<code style="background: #f1f5f9; padding: 2px 4px; border-radius: 3px;">$1</code>');
    }

    showTemplateModal() {
        const modal = document.getElementById('templateModal');
        if (modal) {
            this.loadEmailTemplates();
            this.showModal(modal);
        }
    }

    loadEmailTemplates() {
        const templateList = document.querySelector('.template-list');
        if (!templateList) return;

        const templates = [
            {
                name: 'Welcome Email',
                subject: 'Welcome to AuraReach!',
                message: 'Dear {{name}},\n\nWelcome to AuraReach! We\'re excited to have you on board.\n\nBest regards,\nThe AuraReach Team'
            },
            {
                name: 'Newsletter',
                subject: 'AuraReach Newsletter - {{month}} {{year}}',
                message: 'Hello {{name}},\n\nHere\'s what\'s new this month:\n\n• Feature updates\n• Tips and tricks\n• Community highlights\n\nStay connected!\nAuraReach Team'
            },
            {
                name: 'Follow-up',
                subject: 'Following up on our conversation',
                message: 'Hi {{name}},\n\nI wanted to follow up on our recent conversation about {{topic}}.\n\nPlease let me know if you have any questions.\n\nBest regards,\n{{sender_name}}'
            }
        ];

        templateList.innerHTML = templates.map(template => `
            <div class="template-item" onclick="emailSender.selectTemplate('${template.name}', '${template.subject}', \`${template.message}\`)">
                <h4>${template.name}</h4>
                <p>${template.message.substring(0, 100)}...</p>
            </div>
        `).join('');
    }

    selectTemplate(name, subject, message) {
        document.getElementById('subject').value = subject;
        document.getElementById('message').value = message;
        
        this.closeModal(document.getElementById('templateModal'));
        this.showNotification(`Template "${name}" applied`, 'success');
    }

    showModal(modal) {
        if (modal) {
            modal.classList.add('show');
            modal.style.display = 'flex';
            document.body.style.overflow = 'hidden';
        }
    }

    closeModal(modal) {
        if (modal) {
            modal.classList.remove('show');
            modal.style.display = 'none';
            document.body.style.overflow = 'auto';
        }
    }

    startTutorial() {
        if (this.tutorialActive) return;
        
        this.tutorialActive = true;
        this.showNotification('Tutorial started! Follow the highlighted steps.', 'info');
        
        const steps = [
            {
                element: '#recipients',
                title: 'Add Recipients',
                content: 'Enter email addresses here, one per line. You can also import from CSV files.'
            },
            {
                element: '#subject',
                title: 'Email Subject',
                content: 'Write a compelling subject line for your email.'
            },
            {
                element: '#message',
                title: 'Email Message',
                content: 'Compose your email message. Use the toolbar for formatting.'
            },
            {
                element: '.advanced-options',
                title: 'Advanced Options',
                content: 'Configure sending delays, priority, and tracking options.'
            },
            {
                element: '#sendNowBtn',
                title: 'Send Emails',
                content: 'Click here to send your emails immediately, or use Schedule for later sending.'
            }
        ];

        this.runTutorialSteps(steps, 0);
    }

    runTutorialSteps(steps, currentStep) {
        if (currentStep >= steps.length) {
            this.tutorialActive = false;
            this.showNotification('Tutorial completed!', 'success');
            return;
        }

        const step = steps[currentStep];
        const element = document.querySelector(step.element);
        
        if (element) {
            this.highlightElement(element, step.title, step.content, () => {
                this.runTutorialSteps(steps, currentStep + 1);
            });
        } else {
            this.runTutorialSteps(steps, currentStep + 1);
        }
    }

    highlightElement(element, title, content, onNext) {
        // Create tutorial overlay
        const overlay = document.createElement('div');
        overlay.className = 'tutorial-overlay';
        overlay.innerHTML = `
            <div class="tutorial-spotlight"></div>
            <div class="tutorial-popup">
                <h3>${title}</h3>
                <p>${content}</p>
                <div class="tutorial-actions">
                    <button class="btn btn-secondary" onclick="emailSender.endTutorial()">Skip Tutorial</button>
                    <button class="btn btn-primary" onclick="this.parentElement.parentElement.parentElement.remove(); (${onNext})()">Next</button>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);

        // Position spotlight on element
        const rect = element.getBoundingClientRect();
        const spotlight = overlay.querySelector('.tutorial-spotlight');
        spotlight.style.top = `${rect.top - 10}px`;
        spotlight.style.left = `${rect.left - 10}px`;
        spotlight.style.width = `${rect.width + 20}px`;
        spotlight.style.height = `${rect.height + 20}px`;

        // Scroll element into view
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    endTutorial() {
        this.tutorialActive = false;
        const overlays = document.querySelectorAll('.tutorial-overlay');
        overlays.forEach(overlay => overlay.remove());
        this.showNotification('Tutorial ended', 'info');
    }

    startAutoRefresh() {
        // Refresh status every 60 seconds
        setInterval(() => {
            if (!this.sendingInProgress) {
                this.updateStatusDisplay();
            }
        }, 60000);
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type} fade-in`;
        notification.innerHTML = `
            <div class="notification-content">
                <span class="notification-icon">
                    ${type === 'success' ? '✓' : type === 'error' ? '✗' : type === 'warning' ? '⚠' : 'ℹ'}
                </span>
                <span class="notification-message">${message}</span>
            </div>
            <button class="notification-close" onclick="this.parentElement.remove()">×</button>
        `;

        // Add to page
        let container = document.querySelector('.notification-container');
        if (!container) {
            container = document.createElement('div');
            container.className = 'notification-container';
            document.body.appendChild(container);
        }

        container.appendChild(notification);

        // Auto remove after 5 seconds
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 5000);
    }

    showTooltip(e) {
        const element = e.target;
        const tooltipText = element.dataset.tooltip;
        if (!tooltipText) return;

        const tooltip = document.createElement('div');
        tooltip.className = 'tooltip';
        tooltip.textContent = tooltipText;
        document.body.appendChild(tooltip);

        const rect = element.getBoundingClientRect();
        tooltip.style.top = `${rect.bottom + 5}px`;
        tooltip.style.left = `${rect.left + (rect.width / 2) - (tooltip.offsetWidth / 2)}px`;

        element._tooltip = tooltip;
    }

    hideTooltip() {
        const tooltips = document.querySelectorAll('.tooltip');
        tooltips.forEach(tooltip => tooltip.remove());
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Initialize the email sender when the page loads
const emailSender = new EmailSender();