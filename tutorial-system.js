/**
 * AuraReach Tutorial System
 * Provides interactive tutorials and help system for user onboarding
 */

class TutorialSystem {
    constructor() {
        this.currentStep = 0;
        this.isActive = false;
        this.tutorials = {};
        this.notifications = [];
        this.init();
    }

    init() {
        this.setupTutorials();
        this.createNotificationContainer();
        this.bindEvents();
        this.checkFirstVisit();
    }

    setupTutorials() {
        // Email Sender Tutorial
        this.tutorials.emailSender = {
            id: 'emailSender',
            title: 'Email Sender Tutorial',
            steps: [
                {
                    target: '.status-bar',
                    title: 'Status Overview',
                    content: 'This status bar shows your active Gmail accounts, daily usage, and remaining limits. Monitor this to stay within safe sending limits.',
                    position: 'bottom'
                },
                {
                    target: '.recipients-section',
                    title: 'Add Recipients',
                    content: 'Add email recipients manually or import from CSV. The system validates emails and shows duplicate warnings.',
                    position: 'bottom'
                },
                {
                    target: '.subject-input',
                    title: 'Email Subject',
                    content: 'Enter your email subject here. Keep it clear and engaging to improve open rates.',
                    position: 'bottom'
                },
                {
                    target: '.message-composer',
                    title: 'Compose Message',
                    content: 'Write your email message here. Use the rich text editor for formatting and the preview button to see how it looks.',
                    position: 'top'
                },
                {
                    target: '.advanced-options',
                    title: 'Advanced Options',
                    content: 'Set delays between emails and priority levels. Higher delays help maintain account safety.',
                    position: 'top'
                },
                {
                    target: '.send-actions',
                    title: 'Send Actions',
                    content: 'Preview your email, schedule for later, or send immediately. The system will rotate between accounts automatically.',
                    position: 'top'
                }
            ]
        };

        // Admin Panel Tutorial
        this.tutorials.adminPanel = {
            id: 'adminPanel',
            title: 'Admin Panel Tutorial',
            steps: [
                {
                    target: '.dashboard-section',
                    title: 'Dashboard Overview',
                    content: 'Monitor overall system performance, active accounts, and daily usage across all users.',
                    position: 'bottom'
                },
                {
                    target: '.accounts-section',
                    title: 'Gmail Account Management',
                    content: 'Add and manage multiple Gmail accounts. The system automatically rotates between them for higher sending capacity.',
                    position: 'bottom'
                },
                {
                    target: '.users-section',
                    title: 'User Management',
                    content: 'Add team members, assign roles, and set individual email limits. Control who can access what features.',
                    position: 'bottom'
                },
                {
                    target: '.analytics-section',
                    title: 'Analytics & Reports',
                    content: 'View detailed analytics, export reports, and monitor system health and usage patterns.',
                    position: 'top'
                }
            ]
        };

        // Safety Features Tutorial
        this.tutorials.safety = {
            id: 'safety',
            title: 'Safety Features',
            steps: [
                {
                    target: '.safety-alerts',
                    title: 'Safety Monitoring',
                    content: 'The system continuously monitors your sending patterns and shows alerts when approaching limits.',
                    position: 'bottom'
                },
                {
                    target: '.buffer-warning',
                    title: 'Buffer Protection',
                    content: 'When you reach 80% of daily limits, you\'ll see warnings. At 95%, sending is automatically locked for safety.',
                    position: 'bottom'
                },
                {
                    target: '.account-rotation',
                    title: 'Account Rotation',
                    content: 'The system automatically switches between Gmail accounts to distribute load and maintain account health.',
                    position: 'bottom'
                }
            ]
        };
    }

    createNotificationContainer() {
        if (!document.querySelector('.notification-container')) {
            const container = document.createElement('div');
            container.className = 'notification-container';
            document.body.appendChild(container);
        }
    }

    bindEvents() {
        // Tutorial trigger buttons
        document.addEventListener('click', (e) => {
            if (e.target.matches('[data-tutorial]')) {
                const tutorialId = e.target.getAttribute('data-tutorial');
                this.startTutorial(tutorialId);
            }

            if (e.target.matches('.tutorial-next')) {
                this.nextStep();
            }

            if (e.target.matches('.tutorial-prev')) {
                this.prevStep();
            }

            if (e.target.matches('.tutorial-skip, .tutorial-close')) {
                this.endTutorial();
            }

            if (e.target.matches('.notification-close')) {
                this.closeNotification(e.target.closest('.notification'));
            }
        });

        // Keyboard navigation
        document.addEventListener('keydown', (e) => {
            if (this.isActive) {
                switch (e.key) {
                    case 'ArrowRight':
                    case 'Enter':
                        e.preventDefault();
                        this.nextStep();
                        break;
                    case 'ArrowLeft':
                        e.preventDefault();
                        this.prevStep();
                        break;
                    case 'Escape':
                        e.preventDefault();
                        this.endTutorial();
                        break;
                }
            }
        });

        // Help button
        const helpBtn = document.querySelector('.help-btn');
        if (helpBtn) {
            helpBtn.addEventListener('click', () => this.showHelpMenu());
        }
    }

