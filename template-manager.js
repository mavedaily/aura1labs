// Template Manager with User Roles and Limits
class TemplateManager {
    constructor() {
        this.templates = JSON.parse(localStorage.getItem('emailTemplates')) || [];
        this.userRoles = JSON.parse(localStorage.getItem('userRoles')) || {};
        this.currentUser = JSON.parse(localStorage.getItem('currentUser')) || { role: 'user', email: 'user@example.com' };
        this.emailLimits = this.getEmailLimits();
        this.usageStats = JSON.parse(localStorage.getItem('usageStats')) || {};
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadTemplates();
        this.updateUserInfo();
        this.updateUsageStats();
        this.initializeHTMLEditor();
    }

    // User Role Management
    getEmailLimits() {
        const limits = {
            'user': { daily: 50, monthly: 1000, templates: 5 },
            'manager': { daily: 200, monthly: 5000, templates: 20 },
            'admin': { daily: 1000, monthly: 25000, templates: 50 },
            'master_admin': { daily: -1, monthly: -1, templates: -1 } // Unlimited
        };
        return limits[this.currentUser.role] || limits['user'];
    }

    checkEmailLimit(count = 1) {
        const today = new Date().toDateString();
        const currentMonth = new Date().toISOString().slice(0, 7);
        
        if (!this.usageStats[this.currentUser.email]) {
            this.usageStats[this.currentUser.email] = {
                daily: {},
                monthly: {}
            };
        }

        const userStats = this.usageStats[this.currentUser.email];
        const dailyCount = userStats.daily[today] || 0;
        const monthlyCount = userStats.monthly[currentMonth] || 0;

        // Check limits (unlimited = -1)
        if (this.emailLimits.daily !== -1 && dailyCount + count > this.emailLimits.daily) {
            return { allowed: false, reason: `Daily limit exceeded (${this.emailLimits.daily})` };
        }
        if (this.emailLimits.monthly !== -1 && monthlyCount + count > this.emailLimits.monthly) {
            return { allowed: false, reason: `Monthly limit exceeded (${this.emailLimits.monthly})` };
        }

        return { allowed: true };
    }

    updateEmailUsage(count = 1) {
        const today = new Date().toDateString();
        const currentMonth = new Date().toISOString().slice(0, 7);
        
        if (!this.usageStats[this.currentUser.email]) {
            this.usageStats[this.currentUser.email] = { daily: {}, monthly: {} };
        }

        const userStats = this.usageStats[this.currentUser.email];
        userStats.daily[today] = (userStats.daily[today] || 0) + count;
        userStats.monthly[currentMonth] = (userStats.monthly[currentMonth] || 0) + count;

        localStorage.setItem('usageStats', JSON.stringify(this.usageStats));
        this.updateUsageStats();
    }

    // Template Management
    createTemplate(templateData) {
        if (this.emailLimits.templates !== -1 && this.templates.length >= this.emailLimits.templates) {
            this.showNotification(`Template limit reached (${this.emailLimits.templates})`, 'error');
            return false;
        }

        const template = {
            id: Date.now().toString(),
            name: templateData.name,
            subject: templateData.subject,
            content: templateData.content,
            htmlContent: templateData.htmlContent || '',
            cssContent: templateData.cssContent || '',
            variables: templateData.variables || [],
            category: templateData.category || 'General',
            isHTML: templateData.isHTML || false,
            ccEmails: templateData.ccEmails || [],
            bccEmails: templateData.bccEmails || [],
            replyTo: templateData.replyTo || '',
            createdBy: this.currentUser.email,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            tags: templateData.tags || [],
            isActive: true
        };

        this.templates.push(template);
        this.saveTemplates();
        this.loadTemplates();
        this.showNotification('Template created successfully!', 'success');
        return true;
    }

