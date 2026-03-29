const fs = require('fs');

const HF_API_KEY  = process.env.HUGGINGFACE_API_KEY;
const HF_BASE_URL = 'https://api-inference.huggingface.co/models';

// Models that are reliably free and public on HuggingFace Inference API
const MODELS = {
  chat:    'HuggingFaceH4/zephyr-7b-beta',          // Free, no gating, great chat
  quiz:    'HuggingFaceH4/zephyr-7b-beta',          // Same for quiz generation
  summary: 'facebook/bart-large-cnn',               // Purpose-built summarization, always free
  fallback:'tiiuae/falcon-7b-instruct',             // Open-access fallback
};

const isConfigured = () => !!(HF_API_KEY && HF_API_KEY.startsWith('hf_'));

const callHF = async (model, inputs, parameters = {}, retryModel = null) => {
  if (!isConfigured()) throw new Error('HUGGINGFACE_API_KEY not configured');

  const doFetch = async (m) => {
    const res = await fetch(`${HF_BASE_URL}/${m}`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${HF_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ inputs, parameters }),
    });

    if (res.status === 503) {
      const json = await res.json().catch(() => ({}));
      const wait = Math.min(json.estimated_time || 25, 35);
      console.log(`⏳ ${m} loading, waiting ${wait}s...`);
      await new Promise(r => setTimeout(r, wait * 1000));
      const retry = await fetch(`${HF_BASE_URL}/${m}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${HF_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ inputs, parameters }),
      });
      return retry;
    }
    return res;
  };

  let res = await doFetch(model);

  if (!res.ok && retryModel && retryModel !== model) {
    console.warn(`⚠️ ${model} failed (${res.status}), trying ${retryModel}...`);
    res = await doFetch(retryModel);
  }

  if (!res.ok) {
    const errText = await res.text().catch(() => res.statusText);
    throw new Error(`HuggingFace API error ${res.status}: ${errText.substring(0, 200)}`);
  }

  return res.json();
};

// Zephyr uses ChatML format
const buildZephyrPrompt = (systemMsg, userMsg, history = []) => {
  let prompt = `<|system|>\n${systemMsg}</s>\n`;

  const recent = history.slice(-4);
  for (const h of recent) {
    if (h.role === 'user')      prompt += `<|user|>\n${h.content}</s>\n`;
    if (h.role === 'assistant') prompt += `<|assistant|>\n${h.content}</s>\n`;
  }

  prompt += `<|user|>\n${userMsg}</s>\n<|assistant|>\n`;
  return prompt;
};

const extractText = (result) => {
  if (Array.isArray(result) && result[0]?.generated_text) return result[0].generated_text.trim();
  if (typeof result === 'string') return result.trim();
  if (result?.generated_text) return result.generated_text.trim();
  throw new Error('Unexpected HuggingFace response format');
};

const demoChat = (msg) => {
  const m = msg.toLowerCase();
  if (m.includes('oop') || m.includes('object'))
    return 'OOP (Object-Oriented Programming) has 4 pillars:\n\n1. **Encapsulation** — bundling data and methods inside a class\n2. **Inheritance** — a child class inherits properties from parent\n3. **Polymorphism** — same method name, different behavior\n4. **Abstraction** — hiding internal details, showing only essentials\n\nExample: A `Dog` class extends `Animal`. Both have a `speak()` method but behave differently.';
  if (m.includes('python'))
    return 'Python key concepts:\n\n- **Variables**: `x = 10`, `name = "Alice"`\n- **Lists**: `my_list = [1, 2, 3]`\n- **Functions**: `def greet(name): return f"Hello {name}"`\n- **Classes**: `class Person: def __init__(self, name): self.name = name`\n- **Loops**: `for i in range(5): print(i)`';
  if (m.includes('algorithm') || m.includes('dsa'))
    return 'Key DSA Topics:\n\n- **Arrays** — O(1) access, O(n) search\n- **Binary Search** — O(log n), works on sorted arrays\n- **Sorting** — QuickSort O(n log n) avg, BubbleSort O(n²)\n- **Linked Lists** — O(1) insert, O(n) search\n- **Trees** — Binary Search Tree: O(log n) avg\n- **Graph** — BFS uses queue, DFS uses stack/recursion';
  if (m.includes('react'))
    return 'React fundamentals:\n\n- **Components** — functions returning JSX\n- **Props** — read-only data passed to components\n- **State** — `const [count, setCount] = useState(0)`\n- **useEffect** — for side effects (API calls, timers)\n- **JSX** — HTML-like syntax in JavaScript\n\nExample: `function Button({ label }) { return <button>{label}</button>; }`';
  return `I'm EduBot in demo mode. You asked: "${msg}"\n\n**To enable real AI responses:**\n1. Get a free token at huggingface.co → Settings → Access Tokens\n2. Add to backend .env: \`HUGGINGFACE_API_KEY=hf_xxxx\`\n3. Restart the server\n\nThe AI uses **Zephyr-7B** which is completely free and requires no model agreements.`;
};

const demoQuiz = (n) => Array.from({ length: n }, (_, i) => ({
  question: `Sample Q${i + 1}: What concept is central to the content you provided?`,
  options: ['Core concept A', 'Core concept B', 'Core concept C', 'Core concept D'],
  correctAnswer: 0,
  explanation: 'Add your HuggingFace API key (hf_xxx) to backend .env to generate real questions.',
}));

exports.status = (req, res) => {
  res.json({
    success: true,
    aiAvailable: isConfigured(),
    provider: 'HuggingFace',
    model: MODELS.chat,
  });
};

exports.chat = async (req, res) => {
  const { message, history = [] } = req.body;
  if (!message?.trim()) return res.status(400).json({ success: false, message: 'Message required' });

  if (!isConfigured()) {
    return res.json({ success: true, reply: demoChat(message), aiAvailable: false, provider: 'demo' });
  }

  try {
    const system = `You are EduBot, a helpful academic assistant for EduCloud learning platform. Help ${req.user.name} (${req.user.role}) with coursework and academic questions. Be clear, concise, and educational. Use markdown formatting for code and lists.`;

    const prompt = buildZephyrPrompt(system, message, history);

    const result = await callHF(
      MODELS.chat,
      prompt,
      { max_new_tokens: 500, temperature: 0.7, top_p: 0.9, do_sample: true, return_full_text: false },
      MODELS.fallback
    );

    const reply = extractText(result);
    res.json({ success: true, reply, aiAvailable: true, provider: 'huggingface' });
  } catch (err) {
    console.error('Chat error:', err.message);
    // Return demo answer gracefully — never crash
    res.json({ success: true, reply: demoChat(message) + `\n\n*(AI temporarily unavailable: ${err.message.substring(0, 100)})*`, aiAvailable: false, provider: 'fallback' });
  }
};

exports.generateQuizFromText = async (req, res) => {
  const { content, numQuestions = 5 } = req.body;
  const numQ = Math.min(Math.max(parseInt(numQuestions) || 5, 2), 10);

  if (!content || content.trim().length < 30)
    return res.status(400).json({ success: false, message: 'Provide at least 30 characters of content' });

  if (!isConfigured())
    return res.json({ success: true, questions: demoQuiz(numQ), aiAvailable: false });

  try {
    const prompt = buildZephyrPrompt(
      'You are a quiz generator. You output ONLY valid JSON arrays. No explanations, no markdown, no extra text. Just the JSON array.',
      `Generate exactly ${numQ} multiple-choice questions based on this content:

${content.substring(0, 2000)}

Output ONLY this JSON array format (no other text):
[{"question":"...","options":["A","B","C","D"],"correctAnswer":0,"explanation":"..."}]

Rules:
- correctAnswer is 0-3 (index of correct option)
- Each question has exactly 4 options
- Questions test understanding of the content above`
    );

    const raw = await callHF(
      MODELS.quiz,
      prompt,
      { max_new_tokens: 1800, temperature: 0.2, do_sample: false, return_full_text: false },
      MODELS.fallback
    );

    let rawText = extractText(raw);

    // Strip any leading/trailing text, extract JSON array
    const match = rawText.match(/\[[\s\S]*\]/);
    if (!match) throw new Error('No JSON array in response');

    let questions = JSON.parse(match[0]);

    if (!Array.isArray(questions) || questions.length === 0)
      throw new Error('Empty quiz returned');

    // Sanitize
    questions = questions.slice(0, numQ).map((q, i) => ({
      question:      String(q.question || `Question ${i + 1}`),
      options:       Array.isArray(q.options) && q.options.length === 4 ? q.options.map(String) : ['Option A', 'Option B', 'Option C', 'Option D'],
      correctAnswer: Number.isInteger(q.correctAnswer) && q.correctAnswer >= 0 && q.correctAnswer <= 3 ? q.correctAnswer : 0,
      explanation:   String(q.explanation || ''),
    }));

    res.json({ success: true, questions, aiAvailable: true, provider: 'huggingface' });
  } catch (err) {
    console.error('Quiz gen error:', err.message);
    res.json({ success: true, questions: demoQuiz(numQ), aiAvailable: false, provider: 'fallback', warning: err.message });
  }
};

exports.generateQuiz = async (req, res) => {
  try {
    let content = req.body.content || '';
    if (req.file) {
      try {
        if (req.file.mimetype === 'application/pdf') {
          const pdf        = require('pdf-parse');
          const dataBuffer = fs.readFileSync(req.file.path);
          content          = (await pdf(dataBuffer)).text.substring(0, 2000);
        } else {
          content = fs.readFileSync(req.file.path, 'utf8').substring(0, 2000);
        }
      } catch (e) { console.warn('File read error:', e.message); }
    }
    if (!content || content.trim().length < 30)
      return res.status(400).json({ success: false, message: 'No readable content found' });
    req.body.content = content;
    return exports.generateQuizFromText(req, res);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.summarize = async (req, res) => {
  let content = req.body.content || '';
  if (req.file) {
    try {
      if (req.file.mimetype === 'application/pdf') {
        const pdf        = require('pdf-parse');
        const dataBuffer = fs.readFileSync(req.file.path);
        content          = (await pdf(dataBuffer)).text;
      } else {
        content = fs.readFileSync(req.file.path, 'utf8');
      }
    } catch (e) {}
  }

  if (!content || content.trim().length < 20)
    return res.status(400).json({ success: false, message: 'Content required' });

  if (!isConfigured()) {
    return res.json({
      success: true, aiAvailable: false,
      summary: `## Content Preview (Demo Mode)\n\n${content.substring(0, 500)}...\n\n---\n*Add HUGGINGFACE_API_KEY to backend .env to get real AI summaries.*`,
    });
  }

  try {
    // BART for summarization - chunk to fit 1024 token limit
    const chunks = [];
    const text   = content.trim();
    for (let i = 0; i < Math.min(text.length, 2700); i += 900) {
      chunks.push(text.substring(i, i + 900));
    }

    const summaries = await Promise.all(
      chunks.map(chunk =>
        callHF(MODELS.summary, chunk, { max_length: 250, min_length: 60, do_sample: false })
          .then(r => Array.isArray(r) ? r[0]?.summary_text || '' : '')
          .catch(() => '')
      )
    );

    const combined = summaries.filter(Boolean).join(' ');

    // Format with Zephyr
    let formatted = combined;
    try {
      const fmtPrompt = buildZephyrPrompt(
        'Format academic content into clear markdown with sections. Be concise.',
        `Format this into academic notes with: ## Key Concepts, ## Main Points (bullets), ## Summary\n\n${combined.substring(0, 800)}`
      );
      const fmtResult = await callHF(MODELS.chat, fmtPrompt, { max_new_tokens: 400, temperature: 0.3, return_full_text: false });
      formatted = extractText(fmtResult) || combined;
    } catch (e) {
      formatted = `## Summary\n\n${combined}`;
    }

    res.json({ success: true, summary: formatted, aiAvailable: true, provider: 'huggingface' });
  } catch (err) {
    console.error('Summarize error:', err.message);
    res.json({
      success: true, aiAvailable: false, provider: 'fallback',
      summary: `## Content Summary (AI Unavailable)\n\n${content.substring(0, 600)}...\n\n*Error: ${err.message.substring(0, 100)}*`,
    });
  }
};