    checkFirstVisit() {
        const hasVisited = localStorage.getItem('aurareach_visited');
        if (!hasVisited) {
            setTimeout(() => {
                this.showWelcomeMessage();
                localStorage.setItem('aurareach_visited', 'true');
            }, 1000);
        }
    }

    showWelcomeMessage() {
        this.showNotification({
            type: 'info',
            title: 'Welcome to AuraReach!',
            message: 'Take a quick tutorial to learn how to use the email sender safely and effectively.',
            actions: [
                {
                    text: 'Start Tutorial',
                    action: () => this.startTutorial('emailSender')
                },
                {
                    text: 'Skip',
                    action: () => {}
                }
            ],
            persistent: true
        });
    }

    startTutorial(tutorialId) {
        const tutorial = this.tutorials[tutorialId];
        if (!tutorial) return;

        this.currentTutorial = tutorial;
        this.currentStep = 0;
        this.isActive = true;

        this.createTutorialOverlay();
        this.showStep(0);

        // Track tutorial start
        this.trackEvent('tutorial_started', { tutorial_id: tutorialId });
    }

    showStep(stepIndex) {
        const tutorial = this.currentTutorial;
        const step = tutorial.steps[stepIndex];
        
        if (!step) {
            this.endTutorial();
            return;
        }

        this.currentStep = stepIndex;
        this.highlightElement(step.target);
        this.showTutorialPopup(step, stepIndex, tutorial.steps.length);
    }

    highlightElement(selector) {
        // Remove previous highlights
        const prevSpotlight = document.querySelector('.tutorial-spotlight');
        if (prevSpotlight) {
            prevSpotlight.remove();
        }

        const element = document.querySelector(selector);
        if (!element) return;

        const rect = element.getBoundingClientRect();
        const spotlight = document.createElement('div');
        spotlight.className = 'tutorial-spotlight';
        spotlight.style.cssText = `
            top: ${rect.top - 5}px;
            left: ${rect.left - 5}px;
            width: ${rect.width + 10}px;
            height: ${rect.height + 10}px;
        `;

        document.body.appendChild(spotlight);

        // Scroll element into view
        element.scrollIntoView({
            behavior: 'smooth',
            block: 'center'
        });
    }

    showTutorialPopup(step, currentIndex, totalSteps) {
        const existingPopup = document.querySelector('.tutorial-popup');
        if (existingPopup) {
            existingPopup.remove();
        }

        const popup = document.createElement('div');
        popup.className = 'tutorial-popup';
        popup.innerHTML = `
            <h3>${step.title}</h3>
            <p>${step.content}</p>
            <div class="tutorial-progress">
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${((currentIndex + 1) / totalSteps) * 100}%"></div>
                </div>
                <span class="progress-text">${currentIndex + 1} of ${totalSteps}</span>
            </div>
            <div class="tutorial-actions">
                ${currentIndex > 0 ? '<button class="btn btn-secondary tutorial-prev">Previous</button>' : ''}
                <button class="btn btn-outline tutorial-skip">Skip Tutorial</button>
                <button class="btn btn-primary tutorial-next">
                    ${currentIndex === totalSteps - 1 ? 'Finish' : 'Next'}
                </button>
            </div>
        `;

        document.body.appendChild(popup);

        // Focus management for accessibility
        popup.querySelector('.tutorial-next').focus();
    }

    nextStep() {
        this.showStep(this.currentStep + 1);
    }

    prevStep() {
        if (this.currentStep > 0) {
            this.showStep(this.currentStep - 1);
        }
    }

    endTutorial() {
        this.isActive = false;
        this.currentTutorial = null;
        this.currentStep = 0;

        // Remove tutorial elements
        const overlay = document.querySelector('.tutorial-overlay');
        const popup = document.querySelector('.tutorial-popup');
        const spotlight = document.querySelector('.tutorial-spotlight');

        if (overlay) overlay.remove();
        if (popup) popup.remove();
        if (spotlight) spotlight.remove();

        // Show completion message
        this.showNotification({
            type: 'success',
            title: 'Tutorial Complete!',
            message: 'You\'re ready to start sending emails safely and effectively.'
        });

        // Track tutorial completion
        this.trackEvent('tutorial_completed', { 
            tutorial_id: this.currentTutorial?.id,
            steps_completed: this.currentStep + 1
        });
    }

    createTutorialOverlay() {
        const existingOverlay = document.querySelector('.tutorial-overlay');
        if (existingOverlay) {
            existingOverlay.remove();
        }

        const overlay = document.createElement('div');
        overlay.className = 'tutorial-overlay';
        document.body.appendChild(overlay);
    }

