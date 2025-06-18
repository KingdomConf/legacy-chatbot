import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { OpenAI } from 'openai';

dotenv.config();
const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const assistantId = process.env.ASSISTANT_ID;

const threadMap = new Map();

app.post('/api/chat', async (req, res) => {
  const { message, threadId } = req.body;

  try {
    let thread = threadId;

    if (!thread) {
      const newThread = await openai.beta.threads.create();
      thread = newThread.id;
    }

    await openai.beta.threads.messages.create(thread, {
      role: 'user',
      content: message
    });

    const run = await openai.beta.threads.runs.create(thread, {
      assistant_id: assistantId
    });

    let runStatus = run.status;
    while (runStatus !== 'completed' && runStatus !== 'failed') {
      await new Promise(resolve => setTimeout(resolve, 1000));
      const currentRun = await openai.beta.threads.runs.retrieve(thread, run.id);
      runStatus = currentRun.status;
    }

    const messages = await openai.beta.threads.messages.list(thread);
    const lastMessage = messages.data.find(m => m.role === 'assistant');

    res.json({
      reply: lastMessage?.content?.[0]?.text?.value || 'No reply received.',
      threadId: thread
    });
  } catch (err) {
    console.error('Error:', err);
    res.status(500).json({ reply: 'An error occurred.', threadId: null });
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
