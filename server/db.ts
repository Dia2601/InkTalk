import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import type {
  User,
  Work,
  Character,
  Clue,
  MysteryRule,
  CanonData,
  GameSession,
  ChatMessage,
  ReadingJourney,
  AchievementBadge,
} from '../src/types.js';

interface DatabaseSchema {
  users: User[];
  works: Work[];
  characters: Character[];
  clues: Clue[];
  mysteryRules: MysteryRule[];
  canon: CanonData[];
  sessions: GameSession[];
  messages: ChatMessage[];
}

const DB_FILE_PATH = path.join(process.cwd(), 'data', 'inktalk_database.json');

// Ensure data directory exists
function ensureDbDir() {
  const dir = path.dirname(DB_FILE_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

const INITIAL_DB: DatabaseSchema = {
  users: [],
  works: [],
  characters: [], // Strictly empty as required by rule 5
  clues: [],
  mysteryRules: [],
  canon: [],
  sessions: [],
  messages: [],
};

export class InkTalkDatabase {
  private data: DatabaseSchema;

  constructor() {
    ensureDbDir();
    if (fs.existsSync(DB_FILE_PATH)) {
      try {
        const raw = fs.readFileSync(DB_FILE_PATH, 'utf-8');
        this.data = JSON.parse(raw);
        // Ensure all arrays exist
        this.data.users = this.data.users || [];
        this.data.works = this.data.works || [];
        this.data.characters = this.data.characters || [];
        this.data.clues = this.data.clues || [];
        this.data.mysteryRules = this.data.mysteryRules || [];
        this.data.canon = this.data.canon || [];
        this.data.sessions = this.data.sessions || [];
        this.data.messages = this.data.messages || [];
      } catch (err) {
        console.warn('Failed to parse existing database file, initializing clean database:', err);
        this.data = { ...INITIAL_DB };
        this.save();
      }
    } else {
      this.data = { ...INITIAL_DB };
      this.save();
    }
  }

  private save() {
    try {
      fs.writeFileSync(DB_FILE_PATH, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (e) {
      console.error('Failed to save database file:', e);
    }
  }

  // --- Users & Auth ---
  findUserByUsername(username: string): User | undefined {
    return this.data.users.find((u) => u.username.toLowerCase() === username.toLowerCase());
  }

  findUserById(id: string): User | undefined {
    return this.data.users.find((u) => u.id === id);
  }

  createUser(username: string): User {
    const today = new Date().toISOString().split('T')[0];
    const newUser: User = {
      id: 'usr_' + crypto.randomBytes(6).toString('hex'),
      username,
      diamonds: 500, // +500 diamonds first login bonus
      lastLoginDate: today,
      claimedWelcomeBonus: true,
      createdAt: new Date().toISOString(),
    };
    this.data.users.push(newUser);
    this.save();
    return newUser;
  }

  dailyCheckin(userId: string): { success: boolean; diamondsAdded: number; user: User } {
    const user = this.findUserById(userId);
    if (!user) throw new Error('User not found');

    const today = new Date().toISOString().split('T')[0];
    if (user.lastLoginDate === today) {
      return { success: false, diamondsAdded: 0, user };
    }

    user.lastLoginDate = today;
    user.diamonds += 100; // +100 diamonds per day
    this.save();
    return { success: true, diamondsAdded: 100, user };
  }

  updateUserDiamonds(userId: string, delta: number): User {
    const user = this.findUserById(userId);
    if (!user) throw new Error('User not found');
    user.diamonds = Math.max(0, user.diamonds + delta);
    this.save();
    return user;
  }

  // --- Works ---
  getWorks(): Work[] {
    return this.data.works;
  }

  getWorkById(id: string): Work | undefined {
    return this.data.works.find((w) => w.id === id);
  }

  createWork(work: Omit<Work, 'id' | 'createdAt'>): Work {
    const newWork: Work = {
      ...work,
      id: 'wrk_' + crypto.randomBytes(6).toString('hex'),
      createdAt: new Date().toISOString(),
    };
    this.data.works.push(newWork);
    this.save();
    return newWork;
  }

  deleteWork(id: string): boolean {
    const index = this.data.works.findIndex((w) => w.id === id);
    if (index !== -1) {
      this.data.works.splice(index, 1);
      // Clean up characters of this work
      this.data.characters = this.data.characters.filter((c) => c.workId !== id);
      this.save();
      return true;
    }
    return false;
  }

  // --- Characters ---
  getPublishedCharacters(): Character[] {
    return this.data.characters.filter((c) => c.isPublished);
  }

  getAllCharacters(): Character[] {
    return this.data.characters;
  }

  getCharacterById(id: string): Character | undefined {
    return this.data.characters.find((c) => c.id === id);
  }

  createCharacter(char: Omit<Character, 'id' | 'createdAt'>): Character {
    const newChar: Character = {
      ...char,
      id: 'chr_' + crypto.randomBytes(6).toString('hex'),
      createdAt: new Date().toISOString(),
    };
    this.data.characters.push(newChar);
    this.save();
    return newChar;
  }

  updateCharacter(id: string, updates: Partial<Character>): Character | undefined {
    const char = this.getCharacterById(id);
    if (!char) return undefined;
    Object.assign(char, updates);
    this.save();
    return char;
  }

  deleteCharacter(id: string): boolean {
    const index = this.data.characters.findIndex((c) => c.id === id);
    if (index !== -1) {
      this.data.characters.splice(index, 1);
      this.data.clues = this.data.clues.filter((cl) => cl.characterId !== id);
      this.data.mysteryRules = this.data.mysteryRules.filter((m) => m.characterId !== id);
      this.save();
      return true;
    }
    return false;
  }

  // --- Clues & Mystery ---
  getCluesByCharacter(characterId: string): Clue[] {
    return this.data.clues.filter((c) => c.characterId === characterId);
  }

  getClueById(id: string): Clue | undefined {
    return this.data.clues.find((c) => c.id === id);
  }

  saveClues(clues: Clue[]) {
    for (const clue of clues) {
      const idx = this.data.clues.findIndex((c) => c.id === clue.id);
      if (idx >= 0) {
        this.data.clues[idx] = clue;
      } else {
        this.data.clues.push(clue);
      }
    }
    this.save();
  }

  getMysteryRuleByCharacter(characterId: string): MysteryRule | undefined {
    return this.data.mysteryRules.find((m) => m.characterId === characterId);
  }

  saveMysteryRule(rule: MysteryRule) {
    const idx = this.data.mysteryRules.findIndex((m) => m.characterId === rule.characterId);
    if (idx >= 0) {
      this.data.mysteryRules[idx] = rule;
    } else {
      this.data.mysteryRules.push(rule);
    }
    this.save();
  }

  // --- Sessions & Gameplay ---
  getOrCreateSession(userId: string, characterId: string, isReplay = false): GameSession {
    let session = this.data.sessions.find(
      (s) => s.userId === userId && s.characterId === characterId && !s.completed
    );

    if (!session || isReplay) {
      session = {
        id: 'ses_' + crypto.randomBytes(6).toString('hex'),
        userId,
        characterId,
        questionCount: 0,
        isReplay,
        unlockedClueIds: [],
        decodedCombinationIds: [],
        failedAttempts: 0,
        testLockedUntilQuestion: 0,
        completed: false,
        createdAt: new Date().toISOString(),
      };
      this.data.sessions.push(session);
      this.save();
    }
    return session;
  }

  getSessionById(id: string): GameSession | undefined {
    return this.data.sessions.find((s) => s.id === id);
  }

  updateSession(id: string, updates: Partial<GameSession>): GameSession | undefined {
    const s = this.getSessionById(id);
    if (!s) return undefined;
    Object.assign(s, updates);
    this.save();
    return s;
  }

  getMessagesBySession(sessionId: string): ChatMessage[] {
    return this.data.messages.filter((m) => m.sessionId === sessionId);
  }

  addMessage(msg: Omit<ChatMessage, 'id' | 'timestamp'>): ChatMessage {
    const message: ChatMessage = {
      ...msg,
      id: 'msg_' + crypto.randomBytes(6).toString('hex'),
      timestamp: new Date().toISOString(),
    };
    this.data.messages.push(message);
    this.save();
    return message;
  }

  // --- Player Reading Journey ---
  getPlayerJourney(userId: string): ReadingJourney {
    const userSessions = this.data.sessions.filter((s) => s.userId === userId);
    const completedSessions = userSessions.filter((s) => s.completed);

    const exploredCharIds = Array.from(new Set(userSessions.map((s) => s.characterId)));
    const allCharacters = this.data.characters.filter((c) => exploredCharIds.includes(c.id));
    const exploredWorkIds = Array.from(new Set(allCharacters.map((c) => c.workId)));

    const allUnlockedClues = new Set<string>();
    userSessions.forEach((s) => {
      s.unlockedClueIds.forEach((c) => allUnlockedClues.add(c));
    });

    const userMessages = this.data.messages.filter((m) => {
      const sess = this.getSessionById(m.sessionId);
      return sess && sess.userId === userId && m.sender === 'player';
    });

    const badges: AchievementBadge[] = [
      {
        id: 'first_step',
        name: 'Mở Trang Đầu Tiên',
        description: 'Bắt đầu cuộc trò chuyện đầu tiên với một nhân vật văn học.',
        icon: 'BookOpen',
        unlockedAt: userMessages.length > 0 ? userMessages[0].timestamp : undefined,
      },
      {
        id: 'keen_detective',
        name: 'Đôi Mắt Tinh Tường',
        description: 'Thu thập được ít nhất 3 manh mối văn học.',
        icon: 'Search',
        unlockedAt: allUnlockedClues.size >= 3 ? new Date().toISOString() : undefined,
      },
      {
        id: 'mystery_solver',
        name: 'Giải Mã Bi Kịch',
        description: 'Hoàn thành phá đảo bí ẩn của ít nhất 1 tác phẩm.',
        icon: 'Award',
        unlockedAt: completedSessions.length > 0 ? completedSessions[0].createdAt : undefined,
      },
      {
        id: 'literary_scholar',
        name: 'Độc Giả Thấu Cảm',
        description: 'Thực hiện hơn 20 cuộc trao đổi sâu sắc với các nhân vật.',
        icon: 'Sparkles',
        unlockedAt: userMessages.length >= 20 ? new Date().toISOString() : undefined,
      },
    ];

    return {
      charactersExplored: exploredCharIds.length,
      worksExplored: exploredWorkIds.length,
      cluesSolved: allUnlockedClues.size,
      totalMessages: userMessages.length,
      completedMysteries: completedSessions.length,
      streakDays: 1,
      badges,
    };
  }
}

export const db = new InkTalkDatabase();