    updateTemplate(templateId, templateData) {
        const templateIndex = this.templates.findIndex(t => t.id === templateId);
        if (templateIndex === -1) return false;

        const template = this.templates[templateIndex];
        
        // Check permissions
        if (template.createdBy !== this.currentUser.email && !['admin', 'master_admin'].includes(this.currentUser.role)) {
            this.showNotification('You can only edit your own templates', 'error');
            return false;
        }

        Object.assign(template, templateData, {
            updatedAt: new Date().toISOString()
        });

        this.saveTemplates();
        this.loadTemplates();
        this.showNotification('Template updated successfully!', 'success');
        return true;
    }

    deleteTemplate(templateId) {
        const templateIndex = this.templates.findIndex(t => t.id === templateId);
        if (templateIndex === -1) return false;

        const template = this.templates[templateIndex];
        
        // Check permissions
        if (template.createdBy !== this.currentUser.email && !['admin', 'master_admin'].includes(this.currentUser.role)) {
            this.showNotification('You can only delete your own templates', 'error');
            return false;
        }

        this.templates.splice(templateIndex, 1);
        this.saveTemplates();
        this.loadTemplates();
        this.showNotification('Template deleted successfully!', 'success');
        return true;
    }

    // HTML/CSS Editor
    initializeHTMLEditor() {
        const htmlEditor = document.getElementById('htmlEditor');
        const cssEditor = document.getElementById('cssEditor');
        const previewFrame = document.getElementById('emailPreviewFrame');

        if (htmlEditor && cssEditor && previewFrame) {
            // Add syntax highlighting and auto-completion
            this.setupCodeEditor(htmlEditor, 'html');
            this.setupCodeEditor(cssEditor, 'css');

            // Real-time preview
            const updatePreview = () => {
                const html = htmlEditor.value;
                const css = cssEditor.value;
                const fullHTML = `
                    <!DOCTYPE html>
                    <html>
                    <head>
                        <meta charset="UTF-8">
                        <meta name="viewport" content="width=device-width, initial-scale=1.0">
                        <style>
                            body { margin: 0; padding: 20px; font-family: Arial, sans-serif; }
                            ${css}
                        </style>
                    </head>
                    <body>
                        ${html}
                    </body>
                    </html>
                `;
                
                previewFrame.srcdoc = fullHTML;
            };

            htmlEditor.addEventListener('input', updatePreview);
            cssEditor.addEventListener('input', updatePreview);
        }
    }

    setupCodeEditor(element, language) {
        // Basic syntax highlighting and formatting
        element.addEventListener('keydown', (e) => {
            if (e.key === 'Tab') {
                e.preventDefault();
                const start = element.selectionStart;
                const end = element.selectionEnd;
                element.value = element.value.substring(0, start) + '    ' + element.value.substring(end);
                element.selectionStart = element.selectionEnd = start + 4;
            }
        });

        // Auto-close tags for HTML
        if (language === 'html') {
            element.addEventListener('input', (e) => {
                const value = e.target.value;
                const cursorPos = e.target.selectionStart;
                
                // Auto-close HTML tags
                if (e.inputType === 'insertText' && e.data === '>') {
                    const beforeCursor = value.substring(0, cursorPos);
                    const tagMatch = beforeCursor.match(/<(\w+)(?:\s[^>]*)?$/);
                    
                    if (tagMatch && !['img', 'br', 'hr', 'input', 'meta', 'link'].includes(tagMatch[1])) {
                        const tagName = tagMatch[1];
                        const afterCursor = value.substring(cursorPos);
                        e.target.value = beforeCursor + afterCursor.substring(0, 0) + `</${tagName}>` + afterCursor;
                        e.target.selectionStart = e.target.selectionEnd = cursorPos;
                    }
                }
            });
        }
    }

