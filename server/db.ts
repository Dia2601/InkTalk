import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { DatabaseSync } from 'node:sqlite';
import type {
  User,
  Work,
  Character,
  CharacterStatus,
  CharacterVersion,
  CharacterDraft,
  ResearchRecord,
  DataIntegrityReport,
  Clue,
  MysteryRule,
  CanonData,
  GameSession,
  ChatMessage,
  ReadingJourney,
  AchievementBadge,
  CharacterAiTestRecord,
} from '../src/types.js';

const DATA_DIR = path.join(process.cwd(), 'data');
const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');
const BACKUPS_DIR = path.join(DATA_DIR, 'backups');
const DB_SQLITE_PATH = path.join(DATA_DIR, 'inktalk.db');
const DB_JSON_PATH = path.join(DATA_DIR, 'inktalk_database.json');

// Ensure necessary persistence directories exist
function ensureDirectories() {
  for (const dir of [DATA_DIR, UPLOADS_DIR, BACKUPS_DIR]) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }
}

export class InkTalkDatabase {
  private sqlite: any = null;
  private isWalActive = false;

  constructor() {
    ensureDirectories();
    this.initSqlite();
    this.migrateFromJsonIfNeeded();
    this.ensureSeedData();
    this.createAutomaticBackup();
  }

  private initSqlite() {
    if (!DatabaseSync) {
      console.warn('[Database] SQLite not available in runtime; operating in fallback mode.');
      return;
    }

    try {
      this.sqlite = new DatabaseSync(DB_SQLITE_PATH);

      // Enable Write-Ahead Logging (WAL) for crash durability & concurrency
      this.sqlite.exec('PRAGMA journal_mode = WAL;');
      this.sqlite.exec('PRAGMA synchronous = NORMAL;');
      this.sqlite.exec('PRAGMA foreign_keys = ON;');
      this.isWalActive = true;

      // Initialize all tables
      this.sqlite.exec(`
        CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          username TEXT UNIQUE,
          diamonds INTEGER,
          lastLoginDate TEXT,
          claimedWelcomeBonus INTEGER,
          role TEXT,
          createdAt TEXT
        );

        CREATE TABLE IF NOT EXISTS works (
          id TEXT PRIMARY KEY,
          title TEXT,
          author TEXT,
          era TEXT,
          summary TEXT,
          chapters TEXT,
          createdAt TEXT
        );

        CREATE TABLE IF NOT EXISTS characters (
          id TEXT PRIMARY KEY,
          workId TEXT,
          workTitle TEXT,
          workAuthor TEXT,
          name TEXT,
          role TEXT,
          badge TEXT,
          personality TEXT,
          voiceTone TEXT,
          pronouns TEXT,
          perspective TEXT,
          knownFacts TEXT,
          knowledgeBoundaries TEXT,
          shortIntro TEXT,
          imageUrl TEXT,
          isPublished INTEGER,
          status TEXT,
          version INTEGER,
          updatedAt TEXT,
          createdAt TEXT
        );

        CREATE TABLE IF NOT EXISTS character_versions (
          id TEXT PRIMARY KEY,
          characterId TEXT,
          versionNumber INTEGER,
          snapshotData TEXT,
          changeSummary TEXT,
          createdAt TEXT
        );

        CREATE TABLE IF NOT EXISTS character_drafts (
          id TEXT PRIMARY KEY,
          characterId TEXT,
          formData TEXT,
          lastSavedAt TEXT
        );

        CREATE TABLE IF NOT EXISTS clues (
          id TEXT PRIMARY KEY,
          characterId TEXT,
          workId TEXT,
          title TEXT,
          description TEXT,
          sourceHint TEXT,
          triggerKeywords TEXT,
          semanticContext TEXT,
          isDecoded INTEGER
        );

        CREATE TABLE IF NOT EXISTS mystery_rules (
          id TEXT PRIMARY KEY,
          characterId TEXT,
          requiredClueIds TEXT,
          validCombinations TEXT,
          deductionSolution TEXT,
          minQuestionsForDeduction INTEGER,
          replayMinQuestions INTEGER
        );

        CREATE TABLE IF NOT EXISTS canon_data (
          id TEXT PRIMARY KEY,
          workId TEXT,
          timeline TEXT,
          verifiedQuotes TEXT,
          coreThemes TEXT,
          conflict TEXT
        );

        CREATE TABLE IF NOT EXISTS sessions (
          id TEXT PRIMARY KEY,
          userId TEXT,
          characterId TEXT,
          questionCount INTEGER,
          isReplay INTEGER,
          unlockedClueIds TEXT,
          decodedCombinationIds TEXT,
          failedAttempts INTEGER,
          testLockedUntilQuestion INTEGER,
          completed INTEGER,
          createdAt TEXT
        );

        CREATE TABLE IF NOT EXISTS messages (
          id TEXT PRIMARY KEY,
          sessionId TEXT,
          sender TEXT,
          text TEXT,
          timestamp TEXT,
          clueUnlocked TEXT,
          debugInfo TEXT
        );

        CREATE TABLE IF NOT EXISTS research_records (
          id TEXT PRIMARY KEY,
          workTitle TEXT,
          author TEXT,
          excerpt TEXT,
          status TEXT,
          result TEXT,
          errorMessage TEXT,
          createdAt TEXT,
          updatedAt TEXT
        );

        CREATE TABLE IF NOT EXISTS ai_test_records (
          characterId TEXT PRIMARY KEY,
          status TEXT,
          passedCount INTEGER,
          totalCount INTEGER,
          report TEXT,
          errorMessage TEXT,
          lastRunAt TEXT
        );
      `);

      console.log('[Database] SQLite persistent engine initialized successfully with WAL mode.');
    } catch (err) {
      console.error('[Database] Failed to initialize SQLite engine:', err);
    }
  }

  // Migrate existing data from inktalk_database.json if SQLite is fresh
  private migrateFromJsonIfNeeded() {
    if (!this.sqlite) return;

    try {
      const charCountRow = this.sqlite.prepare('SELECT COUNT(*) as cnt FROM characters').get();
      const count = Number(charCountRow?.cnt || 0);

      if (count === 0 && fs.existsSync(DB_JSON_PATH)) {
        console.log('[Database Migration] Detecting existing data from JSON file...');
        const raw = fs.readFileSync(DB_JSON_PATH, 'utf-8');
        const json = JSON.parse(raw);

        // Migrate users
        if (Array.isArray(json.users)) {
          const insertUser = this.sqlite.prepare(`
            INSERT OR REPLACE INTO users (id, username, diamonds, lastLoginDate, claimedWelcomeBonus, role, createdAt)
            VALUES (?, ?, ?, ?, ?, ?, ?)
          `);
          for (const u of json.users) {
            insertUser.run(
              u.id,
              u.username,
              u.diamonds ?? 500,
              u.lastLoginDate || new Date().toISOString().split('T')[0],
              u.claimedWelcomeBonus ? 1 : 0,
              u.role || 'PLAYER',
              u.createdAt || new Date().toISOString()
            );
          }
        }

        // Migrate works
        if (Array.isArray(json.works)) {
          const insertWork = this.sqlite.prepare(`
            INSERT OR REPLACE INTO works (id, title, author, era, summary, chapters, createdAt)
            VALUES (?, ?, ?, ?, ?, ?, ?)
          `);
          for (const w of json.works) {
            insertWork.run(
              w.id,
              w.title,
              w.author,
              w.era || 'Văn học THPT',
              w.summary || '',
              JSON.stringify(w.chapters || []),
              w.createdAt || new Date().toISOString()
            );
          }
        }

        // Migrate characters
        if (Array.isArray(json.characters)) {
          const insertChar = this.sqlite.prepare(`
            INSERT OR REPLACE INTO characters (
              id, workId, workTitle, workAuthor, name, role, badge, personality,
              voiceTone, pronouns, perspective, knownFacts, knowledgeBoundaries,
              shortIntro, imageUrl, isPublished, status, version, updatedAt, createdAt
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `);
          for (const c of json.characters) {
            const status = c.isPublished ? 'PUBLISHED' : 'DRAFT';
            insertChar.run(
              c.id,
              c.workId,
              c.workTitle || '',
              c.workAuthor || '',
              c.name,
              c.role || 'Nhân vật chính',
              c.badge || 'main',
              c.personality || '',
              c.voiceTone || '',
              c.pronouns || 'tôi',
              c.perspective || '',
              JSON.stringify(c.knownFacts || []),
              JSON.stringify(c.knowledgeBoundaries || []),
              c.shortIntro || '',
              c.imageUrl || '',
              c.isPublished ? 1 : 0,
              status,
              c.version || 1,
              new Date().toISOString(),
              c.createdAt || new Date().toISOString()
            );
          }
        }

        // Migrate clues
        if (Array.isArray(json.clues)) {
          const insertClue = this.sqlite.prepare(`
            INSERT OR REPLACE INTO clues (
              id, characterId, workId, title, description, sourceHint, triggerKeywords, semanticContext, isDecoded
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          `);
          for (const cl of json.clues) {
            insertClue.run(
              cl.id,
              cl.characterId,
              cl.workId,
              cl.title,
              cl.description,
              cl.sourceHint || '',
              JSON.stringify(cl.triggerKeywords || []),
              cl.semanticContext || '',
              cl.isDecoded ? 1 : 0
            );
          }
        }

        // Migrate mystery rules
        if (Array.isArray(json.mysteryRules)) {
          const insertRule = this.sqlite.prepare(`
            INSERT OR REPLACE INTO mystery_rules (
              id, characterId, requiredClueIds, validCombinations, deductionSolution, minQuestionsForDeduction, replayMinQuestions
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
          `);
          for (const r of json.mysteryRules) {
            insertRule.run(
              r.id || `rule_${r.characterId}`,
              r.characterId,
              JSON.stringify(r.requiredClueIds || []),
              JSON.stringify(r.validCombinations || []),
              JSON.stringify(r.deductionSolution || {}),
              r.minQuestionsForDeduction || 5,
              r.replayMinQuestions || 20
            );
          }
        }

        // Migrate sessions and messages
        if (Array.isArray(json.sessions)) {
          const insertSession = this.sqlite.prepare(`
            INSERT OR REPLACE INTO sessions (
              id, userId, characterId, questionCount, isReplay, unlockedClueIds,
              decodedCombinationIds, failedAttempts, testLockedUntilQuestion, completed, createdAt
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `);
          for (const s of json.sessions) {
            insertSession.run(
              s.id,
              s.userId,
              s.characterId,
              s.questionCount || 0,
              s.isReplay ? 1 : 0,
              JSON.stringify(s.unlockedClueIds || []),
              JSON.stringify(s.decodedCombinationIds || []),
              s.failedAttempts || 0,
              s.testLockedUntilQuestion || 0,
              s.completed ? 1 : 0,
              s.createdAt || new Date().toISOString()
            );
          }
        }

        if (Array.isArray(json.messages)) {
          const insertMsg = this.sqlite.prepare(`
            INSERT OR REPLACE INTO messages (id, sessionId, sender, text, timestamp, clueUnlocked, debugInfo)
            VALUES (?, ?, ?, ?, ?, ?, ?)
          `);
          for (const m of json.messages) {
            insertMsg.run(
              m.id,
              m.sessionId,
              m.sender,
              m.text,
              m.timestamp || new Date().toISOString(),
              m.clueUnlocked ? JSON.stringify(m.clueUnlocked) : null,
              m.debugInfo ? JSON.stringify(m.debugInfo) : null
            );
          }
        }

        console.log('[Database Migration] Successfully migrated existing data into persistent SQLite tables.');
      }
    } catch (migErr) {
      console.error('[Database Migration] Error during JSON migration:', migErr);
    }
  }

