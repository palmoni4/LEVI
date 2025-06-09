class GeminiClone {
    constructor() {
        // הגדרת הנחיות המערכת
        this.systemPrompt = "אתה דונלד טראמפ שמדבר בעברית. אתה עונה תשובות בניסוח טראמפ ומפורטות על עצמך";
       
        this.currentChatId = null;
        this.chats = JSON.parse(localStorage.getItem('gemini-chats') || '{}');
        this.apiKey = localStorage.getItem('gemini-api-key') || '';
        this.currentModel = localStorage.getItem('gemini-model') || 'gemini-2.0-flash-exp';
        this.settings = JSON.parse(localStorage.getItem('gemini-settings') || '{"temperature": 0.7, "maxTokens": 2048}');
        this.isLoading = false;
        this.abortController = null;
        this.files = [];
        this.initializeElements();
        this.bindEvents();
        this.loadSettings();
        this.setupAutoResize();
        this.loadTheme();
        this.initializeQuickActions();
    }

    initializeElements() {
        this.sidebar = document.getElementById('sidebar');
        this.sidebarToggle = document.getElementById('sidebarToggle');
        this.newChatBtn = document.getElementById('newChatBtn');
        this.chatHistory = document.getElementById('historyList');
        this.themeToggle = document.getElementById('themeToggle');
        this.clearHistoryBtn = document.getElementById('clearHistoryBtn');
        this.exportBtn = document.getElementById('exportBtn');
        this.geminiApiKey = document.getElementById('geminiApiKey');
        this.geminiModel = document.getElementById('geminiModel');
        this.temperatureSlider = document.getElementById('temperature');
        this.maxTokensSlider = document.getElementById('maxTokens');
        this.tempValue = document.getElementById('tempValue');
        this.maxTokensValue = document.getElementById('maxTokensValue');
        this.apiStatus = document.getElementById('apiStatus');
        this.mainContent = document.getElementById('mainContent');
        this.welcomeScreen = document.getElementById('welcomeScreen');
        this.chatMessages = document.getElementById('chatMessages');
        this.chatContainer = document.getElementById('chatContainer');
        this.chatTitle = document.getElementById('chatTitle');
        this.shareBtn = document.getElementById('shareBtn');
        this.regenerateBtn = document.getElementById('regenerateBtn');
        this.messageInput = document.getElementById('messageInput');
        this.sendBtn = document.getElementById('sendBtn');
        this.stopBtn = document.getElementById('stopBtn');
        this.charCount = document.getElementById('charCount');
        this.modelInfo = document.getElementById('modelInfo');
        this.attachBtn = document.getElementById('attachBtn');
        this.micBtn = document.getElementById('micBtn');
        this.loadingOverlay = document.getElementById('loadingOverlay');
        this.loadingMessage = document.getElementById('loadingMessage');
        this.toastContainer = document.getElementById('toastContainer');
        this.contextMenu = document.getElementById('contextMenu');
        this.filePreviewList = document.getElementById('filePreviewList');
    }

    bindEvents() {
        this.sidebarToggle.addEventListener('click', () => this.toggleSidebar());
        this.newChatBtn.addEventListener('click', () => this.startNewChat());
        this.themeToggle.addEventListener('click', () => this.toggleTheme());
        this.clearHistoryBtn.addEventListener('click', () => this.clearHistory());
        this.exportBtn.addEventListener('click', () => this.exportChat());
        this.geminiApiKey.addEventListener('input', (e) => this.saveApiKey(e.target.value));
        this.geminiModel.addEventListener('change', (e) => this.changeModel(e.target.value));
        this.temperatureSlider.addEventListener('input', (e) => this.updateTemperature(e.target.value));
        this.maxTokensSlider.addEventListener('input', (e) => this.updateMaxTokens(e.target.value));
        this.shareBtn.addEventListener('click', () => this.shareChat());
        this.regenerateBtn.addEventListener('click', () => this.regenerateLastResponse());
        this.messageInput.addEventListener('input', () => this.updateCharCount());
        this.messageInput.addEventListener('keydown', (e) => this.handleKeyDown(e));
        this.sendBtn.addEventListener('click', () => this.sendMessage());
        this.stopBtn.addEventListener('click', () => this.abortGeneration());
        document.querySelectorAll('.suggestion-card').forEach(card => {
            card.addEventListener('click', () => {
                const prompt = card.getAttribute('data-prompt');
                this.messageInput.value = prompt;
                this.updateCharCount();
                this.sendMessage();
            });
        });
        this.attachBtn.addEventListener('click', () => this.handleAttachment());
        this.micBtn.addEventListener('click', () => this.toggleVoiceRecording());
        document.addEventListener('contextmenu', (e) => this.handleContextMenu(e));
        document.addEventListener('click', () => this.hideContextMenu());
        document.addEventListener('keydown', (e) => this.handleGlobalShortcuts(e));
        // Drag & drop
        this.messageInput.addEventListener('dragover', (e) => {
            e.preventDefault();
            this.inputWrapper().classList.add('dragover');
        });
        this.messageInput.addEventListener('dragleave', (e) => {
            e.preventDefault();
            this.inputWrapper().classList.remove('dragover');
        });
        this.messageInput.addEventListener('drop', (e) => {
            e.preventDefault();
            this.inputWrapper().classList.remove('dragover');
            this.handleDropFiles(e.dataTransfer.files);
        });
    }

    inputWrapper() {
        return this.messageInput.closest('.input-wrapper');
    }

    handleDropFiles(fileList) {
        const files = Array.from(fileList);
        this.files.push(...files);
        this.renderFilePreview();
    }

    handleAttachment() {
        const input = document.createElement('input');
        input.type = 'file';
        input.multiple = true;
        input.onchange = (e) => {
            const files = Array.from(e.target.files);
            this.files.push(...files);
            this.renderFilePreview();
        };
        input.click();
    }

    renderFilePreview() {
        this.filePreviewList.innerHTML = '';
        this.files.forEach((file, idx) => {
            const icon = this.getFileIcon(file);
            const el = document.createElement('div');
            el.className = 'file-preview';
            el.innerHTML = `
                <span class="material-icons">${icon}</span>
                <span title="${file.name}">${file.name.length > 18 ? file.name.slice(0,15)+'...' : file.name}</span>
                <span>(${this.formatFileSize(file.size)})</span>
                <button class="file-remove-btn" title="הסר" data-idx="${idx}">
                    <span class="material-icons">close</span>
                </button>
            `;
            el.querySelector('.file-remove-btn').onclick = (e) => {
                this.files.splice(idx, 1);
                this.renderFilePreview();
            };
            this.filePreviewList.appendChild(el);
        });
    }

    getFileIcon(file) {
        if (file.type && file.type.startsWith('image/')) return 'image';
        if (file.type && file.type.startsWith('video/')) return 'movie';
        if (file.type && file.type.startsWith('audio/')) return 'audiotrack';
        if (file.type === 'application/pdf') return 'picture_as_pdf';
        if (file.type && file.type.includes('word')) return 'description';
        if (file.type && file.type.includes('excel')) return 'grid_on';
        if (file.type && file.type.includes('zip')) return 'folder_zip';
        if (file.type && file.type.startsWith('text/')) return 'article';
        return 'attach_file';
    }

    formatFileSize(size) {
        if (size < 1024) return size + 'B';
        if (size < 1024 * 1024) return (size/1024).toFixed(1) + 'KB';
        return (size/1024/1024).toFixed(1) + 'MB';
    }

    loadSettings() {
        this.geminiApiKey.value = this.apiKey;
        this.geminiModel.value = this.currentModel;
        this.temperatureSlider.value = this.settings.temperature;
        this.maxTokensSlider.value = this.settings.maxTokens;
        this.tempValue.textContent = this.settings.temperature;
        this.maxTokensValue.textContent = this.settings.maxTokens;
        this.modelInfo.textContent = this.getModelDisplayName(this.currentModel);
        if (this.apiKey) this.validateApiKey();
        this.renderChatHistory();
    }

    getModelDisplayName(modelId) {
        const models = {
            'gemini-2.0-flash-exp': 'Gemini 2.0 Flash Experimental',
            'gemini-1.5-flash': 'Gemini 1.5 Flash',
            'gemini-1.5-flash-8b': 'Gemini 1.5 Flash 8B',
            'gemini-1.5-pro': 'Gemini 1.5 Pro',
            'gemini-1.0-pro': 'Gemini 1.0 Pro'
        };
        return models[modelId] || modelId;
    }

    async validateApiKey() {
        if (!this.apiKey) return;
        try {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${this.apiKey}`);
            if (response.ok) {
                this.showApiStatus('API Key תקף ומחובר', 'success');
            } else {
                this.showApiStatus('API Key לא תקף', 'error');
            }
        } catch (error) {
            this.showApiStatus('שגיאה בבדיקת API Key', 'error');
        }
    }

    showApiStatus(message, type) {
        this.apiStatus.textContent = message;
        this.apiStatus.className = `api-status ${type}`;
        this.apiStatus.style.display = 'block';
    }

    saveApiKey(key) {
        this.apiKey = key;
        localStorage.setItem('gemini-api-key', key);
        if (key.trim()) {
            this.validateApiKey();
            this.showToast('API Key נשמר בהצלחה', 'success');
        } else {
            this.apiStatus.style.display = 'none';
        }
    }

    changeModel(model) {
        this.currentModel = model;
        localStorage.setItem('gemini-model', model);
        this.modelInfo.textContent = this.getModelDisplayName(model);
        this.showToast(`עבר למודל ${this.getModelDisplayName(model)}`, 'success');
    }

    updateTemperature(value) {
        this.settings.temperature = parseFloat(value);
        this.tempValue.textContent = value;
        this.saveSettings();
    }

    updateMaxTokens(value) {
        this.settings.maxTokens = parseInt(value);
        this.maxTokensValue.textContent = value;
        this.saveSettings();
    }

    saveSettings() {
        localStorage.setItem('gemini-settings', JSON.stringify(this.settings));
    }

    toggleSidebar() {
        this.sidebar.classList.toggle('collapsed');
        this.mainContent.classList.toggle('sidebar-collapsed');
        localStorage.setItem('sidebar-collapsed', this.sidebar.classList.contains('collapsed'));
    }

    toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('gemini-theme', newTheme);
        const icon = this.themeToggle.querySelector('.material-icons');
        icon.textContent = newTheme === 'dark' ? 'light_mode' : 'dark_mode';
    }

    loadTheme() {
        const savedTheme = localStorage.getItem('gemini-theme') || 'light';
        document.documentElement.setAttribute('data-theme', savedTheme);
        const icon = this.themeToggle.querySelector('.material-icons');
        icon.textContent = savedTheme === 'dark' ? 'light_mode' : 'dark_mode';
        const sidebarCollapsed = localStorage.getItem('sidebar-collapsed') === 'true';
        if (sidebarCollapsed) {
            this.sidebar.classList.add('collapsed');
            this.mainContent.classList.add('sidebar-collapsed');
        }
    }

    setupAutoResize() {
        this.messageInput.addEventListener('input', () => {
            this.messageInput.style.height = 'auto';
            this.messageInput.style.height = Math.min(this.messageInput.scrollHeight, 200) + 'px';
        });
    }

    updateCharCount() {
        const length = this.messageInput.value.length;
        this.charCount.textContent = `${length}/8000`;
        this.sendBtn.disabled = length === 0 || this.isLoading;
        if (length > 7000) {
            this.charCount.style.color = 'var(--accent-color)';
        } else {
            this.charCount.style.color = 'var(--text-tertiary)';
        }
    }

    handleKeyDown(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (!this.isLoading && this.messageInput.value.trim()) {
                this.sendMessage();
            }
        } else if (e.key === 'Enter' && e.ctrlKey) {
            e.preventDefault();
            if (!this.isLoading && this.messageInput.value.trim()) {
                this.sendMessage();
            }
        }
    }

    handleGlobalShortcuts(e) {
        if (e.ctrlKey && e.key === 'n') {
            e.preventDefault();
            this.startNewChat();
        } else if (e.ctrlKey && e.key === 'b') {
            e.preventDefault();
            this.toggleSidebar();
        }
    }

    startNewChat() {
        this.currentChatId = this.generateChatId();
        this.chats[this.currentChatId] = {
            id: this.currentChatId,
            title: 'צ\'אט חדש',
            messages: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            model: this.currentModel
        };
        this.saveChatData();
        this.showChatInterface();
        this.renderChatHistory();
        this.updateChatTitle('צ\'אט חדש');
        this.messageInput.focus();
        this.files = [];
        this.renderFilePreview();
    }

    showChatInterface() {
        this.welcomeScreen.style.display = 'none';
        this.chatMessages.classList.add('active');
        this.chatMessages.style.display = 'block';
        this.renderMessages();
    }

    updateChatTitle(title) {
        this.chatTitle.textContent = title;
    }

    async sendMessage() {
        const message = this.messageInput.value.trim();
        if (!message || this.isLoading) return;
        if (!this.apiKey) {
            this.showToast('אנא הזן API Key עבור Gemini', 'error');
            return;
        }
        if (!this.currentChatId) {
            this.startNewChat();
        }
        const userMessage = {
            id: this.generateMessageId(),
            role: 'user',
            content: message,
            timestamp: new Date().toISOString(),
            files: this.files.map(f => ({ name: f.name, size: f.size, type: f.type }))
        };
        this.chats[this.currentChatId].messages.push(userMessage);
        this.chats[this.currentChatId].updatedAt = new Date().toISOString();
        if (this.chats[this.currentChatId].messages.length === 1) {
            const title = message.substring(0, 30) + (message.length > 30 ? '...' : '');
            this.chats[this.currentChatId].title = title;
            this.updateChatTitle(title);
        }
        this.saveChatData();
        this.renderMessages();
        this.renderChatHistory();
        this.messageInput.value = '';
        this.updateCharCount();
        this.messageInput.style.height = 'auto';
        this.files = [];
        this.renderFilePreview();
        this.setLoading(true);
        this.showLoadingSteps();
        this.abortController = new AbortController();
        try {
            const response = await this.callGemini(message, this.abortController.signal);
            const assistantMessage = {
                id: this.generateMessageId(),
                role: 'assistant',
                content: response,
                timestamp: new Date().toISOString(),
                model: this.currentModel
            };
            this.chats[this.currentChatId].messages.push(assistantMessage);
            this.chats[this.currentChatId].updatedAt = new Date().toISOString();
            this.saveChatData();
            this.renderMessages();
        } catch (error) {
            if (error.name === 'AbortError') {
                this.showToast('התגובה הופסקה', 'error');
            } else {
                this.showToast('שגיאה בשליחת ההודעה: ' + error.message, 'error');
            }
        } finally {
            this.setLoading(false);
        }
        setTimeout(() => {
            this.chatContainer.scrollTop = this.chatContainer.scrollHeight;
        }, 100);
    }

    showLoadingSteps() {
        const steps = document.querySelectorAll('.step');
        let currentStep = 0;
        const stepMessages = [
            'מנתח את השאלה...',
            'מחפש מידע רלוונטי...',
            'מכין תשובה מקיפה...'
        ];
        const interval = setInterval(() => {
            if (currentStep > 0) steps[currentStep - 1].classList.remove('active');
            if (currentStep < steps.length) {
                steps[currentStep].classList.add('active');
                this.loadingMessage.textContent = stepMessages[currentStep];
                currentStep++;
            } else {
                clearInterval(interval);
            }
        }, 1000);
        this.loadingInterval = interval;
    }

    async callGemini(message, signal) {
const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.currentModel}:generateContent?key=${this.apiKey}`;
        
        // הוספת הנחיות המערכת בתחילת כל שיחה
        const messages = [{
            role: 'user',
            parts: [{ text: this.systemPrompt }]
        }, {
            role: 'model',
            parts: [{ text: 'Understanding confirmed.' }]
        }];

        // הוספת היסטוריית השיחה
        const conversationHistory = this.chats[this.currentChatId].messages.slice(-10);
        messages.push(...conversationHistory.map(msg => ({
            role: msg.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: msg.content }]
        })));

        // הוספת ההודעה הנוכחית
        messages.push({
            role: 'user',
            parts: [{ text: message }]
        });

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: messages,
                generationConfig: {
                    temperature: this.settings.temperature,
                    topK: 40,
                    topP: 0.95,
                    maxOutputTokens: this.settings.maxTokens,
                },
                safetySettings: [
                    { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
                    { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_MEDIUM_AND_ABOVE" }
                ]
            }),
            signal
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error?.message || 'Gemini API Error');
        }
        const data = await response.json();
        if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
            throw new Error('תגובה לא תקינה מ-Gemini API');
        }
        return data.candidates[0].content.parts[0].text;
    }

    abortGeneration() {
        if (this.abortController) {
            this.abortController.abort();
            this.abortController = null;
            this.setLoading(false);
        }
    }

    renderMessages() {
        if (!this.currentChatId || !this.chats[this.currentChatId]) {
            this.chatMessages.innerHTML = '';
            return;
        }
        const messages = this.chats[this.currentChatId].messages;
        this.chatMessages.innerHTML = messages.map(message => this.createMessageHTML(message)).join('');
        this.bindMessageActions();
        Prism.highlightAll();
    }

    createMessageHTML(message) {
        const isUser = message.role === 'user';
        const time = new Date(message.timestamp).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
const avatar = isUser ? '<span>אתה</span>' : '<img src="YRTNP1.jpg" alt="תיאור התמונה" width="40">';
        const senderName = isUser ? 'אתה' : 'טראמפ';
        let filesHtml = '';
        if (isUser && message.files && message.files.length) {
            filesHtml = `<div class="file-preview-list" style="margin-top:8px;">` +
                message.files.map(f =>
                    `<div class="file-preview">
                        <span class="material-icons">${this.getFileIcon(f)}</span>
                        <span title="${f.name}">${f.name.length > 18 ? f.name.slice(0,15)+'...' : f.name}</span>
                        <span>(${this.formatFileSize(f.size)})</span>
                    </div>`
                ).join('') + `</div>`;
        }
        return `
            <div class="message ${message.role}" data-message-id="${message.id}">
                <div class="message-header">
                    <div class="message-avatar">${avatar}</div>
                    <span class="message-sender">${senderName}</span>
                    <span class="message-time">${time}</span>
                    ${message.model ? `<span class="message-model">${this.getModelDisplayName(message.model)}</span>` : ''}
                </div>
                <div class="message-content">
                    ${this.formatMessageContent(message.content)}
                    ${filesHtml}
                </div>
                <div class="message-actions">
                    ${!isUser ? `
                        <button class="action-btn-small copy-btn" title="העתק">
                            <span class="material-icons">content_copy</span>
                        </button>
                        <button class="action-btn-small share-btn" title="שתף">
                            <span class="material-icons">share</span>
                        </button>
                        <button class="action-btn-small delete-btn" title="מחק">
                            <span class="material-icons">delete</span>
                        </button>
                    ` : `
                        <button class="action-btn-small edit-btn" title="ערוך">
                            <span class="material-icons">edit</span>
                        </button>
                        <button class="action-btn-small delete-btn" title="מחק">
                            <span class="material-icons">delete</span>
                        </button>
                    `}
                </div>
            </div>
        `;
    }

    formatMessageContent(content) {
        // עיבוד קוד, קישורים, רשימות, כותרות, הדגשות, קו תחתון, טבלאות
        let formatted = content;
        // קוד בלוק - שמירה על מבנה שורות אמיתי
        formatted = formatted.replace(/```(\w+)?\n([\s\S]*?)```/g, (match, lang, code) => {
            lang = lang || 'javascript';
            // לא להמיר ל-entities לפני Prism!
            const highlighted = Prism.highlight(code, Prism.languages[lang] || Prism.languages.javascript, lang);
            return `<pre class="code-block"><code class="language-${lang}">${highlighted}</code>
                <button class="copy-code-btn" title="העתק קוד"><span class="material-icons">content_copy</span></button>
            </pre>`;
        });
        // קוד שורה
        formatted = formatted.replace(/`([^`]+)`/g, '<code>$1</code>');
        // קישורים
        formatted = formatted.replace(/\[([^\]]+)\]\((https?:\/\/[^\)]+)\)/g, '<a href="$2" target="_blank">$1</a>');
        // כותרות
        formatted = formatted.replace(/^### (.*)$/gm, '<h3>$1</h3>');
        formatted = formatted.replace(/^## (.*)$/gm, '<h2>$1</h2>');
        formatted = formatted.replace(/^# (.*)$/gm, '<h1>$1</h1>');
        // רשימות
        formatted = formatted.replace(/^- (.+)$/gm, '<li>$1</li>');
        formatted = formatted.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');
        formatted = formatted.replace(/^\d+\. (.+)$/gm, '<li>$1</li>');
        // הדגשות
        formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        formatted = formatted.replace(/\*(.*?)\*/g, '<em>$1</em>');
        // קו תחתון
        formatted = formatted.replace(/__(.*?)__/g, '<u>$1</u>');
        // טבלאות (פשוט)
        formatted = formatted.replace(/((?:\|.+\|(?:\n|$))+)/g, (table) => {
            const rows = table.trim().split('\n');
            return '<table>' + rows.map(row => '<tr>' + row.split('|').filter(Boolean).map(cell => `<td>${cell.trim()}</td>`).join('') + '</tr>').join('') + '</table>';
        });
        // שורות חדשות (רק מחוץ לבלוקי קוד)
        formatted = formatted.replace(/(?<!<\/pre>)\n/g, '<br>');
        return formatted;
    }

    bindMessageActions() {
        document.querySelectorAll('.copy-code-btn').forEach(btn => {
            btn.onclick = (e) => {
                const code = btn.parentElement.querySelector('code').innerText;
                navigator.clipboard.writeText(code);
                this.showToast('הקוד הועתק', 'success');
                e.stopPropagation();
            };
        });
        document.querySelectorAll('.copy-btn').forEach(btn => {
            btn.onclick = (e) => {
                const msg = btn.closest('.message').querySelector('.message-content').innerText;
                navigator.clipboard.writeText(msg);
                this.showToast('הועתק ללוח', 'success');
                e.stopPropagation();
            };
        });
        document.querySelectorAll('.share-btn').forEach(btn => {
            btn.onclick = (e) => {
                const msg = btn.closest('.message').querySelector('.message-content').innerText;
                navigator.clipboard.writeText(msg);
                this.showToast('ההודעה הועתקה לשיתוף', 'success');
                e.stopPropagation();
            };
        });
        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.onclick = (e) => {
                const msgEl = btn.closest('.message');
                const messageId = msgEl.getAttribute('data-message-id');
                this.deleteMessage(messageId);
                e.stopPropagation();
            };
        });
        document.querySelectorAll('.edit-btn').forEach(btn => {
            btn.onclick = (e) => {
                const msgEl = btn.closest('.message');
                const messageId = msgEl.getAttribute('data-message-id');
                this.editMessage(messageId);
                e.stopPropagation();
            };
        });
    }

    editMessage(messageId) {
        this.showToast('עריכת הודעות תתאפשר בגרסה הבאה', 'success');
    }

    deleteMessage(messageId) {
        if (!this.currentChatId) return;
        const messages = this.chats[this.currentChatId].messages;
        const messageIndex = messages.findIndex(msg => msg.id === messageId);
        if (messageIndex !== -1) {
            messages.splice(messageIndex, 1);
            this.saveChatData();
            this.renderMessages();
            this.showToast('ההודעה נמחקה', 'success');
        }
    }

    renderChatHistory() {
        const sortedChats = Object.values(this.chats)
            .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
        this.chatHistory.innerHTML = sortedChats.map(chat => `
            <div class="history-item ${chat.id === this.currentChatId ? 'active' : ''}" 
                 data-chat-id="${chat.id}">
                <div class="history-item-title">${chat.title}</div>
                <div class="history-item-preview">
                    ${this.getChatSummary(chat)}
                </div>
            </div>
        `).join('');
        document.querySelectorAll('.history-item').forEach(item => {
            item.addEventListener('click', () => {
                const chatId = item.getAttribute('data-chat-id');
                this.loadChat(chatId);
            });
        });
    }

    getChatSummary(chat) {
        if (!chat.messages || chat.messages.length === 0) return 'שיחה חדשה';
        const firstUserMsg = chat.messages.find(m => m.role === 'user');
        if (firstUserMsg) {
            let summary = firstUserMsg.content.split('\n')[0];
            if (summary.length > 40) summary = summary.substring(0, 40) + '...';
            return summary;
        }
        return chat.title;
    }

    loadChat(chatId) {
        this.currentChatId = chatId;
        const chat = this.chats[chatId];
        this.showChatInterface();
        this.updateChatTitle(chat.title);
        this.renderChatHistory();
        this.files = [];
        this.renderFilePreview();
    }

    clearHistory() {
        if (confirm('האם אתה בטוח שברצונך למחוק את כל ההיסטוריה?')) {
            this.chats = {};
            this.currentChatId = null;
            localStorage.removeItem('gemini-chats');
            this.renderChatHistory();
            this.welcomeScreen.style.display = 'flex';
            this.chatMessages.style.display = 'none';
            this.chatMessages.classList.remove('active');
            this.updateChatTitle('צ\'אט חדש');
            this.showToast('ההיסטוריה נמחקה', 'success');
        }
    }

    shareChat() {
        if (!this.currentChatId) {
            this.showToast('אין צ\'אט לשיתוף', 'error');
            return;
        }
        const chat = this.chats[this.currentChatId];
        const chatText = chat.messages.map(msg =>
            `${msg.role === 'user' ? 'אתה' : 'Gemini'}: ${msg.content}`
        ).join('\n\n');
        navigator.clipboard.writeText(chatText).then(() => {
            this.showToast('הצ\'אט הועתק ללוח', 'success');
        });
    }

    exportChat() {
        if (!this.currentChatId) {
            this.showToast('אין צ\'אט לייצוא', 'error');
            return;
        }
        const chat = this.chats[this.currentChatId];
        const dataStr = JSON.stringify(chat, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = `chat_${chat.title.replace(/[^a-zA-Z0-9]/g, '_')}.json`;
        link.click();
        this.showToast('הצ\'אט יוצא בהצלחה', 'success');
    }

    initializeQuickActions() {
        document.querySelectorAll('.quick-action').forEach(btn => {
            btn.addEventListener('click', () => {
                const action = btn.getAttribute('data-action');
                this.handleQuickAction(action);
            });
        });
    }

    async handleQuickAction(action) {
        const currentText = this.messageInput.value;
        if (action === 'translate') {
            // תרגום ללא API: פתח translate.google.com עם הטקסט
            const isHebrew = /[\u0590-\u05FF]/.test(currentText);
            const targetLang = isHebrew ? 'en' : 'he';
            window.open(`https://translate.google.com/?sl=auto&tl=${targetLang}&text=${encodeURIComponent(currentText)}`, '_blank');
            this.showToast('נפתח תרגום בגוגל', 'success');
        } else {
            const prompts = {
                summarize: 'סכם את הנושא הזה בצורה קצרה ומובנת: ',
                explain: 'הסבר לי בפשטות מה זה: '
            };
            this.messageInput.value = prompts[action] + currentText;
            this.updateCharCount();
            this.messageInput.focus();
        }
    }

    handleContextMenu(e) {
        const messageElement = e.target.closest('.message');
        if (messageElement) {
            e.preventDefault();
            this.showContextMenu(e.pageX, e.pageY, messageElement);
        }
    }

    showContextMenu(x, y, messageElement) {
        this.contextMenu.style.display = 'block';
        this.contextMenu.style.left = x + 'px';
        this.contextMenu.style.top = y + 'px';
        document.querySelectorAll('.context-item').forEach(item => {
            item.onclick = () => {
                const action = item.getAttribute('data-action');
                this.handleContextAction(action, messageElement);
                this.hideContextMenu();
            };
        });
    }

    hideContextMenu() {
        this.contextMenu.style.display = 'none';
    }

    handleContextAction(action, messageElement) {
        const messageId = messageElement.getAttribute('data-message-id');
        switch (action) {
            case 'copy':
                const content = messageElement.querySelector('.message-content').innerText;
                navigator.clipboard.writeText(content);
                this.showToast('הועתק ללוח', 'success');
                break;
            case 'edit':
                this.editMessage(messageId);
                break;
            case 'delete':
                this.deleteMessage(messageId);
                break;
            case 'share':
                const msg = messageElement.querySelector('.message-content').innerText;
                navigator.clipboard.writeText(msg);
                this.showToast('ההודעה הועתקה לשיתוף', 'success');
                break;
        }
    }

    setLoading(loading) {
        this.isLoading = loading;
        this.loadingOverlay.classList.toggle('active', loading);
        this.sendBtn.disabled = loading || !this.messageInput.value.trim();

        // כפתור עצירה בתוך חלון הטעינה
        let stopBtnInOverlay = document.getElementById('stopBtnInOverlay');
        if (!stopBtnInOverlay) {
            stopBtnInOverlay = document.createElement('button');
            stopBtnInOverlay.id = 'stopBtnInOverlay';
            stopBtnInOverlay.className = 'stop-btn stop-btn-overlay';
            stopBtnInOverlay.innerHTML = `<span class="material-icons">stop_circle</span> עצור`;
            stopBtnInOverlay.onclick = () => this.abortGeneration();
            this.loadingOverlay.querySelector('.loading-content').appendChild(stopBtnInOverlay);
        }
        stopBtnInOverlay.style.display = loading ? 'inline-flex' : 'none';

        // הסתרת כפתור העצירה התחתון
        this.stopBtn.style.display = 'none';

        if (!loading && this.loadingInterval) {
            clearInterval(this.loadingInterval);
            document.querySelectorAll('.step').forEach(step => {
                step.classList.remove('active');
            });
        }
    }

    showToast(message, type = 'success') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <span class="material-icons">${type === 'success' ? 'check_circle' : 'error'}</span>
            <span>${message}</span>
        `;
        this.toastContainer.appendChild(toast);
        setTimeout(() => {
            toast.style.animation = 'toastSlideUp 0.3s ease-out forwards';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    toggleVoiceRecording() {
        if ('webkitSpeechRecognition' in window) {
            const recognition = new webkitSpeechRecognition();
            recognition.continuous = false;
            recognition.interimResults = false;
            recognition.lang = 'he-IL';
            recognition.onstart = () => {
                this.micBtn.style.color = 'var(--accent-color)';
                this.showToast('מתחיל להקליט...', 'success');
            };
            recognition.onresult = (event) => {
                const transcript = event.results[0][0].transcript;
                this.messageInput.value += transcript;
                this.updateCharCount();
            };
            recognition.onend = () => {
                this.micBtn.style.color = '';
                this.showToast('ההקלטה הסתיימה', 'success');
            };
            recognition.onerror = () => {
                this.micBtn.style.color = '';
                this.showToast('שגיאה בהקלטה', 'error');
            };
            recognition.start();
        } else {
            this.showToast('הדפדפן לא תומך בהקלטה קולית', 'error');
        }
    }

    generateChatId() {
        return 'chat_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    generateMessageId() {
        return 'msg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    saveChatData() {
        localStorage.setItem('gemini-chats', JSON.stringify(this.chats));
    }

    regenerateLastResponse() {
        this.showToast('פיצ\'ר זה יתווסף בקרוב', 'success');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new GeminiClone();
});

const style = document.createElement('style');
style.textContent = `
    @keyframes toastSlideUp {
        to {
            opacity: 0;
            transform: translateY(-20px);
        }
    }
    .message-model {
        font-size: 10px;
        background: var(--primary-color);
        color: white;
        padding: 2px 6px;
        border-radius: 4px;
        margin-right: auto;
    }
    .code-block {
        position: relative;
        background: var(--background-tertiary);
        border-radius: 8px;
        margin: 1rem 0;
        padding: 0.5rem 0.5rem 0.5rem 2.5rem;
    }
    .copy-code-btn {
        position: absolute;
        left: 0.5rem;
        top: 0.5rem;
        background: none;
        border: none;
        color: var(--text-secondary);
        cursor: pointer;
        border-radius: 4px;
        font-size: 1rem;
        z-index: 2;
        transition: background 0.2s;
    }
    .copy-code-btn:hover {
        background: var(--hover-color);
        color: var(--primary-color);
    }
    .sidebar.collapsed .sidebar-header .logo,
    .sidebar.collapsed .sidebar-header .logo-text {
        display: flex !important;
        justify-content: center;
        align-items: center;
    }
    .sidebar.collapsed .sidebar-header .logo-text {
        display: none !important;
    }
    .stop-btn-overlay {
        margin-top: 24px;
        margin-bottom: 0;
        font-size: 18px;
        padding: 12px 24px;
        background: var(--accent-color);
        color: #fff;
        border: none;
        border-radius: 16px;
        box-shadow: var(--shadow-medium);
        display: inline-flex;
        align-items: center;
        gap: 8px;
        cursor: pointer;
        transition: background 0.2s, transform 0.2s;
    }
    .stop-btn-overlay:hover {
        background: #c62828;
        transform: scale(1.05);
    }
    /* שיפור הצעות - גובה קטן יותר */
    .suggestion-card {
        min-width: 0;
        padding: 8px 10px;
        font-size: 12px;
        border-radius: var(--border-radius);
        display: flex;
        align-items: flex-start;
        gap: 8px;
        background: var(--background-secondary);
        border: 1px solid var(--border-color);
        cursor: pointer;
        transition: var(--transition);
        box-shadow: var(--shadow-light);
        position: relative;
        overflow: hidden;
        min-height: 0;
        margin-bottom: 0;
    }
    .card-icon {
        padding: 6px;
        border-radius: var(--border-radius-small);
        background: var(--gradient-primary);
        color: white;
        flex-shrink: 0;
        display: flex;
        align-items: center;
        justify-content: center;
    }
    .card-icon .material-icons {
        font-size: 18px;
    }
    .card-content h4 {
        font-size: 13px;
        margin-bottom: 2px;
        font-weight: 600;
        color: var(--text-primary);
    }
    .card-content p {
        font-size: 11px;
        color: var(--text-secondary);
    }
    /* שדה קלט - כפתורי הקלטה וקובץ בשורה אחת */
    .input-actions {
        display: flex;
        flex-direction: row;
        gap: 4px;
        align-items: flex-end;
        margin-left: 4px;
        margin-bottom: 0;
    }
    @media (max-width: 600px) {
        .suggestion-card {
            padding: 8px 6px;
        }
        .card-content h4 { font-size: 12px; }
        .card-content p { font-size: 10px; }
    }
    /* שמירה על מבנה שורות בקוד */
    .code-block code,
    .message-content pre,
    .message-content code {
        white-space: pre-wrap !important;
        word-break: break-word;
    }
`;
document.head.appendChild(style);