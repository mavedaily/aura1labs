// Email Composer with Rich Text Editor
class EmailComposer {
    constructor() {
        this.editor = null;
        this.attachments = [];
        this.currentTemplate = null;
        this.isDraft = false;
        this.init();
    }

    init() {
        this.createRichTextEditor();
        this.setupEventListeners();
        this.loadDrafts();
    }

    createRichTextEditor() {
        // Create toolbar
        const toolbar = this.createToolbar();
        
        // Create editor container
        const editorContainer = document.createElement('div');
        editorContainer.className = 'rich-editor-container';
        editorContainer.innerHTML = `
            ${toolbar}
            <div class="rich-editor" id="richEditor" contenteditable="true" 
                 placeholder="Start typing your email content..."></div>
            <div class="editor-footer">
                <div class="attachment-area" id="attachmentArea">
                    <button type="button" class="btn btn-secondary" onclick="emailComposer.addAttachment()">
                        <svg class="icon icon-sm"><use href="#icon-plus"></use></svg>
                        Add Attachment
                    </button>
                    <div class="attachments-list" id="attachmentsList"></div>
                </div>
                <div class="editor-actions">
                    <button type="button" class="btn btn-secondary" onclick="emailComposer.insertVariable()">
                        <svg class="icon icon-sm"><use href="#icon-template"></use></svg>
                        Insert Variable
                    </button>
                    <button type="button" class="btn btn-secondary" onclick="emailComposer.previewEmail()">
                        <svg class="icon icon-sm"><use href="#icon-mail"></use></svg>
                        Preview
                    </button>
                </div>
            </div>
        `;

        // Replace the existing textarea with rich editor
        const emailBodyTextarea = document.getElementById('emailBody');
        if (emailBodyTextarea) {
            emailBodyTextarea.parentNode.replaceChild(editorContainer, emailBodyTextarea);
            this.editor = document.getElementById('richEditor');
            this.setupEditorEvents();
        }
    }

    createToolbar() {
        return `
            <div class="editor-toolbar">
                <div class="toolbar-group">
                    <button type="button" class="toolbar-btn" onclick="emailComposer.formatText('bold')" title="Bold">
                        <strong>B</strong>
                    </button>
                    <button type="button" class="toolbar-btn" onclick="emailComposer.formatText('italic')" title="Italic">
                        <em>I</em>
                    </button>
                    <button type="button" class="toolbar-btn" onclick="emailComposer.formatText('underline')" title="Underline">
                        <u>U</u>
                    </button>
                </div>
                <div class="toolbar-group">
                    <select class="toolbar-select" onchange="emailComposer.changeFontSize(this.value)">
                        <option value="">Font Size</option>
                        <option value="12px">12px</option>
                        <option value="14px">14px</option>
                        <option value="16px">16px</option>
                        <option value="18px">18px</option>
                        <option value="20px">20px</option>
                        <option value="24px">24px</option>
                    </select>
                    <input type="color" class="toolbar-color" onchange="emailComposer.changeTextColor(this.value)" title="Text Color">
                </div>
                <div class="toolbar-group">
                    <button type="button" class="toolbar-btn" onclick="emailComposer.formatText('justifyLeft')" title="Align Left">
                        ←
                    </button>
                    <button type="button" class="toolbar-btn" onclick="emailComposer.formatText('justifyCenter')" title="Align Center">
                        ↔
                    </button>
                    <button type="button" class="toolbar-btn" onclick="emailComposer.formatText('justifyRight')" title="Align Right">
                        →
                    </button>
                </div>
                <div class="toolbar-group">
                    <button type="button" class="toolbar-btn" onclick="emailComposer.formatText('insertUnorderedList')" title="Bullet List">
                        •
                    </button>
                    <button type="button" class="toolbar-btn" onclick="emailComposer.formatText('insertOrderedList')" title="Numbered List">
                        1.
                    </button>
                    <button type="button" class="toolbar-btn" onclick="emailComposer.insertLink()" title="Insert Link">
                        🔗
                    </button>
                </div>
                <div class="toolbar-group">
                    <button type="button" class="toolbar-btn" onclick="emailComposer.insertTable()" title="Insert Table">
                        ⊞
                    </button>
                    <button type="button" class="toolbar-btn" onclick="emailComposer.insertImage()" title="Insert Image">
                        🖼
                    </button>
                </div>
            </div>
        `;
    }