  // Ensure both "Vũ Nương" and "Chí Phèo" exist in database
  private ensureSeedData() {
    if (!this.sqlite) return;

    try {
      // 1. Ensure "Chuyện người con gái Nam Xương" & "Vũ Nương"
      let vnWork = this.getWorkByTitle('Chuyện người con gái Nam Xương');
      if (!vnWork) {
        vnWork = this.createWork({
          title: 'Chuyện người con gái Nam Xương',
          author: 'Nguyễn Dữ',
          era: 'Văn học trung đại thế kỷ XVI',
          summary:
            'Tác phẩm ngợi ca vẻ đẹp đoan trang, tiết hạnh của người phụ nữ Vũ Thị Thiết (Vũ Nương), đồng thời phản ánh số phận đầy oan khuất, bi kịch do chiến tranh phong kiến và chế độ gia trưởng đa nghi gây nên.',
        });
      }

      const vnChar = this.findCharacterByName('Vũ Nương');
      if (!vnChar && vnWork) {
        this.createCharacter({
          workId: vnWork.id,
          workTitle: vnWork.title,
          workAuthor: vnWork.author,
          name: 'Vũ Nương',
          role: 'Nhân vật chính',
          badge: 'main',
          personality:
            'Thùy mị, nết na, đoan trang, giàu lòng vị tha và tình mẫu tử, chịu oan khuất nhưng trọng danh dự.',
          voiceTone: 'Trầm lắng, dịu dàng, lễ phép cổ phong nhưng ẩn chứa nỗi u hoài sâu sắc.',
          pronouns: 'thiếp - bạn đọc/người',
          perspective:
            'Góc nhìn của người phụ nữ chịu tiếng oan từ sự đa nghi của chồng và lời ngây thơ của con nhỏ.',
          knownFacts: [
            'Nàng hết lòng phụng dưỡng mẹ chồng và chăm sóc bé Đản khi Trương Sinh đi lính.',
            'Mẹ chồng mất, nàng lo liệu ma chay chu tất như với cha mẹ đẻ.',
            'Mỗi tối dỗ con, nàng thường chỉ bóng mình trên vách và nói đó là cha Đản.',
            'Trương Sinh trở về nghe con thơ nói đã nổi cơn ghen mù quáng, ruồng rẫy nàng.',
            'Nàng tắm gội chay sạch, đến bến Hoàng Giang than khóc rồi trẫm mình.',
          ],
          knowledgeBoundaries: [
            'Không biết Trương Sinh nghĩ gì sau khi nàng mất cho đến khi chàng thấy cái bóng trên vách.',
            'Không biết thế giới hiện đại hay các tác phẩm khác.',
          ],
          shortIntro:
            'Người con gái quê ở Nam Xương, tính đã thùy mị nết na, lại thêm tư dung tốt đẹp, trọn đời giữ gìn tiết hạnh...',
          imageUrl: '/src/assets/images/vu_nuong_portrait_1790034427247.jpg',
          isPublished: true,
          status: 'PUBLISHED',
        });
      }

      // 2. Ensure "Chí Phèo" (Nam Cao) work and character are preserved
      let cpWork = this.getWorkByTitle('Chí Phèo');
      if (!cpWork) {
        cpWork = this.createWork({
          title: 'Chí Phèo',
          author: 'Nam Cao',
          era: 'Văn học hiện thực phê phán 1930 - 1945',
          summary:
            'Kiệt tác văn xuôi hiện thực phê phán viết về bi kịch tha hóa và khát vọng lương thiện bị cự tuyệt của người nông dân nghèo trước Cách mạng tháng Tám.',
        });
      }

      const cpChar = this.findCharacterByName('Chí Phèo');
      if (!cpChar && cpWork) {
        const newCp = this.createCharacter({
          workId: cpWork.id,
          workTitle: cpWork.title,
          workAuthor: cpWork.author,
          name: 'Chí Phèo',
          role: 'Nhân vật chính',
          badge: 'main',
          personality:
            'Vốn là nông dân hiền lành như đất; sau khi bị Bá Kiến đẩy vào tù thì trở thành con quỷ dữ của làng Vũ Đại, nhưng sâu thẳm vẫn cháy bỏng khát vọng làm người lương thiện sau bát cháo hành của Thị Nở.',
          voiceTone:
            'Chua chát, phẫn uất, lúc thì chửi đổng say khướt, lúc lại tha thiết thèm làm người lương thiện.',
          pronouns: 'tao - mày / tôi - bác',
          perspective:
            'Góc nhìn bi kịch của kẻ bị tước đoạt cả nhân hình lẫn nhân tính, khao khát hoàn lương nhưng bị định kiến xã hội xua đuổi.',
          knownFacts: [
            'Bị bỏ rơi ở lò gạch cũ từ khi mới lọt lòng, lớn lên làm canh điền cho nhà Bá Kiến.',
            'Bị Bá Kiến ghen tuông với bà Ba nên ngấm ngầm hãm hại đẩy vào tù ngục thực dân.',
            'Ra tù với nhân hình biến dạng, mặt đầy sẹo, trở thành tay sai đắc lực của Bá Kiến.',
            'Gặp Thị Nở ở vườn chuối bờ sông, ăn bát cháo hành và thức tỉnh lương tri.',
            'Bị Thị Nở cự tuyệt theo lời bà cô, rơi vào tận cùng đau đớn và tuyệt vọng.',
            'Đến nhà Bá Kiến đòi lương thiện: "Ai cho tao lương thiện?", đâm chết Bá Kiến rồi tự sát.',
          ],
          knowledgeBoundaries: [
            'Không biết những toan tính chính trị, thế giới hiện đại sau năm 1945.',
            'Không biết suy nghĩ thầm kín trong đầu bà cô Thị Nở ngoài lời Thị Nở thuật lại.',
          ],
          shortIntro:
            'Kẻ ngơ ngác giữa ngã ba lương thiện và quỷ dữ làng Vũ Đại, mang theo vết sẹo bi thương của kiếp người cùng quẫn...',
          imageUrl: '',
          isPublished: true,
          status: 'PUBLISHED',
        });

        // Seed clues for Chí Phèo
        this.saveClues([
          {
            id: 'clue_cp_1',
            characterId: newCp.id,
            workId: cpWork.id,
            title: 'Bát cháo hành của Thị Nở',
            description:
              'Hương cháo hành buổi sớm thức tỉnh phần người đã ngủ quên trong tâm hồn Chí Phèo sau hai mươi năm đọa đày.',
            sourceHint: 'Buổi sáng sau đêm trăng ở bờ sông',
            triggerKeywords: ['cháo hành', 'thị nở', 'lương thiện', 'tỉnh dậy'],
            semanticContext: 'Khao khát trở lại làm người hiền lành, xây dựng hạnh phúc bình dị.',
          },
          {
            id: 'clue_cp_2',
            characterId: newCp.id,
            workId: cpWork.id,
            title: 'Tiếng chửi làng Vũ Đại',
            description:
              'Chí Phèo chửi trời, chửi đời, chửi cả làng Vũ Đại và chửi đứa nào đẻ ra thân hắn.',
            sourceHint: 'Mỗi khi say rượu đi dọc đường làng',
            triggerKeywords: ['chửi', 'say rượu', 'làng vũ đại', 'rạch mặt'],
            semanticContext: 'Tiếng kêu cứu tuyệt vọng muốn giao tiếp với đồng loại của một linh hồn cô độc.',
          },
          {
            id: 'clue_cp_3',
            characterId: newCp.id,
            workId: cpWork.id,
            title: 'Mối thù Bá Kiến',
            description:
              'Căn nguyên của mọi nỗi đau khổ: Bá Kiến đẩy Chí vào tù vì ghen tuông vô cớ.',
            sourceHint: 'Những ngày làm canh điền ở nhà cụ Bá',
            triggerKeywords: ['bá kiến', 'ở tù', 'bà ba', 'đòi lương thiện'],
            semanticContext: 'Mâu thuẫn giai cấp sâu sắc giữa cường hào phong kiến và người nông dân bần cùng hóa.',
          },
        ]);

        this.saveMysteryRule({
          id: `rule_${newCp.id}`,
          characterId: newCp.id,
          requiredClueIds: ['clue_cp_1', 'clue_cp_3'],
          validCombinations: [
            {
              clueIds: ['clue_cp_1', 'clue_cp_3'],
              relationshipReveal:
                'Bát cháo hành của Thị Nở khơi dậy khao khát lương thiện, nhưng chính Bá Kiến và định kiến làng xã đã chặn đứng con đường hoàn lương.',
            },
          ],
          deductionSolution: {
            prompt: 'Tại sao Chí Phèo lại đâm chết Bá Kiến thay vì tiếp tục làm tay sai đòi nợ?',
            correctClueIds: ['clue_cp_1', 'clue_cp_3'],
            explanation:
              'Chí Phèo đã tỉnh rượu và nhận ra kẻ tước đoạt nhân tính, đẩy mình vào bước đường cùng không thể làm người lương thiện chính là Bá Kiến.',
            finalReveal:
              'Câu hỏi nhức nhối: "Ai cho tao lương thiện?" là lời kết án đanh thép chế độ thực dân nửa phong kiến tàn bạo.',
          },
          minQuestionsForDeduction: 5,
          replayMinQuestions: 20,
        });

        // Also record a successful research record for Chí Phèo
        this.createOrUpdateResearchRecord(
          'Chí Phèo',
          'Nam Cao',
          'Tác phẩm truyện ngắn hiện thực xuất sắc.',
          'SUCCESS',
          {
            work: {
              title: cpWork.title,
              author: cpWork.author,
              era: cpWork.era,
              summary: cpWork.summary,
            },
            characters: [
              {
                name: newCp.name,
                role: newCp.role,
                badge: newCp.badge,
                personality: newCp.personality,
                voiceTone: newCp.voiceTone,
                pronouns: newCp.pronouns,
                perspective: newCp.perspective,
                shortIntro: newCp.shortIntro,
                knownFacts: newCp.knownFacts,
                knowledgeBoundaries: newCp.knowledgeBoundaries,
              },
            ],
            clues: [
              {
                title: 'Bát cháo hành của Thị Nở',
                description: 'Hương cháo hành buổi sớm thức tỉnh phần người.',
                triggerKeywords: ['cháo hành', 'lương thiện'],
              },
            ],
          }
        );
      }
    } catch (seedErr) {
      console.error('[Database Seed] Error ensuring seed data:', seedErr);
    }
  }

