import { chatWithGemini } from '../services/gemini.service.js';

export const handleChat = async (req, res, next) => {
  try {
    const { message } = req.body;
    if (!message?.trim()) {
      return res.status(400).json({ success: false, message: 'Message is required.' });
    }

    const reply = await chatWithGemini(req.user, message);
    return res.json({ success: true, data: { reply, timestamp: new Date().toISOString() } });
  } catch (err) {
    // Graceful fallback if Gemini is unavailable
    if (err.message?.includes('API_KEY') || err.status === 429) {
      return res.json({
        success: true,
        data: {
          reply: 'The AI assistant is temporarily unavailable. Please contact the Finance Office directly for queries.',
          timestamp: new Date().toISOString(),
          fallback: true,
        },
      });
    }
    next(err);
  }
};
