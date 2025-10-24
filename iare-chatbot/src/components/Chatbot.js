import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import './Chatbot.css';

function Chatbot() {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationHistory, setConversationHistory] = useState([]);
  const messagesContainerRef = useRef(null);

  // Scroll to show only the beginning of new messages
  const scrollToPartialView = () => {
    setTimeout(() => {
      const container = messagesContainerRef.current;
      if (!container) return;

      const messageElements = container.querySelectorAll('.message');
      if (messageElements.length === 0) return;

      const lastMessage = messageElements[messageElements.length - 1];
      const messageTop = lastMessage.offsetTop;
      const containerHeight = container.clientHeight;
      const scrollPosition = messageTop - (containerHeight * 0.2);
      
      container.scrollTo({
        top: Math.max(0, scrollPosition),
        behavior: 'smooth'
      });
    }, 100);
  };

  useEffect(() => {
    scrollToPartialView();
  }, [messages]);

  // Typewriter effect function
  const typewriterEffect = (text, speed = 20) => {
    return new Promise((resolve) => {
      let i = 0;
      let displayedText = '';
      
      const timer = setInterval(() => {
        if (i < text.length) {
          displayedText += text.charAt(i);
          i++;
          return displayedText;
        } else {
          clearInterval(timer);
          resolve(text);
        }
      }, speed);
    });
  };

  const addMessageWithAnimation = async (text, isUser = false, useTypewriter = false) => {
    const newMessage = {
      id: Date.now() + Math.random(),
      type: isUser ? 'user' : 'bot',
      text: useTypewriter ? '' : text, // Start with empty text for typewriter
      animate: true,
      isTyping: useTypewriter
    };
    
    setMessages(prev => [...prev, newMessage]);
    
    // If typewriter effect is enabled for bot messages
    if (useTypewriter && !isUser) {
      let displayedText = '';
      const speed = 10; // Adjust typing speed (lower = faster)
      
      for (let i = 0; i < text.length; i++) {
        displayedText += text.charAt(i);
        
        // Update message text gradually
        setMessages(prev => 
          prev.map(msg => 
            msg.id === newMessage.id 
              ? { ...msg, text: displayedText }
              : msg
          )
        );
        
        // Small delay to create typing effect
        await new Promise(resolve => setTimeout(resolve, speed));
      }
      
      // Mark typing as complete
      setMessages(prev => 
        prev.map(msg => 
          msg.id === newMessage.id 
            ? { ...msg, isTyping: false }
            : msg
        )
      );
    }
    
    // Remove animation class after animation completes
    setTimeout(() => {
      setMessages(prev => 
        prev.map(msg => 
          msg.id === newMessage.id 
            ? { ...msg, animate: false }
            : msg
        )
      );
    }, 500);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    // Add user message immediately (no typewriter)
    addMessageWithAnimation(inputValue, true, false);
    const currentQuestion = inputValue;
    setInputValue('');
    setIsLoading(true);

    try {
      const response = await fetch('http://localhost:5000/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          question: currentQuestion,
          conversationHistory: conversationHistory
        })
      });

      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }

      // Add bot message with typewriter effect
      await addMessageWithAnimation(data.answer, false, true);
      
      setConversationHistory((prev) => [
        ...prev,
        { role: 'user', content: currentQuestion },
        { role: 'assistant', content: data.answer }
      ]);
      
    } catch (error) {
      console.error('Error:', error);
      // Error messages also with typewriter effect
      await addMessageWithAnimation("Error: " + error.message, false, true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickQuestion = (question) => {
    setInputValue(question);
  };

 return (
  <div className="chatbot-main-layout">
    {/* LEFT: IMAGE PANEL */}
    <div className="left-panel">
      <img
        src={require("../images/IARE.jpg")} // Put your actual image file here
        alt="Welcome"
        className="side-image"
      />
      <div className="side-caption">
      Unlock quick guidance on courses, admissions, and college services—your personal assistant for a seamless campus experience.
    </div>
    </div>

    {/* RIGHT: CHATBOT PANEL */}
    <div className="right-panel">
      <div className="chatbot-container">
        <div className="chatbot-header-custom">
          <img 
            src={require("../images/iare1.png")} 
            alt="IARE Logo" 
            className="header-logo-custom"
          />
        </div>

        <div className="messages-container" ref={messagesContainerRef}>
          {messages.length === 0 ? (
            <div className="welcome-message">
              <h3>Welcome!  <span className="emoji-wave">👋</span></h3>
              <p>Ask me anything about IARE courses, admissions, facilities, faculty, or events.</p>
              <div className="quick-questions">
                <p><strong>Try asking:</strong></p>
                <button onClick={() => handleQuickQuestion("Tell me about admissions")}>
                  Tell me about admissions
                </button>
                <button onClick={() => handleQuickQuestion("What courses are offered?")}>
                  What courses are offered?
                </button>
                <button onClick={() => handleQuickQuestion("Show me BT23 syllabus")}>
                  Show me BT23 syllabus
                </button>
                <button onClick={() => handleQuickQuestion("Tell me about campus facilities")}>
                  Tell me about campus facilities
                </button>
              </div>
            </div>
          ) : (
            messages.map((message) => (
              <div 
                key={message.id} 
                className={`message ${message.type} ${message.animate ? 'animate' : ''} ${message.isTyping ? 'typing' : ''}`}
              >
                <div className="message-content">
                  {message.type === 'bot' ? (
                    <ReactMarkdown>{message.text}</ReactMarkdown>
                  ) : (
                    message.text
                  )}
                  {message.isTyping && <span className="typing-cursor">|</span>}
                </div>
              </div>
            ))
          )}

          {isLoading && (
            <div className="message bot animate">
              <div className="message-content loading">
                <span>Searching IARE website</span>
                <div className="loading-dots">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            </div>
          )}
        </div>

        <form className="input-container" onSubmit={handleSubmit}>
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Ask about IARE..."
            disabled={isLoading}
          />
          <button type="submit" disabled={isLoading || !inputValue.trim()}>
            Send
          </button>
        </form>
      </div>
    </div>
  </div>
)
}

export default Chatbot;