    showHelpMenu() {
        const helpMenu = document.createElement('div');
        helpMenu.className = 'help-menu modal';
        helpMenu.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2>Help & Tutorials</h2>
                    <button class="modal-close">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="help-options">
                        <div class="help-option" data-tutorial="emailSender">
                            <div class="help-icon">📧</div>
                            <div class="help-content">
                                <h3>Email Sender Tutorial</h3>
                                <p>Learn how to compose and send emails safely</p>
                            </div>
                        </div>
                        <div class="help-option" data-tutorial="adminPanel">
                            <div class="help-icon">⚙️</div>
                            <div class="help-content">
                                <h3>Admin Panel Tutorial</h3>
                                <p>Manage accounts, users, and system settings</p>
                            </div>
                        </div>
                        <div class="help-option" data-tutorial="safety">
                            <div class="help-icon">🛡️</div>
                            <div class="help-content">
                                <h3>Safety Features</h3>
                                <p>Understand limits, buffers, and account protection</p>
                            </div>
                        </div>
                        <div class="help-option" onclick="window.open('mailto:support@aurareach.com')">
                            <div class="help-icon">💬</div>
                            <div class="help-content">
                                <h3>Contact Support</h3>
                                <p>Get help from our support team</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(helpMenu);
        helpMenu.style.display = 'flex';

        // Close menu handlers
        helpMenu.querySelector('.modal-close').addEventListener('click', () => {
            helpMenu.remove();
        });

        helpMenu.addEventListener('click', (e) => {
            if (e.target === helpMenu) {
                helpMenu.remove();
            }
        });
    }

    showNotification({ type = 'info', title, message, actions = [], persistent = false, duration = 5000 }) {
        const container = document.querySelector('.notification-container');
        if (!container) return;

        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        
        const iconMap = {
            success: '✓',
            error: '✕',
            warning: '⚠',
            info: 'ℹ'
        };

        notification.innerHTML = `
            <div class="notification-content">
                <div class="notification-icon">${iconMap[type]}</div>
                <div class="notification-message">
                    ${title ? `<strong>${title}</strong><br>` : ''}
                    ${message}
                    ${actions.length > 0 ? `
                        <div class="notification-actions" style="margin-top: 8px; display: flex; gap: 8px;">
                            ${actions.map(action => `
                                <button class="btn btn-sm btn-outline" onclick="(${action.action.toString()})(); this.closest('.notification').remove();">
                                    ${action.text}
                                </button>
                            `).join('')}
                        </div>
                    ` : ''}
                </div>
            </div>
            ${!persistent ? '<button class="notification-close">&times;</button>' : ''}
        `;

        container.appendChild(notification);
        this.notifications.push(notification);

        // Auto-remove after duration (unless persistent)
        if (!persistent) {
            setTimeout(() => {
                this.closeNotification(notification);
            }, duration);
        }

        return notification;
    }

    closeNotification(notification) {
        if (notification && notification.parentNode) {
            notification.style.animation = 'slideOutRight 0.3s ease-out';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.remove();
                }
                const index = this.notifications.indexOf(notification);
                if (index > -1) {
                    this.notifications.splice(index, 1);
                }
            }, 300);
        }
    }

    showTooltip(element, text, position = 'top') {
        const existingTooltip = document.querySelector('.tooltip');
        if (existingTooltip) {
            existingTooltip.remove();
        }

        const tooltip = document.createElement('div');
        tooltip.className = 'tooltip';
        tooltip.textContent = text;

        document.body.appendChild(tooltip);

        const rect = element.getBoundingClientRect();
        const tooltipRect = tooltip.getBoundingClientRect();

        let top, left;

        switch (position) {
            case 'top':
                top = rect.top - tooltipRect.height - 8;
                left = rect.left + (rect.width - tooltipRect.width) / 2;
                break;
            case 'bottom':
                top = rect.bottom + 8;
                left = rect.left + (rect.width - tooltipRect.width) / 2;
                break;
            case 'left':
                top = rect.top + (rect.height - tooltipRect.height) / 2;
                left = rect.left - tooltipRect.width - 8;
                break;
            case 'right':
                top = rect.top + (rect.height - tooltipRect.height) / 2;
                left = rect.right + 8;
                break;
        }

        tooltip.style.top = `${Math.max(0, top)}px`;
        tooltip.style.left = `${Math.max(0, left)}px`;

        return tooltip;
    }

    hideTooltip() {
        const tooltip = document.querySelector('.tooltip');
        if (tooltip) {
            tooltip.remove();
        }
    }

    trackEvent(eventName, data = {}) {
        // Analytics tracking (implement with your preferred analytics service)
        console.log('Tutorial Event:', eventName, data);
        
        // Example: Google Analytics
        if (typeof gtag !== 'undefined') {
            gtag('event', eventName, {
                event_category: 'tutorial',
                ...data
            });
        }
    }

    // Public API methods
    showSuccessMessage(message) {
        this.showNotification({
            type: 'success',
            message: message
        });
    }

    showErrorMessage(message) {
        this.showNotification({
            type: 'error',
            message: message,
            duration: 8000
        });
    }

    showWarningMessage(message) {
        this.showNotification({
            type: 'warning',
            message: message,
            duration: 6000
        });
    }

    showInfoMessage(message) {
        this.showNotification({
            type: 'info',
            message: message
        });
    }
}

// Initialize tutorial system when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.tutorialSystem = new TutorialSystem();
});

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TutorialSystem;
}