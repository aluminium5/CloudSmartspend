/**
 * SmartSpend AI Advisor
 * Handles the financial advice chatbot logic and UI interactions.
 */
const AIAdvisor = (function() {
  // Elements initialized after DOM is ready
  let chatWindow, chatBtn, chatMessages, chatInput;
  
  // Settings
  let GROQ_API_KEY = localStorage.getItem('GROQ_API_KEY') || '';
  const MODEL = 'llama3-8b-8192';
  const SYSTEM_PROMPT = `You are the "SmartSpend Advisor", a premium AI financial assistant. 
  Your goal is to provide expert, concise, and professional financial advice. 
  Keep responses under 3 paragraphs unless asked for a detailed breakdown. 
  Focus on budgeting, savings, and smart investing. If the user's question is not about finance, politely redirect them back to financial topics.`;

  // Initialize elements when DOM is ready
  function init() {
    chatWindow = document.getElementById('ai-chat-window');
    chatBtn = document.getElementById('ai-chat-btn');
    chatMessages = document.getElementById('ai-chat-messages');
    chatInput = document.getElementById('ai-chat-input');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  function toggle() {
    if (!chatWindow) return;
    if (chatWindow.classList.contains('active')) {
      close();
    } else {
      open();
    }
  }

  function open() {
    if (!chatWindow) return;
    chatWindow.classList.add('active');
    chatBtn.style.display = 'none';
    chatInput.focus();
    
    if (!GROQ_API_KEY) {
      addMessage("Welcome! To enable Llama 3 AI advice, please click the key icon in the header to enter your free Groq API key.", 'ai');
    }
  }

  function close() {
    if (!chatWindow) return;
    chatWindow.classList.remove('active');
    chatBtn.style.display = 'flex';
  }

  function addMessage(text, sender) {
    if (!chatMessages) return;
    const msgDiv = document.createElement('div');
    msgDiv.className = `message ${sender}`;
    msgDiv.textContent = text;
    chatMessages.appendChild(msgDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  async function send() {
    if (!chatInput) return;
    const text = chatInput.value.trim();
    if (!text) return;

    if (!GROQ_API_KEY) {
      GROQ_API_KEY = localStorage.getItem('GROQ_API_KEY');
      if (!GROQ_API_KEY) {
        promptForKey();
        return;
      }
    }

    addMessage(text, 'user');
    chatInput.value = '';

    // Show typing indicator
    const typingMsg = document.createElement('div');
    typingMsg.className = 'message ai typing';
    typingMsg.textContent = 'Smart Advisor is thinking...';
    chatMessages.appendChild(typingMsg);
    chatMessages.scrollTop = chatMessages.scrollHeight;

    try {
      const response = await fetchGroqResponse(text);
      chatMessages.removeChild(typingMsg);
      addMessage(response, 'ai');
    } catch (error) {
      chatMessages.removeChild(typingMsg);
      addMessage("I'm sorry, I encountered an error connecting to Llama 3. Please check your API key and connection.", 'ai');
      console.error("Groq API Error:", error);
    }
  }

  async function fetchGroqResponse(userText) {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${GROQ_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userText }
        ],
        temperature: 0.7,
        max_tokens: 1024
      })
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error?.message || "API Request Failed");
    }

    const data = await response.json();
    return data.choices[0].message.content;
  }

  function promptForKey() {
    const key = prompt("Please enter your Groq API Key (get it for free at console.groq.com):");
    if (key) {
      localStorage.setItem('GROQ_API_KEY', key);
      GROQ_API_KEY = key;
      addMessage("API Key saved! You can now start chatting with Llama 3.", 'ai');
    }
  }

  function updateKey(newKey) {
    localStorage.setItem('GROQ_API_KEY', newKey);
    GROQ_API_KEY = newKey;
    alert("API Key updated successfully!");
  }

  return { toggle, close, send, promptForKey, updateKey };
})();