    // Event Listeners
    setupEventListeners() {
        // Template form submission
        const templateForm = document.getElementById('templateForm');
        if (templateForm) {
            templateForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleTemplateSubmission();
            });
        }

        // Template type toggle
        const templateTypeToggle = document.getElementById('templateType');
        if (templateTypeToggle) {
            templateTypeToggle.addEventListener('change', (e) => {
                this.toggleTemplateEditor(e.target.value);
            });
        }

        // Search and filter
        const templateSearch = document.getElementById('templateSearch');
        if (templateSearch) {
            templateSearch.addEventListener('input', (e) => {
                this.filterTemplates(e.target.value);
            });
        }

        // Category filter
        const categoryFilter = document.getElementById('categoryFilter');
        if (categoryFilter) {
            categoryFilter.addEventListener('change', (e) => {
                this.filterByCategory(e.target.value);
            });
        }

        // User role selector (for admins)
        const userRoleSelector = document.getElementById('userRoleSelector');
        if (userRoleSelector && ['admin', 'master_admin'].includes(this.currentUser.role)) {
            userRoleSelector.addEventListener('change', (e) => {
                this.switchUserRole(e.target.value);
            });
        }
    }

    handleTemplateSubmission() {
        const formData = new FormData(document.getElementById('templateForm'));
        const templateType = document.getElementById('templateType').value;
        
        const templateData = {
            name: formData.get('templateName'),
            subject: formData.get('templateSubject'),
            category: formData.get('templateCategory'),
            tags: formData.get('templateTags').split(',').map(tag => tag.trim()).filter(tag => tag),
            ccEmails: formData.get('ccEmails').split(',').map(email => email.trim()).filter(email => email),
            bccEmails: formData.get('bccEmails').split(',').map(email => email.trim()).filter(email => email),
            replyTo: formData.get('replyTo'),
            isHTML: templateType === 'html'
        };

        if (templateType === 'html') {
            templateData.htmlContent = document.getElementById('htmlEditor').value;
            templateData.cssContent = document.getElementById('cssEditor').value;
            templateData.content = this.extractTextFromHTML(templateData.htmlContent);
        } else {
            templateData.content = formData.get('templateContent');
        }

        // Extract variables from content
        templateData.variables = this.extractVariables(templateData.content + templateData.htmlContent);

        const templateId = document.getElementById('templateForm').dataset.editingId;
        if (templateId) {
            this.updateTemplate(templateId, templateData);
            delete document.getElementById('templateForm').dataset.editingId;
        } else {
            this.createTemplate(templateData);
        }

        this.resetTemplateForm();
    }

    toggleTemplateEditor(type) {
        const richTextEditor = document.getElementById('richTextEditor');
        const htmlCssEditor = document.getElementById('htmlCssEditor');

        if (type === 'html') {
            richTextEditor.style.display = 'none';
            htmlCssEditor.style.display = 'block';
        } else {
            richTextEditor.style.display = 'block';
            htmlCssEditor.style.display = 'none';
        }
    }

    extractVariables(content) {
        const variableRegex = /\{\{(\w+)\}\}/g;
        const variables = [];
        let match;

        while ((match = variableRegex.exec(content)) !== null) {
            if (!variables.includes(match[1])) {
                variables.push(match[1]);
            }
        }

        return variables;
    }

    extractTextFromHTML(html) {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = html;
        return tempDiv.textContent || tempDiv.innerText || '';
    }

    // Template Loading and Display
    loadTemplates() {
        const templatesList = document.getElementById('templatesList');
        if (!templatesList) return;

        const userTemplates = this.templates.filter(template => {
            if (['admin', 'master_admin'].includes(this.currentUser.role)) {
                return true; // Admins can see all templates
            }
            return template.createdBy === this.currentUser.email;
        });

        templatesList.innerHTML = userTemplates.map(template => this.createTemplateCard(template)).join('');
        this.updateTemplateStats();
    }

    createTemplateCard(template) {
        const canEdit = template.createdBy === this.currentUser.email || ['admin', 'master_admin'].includes(this.currentUser.role);
        
        return `
            <div class="template-card" data-template-id="${template.id}">
                <div class="template-header">
                    <div class="template-info">
                        <h4 class="template-name">${template.name}</h4>
                        <span class="template-category">${template.category}</span>
                        ${template.isHTML ? '<span class="template-type-badge html">HTML</span>' : '<span class="template-type-badge text">Text</span>'}
                    </div>
                    <div class="template-actions">
                        <button class="btn btn-sm btn-secondary" onclick="templateManager.previewTemplate('${template.id}')">
                            <svg class="icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                <circle cx="12" cy="12" r="3"></circle>
                            </svg>
                            Preview
                        </button>
                        <button class="btn btn-sm btn-primary" onclick="templateManager.useTemplate('${template.id}')">
                            <svg class="icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M9 12l2 2 4-4"></path>
                                <circle cx="12" cy="12" r="9"></circle>
                            </svg>
                            Use
                        </button>
                        ${canEdit ? `
                            <button class="btn btn-sm btn-outline" onclick="templateManager.editTemplate('${template.id}')">
                                <svg class="icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                    <path d="m18.5 2.5 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                </svg>
                                Edit
                            </button>
                            <button class="btn btn-sm btn-danger" onclick="templateManager.deleteTemplate('${template.id}')">
                                <svg class="icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <polyline points="3,6 5,6 21,6"></polyline>
                                    <path d="m19,6v14a2,2 0 0,1-2,2H7a2,2 0 0,1-2-2V6m3,0V4a2,2 0 0,1,2-2h4a2,2 0 0,1,2,2v2"></path>
                                </svg>
                                Delete
                            </button>
                        ` : ''}
                    </div>
                </div>
                <div class="template-content">
                    <p class="template-subject"><strong>Subject:</strong> ${template.subject}</p>
                    <p class="template-preview">${template.content.substring(0, 150)}${template.content.length > 150 ? '...' : ''}</p>
                    ${template.variables.length > 0 ? `
                        <div class="template-variables">
                            <strong>Variables:</strong> ${template.variables.map(v => `<span class="variable-tag">{{${v}}}</span>`).join(' ')}
                        </div>
                    ` : ''}
                    ${template.tags.length > 0 ? `
                        <div class="template-tags">
                            ${template.tags.map(tag => `<span class="tag">${tag}</span>`).join(' ')}
                        </div>
                    ` : ''}
                </div>
                <div class="template-footer">
                    <small class="template-meta">
                        Created by: ${template.createdBy} | 
                        ${new Date(template.createdAt).toLocaleDateString()}
                        ${template.ccEmails.length > 0 ? ` | CC: ${template.ccEmails.length}` : ''}
                        ${template.bccEmails.length > 0 ? ` | BCC: ${template.bccEmails.length}` : ''}
                        ${template.replyTo ? ` | Reply-to: ${template.replyTo}` : ''}
                    </small>
                </div>
            </div>
        `;
    }

    // Template Actions
    previewTemplate(templateId) {
        const template = this.templates.find(t => t.id === templateId);
        if (!template) return;

        const modal = document.getElementById('templatePreviewModal');
        const modalContent = document.getElementById('templatePreviewContent');
        
        if (template.isHTML) {
            const fullHTML = `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <style>
                        body { margin: 0; padding: 20px; font-family: Arial, sans-serif; }
                        ${template.cssContent}
                    </style>
                </head>
                <body>
                    ${template.htmlContent}
                </body>
                </html>
            `;
            modalContent.innerHTML = `<iframe srcdoc="${fullHTML.replace(/"/g, '&quot;')}" style="width: 100%; height: 400px; border: 1px solid #ddd;"></iframe>`;
        } else {
            modalContent.innerHTML = `
                <div class="text-preview">
                    <h4>Subject: ${template.subject}</h4>
                    <div class="content-preview">${template.content.replace(/\n/g, '<br>')}</div>
                </div>
            `;
        }

        modal.style.display = 'block';
    }

    useTemplate(templateId) {
        const template = this.templates.find(t => t.id === templateId);
        if (!template) return;

        // Switch to compose tab
        document.querySelector('[data-tab="compose"]').click();

        // Fill in the compose form
        document.getElementById('emailSubject').value = template.subject;
        
        if (template.isHTML) {
            // Set HTML content
            document.getElementById('emailContent').innerHTML = template.htmlContent;
        } else {
            // Set text content
            document.getElementById('emailContent').innerHTML = template.content.replace(/\n/g, '<br>');
        }

        // Fill CC, BCC, Reply-to
        if (template.ccEmails.length > 0) {
            document.getElementById('ccEmails').value = template.ccEmails.join(', ');
        }
        if (template.bccEmails.length > 0) {
            document.getElementById('bccEmails').value = template.bccEmails.join(', ');
        }
        if (template.replyTo) {
            document.getElementById('replyTo').value = template.replyTo;
        }

        this.showNotification(`Template "${template.name}" loaded into composer`, 'success');
    }

    editTemplate(templateId) {
        const template = this.templates.find(t => t.id === templateId);
        if (!template) return;

        // Switch to templates tab
        document.querySelector('[data-tab="templates"]').click();

        // Fill the form
        document.getElementById('templateName').value = template.name;
        document.getElementById('templateSubject').value = template.subject;
        document.getElementById('templateCategory').value = template.category;
        document.getElementById('templateTags').value = template.tags.join(', ');
        document.getElementById('ccEmails').value = template.ccEmails.join(', ');
        document.getElementById('bccEmails').value = template.bccEmails.join(', ');
        document.getElementById('replyTo').value = template.replyTo;

        if (template.isHTML) {
            document.getElementById('templateType').value = 'html';
            document.getElementById('htmlEditor').value = template.htmlContent;
            document.getElementById('cssEditor').value = template.cssContent;
            this.toggleTemplateEditor('html');
        } else {
            document.getElementById('templateType').value = 'text';
            document.getElementById('templateContent').value = template.content;
            this.toggleTemplateEditor('text');
        }

        // Set editing mode
        document.getElementById('templateForm').dataset.editingId = templateId;
        document.querySelector('#templateForm button[type="submit"]').textContent = 'Update Template';
    }

    // Utility Functions
    filterTemplates(searchTerm) {
        const templateCards = document.querySelectorAll('.template-card');
        templateCards.forEach(card => {
            const templateName = card.querySelector('.template-name').textContent.toLowerCase();
            const templateContent = card.querySelector('.template-preview').textContent.toLowerCase();
            const isVisible = templateName.includes(searchTerm.toLowerCase()) || 
                            templateContent.includes(searchTerm.toLowerCase());
            card.style.display = isVisible ? 'block' : 'none';
        });
    }

    filterByCategory(category) {
        const templateCards = document.querySelectorAll('.template-card');
        templateCards.forEach(card => {
            const templateCategory = card.querySelector('.template-category').textContent;
            const isVisible = category === 'all' || templateCategory === category;
            card.style.display = isVisible ? 'block' : 'none';
        });
    }

    updateUserInfo() {
        const userInfoElement = document.getElementById('currentUserInfo');
        if (userInfoElement) {
            userInfoElement.innerHTML = `
                <div class="user-info">
                    <span class="user-email">${this.currentUser.email}</span>
                    <span class="user-role role-${this.currentUser.role}">${this.currentUser.role.replace('_', ' ').toUpperCase()}</span>
                </div>
            `;
        }
    }

    updateUsageStats() {
        const today = new Date().toDateString();
        const currentMonth = new Date().toISOString().slice(0, 7);
        
        const userStats = this.usageStats[this.currentUser.email] || { daily: {}, monthly: {} };
        const dailyUsed = userStats.daily[today] || 0;
        const monthlyUsed = userStats.monthly[currentMonth] || 0;

        const usageStatsElement = document.getElementById('usageStats');
        if (usageStatsElement) {
            usageStatsElement.innerHTML = `
                <div class="usage-stats">
                    <div class="usage-item">
                        <span class="usage-label">Daily:</span>
                        <span class="usage-value">${dailyUsed}${this.emailLimits.daily !== -1 ? ` / ${this.emailLimits.daily}` : ' (Unlimited)'}</span>
                    </div>
                    <div class="usage-item">
                        <span class="usage-label">Monthly:</span>
                        <span class="usage-value">${monthlyUsed}${this.emailLimits.monthly !== -1 ? ` / ${this.emailLimits.monthly}` : ' (Unlimited)'}</span>
                    </div>
                    <div class="usage-item">
                        <span class="usage-label">Templates:</span>
                        <span class="usage-value">${this.templates.filter(t => t.createdBy === this.currentUser.email).length}${this.emailLimits.templates !== -1 ? ` / ${this.emailLimits.templates}` : ' (Unlimited)'}</span>
                    </div>
                </div>
            `;
        }
    }

    updateTemplateStats() {
        const templateStatsElement = document.getElementById('templateStats');
        if (templateStatsElement) {
            const userTemplates = this.templates.filter(t => t.createdBy === this.currentUser.email);
            const categories = [...new Set(userTemplates.map(t => t.category))];
            
            templateStatsElement.innerHTML = `
                <div class="template-stats">
                    <div class="stat-item">
                        <span class="stat-number">${userTemplates.length}</span>
                        <span class="stat-label">Total Templates</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-number">${categories.length}</span>
                        <span class="stat-label">Categories</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-number">${userTemplates.filter(t => t.isHTML).length}</span>
                        <span class="stat-label">HTML Templates</span>
                    </div>
                </div>
            `;
        }
    }

    resetTemplateForm() {
        document.getElementById('templateForm').reset();
        delete document.getElementById('templateForm').dataset.editingId;
        document.querySelector('#templateForm button[type="submit"]').textContent = 'Create Template';
        this.toggleTemplateEditor('text');
    }

    saveTemplates() {
        localStorage.setItem('emailTemplates', JSON.stringify(this.templates));
    }

    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <span>${message}</span>
            <button onclick="this.parentElement.remove()">&times;</button>
        `;

        // Add to page
        const container = document.getElementById('notificationContainer') || document.body;
        container.appendChild(notification);

        // Auto remove after 5 seconds
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 5000);
    }

    // Admin Functions
    switchUserRole(newRole) {
        if (!['admin', 'master_admin'].includes(this.currentUser.role)) return;
        
        this.currentUser.role = newRole;
        this.emailLimits = this.getEmailLimits();
        localStorage.setItem('currentUser', JSON.stringify(this.currentUser));
        
        this.updateUserInfo();
        this.updateUsageStats();
        this.loadTemplates();
        this.showNotification(`Switched to ${newRole.replace('_', ' ')} role`, 'info');
    }

    // Export/Import Templates
    exportTemplates() {
        const userTemplates = this.templates.filter(t => t.createdBy === this.currentUser.email);
        const dataStr = JSON.stringify(userTemplates, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = `email-templates-${new Date().toISOString().split('T')[0]}.json`;
        link.click();
    }

    importTemplates(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const importedTemplates = JSON.parse(e.target.result);
                let importCount = 0;

                importedTemplates.forEach(template => {
                    if (this.emailLimits.templates === -1 || this.templates.length < this.emailLimits.templates) {
                        template.id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
                        template.createdBy = this.currentUser.email;
                        template.createdAt = new Date().toISOString();
                        template.updatedAt = new Date().toISOString();
                        this.templates.push(template);
                        importCount++;
                    }
                });

                this.saveTemplates();
                this.loadTemplates();
                this.showNotification(`Imported ${importCount} templates successfully!`, 'success');
            } catch (error) {
                this.showNotification('Error importing templates. Please check the file format.', 'error');
            }
        };
        reader.readAsText(file);
    }
}

// Initialize Template Manager
let templateManager;
document.addEventListener('DOMContentLoaded', () => {
    templateManager = new TemplateManager();
});

// Global functions for template actions
function closeTemplatePreview() {
    document.getElementById('templatePreviewModal').style.display = 'none';
}

function exportTemplates() {
    templateManager.exportTemplates();
}

function importTemplates() {
    document.getElementById('templateImportFile').click();
}

function handleTemplateImport(event) {
    const file = event.target.files[0];
    if (file) {
        templateManager.importTemplates(file);
    }
}