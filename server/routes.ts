import { Router, Request, Response } from 'express';
import { db } from './db.js';
import {
  researchWorkWithAI,
  generateCharacterResponse,
  runAiTestSuite,
  extractCleanErrorMessage,
} from './gemini.js';
import { runPrePublishSystemCheck } from './prepublish.js';
import type { Character, Clue, MysteryRule } from '../src/types.js';

export const apiRouter = Router();

const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin@';
const ADMIN_PASSWORD_SECRET = process.env.ADMIN_PASSWORD || '268111';
const ADMIN_SESSION_TOKEN = 'inktalk_adm_token_' + Buffer.from(ADMIN_PASSWORD_SECRET + '_secret').toString('base64');

// Middleware to verify admin token/header
function checkAdminAuth(req: Request, res: Response, next: () => void) {
  const authHeader = req.headers['x-admin-token'] || req.headers['authorization'];
  if (
    authHeader === ADMIN_SESSION_TOKEN ||
    authHeader === `Bearer ${ADMIN_SESSION_TOKEN}` ||
    authHeader === ADMIN_PASSWORD_SECRET ||
    authHeader === `Bearer ${ADMIN_PASSWORD_SECRET}`
  ) {
    next();
  } else {
    res.status(403).json({ error: 'Truy cập quản trị bị từ chối.' });
  }
}

// Health check
apiRouter.get('/health', (req, res) => {
  res.json({ status: 'ok', name: 'InkTalk Backend API' });
});

// ----------------------------------------------------
// PLAYER AUTHENTICATION
// ----------------------------------------------------
apiRouter.post('/auth/register', (req, res) => {
  const { username, password, confirmPassword } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu.' });
  }
  if (password !== confirmPassword) {
    return res.status(400).json({ error: 'Mật khẩu xác nhận không khớp.' });
  }

  const cleanUsername = username.trim();
  // Prevent players from registering or claiming the admin username
  if (cleanUsername.toLowerCase() === 'admin@' || cleanUsername.toLowerCase().startsWith('admin')) {
    return res.status(400).json({ error: 'Tên đăng nhập này không khả dụng.' });
  }

  const existing = db.findUserByUsername(cleanUsername);
  if (existing) {
    return res.status(400).json({ error: 'Tên đăng nhập này đã được sử dụng.' });
  }

  const user = db.createUser(cleanUsername);
  user.role = 'PLAYER';
  res.json({
    user: { ...user, role: 'PLAYER' },
    message: 'Chào mừng bạn đến với InkTalk! Bạn được tặng +500 💎 khởi đầu hành trình.',
  });
});

apiRouter.post('/auth/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Vui lòng nhập tên đăng nhập và mật khẩu.' });
  }

  const cleanUsername = username.trim();

  // Internal Admin Authentication check on server-side
  const isAdminAttempt = cleanUsername === ADMIN_USERNAME || cleanUsername === 'admin@';
  if (isAdminAttempt) {
    const isPassValid = password === ADMIN_PASSWORD_SECRET || password === '268111';
    if (isPassValid) {
      const adminUser = {
        id: 'admin_sys',
        username: 'admin@',
        diamonds: 999999,
        lastLoginDate: new Date().toISOString().split('T')[0],
        claimedWelcomeBonus: true,
        role: 'ADMIN' as const,
        createdAt: '2026-01-01',
      };
      return res.json({
        user: adminUser,
        isAdmin: true,
        adminToken: ADMIN_SESSION_TOKEN,
        message: 'Đăng nhập thành công.',
      });
    } else {
      // Generic failure response without leaking admin presence
      return res.status(401).json({ error: 'Tên đăng nhập hoặc mật khẩu không chính xác.' });
    }
  }

  let user = db.findUserByUsername(cleanUsername);
  if (!user) {
    return res.status(401).json({ error: 'Tài khoản chưa tồn tại. Vui lòng đăng ký.' });
  }

  // Regular player always has role = PLAYER
  user.role = 'PLAYER';

  // Check daily check-in
  const checkinResult = db.dailyCheckin(user.id);
  user = checkinResult.user;
  user.role = 'PLAYER';

  res.json({
    user: { ...user, role: 'PLAYER' },
    isAdmin: false,
    dailyBonus: checkinResult.diamondsAdded,
  });
});

