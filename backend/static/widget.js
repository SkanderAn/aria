(function() {
    console.log('Aria Widget: Initializing...');
    
    // Get configuration from script tag
    const scripts = document.getElementsByTagName('script');
    let config = {
        workspace: null,
        color: '#1A56DB',
        name: 'Aria',
        apiUrl: 'http://localhost:8000'
    };
    
    // Find the widget script and extract config
    for (let script of scripts) {
        if (script.src && script.src.includes('widget.js')) {
            config.workspace = script.getAttribute('data-workspace');
            config.color = script.getAttribute('data-color') || '#1A56DB';
            config.name = script.getAttribute('data-name') || 'Aria';
            config.apiUrl = script.getAttribute('data-api-url') || 'http://localhost:8000';
            console.log('Aria Widget: Config loaded', config);
            break;
        }
    }
    
    // Also check for config on window (fallback)
    if (!config.workspace && window.ariaWidgetConfig) {
        config = { ...config, ...window.ariaWidgetConfig };
        console.log('Aria Widget: Config from window', config);
    }
    
    if (!config.workspace) {
        console.error('Aria Widget: Missing workspace ID');
        // Show error message on page
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = 'position:fixed;bottom:20px;right:20px;background:#ef4444;color:white;padding:12px;border-radius:8px;font-size:12px;z-index:9999;font-family:monospace;max-width:300px;box-shadow:0 2px 10px rgba(0,0,0,0.1);';
        errorDiv.innerHTML = '⚠️ Aria Widget Error: Missing workspace ID. Please check your widget configuration.';
        document.body.appendChild(errorDiv);
        setTimeout(() => errorDiv.remove(), 5000);
        return;
    }
    
    // Generate unique session ID for this visitor
    const sessionId = Math.random().toString(36).substring(2, 15);
    
    // Create widget HTML
    const widgetHTML = `
        <div id="aria-widget-root">
            <style>
                #aria-chat-button {
                    position: fixed;
                    bottom: 20px;
                    right: 20px;
                    width: 60px;
                    height: 60px;
                    border-radius: 50%;
                    background: ${config.color};
                    color: white;
                    border: none;
                    cursor: pointer;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                    font-size: 24px;
                    z-index: 9998;
                    transition: all 0.3s ease;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                #aria-chat-button:hover {
                    transform: scale(1.1);
                    box-shadow: 0 6px 16px rgba(0,0,0,0.2);
                }
                #aria-chat-window {
                    position: fixed;
                    bottom: 90px;
                    right: 20px;
                    width: 380px;
                    height: 550px;
                    background: white;
                    border-radius: 12px;
                    box-shadow: 0 10px 40px rgba(0,0,0,0.2);
                    display: none;
                    flex-direction: column;
                    z-index: 9999;
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    overflow: hidden;
                    animation: slideUp 0.3s ease;
                }
                #aria-chat-window.open {
                    display: flex;
                }
                @keyframes slideUp {
                    from {
                        opacity: 0;
                        transform: translateY(20px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
                .aria-header {
                    background: ${config.color};
                    color: white;
                    padding: 16px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    cursor: pointer;
                }
                .aria-header h3 {
                    margin: 0;
                    font-size: 16px;
                    font-weight: 600;
                }
                .aria-header p {
                    margin: 4px 0 0;
                    font-size: 12px;
                    opacity: 0.9;
                }
                .aria-close {
                    background: none;
                    border: none;
                    color: white;
                    font-size: 24px;
                    cursor: pointer;
                    padding: 0;
                    width: 32px;
                    height: 32px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border-radius: 50%;
                    transition: background 0.2s;
                }
                .aria-close:hover {
                    background: rgba(255,255,255,0.2);
                }
                .aria-messages {
                    flex: 1;
                    overflow-y: auto;
                    padding: 16px;
                    background: #f9fafb;
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                }
                .aria-message {
                    max-width: 85%;
                    padding: 10px 14px;
                    border-radius: 12px;
                    font-size: 14px;
                    line-height: 1.5;
                    word-wrap: break-word;
                    animation: fadeIn 0.3s ease;
                }
                @keyframes fadeIn {
                    from {
                        opacity: 0;
                        transform: translateY(10px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
                .aria-message.user {
                    background: ${config.color};
                    color: white;
                    align-self: flex-end;
                    border-bottom-right-radius: 4px;
                }
                .aria-message.bot {
                    background: #e5e7eb;
                    color: #1f2937;
                    align-self: flex-start;
                    border-bottom-left-radius: 4px;
                }
                .aria-input-area {
                    padding: 16px;
                    border-top: 1px solid #e5e7eb;
                    display: flex;
                    gap: 8px;
                    background: white;
                }
                .aria-input {
                    flex: 1;
                    padding: 10px 12px;
                    border: 1px solid #d1d5db;
                    border-radius: 8px;
                    font-size: 14px;
                    outline: none;
                    transition: border-color 0.2s;
                }
                .aria-input:focus {
                    border-color: ${config.color};
                }
                .aria-send {
                    background: ${config.color};
                    color: white;
                    border: none;
                    border-radius: 8px;
                    padding: 10px 20px;
                    cursor: pointer;
                    font-weight: 500;
                    transition: opacity 0.2s;
                }
                .aria-send:hover {
                    opacity: 0.9;
                }
                .aria-send:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                }
                .aria-loading {
                    display: flex;
                    gap: 4px;
                    padding: 10px 14px;
                    background: #e5e7eb;
                    border-radius: 12px;
                    align-self: flex-start;
                    border-bottom-left-radius: 4px;
                }
                .aria-dot {
                    width: 8px;
                    height: 8px;
                    background: #6b7280;
                    border-radius: 50%;
                    animation: ariaPulse 1.4s ease-in-out infinite;
                }
                .aria-dot:nth-child(2) { animation-delay: 0.2s; }
                .aria-dot:nth-child(3) { animation-delay: 0.4s; }
                @keyframes ariaPulse {
                    0%, 60%, 100% {
                        transform: scale(0.8);
                        opacity: 0.3;
                    }
                    30% {
                        transform: scale(1.2);
                        opacity: 1;
                    }
                }
            </style>
            <button id="aria-chat-button">
                💬
            </button>
            <div id="aria-chat-window">
                <div class="aria-header">
                    <div>
                        <h3>${config.name}</h3>
                        <p>AI Assistant</p>
                    </div>
                    <button class="aria-close">×</button>
                </div>
                <div class="aria-messages" id="aria-messages">
                    <div class="aria-message bot">Hello! 👋 How can I help you today?</div>
                </div>
                <div class="aria-input-area">
                    <input type="text" class="aria-input" id="aria-input" placeholder="Type your message...">
                    <button class="aria-send" id="aria-send">Send</button>
                </div>
            </div>
        </div>
    `;
    
    // Add widget to page
    document.body.insertAdjacentHTML('beforeend', widgetHTML);
    
    // Get DOM elements
    const button = document.getElementById('aria-chat-button');
    const chatWindow = document.getElementById('aria-chat-window');
    const closeBtn = document.querySelector('.aria-close');
    const messagesDiv = document.getElementById('aria-messages');
    const input = document.getElementById('aria-input');
    const sendBtn = document.getElementById('aria-send');
    
    let isLoading = false;
    
    // Toggle chat window
    button.onclick = () => {
        chatWindow.classList.toggle('open');
    };
    
    closeBtn.onclick = () => {
        chatWindow.classList.remove('open');
    };
    
    // Function to add message
    function addMessage(text, role) {
        const msgDiv = document.createElement('div');
        msgDiv.className = `aria-message ${role}`;
        msgDiv.textContent = text;
        messagesDiv.appendChild(msgDiv);
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
    }
    
    // Function to send message
    async function sendMessage() {
        const message = input.value.trim();
        if (!message || isLoading) return;
        
        // Add user message
        addMessage(message, 'user');
        input.value = '';
        isLoading = true;
        sendBtn.disabled = true;
        
        // Show loading indicator
        const loadingDiv = document.createElement('div');
        loadingDiv.className = 'aria-loading';
        loadingDiv.innerHTML = '<div class="aria-dot"></div><div class="aria-dot"></div><div class="aria-dot"></div>';
        messagesDiv.appendChild(loadingDiv);
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
        
        try {
            // Send to backend
            const response = await fetch(`${config.apiUrl}/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    question: message,
                    session_id: sessionId,
                    workspace_id: config.workspace
                })
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            
            // Remove loading indicator
            loadingDiv.remove();
            
            // Add bot response
            addMessage(data.answer, 'bot');
            
        } catch (error) {
            console.error('Aria Widget Error:', error);
            loadingDiv.remove();
            addMessage('Sorry, I encountered an error. Please try again later.', 'bot');
        } finally {
            isLoading = false;
            sendBtn.disabled = false;
            input.focus();
        }
    }
    
    // Event listeners
    sendBtn.onclick = sendMessage;
    input.onkeypress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };
    
    console.log('Aria Widget: Initialized successfully for workspace', config.workspace);
})();