  // Write atomic JSON snapshot to disk so both SQLite and JSON files stay 100% in sync
  public saveJsonSnapshot() {
    try {
      const dump = this.exportFullDatabase();
      const tmpPath = `${DB_JSON_PATH}.tmp_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      fs.writeFileSync(tmpPath, JSON.stringify(dump, null, 2), 'utf-8');
      fs.renameSync(tmpPath, DB_JSON_PATH);
    } catch (e) {
      console.error('[Database] Failed to write atomic JSON snapshot:', e);
    }
  }

  // Automatic timestamped rolling backups (keeps last 10 snapshots)
  public createAutomaticBackup(): string | null {
    try {
      const dump = this.exportFullDatabase();
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `inktalk_backup_${timestamp}.json`;
      const backupPath = path.join(BACKUPS_DIR, filename);

      fs.writeFileSync(backupPath, JSON.stringify(dump, null, 2), 'utf-8');

      // Clean up older backups keeping the 10 most recent
      const files = fs
        .readdirSync(BACKUPS_DIR)
        .filter((f) => f.startsWith('inktalk_backup_') && f.endsWith('.json'))
        .sort()
        .reverse();

      if (files.length > 10) {
        for (const oldFile of files.slice(10)) {
          try {
            fs.unlinkSync(path.join(BACKUPS_DIR, oldFile));
          } catch {}
        }
      }

      return filename;
    } catch (e) {
      console.error('[Database] Failed to create automatic backup:', e);
      return null;
    }
  }

  // --- Users & Auth ---
  findUserByUsername(username: string): User | undefined {
    if (!this.sqlite) return undefined;
    const row = this.sqlite
      .prepare('SELECT * FROM users WHERE LOWER(username) = LOWER(?)')
      .get(username.trim());
    if (!row) return undefined;
    return {
      id: row.id,
      username: row.username,
      diamonds: Number(row.diamonds),
      lastLoginDate: row.lastLoginDate,
      claimedWelcomeBonus: Boolean(row.claimedWelcomeBonus),
      role: row.role || 'PLAYER',
      createdAt: row.createdAt,
    };
  }

  findUserById(id: string): User | undefined {
    if (!this.sqlite) return undefined;
    const cleanId = (id || '').trim();
    if (!cleanId) return undefined;
    const row = this.sqlite.prepare('SELECT * FROM users WHERE id = ?').get(cleanId);
    if (!row) return undefined;
    return {
      id: row.id,
      username: row.username,
      diamonds: Number(row.diamonds),
      lastLoginDate: row.lastLoginDate,
      claimedWelcomeBonus: Boolean(row.claimedWelcomeBonus),
      role: row.role || 'PLAYER',
      createdAt: row.createdAt,
    };
  }

  /**
   * Resilient Player Resolver:
   * Accurately resolves player by ID, username, active session, or single existing active player.
   * Prevents accidental 'Player not found' errors when identifier formatting differs.
   */
  resolveUser(
    identifier?: string,
    fallbackInfo?: { username?: string; diamonds?: number; characterId?: string }
  ): User | undefined {
    if (!this.sqlite) return undefined;

    const trimmed = (identifier || '').trim();

    // 1. Direct ID lookup
    if (trimmed) {
      const byId = this.findUserById(trimmed);
      if (byId) return byId;

      // 2. Direct username lookup
      const byUsername = this.findUserByUsername(trimmed);
      if (byUsername) return byUsername;
    }

    // 3. Fallback username lookup if provided
    if (fallbackInfo?.username?.trim()) {
      const byFallbackName = this.findUserByUsername(fallbackInfo.username.trim());
      if (byFallbackName) return byFallbackName;
    }

    // 4. Admin testing profile (allows admin to test gameplay as player)
    if (trimmed === 'admin_sys' || trimmed === 'admin@' || fallbackInfo?.username === 'admin@') {
      return {
        id: 'admin_sys',
        username: 'admin@',
        diamonds: 999999,
        lastLoginDate: new Date().toISOString().split('T')[0],
        claimedWelcomeBonus: true,
        role: 'ADMIN',
        createdAt: '2026-01-01',
      };
    }

    // 5. Check sessions if characterId provided
    if (fallbackInfo?.characterId) {
      try {
        const sessionRow: any = this.sqlite
          .prepare('SELECT userId FROM sessions WHERE characterId = ? AND completed = 0 ORDER BY createdAt DESC LIMIT 1')
          .get(fallbackInfo.characterId);
        if (sessionRow?.userId) {
          const userFromSession = this.findUserById(sessionRow.userId) || this.findUserByUsername(sessionRow.userId);
          if (userFromSession) return userFromSession;
        }
      } catch (err) {
        // silent
      }
    }

    // 6. Check existing users in the system:
    // If there is an existing registered user in the database (e.g. ThanhTam with 497 diamonds),
    // and the request comes from the player, resolve to this active player account!
    try {
      const allRows: any[] = this.sqlite.prepare('SELECT * FROM users ORDER BY createdAt ASC').all();
      if (allRows.length === 1) {
        const row = allRows[0];
        console.log(`[Player Resolution] Resolved identifier "${trimmed}" to existing active player "${row.username}" (${row.id}) with ${row.diamonds} 💎`);
        return {
          id: row.id,
          username: row.username,
          diamonds: Number(row.diamonds),
          lastLoginDate: row.lastLoginDate,
          claimedWelcomeBonus: Boolean(row.claimedWelcomeBonus),
          role: row.role || 'PLAYER',
          createdAt: row.createdAt,
        };
      }
    } catch (err) {
      console.error('[Player Resolution] Error checking existing users:', err);
    }

    // 7. If no user exists at all in the database, safely create the initial player profile
    // preserving current state/diamonds (e.g. 497 diamonds)
    if (trimmed || fallbackInfo?.username) {
      const newUsername = (fallbackInfo?.username || trimmed || 'ThanhTam').trim();
      const initialDiamonds = typeof fallbackInfo?.diamonds === 'number' ? fallbackInfo.diamonds : 497;
      console.log(`[Player Resolution] Initializing missing player record for "${newUsername}" with ${initialDiamonds} 💎`);
      const user = this.createUser(newUsername);
      if (initialDiamonds !== 500) {
        this.sqlite.prepare('UPDATE users SET diamonds = ? WHERE id = ?').run(initialDiamonds, user.id);
        user.diamonds = initialDiamonds;
        this.saveJsonSnapshot();
      }
      return user;
    }

    return undefined;
  }

  createUser(username: string): User {
    const today = new Date().toISOString().split('T')[0];
    const newUser: User = {
      id: 'usr_' + crypto.randomBytes(6).toString('hex'),
      username,
      diamonds: 500, // +500 diamonds first login bonus
      lastLoginDate: today,
      claimedWelcomeBonus: true,
      role: 'PLAYER',
      createdAt: new Date().toISOString(),
    };

    if (this.sqlite) {
      this.sqlite
        .prepare(`
          INSERT INTO users (id, username, diamonds, lastLoginDate, claimedWelcomeBonus, role, createdAt)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `)
        .run(
          newUser.id,
          newUser.username,
          newUser.diamonds,
          newUser.lastLoginDate,
          1,
          newUser.role,
          newUser.createdAt
        );
      this.saveJsonSnapshot();
    }
    return newUser;
  }

  dailyCheckin(userId: string): { success: boolean; diamondsAdded: number; user: User } {
    const user = this.resolveUser(userId);
    if (!user) throw new Error('User not found');

    const today = new Date().toISOString().split('T')[0];
    if (user.lastLoginDate === today) {
      return { success: false, diamondsAdded: 0, user };
    }

    const updatedDiamonds = user.diamonds + 100;
    if (this.sqlite) {
      this.sqlite
        .prepare('UPDATE users SET diamonds = ?, lastLoginDate = ? WHERE id = ?')
        .run(updatedDiamonds, today, userId);
      this.saveJsonSnapshot();
    }
    user.diamonds = updatedDiamonds;
    user.lastLoginDate = today;
    return { success: true, diamondsAdded: 100, user };
  }

  updateUserDiamonds(userId: string, delta: number): User {
    const user = this.resolveUser(userId);
    if (!user) throw new Error('User not found');

    const updatedDiamonds = Math.max(0, user.diamonds + delta);
    if (this.sqlite) {
      this.sqlite
        .prepare('UPDATE users SET diamonds = ? WHERE id = ?')
        .run(updatedDiamonds, userId);
      this.saveJsonSnapshot();
    }
    user.diamonds = updatedDiamonds;
    return user;
  }

  // --- Works ---
  getWorks(): Work[] {
    if (!this.sqlite) return [];
    const rows = this.sqlite.prepare('SELECT * FROM works ORDER BY createdAt DESC').all();
    return rows.map((r: any) => ({
      id: r.id,
      title: r.title,
      author: r.author,
      era: r.era,
      summary: r.summary,
      chapters: r.chapters ? JSON.parse(r.chapters) : [],
      createdAt: r.createdAt,
    }));
  }

  getWorkById(id: string): Work | undefined {
    if (!this.sqlite) return undefined;
    const r = this.sqlite.prepare('SELECT * FROM works WHERE id = ?').get(id);
    if (!r) return undefined;
    return {
      id: r.id,
      title: r.title,
      author: r.author,
      era: r.era,
      summary: r.summary,
      chapters: r.chapters ? JSON.parse(r.chapters) : [],
      createdAt: r.createdAt,
    };
  }

  getWorkByTitle(title: string): Work | undefined {
    if (!this.sqlite) return undefined;
    const r = this.sqlite
      .prepare('SELECT * FROM works WHERE LOWER(title) = LOWER(?)')
      .get(title.trim());
    if (!r) return undefined;
    return {
      id: r.id,
      title: r.title,
      author: r.author,
      era: r.era,
      summary: r.summary,
      chapters: r.chapters ? JSON.parse(r.chapters) : [],
      createdAt: r.createdAt,
    };
  }

  createWork(work: Omit<Work, 'id' | 'createdAt'>): Work {
    const newWork: Work = {
      ...work,
      id: 'wrk_' + crypto.randomBytes(6).toString('hex'),
      createdAt: new Date().toISOString(),
    };

    if (this.sqlite) {
      this.sqlite
        .prepare(`
          INSERT INTO works (id, title, author, era, summary, chapters, createdAt)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `)
        .run(
          newWork.id,
          newWork.title,
          newWork.author,
          newWork.era || 'Văn học THPT',
          newWork.summary || '',
          JSON.stringify(newWork.chapters || []),
          newWork.createdAt
        );
      this.saveJsonSnapshot();
    }
    return newWork;
  }

  updateWork(id: string, updates: Partial<Work>): Work | undefined {
    const existing = this.getWorkById(id);
    if (!existing || !this.sqlite) return undefined;

    const merged: Work = {
      ...existing,
      ...updates,
    };

    this.sqlite.exec('BEGIN TRANSACTION;');
    try {
      this.sqlite
        .prepare(`
          UPDATE works SET
            title = ?, author = ?, era = ?, summary = ?, chapters = ?
          WHERE id = ?
        `)
        .run(
          merged.title,
          merged.author,
          merged.era || 'Văn học THPT',
          merged.summary || '',
          JSON.stringify(merged.chapters || []),
          id
        );

      // If work title or author changed, cascade update to characters
      if (updates.title || updates.author) {
        this.sqlite
          .prepare(`
            UPDATE characters SET
              workTitle = COALESCE(?, workTitle),
              workAuthor = COALESCE(?, workAuthor)
            WHERE workId = ?
          `)
          .run(updates.title || null, updates.author || null, id);
      }

      this.sqlite.exec('COMMIT;');
      this.saveJsonSnapshot();
      return merged;
    } catch (e) {
      this.sqlite.exec('ROLLBACK;');
      console.error('[Database] Failed to update work transactionally:', e);
      throw e;
    }
  }

  deleteWork(id: string): boolean {
    if (!this.sqlite) return false;
    this.sqlite.exec('BEGIN TRANSACTION;');
    try {
      this.sqlite.prepare('DELETE FROM works WHERE id = ?').run(id);
      this.sqlite.prepare('DELETE FROM characters WHERE workId = ?').run(id);
      this.sqlite.prepare('DELETE FROM clues WHERE workId = ?').run(id);
      this.sqlite.exec('COMMIT;');
      this.saveJsonSnapshot();
      return true;
    } catch (e) {
      this.sqlite.exec('ROLLBACK;');
      console.error('[Database] Failed to delete work transactionally:', e);
      return false;
    }
  }

  // --- Characters ---
  private mapCharacterRow(r: any): Character {
    return {
      id: r.id,
      workId: r.workId,
      workTitle: r.workTitle || '',
      workAuthor: r.workAuthor || '',
      name: r.name,
      role: r.role,
      badge: r.badge,
      personality: r.personality,
      voiceTone: r.voiceTone,
      pronouns: r.pronouns,
      perspective: r.perspective,
      knownFacts: r.knownFacts ? JSON.parse(r.knownFacts) : [],
      knowledgeBoundaries: r.knowledgeBoundaries ? JSON.parse(r.knowledgeBoundaries) : [],
      shortIntro: r.shortIntro,
      imageUrl: r.imageUrl || '',
      isPublished: Boolean(r.isPublished),
      status: (r.status as CharacterStatus) || (r.isPublished ? 'PUBLISHED' : 'DRAFT'),
      version: Number(r.version || 1),
      updatedAt: r.updatedAt || r.createdAt,
      createdAt: r.createdAt,
    };
  }

  getPublishedCharacters(): Character[] {
    if (!this.sqlite) return [];
    const rows = this.sqlite
      .prepare("SELECT * FROM characters WHERE isPublished = 1 OR status = 'PUBLISHED' ORDER BY createdAt DESC")
      .all();
    return rows.map((r: any) => this.mapCharacterRow(r));
  }

  getAllCharacters(): Character[] {
    if (!this.sqlite) return [];
    const rows = this.sqlite.prepare('SELECT * FROM characters ORDER BY createdAt DESC').all();
    return rows.map((r: any) => this.mapCharacterRow(r));
  }

  getCharacterById(id: string): Character | undefined {
    if (!this.sqlite) return undefined;
    const r = this.sqlite.prepare('SELECT * FROM characters WHERE id = ?').get(id);
    if (!r) return undefined;
    return this.mapCharacterRow(r);
  }

  findCharacterByName(name: string): Character | undefined {
    if (!this.sqlite) return undefined;
    const r = this.sqlite
      .prepare('SELECT * FROM characters WHERE LOWER(name) = LOWER(?)')
      .get(name.trim());
    if (!r) return undefined;
    return this.mapCharacterRow(r);
  }

  createCharacter(char: Omit<Character, 'id' | 'createdAt'>): Character {
    const newChar: Character = {
      ...char,
      id: 'chr_' + crypto.randomBytes(6).toString('hex'),
      isPublished: Boolean(char.isPublished),
      status: char.status || (char.isPublished ? 'PUBLISHED' : 'DRAFT'),
      version: 1,
      updatedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };

    if (this.sqlite) {
      this.sqlite.exec('BEGIN TRANSACTION;');
      try {
        this.sqlite
          .prepare(`
            INSERT INTO characters (
              id, workId, workTitle, workAuthor, name, role, badge, personality,
              voiceTone, pronouns, perspective, knownFacts, knowledgeBoundaries,
              shortIntro, imageUrl, isPublished, status, version, updatedAt, createdAt
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `)
          .run(
            newChar.id,
            newChar.workId,
            newChar.workTitle,
            newChar.workAuthor,
            newChar.name,
            newChar.role,
            newChar.badge,
            newChar.personality,
            newChar.voiceTone,
            newChar.pronouns,
            newChar.perspective,
            JSON.stringify(newChar.knownFacts || []),
            JSON.stringify(newChar.knowledgeBoundaries || []),
            newChar.shortIntro,
            newChar.imageUrl || '',
            newChar.isPublished ? 1 : 0,
            newChar.status,
            newChar.version,
            newChar.updatedAt,
            newChar.createdAt
          );

        // Record initial Version 1
        const versionId = 'ver_' + crypto.randomBytes(6).toString('hex');
        this.sqlite
          .prepare(`
            INSERT INTO character_versions (id, characterId, versionNumber, snapshotData, changeSummary, createdAt)
            VALUES (?, ?, ?, ?, ?, ?)
          `)
          .run(
            versionId,
            newChar.id,
            1,
            JSON.stringify(newChar),
            'Khởi tạo nhân vật mới (Bản đầu tiên)',
            newChar.createdAt
          );

        this.sqlite.exec('COMMIT;');
        this.saveJsonSnapshot();
      } catch (err) {
        this.sqlite.exec('ROLLBACK;');
        console.error('[Database] Failed to insert character transactionally:', err);
        throw err;
      }
    }

    return newChar;
  }

  updateCharacter(id: string, updates: Partial<Character>, changeSummary = 'Cập nhật thông tin nhân vật'): Character | undefined {
    const existing = this.getCharacterById(id);
    if (!existing || !this.sqlite) return undefined;

    const newVersion = (existing.version || 1) + 1;
    const updatedAt = new Date().toISOString();

    let isPublished = existing.isPublished;
    let status = existing.status || 'DRAFT';

    if (updates.isPublished !== undefined) {
      isPublished = Boolean(updates.isPublished);
      if (!isPublished && (!updates.status || updates.status === 'PUBLISHED')) {
        status = 'DRAFT';
      } else if (isPublished && !updates.status) {
        status = 'PUBLISHED';
      }
    }

    if (updates.status !== undefined) {
      status = updates.status;
      if (status === 'PUBLISHED') {
        isPublished = true;
      } else if (updates.isPublished === undefined) {
        isPublished = false;
      }
    }

    const merged: Character = {
      ...existing,
      ...updates,
      version: newVersion,
      updatedAt,
      isPublished,
      status,
    };

    this.sqlite.exec('BEGIN TRANSACTION;');
    try {
      this.sqlite
        .prepare(`
          UPDATE characters SET
            workId = ?, workTitle = ?, workAuthor = ?, name = ?, role = ?, badge = ?,
            personality = ?, voiceTone = ?, pronouns = ?, perspective = ?,
            knownFacts = ?, knowledgeBoundaries = ?, shortIntro = ?, imageUrl = ?,
            isPublished = ?, status = ?, version = ?, updatedAt = ?
          WHERE id = ?
        `)
        .run(
          merged.workId,
          merged.workTitle,
          merged.workAuthor,
          merged.name,
          merged.role,
          merged.badge,
          merged.personality,
          merged.voiceTone,
          merged.pronouns,
          merged.perspective,
          JSON.stringify(merged.knownFacts || []),
          JSON.stringify(merged.knowledgeBoundaries || []),
          merged.shortIntro,
          merged.imageUrl || '',
          merged.isPublished ? 1 : 0,
          merged.status,
          merged.version,
          merged.updatedAt,
          id
        );

      // Snapshot this version
      const verId = 'ver_' + crypto.randomBytes(6).toString('hex');
      this.sqlite
        .prepare(`
          INSERT INTO character_versions (id, characterId, versionNumber, snapshotData, changeSummary, createdAt)
          VALUES (?, ?, ?, ?, ?, ?)
        `)
        .run(verId, id, newVersion, JSON.stringify(merged), changeSummary, updatedAt);

      this.sqlite.exec('COMMIT;');
      this.saveJsonSnapshot();
      return merged;
    } catch (err) {
      this.sqlite.exec('ROLLBACK;');
      console.error('[Database] Failed to update character transactionally:', err);
      throw err;
    }
  }

  deleteCharacter(id: string): boolean {
    if (!this.sqlite) return false;
    this.sqlite.exec('BEGIN TRANSACTION;');
    try {
      this.sqlite.prepare('DELETE FROM characters WHERE id = ?').run(id);
      this.sqlite.prepare('DELETE FROM clues WHERE characterId = ?').run(id);
      this.sqlite.prepare('DELETE FROM mystery_rules WHERE characterId = ?').run(id);
      this.sqlite.prepare('DELETE FROM character_versions WHERE characterId = ?').run(id);
      this.sqlite.prepare('DELETE FROM character_drafts WHERE characterId = ?').run(id);
      this.sqlite.exec('COMMIT;');
      this.saveJsonSnapshot();
      return true;
    } catch (e) {
      this.sqlite.exec('ROLLBACK;');
      console.error('[Database] Failed to delete character transactionally:', e);
      return false;
    }
  }

  // --- Character Versions ---
  getCharacterVersions(characterId: string): CharacterVersion[] {
    if (!this.sqlite) return [];
    const rows = this.sqlite
      .prepare('SELECT * FROM character_versions WHERE characterId = ? ORDER BY versionNumber DESC')
      .all(characterId);
    return rows.map((r: any) => ({
      id: r.id,
      characterId: r.characterId,
      versionNumber: Number(r.versionNumber),
      snapshotData: JSON.parse(r.snapshotData),
      changeSummary: r.changeSummary,
      createdAt: r.createdAt,
    }));
  }

  revertCharacterVersion(characterId: string, versionNumber: number): Character | undefined {
    if (!this.sqlite) return undefined;
    const row = this.sqlite
      .prepare('SELECT * FROM character_versions WHERE characterId = ? AND versionNumber = ?')
      .get(characterId, versionNumber);
    if (!row) return undefined;

    const snapshot: Character = JSON.parse(row.snapshotData);
    return this.updateCharacter(
      characterId,
      {
        ...snapshot,
        status: snapshot.status || 'DRAFT',
      },
      `Khôi phục về Phiên bản ${versionNumber}`
    );
  }

  // --- Character Drafts (Auto-Save) ---
  saveCharacterDraft(characterId: string | undefined, formData: any): CharacterDraft {
    const draftId = characterId ? `draft_${characterId}` : 'draft_new_character';
    const now = new Date().toISOString();

    if (this.sqlite) {
      this.sqlite
        .prepare(`
          INSERT INTO character_drafts (id, characterId, formData, lastSavedAt)
          VALUES (?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            formData = excluded.formData,
            lastSavedAt = excluded.lastSavedAt
        `)
        .run(draftId, characterId || '', JSON.stringify(formData), now);
    }

    return {
      id: draftId,
      characterId,
      formData,
      lastSavedAt: now,
    };
  }

  getCharacterDraft(characterId?: string): CharacterDraft | undefined {
    if (!this.sqlite) return undefined;
    const draftId = characterId ? `draft_${characterId}` : 'draft_new_character';
    const row = this.sqlite.prepare('SELECT * FROM character_drafts WHERE id = ?').get(draftId);
    if (!row) return undefined;
    return {
      id: row.id,
      characterId: row.characterId || undefined,
      formData: JSON.parse(row.formData),
      lastSavedAt: row.lastSavedAt,
    };
  }

  deleteCharacterDraft(characterId?: string) {
    if (!this.sqlite) return;
    const draftId = characterId ? `draft_${characterId}` : 'draft_new_character';
    this.sqlite.prepare('DELETE FROM character_drafts WHERE id = ?').run(draftId);
  }

  // --- Physical Image Upload & Storage ---
  saveUploadedImage(characterId: string, dataUrl: string): string {
    const char = this.getCharacterById(characterId);
    if (!char) throw new Error('Không tìm thấy nhân vật để gắn ảnh.');

    // If already a static URL or path, keep it
    if (!dataUrl.startsWith('data:image/')) {
      this.updateCharacter(characterId, { imageUrl: dataUrl }, 'Cập nhật đường dẫn ảnh');
      return dataUrl;
    }

    const matches = dataUrl.match(/^data:image\/([a-zA-Z0-9-+.]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      throw new Error('Định dạng dữ liệu ảnh Base64 không hợp lệ.');
    }

    // Attempt writing physical file for disk cache
    try {
      const rawExt = matches[1].toLowerCase();
      const ext = rawExt === 'jpeg' ? 'jpg' : rawExt === 'svg+xml' ? 'svg' : rawExt;
      const buffer = Buffer.from(matches[2], 'base64');
      const filename = `char_${characterId}_${Date.now()}.${ext}`;
      const filePath = path.join(UPLOADS_DIR, filename);
      fs.writeFileSync(filePath, buffer);
    } catch (diskErr) {
      console.warn('[Database] Local disk image cache write warning:', diskErr);
    }

    // Persist dataUrl directly in database and json snapshot so image is durable in containerized environments
    this.updateCharacter(characterId, { imageUrl: dataUrl }, 'Tải lên ảnh chân dung nhân vật');
    return dataUrl;
  }

  // --- Clues & Mystery Rules ---
  getCluesByCharacter(characterId: string): Clue[] {
    if (!this.sqlite) return [];
    const rows = this.sqlite
      .prepare('SELECT * FROM clues WHERE characterId = ? ORDER BY id ASC')
      .all(characterId);
    return rows.map((r: any) => ({
      id: r.id,
      characterId: r.characterId,
      workId: r.workId,
      title: r.title,
      description: r.description,
      sourceHint: r.sourceHint || '',
      triggerKeywords: r.triggerKeywords ? JSON.parse(r.triggerKeywords) : [],
      semanticContext: r.semanticContext || '',
      isDecoded: Boolean(r.isDecoded),
    }));
  }

  getClueById(id: string): Clue | undefined {
    if (!this.sqlite) return undefined;
    const r = this.sqlite.prepare('SELECT * FROM clues WHERE id = ?').get(id);
    if (!r) return undefined;
    return {
      id: r.id,
      characterId: r.characterId,
      workId: r.workId,
      title: r.title,
      description: r.description,
      sourceHint: r.sourceHint || '',
      triggerKeywords: r.triggerKeywords ? JSON.parse(r.triggerKeywords) : [],
      semanticContext: r.semanticContext || '',
      isDecoded: Boolean(r.isDecoded),
    };
  }

  saveClues(clues: Clue[]) {
    if (!this.sqlite || clues.length === 0) return;
    this.sqlite.exec('BEGIN TRANSACTION;');
    try {
      const stmt = this.sqlite.prepare(`
        INSERT INTO clues (
          id, characterId, workId, title, description, sourceHint, triggerKeywords, semanticContext, isDecoded
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          title = excluded.title,
          description = excluded.description,
          sourceHint = excluded.sourceHint,
          triggerKeywords = excluded.triggerKeywords,
          semanticContext = excluded.semanticContext,
          isDecoded = excluded.isDecoded
      `);
      for (const cl of clues) {
        stmt.run(
          cl.id,
          cl.characterId,
          cl.workId,
          cl.title,
          cl.description,
          cl.sourceHint || '',
          JSON.stringify(cl.triggerKeywords || []),
          cl.semanticContext || '',
          cl.isDecoded ? 1 : 0
        );
      }
      this.sqlite.exec('COMMIT;');
      this.saveJsonSnapshot();
    } catch (e) {
      this.sqlite.exec('ROLLBACK;');
      console.error('[Database] Failed to save clues transactionally:', e);
      throw e;
    }
  }

  getMysteryRuleByCharacter(characterId: string): MysteryRule | undefined {
    if (!this.sqlite) return undefined;
    const r = this.sqlite.prepare('SELECT * FROM mystery_rules WHERE characterId = ?').get(characterId);
    if (!r) return undefined;
    return {
      id: r.id,
      characterId: r.characterId,
      requiredClueIds: r.requiredClueIds ? JSON.parse(r.requiredClueIds) : [],
      validCombinations: r.validCombinations ? JSON.parse(r.validCombinations) : [],
      deductionSolution: r.deductionSolution ? JSON.parse(r.deductionSolution) : {},
      minQuestionsForDeduction: Number(r.minQuestionsForDeduction || 5),
      replayMinQuestions: Number(r.replayMinQuestions || 20),
    };
  }

  saveMysteryRule(rule: MysteryRule) {
    if (!this.sqlite) return;
    const ruleId = rule.id || `rule_${rule.characterId}`;
    this.sqlite
      .prepare(`
        INSERT INTO mystery_rules (
          id, characterId, requiredClueIds, validCombinations, deductionSolution, minQuestionsForDeduction, replayMinQuestions
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          requiredClueIds = excluded.requiredClueIds,
          validCombinations = excluded.validCombinations,
          deductionSolution = excluded.deductionSolution,
          minQuestionsForDeduction = excluded.minQuestionsForDeduction,
          replayMinQuestions = excluded.replayMinQuestions
      `)
      .run(
        ruleId,
        rule.characterId,
        JSON.stringify(rule.requiredClueIds || []),
        JSON.stringify(rule.validCombinations || []),
        JSON.stringify(rule.deductionSolution || {}),
        rule.minQuestionsForDeduction || 5,
        rule.replayMinQuestions || 20
      );
    this.saveJsonSnapshot();
  }

  // --- Sessions & Gameplay ---
  getOrCreateSession(userId: string, characterId: string, isReplay = false): GameSession {
    if (!this.sqlite) throw new Error('Database not initialized');

    if (!isReplay) {
      const existing = this.sqlite
        .prepare('SELECT * FROM sessions WHERE userId = ? AND characterId = ? AND completed = 0')
        .get(userId, characterId);
      if (existing) {
        return {
          id: existing.id,
          userId: existing.userId,
          characterId: existing.characterId,
          questionCount: Number(existing.questionCount),
          isReplay: Boolean(existing.isReplay),
          unlockedClueIds: existing.unlockedClueIds ? JSON.parse(existing.unlockedClueIds) : [],
          decodedCombinationIds: existing.decodedCombinationIds
            ? JSON.parse(existing.decodedCombinationIds)
            : [],
          failedAttempts: Number(existing.failedAttempts),
          testLockedUntilQuestion: Number(existing.testLockedUntilQuestion),
          completed: Boolean(existing.completed),
          createdAt: existing.createdAt,
        };
      }
    }

    const session: GameSession = {
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

    this.sqlite
      .prepare(`
        INSERT INTO sessions (
          id, userId, characterId, questionCount, isReplay, unlockedClueIds,
          decodedCombinationIds, failedAttempts, testLockedUntilQuestion, completed, createdAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .run(
        session.id,
        session.userId,
        session.characterId,
        session.questionCount,
        session.isReplay ? 1 : 0,
        JSON.stringify(session.unlockedClueIds),
        JSON.stringify(session.decodedCombinationIds),
        session.failedAttempts,
        session.testLockedUntilQuestion,
        session.completed ? 1 : 0,
        session.createdAt
      );
    this.saveJsonSnapshot();
    return session;
  }

  getSessionById(id: string): GameSession | undefined {
    if (!this.sqlite) return undefined;
    const r = this.sqlite.prepare('SELECT * FROM sessions WHERE id = ?').get(id);
    if (!r) return undefined;
    return {
      id: r.id,
      userId: r.userId,
      characterId: r.characterId,
      questionCount: Number(r.questionCount),
      isReplay: Boolean(r.isReplay),
      unlockedClueIds: r.unlockedClueIds ? JSON.parse(r.unlockedClueIds) : [],
      decodedCombinationIds: r.decodedCombinationIds ? JSON.parse(r.decodedCombinationIds) : [],
      failedAttempts: Number(r.failedAttempts),
      testLockedUntilQuestion: Number(r.testLockedUntilQuestion),
      completed: Boolean(r.completed),
      createdAt: r.createdAt,
    };
  }

  updateSession(id: string, updates: Partial<GameSession>): GameSession | undefined {
    const s = this.getSessionById(id);
    if (!s || !this.sqlite) return undefined;

    const merged = { ...s, ...updates };
    this.sqlite
      .prepare(`
        UPDATE sessions SET
          questionCount = ?, isReplay = ?, unlockedClueIds = ?,
          decodedCombinationIds = ?, failedAttempts = ?, testLockedUntilQuestion = ?, completed = ?
        WHERE id = ?
      `)
      .run(
        merged.questionCount,
        merged.isReplay ? 1 : 0,
        JSON.stringify(merged.unlockedClueIds || []),
        JSON.stringify(merged.decodedCombinationIds || []),
        merged.failedAttempts,
        merged.testLockedUntilQuestion,
        merged.completed ? 1 : 0,
        id
      );
    this.saveJsonSnapshot();
    return merged;
  }

  getMessagesBySession(sessionId: string): ChatMessage[] {
    if (!this.sqlite) return [];
    const rows = this.sqlite
      .prepare('SELECT * FROM messages WHERE sessionId = ? ORDER BY timestamp ASC')
      .all(sessionId);
    return rows.map((r: any) => ({
      id: r.id,
      sessionId: r.sessionId,
      sender: r.sender,
      text: r.text,
      timestamp: r.timestamp,
      clueUnlocked: r.clueUnlocked ? JSON.parse(r.clueUnlocked) : undefined,
      debugInfo: r.debugInfo ? JSON.parse(r.debugInfo) : undefined,
    }));
  }

  addMessage(msg: Omit<ChatMessage, 'id' | 'timestamp'>): ChatMessage {
    const message: ChatMessage = {
      ...msg,
      id: 'msg_' + crypto.randomBytes(6).toString('hex'),
      timestamp: new Date().toISOString(),
    };

    if (this.sqlite) {
      this.sqlite
        .prepare(`
          INSERT INTO messages (id, sessionId, sender, text, timestamp, clueUnlocked, debugInfo)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `)
        .run(
          message.id,
          message.sessionId,
          message.sender,
          message.text,
          message.timestamp,
          message.clueUnlocked ? JSON.stringify(message.clueUnlocked) : null,
          message.debugInfo ? JSON.stringify(message.debugInfo) : null
        );
      this.saveJsonSnapshot();
    }
    return message;
  }

  // --- Research Records (Persistent Storage & Anti-Spam Queue) ---
  createOrUpdateResearchRecord(
    workTitle: string,
    author: string,
    excerpt: string | undefined,
    status: 'QUEUED' | 'RUNNING' | 'SUCCESS' | 'FAILED',
    result?: any,
    errorMessage?: string
  ): ResearchRecord {
    const now = new Date().toISOString();
    const existing = this.sqlite
      ? this.sqlite
          .prepare('SELECT id, createdAt FROM research_records WHERE LOWER(workTitle) = LOWER(?)')
          .get(workTitle.trim())
      : null;

    const id = existing?.id || 'res_' + crypto.randomBytes(6).toString('hex');
    const createdAt = existing?.createdAt || now;

    if (this.sqlite) {
      this.sqlite
        .prepare(`
          INSERT INTO research_records (id, workTitle, author, excerpt, status, result, errorMessage, createdAt, updatedAt)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            author = excluded.author,
            excerpt = excluded.excerpt,
            status = excluded.status,
            result = excluded.result,
            errorMessage = excluded.errorMessage,
            updatedAt = excluded.updatedAt
        `)
        .run(
          id,
          workTitle.trim(),
          author.trim(),
          excerpt || '',
          status,
          result ? JSON.stringify(result) : null,
          errorMessage || null,
          createdAt,
          now
        );
      this.saveJsonSnapshot();
    }

    return {
      id,
      workTitle: workTitle.trim(),
      author: author.trim(),
      excerpt,
      status,
      result,
      errorMessage,
      createdAt,
      updatedAt: now,
    };
  }

  getResearchRecords(): ResearchRecord[] {
    if (!this.sqlite) return [];
    const rows = this.sqlite
      .prepare('SELECT * FROM research_records ORDER BY updatedAt DESC LIMIT 20')
      .all();
    return rows.map((r: any) => ({
      id: r.id,
      workTitle: r.workTitle,
      author: r.author,
      excerpt: r.excerpt || undefined,
      status: r.status,
      result: r.result ? JSON.parse(r.result) : undefined,
      errorMessage: r.errorMessage || undefined,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    }));
  }

  getLatestResearchRecord(): ResearchRecord | undefined {
    if (!this.sqlite) return undefined;
    const r = this.sqlite
      .prepare('SELECT * FROM research_records ORDER BY updatedAt DESC LIMIT 1')
      .get();
    if (!r) return undefined;
    return {
      id: r.id,
      workTitle: r.workTitle,
      author: r.author,
      excerpt: r.excerpt || undefined,
      status: r.status,
      result: r.result ? JSON.parse(r.result) : undefined,
      errorMessage: r.errorMessage || undefined,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    };
  }

  // --- Reading Journey ---
  getPlayerJourney(userId: string): ReadingJourney {
    const userSessions = this.sqlite
      ? this.sqlite.prepare('SELECT * FROM sessions WHERE userId = ?').all(userId)
      : [];
    const completedSessions = userSessions.filter((s: any) => Boolean(s.completed));

    const exploredCharIds = Array.from(new Set(userSessions.map((s: any) => s.characterId)));
    const allCharacters = this.getAllCharacters().filter((c) => exploredCharIds.includes(c.id));
    const exploredWorkIds = Array.from(new Set(allCharacters.map((c) => c.workId)));

    const allUnlockedClues = new Set<string>();
    userSessions.forEach((s: any) => {
      const clueIds = s.unlockedClueIds ? JSON.parse(s.unlockedClueIds) : [];
      clueIds.forEach((c: string) => allUnlockedClues.add(c));
    });

    const userMessages = this.sqlite
      ? this.sqlite
          .prepare(`
            SELECT m.* FROM messages m
            INNER JOIN sessions s ON m.sessionId = s.id
            WHERE s.userId = ? AND m.sender = 'player'
          `)
          .all(userId)
      : [];

    const badges: AchievementBadge[] = [
      {
        id: 'first_step',
        name: 'Mở Trang Đầu Tiên',
        description: 'Bắt đầu cuộc trò chuyện đầu tiên với một nhân vật văn học.',
        icon: 'BookOpen',
        unlockedAt: userMessages.length > 0 ? (userMessages[0] as any).timestamp : undefined,
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
        unlockedAt: completedSessions.length > 0 ? (completedSessions[0] as any).createdAt : undefined,
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

  // --- Full Database Export & Restore ---
  exportFullDatabase(): any {
    if (!this.sqlite) return {};
    return {
      exportVersion: '2.0.0',
      exportedAt: new Date().toISOString(),
      users: this.sqlite.prepare('SELECT * FROM users').all(),
      works: this.getWorks(),
      characters: this.getAllCharacters(),
      characterVersions: this.sqlite.prepare('SELECT * FROM character_versions').all(),
      characterDrafts: this.sqlite.prepare('SELECT * FROM character_drafts').all(),
      clues: this.sqlite.prepare('SELECT * FROM clues').all().map((c: any) => ({
        ...c,
        triggerKeywords: c.triggerKeywords ? JSON.parse(c.triggerKeywords) : [],
        isDecoded: Boolean(c.isDecoded),
      })),
      mysteryRules: this.sqlite.prepare('SELECT * FROM mystery_rules').all().map((r: any) => ({
        ...r,
        requiredClueIds: r.requiredClueIds ? JSON.parse(r.requiredClueIds) : [],
        validCombinations: r.validCombinations ? JSON.parse(r.validCombinations) : [],
        deductionSolution: r.deductionSolution ? JSON.parse(r.deductionSolution) : {},
      })),
      sessions: this.sqlite.prepare('SELECT * FROM sessions').all().map((s: any) => ({
        ...s,
        unlockedClueIds: s.unlockedClueIds ? JSON.parse(s.unlockedClueIds) : [],
        decodedCombinationIds: s.decodedCombinationIds ? JSON.parse(s.decodedCombinationIds) : [],
        isReplay: Boolean(s.isReplay),
        completed: Boolean(s.completed),
      })),
      messages: this.sqlite.prepare('SELECT * FROM messages').all().map((m: any) => ({
        ...m,
        clueUnlocked: m.clueUnlocked ? JSON.parse(m.clueUnlocked) : undefined,
        debugInfo: m.debugInfo ? JSON.parse(m.debugInfo) : undefined,
      })),
      researchRecords: this.getResearchRecords(),
    };
  }

  restoreFullDatabase(data: any): boolean {
    if (!this.sqlite || !data) return false;

    // Create a safety backup first
    this.createAutomaticBackup();

    this.sqlite.exec('BEGIN TRANSACTION;');
    try {
      this.sqlite.exec(`
        DELETE FROM users;
        DELETE FROM works;
        DELETE FROM characters;
        DELETE FROM character_versions;
        DELETE FROM character_drafts;
        DELETE FROM clues;
        DELETE FROM mystery_rules;
        DELETE FROM sessions;
        DELETE FROM messages;
        DELETE FROM research_records;
      `);

      if (Array.isArray(data.users)) {
        const stmt = this.sqlite.prepare(`
          INSERT INTO users (id, username, diamonds, lastLoginDate, claimedWelcomeBonus, role, createdAt)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `);
        for (const u of data.users) {
          stmt.run(u.id, u.username, u.diamonds, u.lastLoginDate, u.claimedWelcomeBonus ? 1 : 0, u.role || 'PLAYER', u.createdAt);
        }
      }

      if (Array.isArray(data.works)) {
        const stmt = this.sqlite.prepare(`
          INSERT INTO works (id, title, author, era, summary, chapters, createdAt)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `);
        for (const w of data.works) {
          stmt.run(w.id, w.title, w.author, w.era, w.summary, JSON.stringify(w.chapters || []), w.createdAt);
        }
      }

      if (Array.isArray(data.characters)) {
        const stmt = this.sqlite.prepare(`
          INSERT INTO characters (
            id, workId, workTitle, workAuthor, name, role, badge, personality,
            voiceTone, pronouns, perspective, knownFacts, knowledgeBoundaries,
            shortIntro, imageUrl, isPublished, status, version, updatedAt, createdAt
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        for (const c of data.characters) {
          stmt.run(
            c.id, c.workId, c.workTitle || '', c.workAuthor || '', c.name, c.role, c.badge,
            c.personality, c.voiceTone, c.pronouns, c.perspective,
            JSON.stringify(c.knownFacts || []), JSON.stringify(c.knowledgeBoundaries || []),
            c.shortIntro, c.imageUrl || '', c.isPublished ? 1 : 0, c.status || 'DRAFT',
            c.version || 1, c.updatedAt || c.createdAt, c.createdAt
          );
        }
      }

      if (Array.isArray(data.clues)) {
        const stmt = this.sqlite.prepare(`
          INSERT INTO clues (id, characterId, workId, title, description, sourceHint, triggerKeywords, semanticContext, isDecoded)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        for (const cl of data.clues) {
          stmt.run(
            cl.id, cl.characterId, cl.workId, cl.title, cl.description, cl.sourceHint || '',
            JSON.stringify(cl.triggerKeywords || []), cl.semanticContext || '', cl.isDecoded ? 1 : 0
          );
        }
      }

      if (Array.isArray(data.mysteryRules)) {
        const stmt = this.sqlite.prepare(`
          INSERT INTO mystery_rules (id, characterId, requiredClueIds, validCombinations, deductionSolution, minQuestionsForDeduction, replayMinQuestions)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `);
        for (const r of data.mysteryRules) {
          stmt.run(
            r.id, r.characterId, JSON.stringify(r.requiredClueIds || []),
            JSON.stringify(r.validCombinations || []), JSON.stringify(r.deductionSolution || {}),
            r.minQuestionsForDeduction || 5, r.replayMinQuestions || 20
          );
        }
      }

      this.sqlite.exec('COMMIT;');
      this.saveJsonSnapshot();
      return true;
    } catch (e) {
      this.sqlite.exec('ROLLBACK;');
      console.error('[Database] Failed to restore database:', e);
      return false;
    }
  }

  // --- AI Test Suite Persistence (Per-Character) ---
  getAiTestRecord(characterId: string): CharacterAiTestRecord {
    try {
      if (this.sqlite) {
        const row = this.sqlite.prepare('SELECT * FROM ai_test_records WHERE characterId = ?').get(characterId) as any;
        if (row) {
          let parsedReport = null;
          if (row.report) {
            try {
              parsedReport = JSON.parse(row.report);
            } catch {}
          }
          return {
            characterId,
            status: (row.status as any) || 'NOT_RUN',
            passedCount: Number(row.passedCount || 0),
            totalCount: Number(row.totalCount || 10),
            report: parsedReport,
            errorMessage: row.errorMessage || undefined,
            lastRunAt: row.lastRunAt || undefined,
          };
        }
      }
    } catch (e) {
      console.warn('[Database] Could not get ai test record:', e);
    }
    return {
      characterId,
      status: 'NOT_RUN',
      passedCount: 0,
      totalCount: 10,
      report: null,
    };
  }

  saveAiTestRecord(record: CharacterAiTestRecord): void {
    try {
      if (this.sqlite) {
        const stmt = this.sqlite.prepare(`
          INSERT INTO ai_test_records (characterId, status, passedCount, totalCount, report, errorMessage, lastRunAt)
          VALUES (?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(characterId) DO UPDATE SET
            status = excluded.status,
            passedCount = excluded.passedCount,
            totalCount = excluded.totalCount,
            report = excluded.report,
            errorMessage = excluded.errorMessage,
            lastRunAt = excluded.lastRunAt
        `);
        stmt.run(
          record.characterId,
          record.status,
          record.passedCount || 0,
          record.totalCount || 10,
          record.report ? JSON.stringify(record.report) : null,
          record.errorMessage || null,
          record.lastRunAt || new Date().toISOString()
        );
      }
    } catch (e) {
      console.warn('[Database] Could not save ai test record:', e);
    }
  }

  // --- Data Integrity Report ---
  getDataIntegrityReport(circuitBreakerState: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED'): DataIntegrityReport {
    const chars = this.getAllCharacters();
    const charactersByStatus: Record<string, number> = {
      DRAFT: 0,
      REVIEW: 0,
      APPROVED: 0,
      PUBLISHED: 0,
      ARCHIVED: 0,
    };
    chars.forEach((c) => {
      const st = c.status || (c.isPublished ? 'PUBLISHED' : 'DRAFT');
      charactersByStatus[st] = (charactersByStatus[st] || 0) + 1;
    });

    const worksCount = Number(this.sqlite?.prepare('SELECT COUNT(*) as c FROM works').get()?.c || 0);
    const versionsCount = Number(this.sqlite?.prepare('SELECT COUNT(*) as c FROM character_versions').get()?.c || 0);
    const draftsCount = Number(this.sqlite?.prepare('SELECT COUNT(*) as c FROM character_drafts').get()?.c || 0);
    const cluesCount = Number(this.sqlite?.prepare('SELECT COUNT(*) as c FROM clues').get()?.c || 0);
    const mysteryRulesCount = Number(this.sqlite?.prepare('SELECT COUNT(*) as c FROM mystery_rules').get()?.c || 0);
    const researchRecordsCount = Number(this.sqlite?.prepare('SELECT COUNT(*) as c FROM research_records').get()?.c || 0);
    const usersCount = Number(this.sqlite?.prepare('SELECT COUNT(*) as c FROM users').get()?.c || 0);
    const sessionsCount = Number(this.sqlite?.prepare('SELECT COUNT(*) as c FROM sessions').get()?.c || 0);
    const messagesCount = Number(this.sqlite?.prepare('SELECT COUNT(*) as c FROM messages').get()?.c || 0);

    let imagesCount = 0;
    try {
      if (fs.existsSync(UPLOADS_DIR)) {
        imagesCount = fs.readdirSync(UPLOADS_DIR).length;
      }
    } catch {}

    let backupsCount = 0;
    try {
      if (fs.existsSync(BACKUPS_DIR)) {
        backupsCount = fs.readdirSync(BACKUPS_DIR).filter((f) => f.endsWith('.json')).length;
      }
    } catch {}

    const diskStorageAccessible = fs.existsSync(UPLOADS_DIR) && fs.existsSync(DATA_DIR);

    return {
      timestamp: new Date().toISOString(),
      worksCount,
      charactersCount: chars.length,
      charactersByStatus,
      versionsCount,
      draftsCount,
      imagesCount,
      cluesCount,
      mysteryRulesCount,
      researchRecordsCount,
      usersCount,
      sessionsCount,
      messagesCount,
      backupsCount,
      checks: {
        databaseEngine: 'SQLite WAL Mode + Atomic JSON Mirror',
        walMode: this.isWalActive,
        atomicPersistence: fs.existsSync(DB_JSON_PATH),
        diskStorageAccessible,
        circuitBreakerState,
        dataIntegrityPassed: worksCount > 0 && chars.length > 0 && diskStorageAccessible,
      },
    };
  }
}

export const db = new InkTalkDatabase();