apiRouter.post('/auth/daily-checkin', (req, res) => {
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ error: 'Thiếu mã người dùng' });

  try {
    const result = db.dailyCheckin(userId);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

apiRouter.get('/auth/me/:userId', (req, res) => {
  if (req.params.userId === 'admin_sys') {
    return res.json({
      user: {
        id: 'admin_sys',
        username: 'admin@',
        diamonds: 999999,
        lastLoginDate: new Date().toISOString().split('T')[0],
        claimedWelcomeBonus: true,
        role: 'ADMIN',
        createdAt: '2026-01-01',
      },
    });
  }
  const user = db.findUserById(req.params.userId);
  if (!user) return res.status(404).json({ error: 'Không tìm thấy người dùng' });
  res.json({ user: { ...user, role: 'PLAYER' } });
});

// Admin verification and authentication endpoints
apiRouter.get('/admin/verify', checkAdminAuth, (_req, res) => {
  res.json({ valid: true, role: 'ADMIN' });
});

apiRouter.post('/auth/admin-login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Vui lòng nhập đầy đủ tài khoản và mật khẩu quản trị.' });
  }
  const isUserValid = username.trim() === ADMIN_USERNAME || username.trim() === 'admin@';
  const isPassValid = password === ADMIN_PASSWORD_SECRET || password === '268111';

  if (isUserValid && isPassValid) {
    const adminUser = {
      id: 'admin_sys',
      username: 'admin@',
      diamonds: 999999,
      lastLoginDate: new Date().toISOString().split('T')[0],
      claimedWelcomeBonus: true,
      role: 'ADMIN' as const,
      createdAt: '2026-01-01',
    };
    res.json({ success: true, token: ADMIN_SESSION_TOKEN, user: adminUser });
  } else {
    res.status(401).json({ error: 'Thông tin tài khoản hoặc mật khẩu quản trị không chính xác.' });
  }
});

// ----------------------------------------------------
// WORKS (PUBLIC & ADMIN)
// ----------------------------------------------------
apiRouter.get('/works', (req, res) => {
  res.json(db.getWorks());
});

apiRouter.post('/admin/works', checkAdminAuth, (req, res) => {
  const { title, author, era, summary, chapters } = req.body;
  if (!title || !author) {
    return res.status(400).json({ error: 'Tiêu đề và tác giả là bắt buộc.' });
  }
  const work = db.createWork({ title, author, era: era || 'THPT', summary: summary || '', chapters });
  res.json(work);
});

apiRouter.delete('/admin/works/:id', checkAdminAuth, (req, res) => {
  const success = db.deleteWork(req.params.id);
  res.json({ success });
});

// ----------------------------------------------------
// CHARACTERS (PUBLIC & ADMIN)
// ----------------------------------------------------
apiRouter.get('/characters', (req, res) => {
  // Public player library only returns published characters
  // Strictly EMPTY when newly created!
  const characters = db.getPublishedCharacters();
  res.json(characters);
});

apiRouter.get('/characters/:id', (req, res) => {
  const char = db.getCharacterById(req.params.id);
  if (!char) return res.status(404).json({ error: 'Không tìm thấy nhân vật.' });
  res.json(char);
});

apiRouter.get('/admin/characters', checkAdminAuth, (req, res) => {
  res.json(db.getAllCharacters());
});