    setupEditorEvents() {
        if (!this.editor) return;

        // Auto-save as draft
        this.editor.addEventListener('input', () => {
            this.isDraft = true;
            this.autoSaveDraft();
        });

        // Handle paste events
        this.editor.addEventListener('paste', (e) => {
            e.preventDefault();
            const text = e.clipboardData.getData('text/plain');
            document.execCommand('insertText', false, text);
        });

        // Handle keyboard shortcuts
        this.editor.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                switch (e.key) {
                    case 'b':
                        e.preventDefault();
                        this.formatText('bold');
                        break;
                    case 'i':
                        e.preventDefault();
                        this.formatText('italic');
                        break;
                    case 'u':
                        e.preventDefault();
                        this.formatText('underline');
                        break;
                    case 's':
                        e.preventDefault();
                        this.saveDraft();
                        break;
                }
            }
        });
    }

    setupEventListeners() {
        // Template selection
        document.addEventListener('change', (e) => {
            if (e.target.id === 'templateSelect') {
                this.loadTemplate(e.target.value);
            }
        });

        // Recipient management
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('recipient-tag-remove')) {
                this.removeRecipient(e.target.dataset.email);
            }
        });
    }

    formatText(command, value = null) {
        document.execCommand(command, false, value);
        this.editor.focus();
    }

    changeFontSize(size) {
        if (size) {
            this.formatText('fontSize', '7');
            const selection = window.getSelection();
            if (selection.rangeCount > 0) {
                const range = selection.getRangeAt(0);
                const span = document.createElement('span');
                span.style.fontSize = size;
                try {
                    range.surroundContents(span);
                } catch (e) {
                    span.appendChild(range.extractContents());
                    range.insertNode(span);
                }
            }
        }
        this.editor.focus();
    }

    changeTextColor(color) {
        this.formatText('foreColor', color);
    }

    insertLink() {
        const url = prompt('Enter the URL:');
        if (url) {
            this.formatText('createLink', url);
        }
    }

    insertTable() {
        const rows = prompt('Number of rows:', '3');
        const cols = prompt('Number of columns:', '3');
        
        if (rows && cols) {
            let tableHTML = '<table border="1" style="border-collapse: collapse; width: 100%;">';
            for (let i = 0; i < parseInt(rows); i++) {
                tableHTML += '<tr>';
                for (let j = 0; j < parseInt(cols); j++) {
                    tableHTML += '<td style="padding: 8px; border: 1px solid #ccc;">&nbsp;</td>';
                }
                tableHTML += '</tr>';
            }
            tableHTML += '</table>';
            
            this.formatText('insertHTML', tableHTML);
        }
    }

    insertImage() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    const img = `<img src="${e.target.result}" style="max-width: 100%; height: auto;" alt="Inserted image">`;
                    this.formatText('insertHTML', img);
                };
                reader.readAsDataURL(file);
            }
        };
        input.click();
    }

    insertVariable() {
        const variables = [
            '{{firstName}}',
            '{{lastName}}',
            '{{email}}',
            '{{company}}',
            '{{date}}',
            '{{time}}'
        ];

        const variable = prompt('Select a variable to insert:\n' + variables.join('\n'));
        if (variable && variables.includes(variable)) {
            this.formatText('insertText', variable);
        }
    }

    addAttachment() {
        const input = document.createElement('input');
        input.type = 'file';
        input.multiple = true;
        input.onchange = (e) => {
            Array.from(e.target.files).forEach(file => {
                this.attachments.push({
                    id: Date.now() + Math.random(),
                    name: file.name,
                    size: file.size,
                    type: file.type,
                    file: file
                });
            });
            this.updateAttachmentsList();
        };
        input.click();
    }

    updateAttachmentsList() {
        const container = document.getElementById('attachmentsList');
        if (!container) return;

        if (this.attachments.length === 0) {
            container.innerHTML = '';
            return;
        }

        let html = '<div class="attachments-header">Attachments:</div>';
        this.attachments.forEach(attachment => {
            const sizeKB = Math.round(attachment.size / 1024);
            html += `
                <div class="attachment-item" data-id="${attachment.id}">
                    <span class="attachment-name">${attachment.name}</span>
                    <span class="attachment-size">(${sizeKB} KB)</span>
                    <button type="button" class="attachment-remove" onclick="emailComposer.removeAttachment('${attachment.id}')">
                        <svg class="icon icon-sm"><use href="#icon-trash"></use></svg>
                    </button>
                </div>
            `;
        });
        container.innerHTML = html;
    }

    removeAttachment(id) {
        this.attachments = this.attachments.filter(att => att.id !== id);
        this.updateAttachmentsList();
    }

    loadTemplate(templateId) {
        if (!templateId) return;

        const template = templates.find(t => t.id == templateId);
        if (template) {
            document.getElementById('emailSubject').value = template.subject;
            this.editor.innerHTML = template.body;
            this.currentTemplate = template;
            showNotification('success', 'Template loaded successfully');
        }
    }

    getEmailContent() {
        return {
            to: this.getRecipients(),
            subject: document.getElementById('emailSubject').value,
            body: this.editor.innerHTML,
            plainText: this.editor.textContent,
            attachments: this.attachments
        };
    }

    getRecipients() {
        const toField = document.getElementById('emailTo').value;
        return toField.split(',').map(email => email.trim()).filter(email => email);
    }

    setEmailContent(content) {
        if (content.to) {
            document.getElementById('emailTo').value = content.to.join(', ');
        }
        if (content.subject) {
            document.getElementById('emailSubject').value = content.subject;
        }
        if (content.body) {
            this.editor.innerHTML = content.body;
        }
        if (content.attachments) {
            this.attachments = content.attachments;
            this.updateAttachmentsList();
        }
    }

    clearEditor() {
        document.getElementById('emailTo').value = '';
        document.getElementById('emailSubject').value = '';
        this.editor.innerHTML = '';
        this.attachments = [];
        this.updateAttachmentsList();
        this.currentTemplate = null;
        this.isDraft = false;
    }

    previewEmail() {
        const content = this.getEmailContent();
        
        if (!content.to.length || !content.subject || !content.body) {
            showNotification('error', 'Please fill in all required fields');
            return;
        }

        // Create preview modal
        const modal = document.createElement('div');
        modal.className = 'email-preview-modal';
        modal.innerHTML = `
            <div class="modal-overlay" onclick="this.parentElement.remove()"></div>
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Email Preview</h3>
                    <button type="button" class="modal-close" onclick="this.closest('.email-preview-modal').remove()">×</button>
                </div>
                <div class="modal-body">
                    <div class="preview-field">
                        <strong>To:</strong> ${content.to.join(', ')}
                    </div>
                    <div class="preview-field">
                        <strong>Subject:</strong> ${content.subject}
                    </div>
                    <div class="preview-field">
                        <strong>Content:</strong>
                        <div class="preview-content">${content.body}</div>
                    </div>
                    ${content.attachments.length > 0 ? `
                        <div class="preview-field">
                            <strong>Attachments:</strong>
                            <ul>
                                ${content.attachments.map(att => `<li>${att.name} (${Math.round(att.size/1024)} KB)</li>`).join('')}
                            </ul>
                        </div>
                    ` : ''}
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" onclick="this.closest('.email-preview-modal').remove()">Close</button>
                    <button type="button" class="btn btn-primary" onclick="emailComposer.sendFromPreview()">Send Email</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
    }

    sendFromPreview() {
        document.querySelector('.email-preview-modal').remove();
        sendEmail();
    }

    saveDraft() {
        const content = this.getEmailContent();
        const draft = {
            id: Date.now(),
            ...content,
            savedAt: new Date().toISOString()
        };

        let drafts = JSON.parse(localStorage.getItem('aurareach_drafts') || '[]');
        drafts.push(draft);
        localStorage.setItem('aurareach_drafts', JSON.stringify(drafts));

        showNotification('success', 'Draft saved successfully');
        this.isDraft = false;
    }

    autoSaveDraft() {
        if (this.isDraft) {
            clearTimeout(this.autoSaveTimeout);
            this.autoSaveTimeout = setTimeout(() => {
                this.saveDraft();
            }, 30000); // Auto-save after 30 seconds of inactivity
        }
    }

    loadDrafts() {
        const drafts = JSON.parse(localStorage.getItem('aurareach_drafts') || '[]');
        if (drafts.length > 0) {
            // Add drafts section to the compose tab
            this.addDraftsSection(drafts);
        }
    }

    addDraftsSection(drafts) {
        const composeTab = document.getElementById('compose');
        if (!composeTab) return;

        const draftsSection = document.createElement('div');
        draftsSection.className = 'card';
        draftsSection.innerHTML = `
            <h3>
                <svg class="icon"><use href="#icon-template"></use></svg>
                Saved Drafts
            </h3>
            <div id="draftsContainer">
                ${drafts.map(draft => `
                    <div class="list-item">
                        <div>
                            <strong>${draft.subject || 'No Subject'}</strong><br>
                            <small>Saved: ${new Date(draft.savedAt).toLocaleString()}</small>
                        </div>
                        <div class="list-actions">
                            <button class="btn btn-secondary" onclick="emailComposer.loadDraft('${draft.id}')">
                                <svg class="icon icon-sm"><use href="#icon-edit"></use></svg>
                                Load
                            </button>
                            <button class="btn btn-danger" onclick="emailComposer.deleteDraft('${draft.id}')">
                                <svg class="icon icon-sm"><use href="#icon-trash"></use></svg>
                                Delete
                            </button>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;

        composeTab.appendChild(draftsSection);
    }

    loadDraft(draftId) {
        const drafts = JSON.parse(localStorage.getItem('aurareach_drafts') || '[]');
        const draft = drafts.find(d => d.id == draftId);
        
        if (draft) {
            this.setEmailContent(draft);
            showNotification('success', 'Draft loaded successfully');
        }
    }

    deleteDraft(draftId) {
        if (confirm('Are you sure you want to delete this draft?')) {
            let drafts = JSON.parse(localStorage.getItem('aurareach_drafts') || '[]');
            drafts = drafts.filter(d => d.id != draftId);
            localStorage.setItem('aurareach_drafts', JSON.stringify(drafts));
            
            // Refresh drafts display
            location.reload();
        }
    }
}

// Initialize email composer when DOM is loaded
let emailComposer;
document.addEventListener('DOMContentLoaded', function() {
    emailComposer = new EmailComposer();
});

// Enhanced email sending function
function sendEmail() {
    if (!emailComposer) {
        showNotification('error', 'Email composer not initialized');
        return;
    }

    const content = emailComposer.getEmailContent();
    
    if (!content.to.length || !content.subject || !content.body) {
        showNotification('error', 'Please fill in all required fields');
        return;
    }

    // Validate email addresses
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const invalidEmails = content.to.filter(email => !emailRegex.test(email));
    
    if (invalidEmails.length > 0) {
        showNotification('error', `Invalid email addresses: ${invalidEmails.join(', ')}`);
        return;
    }

    // Show sending progress
    showNotification('info', 'Sending email...');

    // Simulate email sending with progress
    setTimeout(() => {
        emailStats.totalEmails += content.to.length;
        updateDashboard();
        showNotification('success', `Email sent successfully to ${content.to.length} recipient(s)!`);
        
        // Clear form after successful send
        emailComposer.clearEditor();
        
        // Remove draft if it was saved
        if (emailComposer.isDraft) {
            emailComposer.isDraft = false;
        }
    }, 2000);
}

// Enhanced save as draft function
function saveAsDraft() {
    if (emailComposer) {
        emailComposer.saveDraft();
    }
}