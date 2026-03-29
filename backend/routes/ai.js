// routes/ai.js
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const upload = require('../middleware/upload');
const aiController = require('../controllers/aiController');

router.get('/status', aiController.status);
router.post('/chat',              protect, aiController.chat);
router.post('/generate-quiz',     protect, upload.single('file'), aiController.generateQuiz);
router.post('/generate-quiz-text',protect, aiController.generateQuizFromText);
router.post('/summarize',         protect, upload.single('file'), aiController.summarize);

module.exports = router;
