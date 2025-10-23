const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = 5000;

// Helper function to get clean last segment as link text
function getLastNameFromURL(url) {
  try {
    const parsedURL = new URL(url);
    const q = parsedURL.searchParams.get('q'); // get ?q= part
    if (q) {
      // Decode and split by '/'
      let parts = decodeURIComponent(q).split('/');
      let lastSegment = parts[parts.length - 1];
      // Clean dashes to spaces and uppercase initials
      lastSegment = lastSegment.replace(/-/g, ' ')
                               .replace(/\b\w/g, c => c.toUpperCase())
                               .trim();
      return lastSegment;
    }

    // If no query param, fallback to last path segment
    let paths = parsedURL.pathname.split('/').filter(Boolean);
    if (paths.length > 0) {
      let lastPath = paths[paths.length - 1];
      return lastPath.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    }
    
    return url; // fallback to whole url if all else fails
  } catch (err) {
    return url; // fallback if invalid URL
  }
}

// Middleware
app.use(cors());
app.use(express.json());

// API endpoint for chatbot
app.post('/api/chat', async (req, res) => {
  try {
    const { question, conversationHistory = [] } = req.body;
    
    const apiKey = process.env.PERPLEXITY_API_KEY;
    
    // Build messages array with conversation history
    const messages = [
      {
        role: 'system',
        content: `You are IARE College's intelligent assistant. Follow these rules strictly:

1. ALWAYS ask clarifying questions when queries are vague or have multiple options:
   - If user asks about "admissions", ask which program (B.Tech, M.Tech, MBA)
   - If user asks about "course catalog" or "syllabus", ask which program and which branch
   - If user asks about "BT23", ask which branch (CSE, IT, ECE, EEE, etc.)

2. Only provide detailed information AFTER getting clarification from the user.

3. When providing information:
   - Be specific and accurate based on iare.ac.in
   - Format answers with bullet points and clear sections
   - Always include direct clickable links to relevant IARE pages

4. Remember the conversation context. If user already specified something (like "B.Tech"), don't ask again.

5. For multi-part questions, break them down and ask one thing at a time.

Answer only from iare.ac.in website.`
      },
      ...conversationHistory.slice(-6), // Keep last 3 exchanges for context
      {
        role: 'user',
        content: question
      }
    ];
    
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'sonar',
        messages: messages,
        search_domain_filter: ['iare.ac.in'],
        temperature: 0.3,
        max_tokens: 600,
        return_citations: true
      })
    });


    const data = await response.json();
    
    if (data.choices && data.choices[0]) {
      let answer = data.choices[0].message.content;
      let citations = data.citations || [];
      
      // Add citations if available
      if (citations.length > 0) {
        // Gather only first 3 non-duplicate, accessible links
        const uniqueLinks = [];
        for (const url of citations) {
          if (url && !uniqueLinks.includes(url) && url.startsWith('http')) {
            uniqueLinks.push(url);
          }
          if (uniqueLinks.length >= 3) break;
        }

        if (uniqueLinks.length > 0) {
          answer += `\n\n**🔗 Top IARE Links:**\n`;
          uniqueLinks.forEach((url) => {
            const title = getLastNameFromURL(url);
            answer += `- [${title}](${url})\n`;
          });
        }
      }

      res.json({ 
        answer: answer,
        citations: citations 
      });
    } else {
      res.status(500).json({ error: 'No response from API' });
    }
    
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
});


app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});