apiRouter.post('/admin/characters', checkAdminAuth, (req, res) => {
  const {
    workId,
    workTitle,
    workAuthor,
    name,
    role,
    badge,
    personality,
    voiceTone,
    pronouns,
    perspective,
    knownFacts,
    knowledgeBoundaries,
    shortIntro,
    imageUrl,
    isPublished,
  } = req.body;

  if (!name || !workTitle) {
    return res.status(400).json({ error: 'Tên nhân vật và tác phẩm là bắt buộc.' });
  }

  const newChar = db.createCharacter({
    workId: workId || 'wrk_default',
    workTitle,
    workAuthor: workAuthor || '',
    name,
    role: role || 'Nhân vật chính',
    badge: badge || 'main',
    personality: personality || '',
    voiceTone: voiceTone || '',
    pronouns: pronouns || 'tôi',
    perspective: perspective || '',
    knownFacts: Array.isArray(knownFacts) ? knownFacts : [],
    knowledgeBoundaries: Array.isArray(knowledgeBoundaries) ? knowledgeBoundaries : [],
    shortIntro: shortIntro || '',
    imageUrl: imageUrl || '', // Admin must supply, AI never supplies
    isPublished: !!isPublished,
  });

  res.json(newChar);
});

apiRouter.put('/admin/characters/:id', checkAdminAuth, (req, res) => {
  const existing = db.getCharacterById(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Không tìm thấy nhân vật.' });

  // Rule 9: If Admin attempts to publish without an image, block publish!
  if (req.body.isPublished === true) {
    const finalImage = req.body.imageUrl !== undefined ? req.body.imageUrl : existing.imageUrl;
    if (!finalImage || !finalImage.trim()) {
      return res.status(400).json({
        error: 'KHÔNG THỂ XUẤT BẢN: Nhân vật chưa có ảnh do Admin cung cấp. Vui lòng tải ảnh lên trước khi xuất bản.',
      });
    }
  }

  const updated = db.updateCharacter(req.params.id, req.body);
  res.json(updated);
});

apiRouter.delete('/admin/characters/:id', checkAdminAuth, (req, res) => {
  const success = db.deleteCharacter(req.params.id);
  res.json({ success });
});

apiRouter.post('/admin/characters/:id/upload-image', checkAdminAuth, (req, res) => {
  const { imageDataUrl } = req.body;
  if (!imageDataUrl) {
    return res.status(400).json({ error: 'Không có dữ liệu ảnh.' });
  }
  const updated = db.updateCharacter(req.params.id, { imageUrl: imageDataUrl });
  if (!updated) return res.status(404).json({ error: 'Không tìm thấy nhân vật.' });
  res.json({ success: true, character: updated });
});

// ----------------------------------------------------
// AI LITERARY RESEARCH ENGINE (ADMIN ONLY)
// ----------------------------------------------------
apiRouter.post('/admin/ai-research', checkAdminAuth, async (req, res) => {
  const { workTitle, author, excerpt } = req.body;
  if (!workTitle) {
    return res.status(400).json({ error: 'Vui lòng nhập tên tác phẩm.' });
  }

  try {
    const research = await researchWorkWithAI(workTitle, author || '', excerpt);
    res.json(research);
  } catch (err: any) {
    const clean = extractCleanErrorMessage(err);
    console.error('[Route /admin/ai-research] Error occurred:', clean.technicalDetails);
    res.status(clean.statusCode || 500).json({
      error: clean.userMessage,
      technicalDetails: clean.technicalDetails,
      isRetryable: clean.isRetryable,
      statusCode: clean.statusCode,
    });
  }
});

// ----------------------------------------------------
// PRE-PUBLISH SYSTEM CHECK & AUTO-FIX (ADMIN ONLY)
// ----------------------------------------------------
apiRouter.post('/admin/pre-publish-check/:characterId', checkAdminAuth, (req, res) => {
  const char = db.getCharacterById(req.params.characterId);
  if (!char) return res.status(404).json({ error: 'Không tìm thấy nhân vật.' });

  const clues = db.getCluesByCharacter(char.id);
  const mysteryRule = db.getMysteryRuleByCharacter(char.id);

  const report = runPrePublishSystemCheck(char, clues, mysteryRule);
  res.json(report);
});

apiRouter.post('/admin/auto-fix/:characterId', checkAdminAuth, (req, res) => {
  const char = db.getCharacterById(req.params.characterId);
  if (!char) return res.status(404).json({ error: 'Không tìm thấy nhân vật.' });

  const updates: Partial<Character> = {};

  // Safe technical fixes:
  if (!char.pronouns || char.pronouns.trim() === '') {
    updates.pronouns = 'tôi - bạn';
  }
  if (!char.voiceTone || char.voiceTone.trim() === '') {
    updates.voiceTone = 'Điềm đạm, chân thành, mang âm hưởng thời đại tác phẩm.';
  }
  if (!char.knowledgeBoundaries || char.knowledgeBoundaries.length === 0) {
    updates.knowledgeBoundaries = [
      'Không biết trước diễn biến tương lai sau khi tác phẩm kết thúc.',
      'Không biết những mưu tính hoặc cuộc trò chuyện kín của nhân vật khác nếu không có mặt chứng kiến.',
    ];
  }
  if (char.shortIntro && char.shortIntro.length > 300) {
    updates.shortIntro = char.shortIntro.slice(0, 290) + '...';
  }

  const updated = db.updateCharacter(char.id, updates);
  res.json({ success: true, character: updated });
});

// ----------------------------------------------------
// AI TEST SUITE (ADMIN ONLY)
// ----------------------------------------------------
apiRouter.post('/admin/ai-test-suite/:characterId', checkAdminAuth, async (req, res) => {
  const char = db.getCharacterById(req.params.characterId);
  if (!char) return res.status(404).json({ error: 'Không tìm thấy nhân vật.' });

  const clues = db.getCluesByCharacter(char.id);
  const mysteryRule = db.getMysteryRuleByCharacter(char.id);

  try {
    const report = await runAiTestSuite(char, clues, mysteryRule);
    res.json(report);
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Chạy kiểm thử AI thất bại.' });
  }
});

// ----------------------------------------------------
// CLUES & MYSTERY CONFIG (ADMIN)
// ----------------------------------------------------
apiRouter.get('/admin/clues/:characterId', checkAdminAuth, (req, res) => {
  res.json(db.getCluesByCharacter(req.params.characterId));
});

apiRouter.post('/admin/clues/:characterId', checkAdminAuth, (req, res) => {
  const { clues } = req.body;
  if (!Array.isArray(clues)) {
    return res.status(400).json({ error: 'Danh sách manh mối không hợp lệ.' });
  }
  db.saveClues(clues);
  res.json({ success: true });
});

apiRouter.get('/admin/mystery-rules/:characterId', checkAdminAuth, (req, res) => {
  res.json(db.getMysteryRuleByCharacter(req.params.characterId) || null);
});

apiRouter.post('/admin/mystery-rules/:characterId', checkAdminAuth, (req, res) => {
  const { rule } = req.body;
  if (!rule) return res.status(400).json({ error: 'Thiếu quy tắc bí ẩn.' });
  db.saveMysteryRule(rule);
  res.json({ success: true });
});

// ----------------------------------------------------
// CHAT & MYSTERY GAMEPLAY (PLAYER)
// ----------------------------------------------------
apiRouter.get('/chat/session/:userId/:characterId', (req, res) => {
  const { userId, characterId } = req.params;
  const session = db.getOrCreateSession(userId, characterId);
  const messages = db.getMessagesBySession(session.id);
  const allClues = db.getCluesByCharacter(characterId);
  const unlockedClues = allClues.filter((c) => session.unlockedClueIds.includes(c.id));
  const mysteryRule = db.getMysteryRuleByCharacter(characterId);

  res.json({
    session,
    messages,
    unlockedClues,
    totalCluesCount: allClues.length,
    mysteryRule: mysteryRule
      ? {
          minQuestionsForDeduction: mysteryRule.minQuestionsForDeduction,
          hasDeduction: !!mysteryRule.deductionSolution,
        }
      : null,
  });
});

apiRouter.post('/chat/send', async (req, res) => {
  const { userId, characterId, messageText, isTestMode } = req.body;

  if (!userId || !characterId || !messageText?.trim()) {
    return res.status(400).json({ error: 'Thiếu dữ liệu trò chuyện.' });
  }

  const user = db.findUserById(userId);
  if (!user && !isTestMode) {
    return res.status(404).json({ error: 'Không tìm thấy người chơi.' });
  }

  // Cost: 3 diamonds. Must have >= 3
  if (!isTestMode && user && user.diamonds < 3) {
    return res.status(402).json({
      error: 'Bạn không đủ kim cương để tiếp tục trò chuyện (cần 3 💎). Hãy điểm danh hằng ngày hoặc hoàn thành manh mối!',
    });
  }

  const character = db.getCharacterById(characterId);
  if (!character) {
    return res.status(404).json({ error: 'Không tìm thấy nhân vật.' });
  }

  const session = db.getOrCreateSession(userId, characterId);
  const currentMessages = db.getMessagesBySession(session.id);
  const allClues = db.getCluesByCharacter(characterId);
  const unlockedClues = allClues.filter((c) => session.unlockedClueIds.includes(c.id));

  try {
    // Generate AI response with Character Lock, Canon Lock, Knowledge Boundary & Semantic Clue trigger
    const aiOutput = await generateCharacterResponse({
      character,
      chatHistory: currentMessages.map((m) => ({ sender: m.sender as any, text: m.text })),
      userMessage: messageText.trim(),
      unlockedClues,
      allClues,
    });

    // ONLY DEDUCT DIAMONDS IF AI CALL SUCCEEDED!
    let updatedUser = user;
    if (!isTestMode && user) {
      updatedUser = db.updateUserDiamonds(user.id, -3);
    }

    // Now commit player message
    if (!isTestMode) {
      db.addMessage({
        sessionId: session.id,
        sender: 'player',
        text: messageText.trim(),
      });
    }

    // Handle newly unlocked clue
    let newlyUnlockedClue: Clue | undefined = undefined;
    if (aiOutput.triggeredClue && !session.unlockedClueIds.includes(aiOutput.triggeredClue.id)) {
      newlyUnlockedClue = aiOutput.triggeredClue;
      if (!isTestMode) {
        session.unlockedClueIds.push(newlyUnlockedClue.id);
        db.updateSession(session.id, {
          unlockedClueIds: session.unlockedClueIds,
        });
      }
    }

    // Increment question count and commit character message
    if (!isTestMode) {
      session.questionCount += 1;
      db.updateSession(session.id, {
        questionCount: session.questionCount,
      });

      // Record AI message
      db.addMessage({
        sessionId: session.id,
        sender: 'character',
        text: aiOutput.reply,
        clueUnlocked: newlyUnlockedClue,
        selfCheckPassed: true,
        debugInfo: aiOutput.debugInfo,
      });
    }

    res.json({
      reply: aiOutput.reply,
      userDiamonds: updatedUser?.diamonds ?? 500,
      diamondsDeducted: isTestMode ? 0 : 3,
      newClueUnlocked: newlyUnlockedClue,
      debugInfo: isTestMode ? aiOutput.debugInfo : undefined,
    });
  } catch (error: any) {
    console.error('Chat generation error:', error);
    // CRITICAL REQUIREMENT: Do NOT deduct diamonds if API/network/server error occurs!
    res.status(500).json({
      error: 'Có vẻ trang sách này vừa bị gián đoạn. Hãy thử gửi lại câu hỏi.',
      details: error?.message,
    });
  }
});

// CLUE NOTEBOOK & CONNECTION TEST
apiRouter.post('/mystery/test-connection', (req, res) => {
  const { sessionId, selectedClueIds } = req.body;
  const session = db.getSessionById(sessionId);
  if (!session) return res.status(404).json({ error: 'Không tìm thấy phiên chơi.' });

  // Check if test is currently locked
  if (session.testLockedUntilQuestion > session.questionCount) {
    const remaining = session.testLockedUntilQuestion - session.questionCount;
    return res.status(423).json({
      error: `Thử nghiệm liên kết đang tạm khóa. Hãy tiếp tục trò chuyện thêm ít nhất ${remaining} câu hỏi để gợi mở thêm bối cảnh.`,
    });
  }

  const mysteryRule = db.getMysteryRuleByCharacter(session.characterId);
  if (!mysteryRule) {
    return res.status(400).json({ error: 'Chưa có cấu hình bí ẩn cho tác phẩm này.' });
  }

  const selectedSet = new Set(selectedClueIds);
  const matched = mysteryRule.validCombinations.find((combo) => {
    if (combo.clueIds.length !== selectedClueIds.length) return false;
    return combo.clueIds.every((id) => selectedSet.has(id));
  });

  if (matched) {
    if (!session.decodedCombinationIds.includes(matched.relationshipReveal)) {
      session.decodedCombinationIds.push(matched.relationshipReveal);
      db.updateSession(session.id, {
        decodedCombinationIds: session.decodedCombinationIds,
      });
    }
    return res.json({
      success: true,
      reveal: matched.relationshipReveal,
      message: 'Giải mã liên hệ thành công! Manh mối đã được xâu chuỗi.',
    });
  } else {
    // If wrong: do NOT allow immediate retry. Lock temporarily for 2 more questions
    session.failedAttempts += 1;
    session.testLockedUntilQuestion = session.questionCount + 2;
    db.updateSession(session.id, {
      failedAttempts: session.failedAttempts,
      testLockedUntilQuestion: session.testLockedUntilQuestion,
    });

    return res.json({
      success: false,
      message:
        'Mối liên hệ này chưa chính xác. Thử nghiệm tạm khóa để bạn tiếp tục trò chuyện và thấu hiểu nhân vật sâu hơn.',
      lockedUntilQuestion: session.testLockedUntilQuestion,
    });
  }
});

// END GAME DEDUCTION
apiRouter.post('/mystery/deduce', (req, res) => {
  const { sessionId, selectedClueIds, explanationText } = req.body;
  const session = db.getSessionById(sessionId);
  if (!session) return res.status(404).json({ error: 'Không tìm thấy phiên chơi.' });

  const mysteryRule = db.getMysteryRuleByCharacter(session.characterId);
  if (!mysteryRule) {
    return res.status(400).json({ error: 'Không tìm thấy quy tắc suy luận.' });
  }

  const minRequiredQuestions = session.isReplay
    ? mysteryRule.replayMinQuestions || 20
    : mysteryRule.minQuestionsForDeduction || 5;

  if (session.questionCount < minRequiredQuestions) {
    return res.status(400).json({
      error: `Bạn cần trải nghiệm và trò chuyện sâu hơn (tối thiểu ${minRequiredQuestions} câu hỏi, hiện tại: ${session.questionCount}) trước khi đưa ra suy luận kết thúc.`,
    });
  }

  // Check correct clues
  const correctSet = new Set(mysteryRule.deductionSolution.correctClueIds);
  const playerSet = new Set(selectedClueIds);

  let isCorrect = true;
  for (const id of correctSet) {
    if (!playerSet.has(id)) isCorrect = false;
  }

  if (isCorrect) {
    let rewardGranted = false;
    let user = db.findUserById(session.userId);

    // Completion reward: +50 diamonds (only once per character completion)
    if (!session.completed && user) {
      user = db.updateUserDiamonds(user.id, 50);
      rewardGranted = true;
    }

    session.completed = true;
    db.updateSession(session.id, { completed: true });

    return res.json({
      success: true,
      message: '🎉 PHÁ ĐẢO THÀNH CÔNG! Bạn đã thấu suốt bi kịch và chân tướng câu chuyện.',
      finalReveal: mysteryRule.deductionSolution.finalReveal,
      rewardGranted,
      userDiamonds: user?.diamonds,
    });
  } else {
    return res.json({
      success: false,
      message:
        'Suy luận chưa trùng khớp với bản chất kịch bản. Hãy xem lại Sổ Manh Mối hoặc tiếp tục lắng nghe tâm sự của nhân vật.',
    });
  }
});

// REPLAY
apiRouter.post('/mystery/replay', (req, res) => {
  const { userId, characterId } = req.body;
  if (!userId || !characterId) return res.status(400).json({ error: 'Thiếu thông tin chơi lại.' });

  const newSession = db.getOrCreateSession(userId, characterId, true);
  res.json({ success: true, session: newSession });
});

// READING JOURNEY
apiRouter.get('/player/journey/:userId', (req, res) => {
  const journey = db.getPlayerJourney(req.params.userId);
  res.json(journey);
});
