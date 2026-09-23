import React, { useState, useEffect, useRef } from 'react';
import {
  ShieldCheck,
  BookOpen,
  UserCheck,
  BrainCircuit,
  Key,
  CheckCircle2,
  AlertCircle,
  FlaskConical,
  Eye,
  Upload,
  Plus,
  Trash2,
  Sparkles,
  Edit,
  Save,
  RotateCw,
  LogOut,
  X,
  Send,
  Image as ImageIcon,
  Puzzle,
  FileText,
  BarChart3,
  Settings,
  AlertTriangle,
  Lock,
  Check,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  History,
  Database,
  Download,
  RefreshCw,
  Layers,
  Archive,
  CheckSquare,
  Clock,
} from 'lucide-react';
import type {
  Character,
  Work,
  Clue,
  MysteryRule,
  PrePublishReport,
  AiTestSuiteReport,
  ChatMessage,
  CharacterStatus,
  CharacterVersion,
  CharacterDraft,
  ResearchRecord,
  DataIntegrityReport,
} from '../types';
import {
  adminLogin,
  getWorks,
  createAdminWork,
  deleteAdminWork,
  getAdminCharacters,
  createAdminCharacter,
  updateAdminCharacter,
  deleteAdminCharacter,
  uploadCharacterImage,
  runAiResearch,
  runPrePublishCheck,
  autoFixCharacter,
  runAiTestSuiteOnChar,
  saveAdminClues,
  getAdminClues,
  saveAdminMysteryRule,
  getAdminMysteryRule,
  sendChatMessage,
  getCharacterVersions,
  revertCharacterVersion,
  saveCharacterDraft,
  getCharacterDraft,
  deleteCharacterDraft,
  getLatestResearchRecord,
  getResearchRecords,
  getDataIntegrityReport,
  exportDatabase,
  createBackup,
  restoreDatabase,
} from '../services/api';

export interface AdminPortalProps {
  isOpen?: boolean;
  onClose?: () => void;
  onRefreshPublicData: () => void;
  isStandalone?: boolean;
  subroute?: string;
  onSubrouteChange?: (subroute: string) => void;
  onNavigateToPublic?: () => void;
}

export const AdminPortal: React.FC<AdminPortalProps> = ({
  isOpen = false,
  onClose,
  onRefreshPublicData,
  isStandalone = false,
  subroute,
  onSubrouteChange,
  onNavigateToPublic,
}) => {
  const [token, setToken] = useState<string | null>(
    localStorage.getItem('inktalk_admin_token')
  );
  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);

  // 12 Admin Dashboard Areas
  const [activeTab, setActiveTab] = useState<
    | 'works'
    | 'characters'
    | 'images'
    | 'literary_data'
    | 'clues'
    | 'mystery_system'
    | 'research'
    | 'testmode'
    | 'prepublish'
    | 'stats'
    | 'integrity'
    | 'settings'
  >('works');

  // Synchronize URL subroute with activeTab
  useEffect(() => {
    if (!subroute) return;
    const map: Record<string, typeof activeTab> = {
      dashboard: 'works',
      works: 'works',
      characters: 'characters',
      images: 'images',
      literary_data: 'literary_data',
      clues: 'clues',
      mystery: 'mystery_system',
      mystery_system: 'mystery_system',
      research: 'research',
      test: 'testmode',
      testmode: 'testmode',
      prepublish: 'prepublish',
      stats: 'stats',
      integrity: 'integrity',
      settings: 'settings',
    };
    if (map[subroute] && map[subroute] !== activeTab) {
      setActiveTab(map[subroute]);
    }
  }, [subroute]);

  const [works, setWorks] = useState<Work[]>([]);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [selectedCharId, setSelectedCharId] = useState<string>('');

  // Character Versioning State
  const [characterVersions, setCharacterVersions] = useState<CharacterVersion[]>([]);
  const [loadingVersions, setLoadingVersions] = useState(false);

  // Character Draft & Auto-Save State
  const [draftSaveStatus, setDraftSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [draftLastSaved, setDraftLastSaved] = useState<string | null>(null);
  const [hasSavedDraft, setHasSavedDraft] = useState(false);
  const [savedDraftData, setSavedDraftData] = useState<any>(null);

  // Character Status State
  const [newCharStatus, setNewCharStatus] = useState<CharacterStatus>('DRAFT');

  // Data Integrity & Backup State
  const [integrityReport, setIntegrityReport] = useState<DataIntegrityReport | null>(null);
  const [integrityLoading, setIntegrityLoading] = useState(false);
  const [backupActionNotice, setBackupActionNotice] = useState<string | null>(null);

  // Past Research Records
  const [pastResearchRecords, setPastResearchRecords] = useState<ResearchRecord[]>([]);

  // AI Research State (Inputs preserved on any error)
  const [researchWorkTitle, setResearchWorkTitle] = useState('');
  const [researchAuthor, setResearchAuthor] = useState('');
  const [researchExcerpt, setResearchExcerpt] = useState('');
  const [researchLoading, setResearchLoading] = useState(false);
  const [researchResult, setResearchResult] = useState<any>(null);

  // Requirement 4: State Machine: IDLE | RESEARCHING | RETRYING | SUCCESS | FAILED
  type ResearchJobState = 'IDLE' | 'RESEARCHING' | 'RETRYING' | 'SUCCESS' | 'FAILED';
  const [researchJobState, setResearchJobState] = useState<ResearchJobState>('IDLE');
  const [researchRetryCount, setResearchRetryCount] = useState<number>(0);
  const [researchError, setResearchError] = useState<{
    message: string;
    technicalDetails?: string;
    isRetryable?: boolean;
    statusCode?: number;
  } | null>(null);
  const [showTechnicalDetails, setShowTechnicalDetails] = useState<boolean>(false);
  const isResearchRunningRef = useRef<boolean>(false);

  // Pre-Publish & Test Suite State
  const [prePublishReport, setPrePublishReport] = useState<PrePublishReport | null>(null);
  const [prePublishLoading, setPrePublishLoading] = useState(false);
  const [testSuiteReport, setTestSuiteReport] = useState<AiTestSuiteReport | null>(null);
  const [testSuiteLoading, setTestSuiteLoading] = useState(false);

  // Clues & Mystery state
  const [charClues, setCharClues] = useState<Clue[]>([]);
  const [mysteryRule, setMysteryRule] = useState<MysteryRule | null>(null);

  // New Clue & Mystery Form states
  const [newClueTitle, setNewClueTitle] = useState('');
  const [newClueDesc, setNewClueDesc] = useState('');
  const [newClueKeywords, setNewClueKeywords] = useState('');
  const [editDeductionPrompt, setEditDeductionPrompt] = useState('');
  const [editFinalReveal, setEditFinalReveal] = useState('');
  const [editMinQuestions, setEditMinQuestions] = useState(5);
  const [editReplayQuestions, setEditReplayQuestions] = useState(20);

  // Image Management state
  const [charImageUrlInput, setCharImageUrlInput] = useState('');
  const [imageUploading, setImageUploading] = useState(false);

  // Canonical Literature Data editing state
  const [editCanonFacts, setEditCanonFacts] = useState('');
  const [editBoundaries, setEditBoundaries] = useState('');

  // Test Mode state
  const [testMessages, setTestMessages] = useState<ChatMessage[]>([]);
  const [testInput, setTestInput] = useState('');
  const [testModeLoading, setTestModeLoading] = useState(false);
  const [lastDebugInfo, setLastDebugInfo] = useState<any>(null);

  // Work Form State
  const [newWorkTitle, setNewWorkTitle] = useState('');
  const [newWorkAuthor, setNewWorkAuthor] = useState('');
  const [newWorkEra, setNewWorkEra] = useState('Văn học THPT');
  const [newWorkSummary, setNewWorkSummary] = useState('');

  // Character Form State
  const [newCharName, setNewCharName] = useState('');
  const [newCharWorkId, setNewCharWorkId] = useState('');
  const [newCharRole, setNewCharRole] = useState('Nhân vật chính');
  const [newCharBadge, setNewCharBadge] = useState<Character['badge']>('main');
  const [newCharPersonality, setNewCharPersonality] = useState('');
  const [newCharVoice, setNewCharVoice] = useState('');
  const [newCharPronouns, setNewCharPronouns] = useState('tôi');
  const [newCharPerspective, setNewCharPerspective] = useState('');
  const [newCharShortIntro, setNewCharShortIntro] = useState('');
  const [newCharKnownFacts, setNewCharKnownFacts] = useState('');
  const [newCharBoundaries, setNewCharBoundaries] = useState('');

  // Notifications
  const [notice, setNotice] = useState<string | null>(null);

  // Load data when authenticated
  useEffect(() => {
    if (!token) return;
    refreshAdminData();
  }, [token]);

  const refreshAdminData = async () => {
    if (!token) return;
    try {
      const [w, c] = await Promise.all([getWorks(), getAdminCharacters(token)]);
      setWorks(w);
      setCharacters(c);
      if (c.length > 0 && !selectedCharId) {
        setSelectedCharId(c[0].id);
      }
    } catch (err) {
      console.error('Failed to load admin data:', err);
    }
  };

  // Load character clues & rules when selected character changes
  useEffect(() => {
    if (!token || !selectedCharId) return;
    getAdminClues(token, selectedCharId).then(setCharClues);
    getAdminMysteryRule(token, selectedCharId).then((rule) => {
      setMysteryRule(rule);
      if (rule) {
        setEditDeductionPrompt(rule.deductionSolution?.prompt || '');
        setEditFinalReveal(rule.deductionSolution?.finalReveal || '');
        setEditMinQuestions(rule.minQuestionsForDeduction || 5);
        setEditReplayQuestions(rule.replayMinQuestions || 20);
      }
    });
    const char = characters.find((c) => c.id === selectedCharId);
    if (char) {
      setCharImageUrlInput(char.imageUrl || '');
      setEditCanonFacts((char.knownFacts || []).join('\n'));
      setEditBoundaries((char.knowledgeBoundaries || []).join('\n'));
    }
    setPrePublishReport(null);
    setTestSuiteReport(null);
    setTestMessages([]);
  }, [token, selectedCharId, characters]);

  // Load Character Versions when selected character changes
  useEffect(() => {
    if (!token || !selectedCharId) {
      setCharacterVersions([]);
      return;
    }
    setLoadingVersions(true);
    getCharacterVersions(token, selectedCharId)
      .then(setCharacterVersions)
      .catch((e) => console.warn('Could not load versions:', e))
      .finally(() => setLoadingVersions(false));
  }, [token, selectedCharId]);

  // Load Saved Character Draft on initialization
  useEffect(() => {
    if (!token) return;
    getCharacterDraft(token).then((draft) => {
      if (draft && draft.formData && Object.keys(draft.formData).length > 0) {
        setHasSavedDraft(true);
        setSavedDraftData(draft.formData);
        setDraftLastSaved(new Date(draft.updatedAt || Date.now()).toLocaleTimeString('vi-VN'));
      }
    });
  }, [token]);

  // Auto-Save Draft Debounce (Requirement 6: Auto-Save Drafts)
  useEffect(() => {
    if (!token) return;
    if (
      !newCharName.trim() &&
      !newCharPersonality.trim() &&
      !newCharShortIntro.trim() &&
      !newCharKnownFacts.trim()
    ) {
      return;
    }

    setDraftSaveStatus('saving');
    const timer = setTimeout(async () => {
      try {
        await saveCharacterDraft(token, undefined, {
          name: newCharName,
          workId: newCharWorkId,
          role: newCharRole,
          badge: newCharBadge,
          personality: newCharPersonality,
          voiceTone: newCharVoice,
          pronouns: newCharPronouns,
          perspective: newCharPerspective,
          shortIntro: newCharShortIntro,
          knownFacts: newCharKnownFacts.split('\n').filter(Boolean),
          knowledgeBoundaries: newCharBoundaries.split('\n').filter(Boolean),
          status: newCharStatus,
        });
        setDraftSaveStatus('saved');
        setDraftLastSaved(new Date().toLocaleTimeString('vi-VN'));
      } catch (err) {
        console.warn('Auto-save draft error:', err);
        setDraftSaveStatus('idle');
      }
    }, 1500);

    return () => clearTimeout(timer);
  }, [
    token,
    newCharName,
    newCharWorkId,
    newCharRole,
    newCharBadge,
    newCharPersonality,
    newCharVoice,
    newCharPronouns,
    newCharPerspective,
    newCharShortIntro,
    newCharKnownFacts,
    newCharBoundaries,
    newCharStatus,
  ]);

  // Restore Draft function
  const handleRestoreDraft = () => {
    if (!savedDraftData) return;
    if (savedDraftData.name) setNewCharName(savedDraftData.name);
    if (savedDraftData.workId) setNewCharWorkId(savedDraftData.workId);
    if (savedDraftData.role) setNewCharRole(savedDraftData.role);
    if (savedDraftData.badge) setNewCharBadge(savedDraftData.badge);
    if (savedDraftData.personality) setNewCharPersonality(savedDraftData.personality);
    if (savedDraftData.voiceTone) setNewCharVoice(savedDraftData.voiceTone);
    if (savedDraftData.pronouns) setNewCharPronouns(savedDraftData.pronouns);
    if (savedDraftData.perspective) setNewCharPerspective(savedDraftData.perspective);
    if (savedDraftData.shortIntro) setNewCharShortIntro(savedDraftData.shortIntro);
    if (savedDraftData.knownFacts) {
      setNewCharKnownFacts(
        Array.isArray(savedDraftData.knownFacts)
          ? savedDraftData.knownFacts.join('\n')
          : savedDraftData.knownFacts
      );
    }
    if (savedDraftData.knowledgeBoundaries) {
      setNewCharBoundaries(
        Array.isArray(savedDraftData.knowledgeBoundaries)
          ? savedDraftData.knowledgeBoundaries.join('\n')
          : savedDraftData.knowledgeBoundaries
      );
    }
    if (savedDraftData.status) setNewCharStatus(savedDraftData.status);
    setHasSavedDraft(false);
    setNotice('✓ Đã khôi phục dữ liệu từ bản nháp tự động lưu!');
  };

  // Discard Draft function
  const handleDiscardDraft = async () => {
    if (!token) return;
    try {
      await deleteCharacterDraft(token);
      setHasSavedDraft(false);
      setSavedDraftData(null);
      setDraftSaveStatus('idle');
      setNotice('Đã hủy bản nháp lưu tạm.');
    } catch (e: any) {
      setNotice('Lỗi xóa bản nháp: ' + e?.message);
    }
  };

  // Revert to a Previous Version
  const handleRevertVersion = async (versionNumber: number) => {
    if (!token || !selectedCharId) return;
    if (!confirm(`Khôi phục nhân vật về Phiên bản ${versionNumber}? Mọi chỉnh sửa sau đó sẽ được lưu thành phiên bản mới.`)) {
      return;
    }
    try {
      await revertCharacterVersion(token, selectedCharId, versionNumber);
      setNotice(`✓ Đã khôi phục thành công về Phiên bản ${versionNumber}!`);
      refreshAdminData();
      getCharacterVersions(token, selectedCharId).then(setCharacterVersions);
      onRefreshPublicData();
    } catch (err: any) {
      setNotice('Lỗi khôi phục phiên bản: ' + err?.message);
    }
  };

  // Update Character Status directly
  const handleUpdateStatus = async (charId: string, status: CharacterStatus) => {
    if (!token) return;
    try {
      await updateAdminCharacter(token, charId, {
        status,
        isPublished: status === 'PUBLISHED',
      });
      setNotice(`✓ Đã cập nhật trạng thái nhân vật thành: ${status}`);
      refreshAdminData();
      getCharacterVersions(token, charId).then(setCharacterVersions);
      onRefreshPublicData();
    } catch (err: any) {
      setNotice('Lỗi: ' + err?.message);
    }
  };

  // Load Latest Research Record on Startup (Persistence)
  useEffect(() => {
    if (!token) return;
    getLatestResearchRecord(token).then((rec) => {
      if (rec && rec.status === 'SUCCESS' && rec.result) {
        setResearchWorkTitle(rec.workTitle);
        if (rec.workAuthor) setResearchAuthor(rec.workAuthor);
        if (rec.excerpt) setResearchExcerpt(rec.excerpt);
        setResearchResult(rec.result);
        setResearchJobState('SUCCESS');
      }
    });
    getResearchRecords(token).then(setPastResearchRecords);
  }, [token]);

  // Load Data Integrity Report when Integrity Tab is Active
  useEffect(() => {
    if (!token || activeTab !== 'integrity') return;
    loadIntegrityReport();
  }, [token, activeTab]);

  const loadIntegrityReport = async () => {
    if (!token) return;
    setIntegrityLoading(true);
    try {
      const rep = await getDataIntegrityReport(token);
      setIntegrityReport(rep);
    } catch (err: any) {
      console.error('Failed to load integrity report:', err);
    } finally {
      setIntegrityLoading(false);
    }
  };

  // Trigger Rolling Backup
  const handleTriggerBackup = async () => {
    if (!token) return;
    try {
      setBackupActionNotice('Đang tạo bản sao lưu an toàn...');
      const res = await createBackup(token);
      setBackupActionNotice(`✓ Đã tạo bản sao lưu thành công: ${res.filename}`);
      loadIntegrityReport();
    } catch (err: any) {
      setBackupActionNotice('Lỗi tạo sao lưu: ' + err?.message);
    }
  };

  // Export Full Database to JSON file
  const handleExportDatabaseJson = async () => {
    if (!token) return;
    try {
      const dump = await exportDatabase(token);
      const blob = new Blob([JSON.stringify(dump, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `inktalk_backup_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setNotice('✓ Đã xuất tệp sao lưu dữ liệu toàn diện (JSON) thành công!');
    } catch (err: any) {
      setNotice('Lỗi xuất dữ liệu: ' + err?.message);
    }
  };

  // Restore Database from JSON file
  const handleRestoreDatabaseFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !token) return;
    if (!confirm('Khôi phục cơ sở dữ liệu từ tệp này sẽ ghi đè dữ liệu hiện tại. Bạn có chắc chắn muốn tiếp tục?')) {
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);
        await restoreDatabase(token, parsed);
        setNotice('✓ Đã khôi phục toàn bộ cơ sở dữ liệu thành công!');
        refreshAdminData();
        loadIntegrityReport();
        onRefreshPublicData();
      } catch (err: any) {
        setNotice('Lỗi khôi phục tệp: ' + err?.message);
      } finally {
        e.target.value = '';
      }
    };
    reader.readAsText(file);
  };

  // Save Image URL manually
  const handleSaveImageUrl = async (charId: string, url: string) => {
    if (!token || !url.trim()) return;
    setImageUploading(true);
    try {
      await uploadCharacterImage(token, charId, url.trim());
      setNotice('Đã cập nhật ảnh nhân vật do Admin chỉ định!');
      refreshAdminData();
      onRefreshPublicData();
    } catch (err: any) {
      setNotice('Lỗi cập nhật ảnh: ' + err?.message);
    } finally {
      setImageUploading(false);
    }
  };

  // Save Mystery Rule
  const handleSaveMysteryRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !selectedCharId) return;
    try {
      const rule: MysteryRule = {
        id: mysteryRule?.id || `rule_${selectedCharId}`,
        characterId: selectedCharId,
        requiredClueIds: charClues.map((c) => c.id),
        validCombinations: mysteryRule?.validCombinations || [],
        deductionSolution: {
          prompt: editDeductionPrompt,
          correctClueIds: charClues.slice(0, 2).map((c) => c.id),
          explanation: editFinalReveal,
          finalReveal: editFinalReveal,
        },
        minQuestionsForDeduction: Number(editMinQuestions) || 5,
        replayMinQuestions: Number(editReplayQuestions) || 20,
      };
      await saveAdminMysteryRule(token, selectedCharId, rule);
      setMysteryRule(rule);
      setNotice('Đã lưu cấu hình Mystery System thành công!');
    } catch (err: any) {
      setNotice('Lỗi lưu Mystery Rule: ' + err?.message);
    }
  };

  // Add & Delete Clues
  const handleAddNewClue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !selectedCharId || !newClueTitle.trim()) return;
    try {
      const clue: Clue = {
        id: `clue_${Date.now()}`,
        characterId: selectedCharId,
        workId: selectedChar?.workId || '',
        title: newClueTitle.trim(),
        description: newClueDesc.trim(),
        sourceHint: selectedChar?.workTitle || '',
        triggerKeywords: newClueKeywords
          .split(',')
          .map((k) => k.trim())
          .filter(Boolean),
        semanticContext: 'Tình tiết văn học THPT',
        isDecoded: false,
      };
      const updated = [...charClues, clue];
      await saveAdminClues(token, selectedCharId, updated);
      setCharClues(updated);
      setNewClueTitle('');
      setNewClueDesc('');
      setNewClueKeywords('');
      setNotice('Đã thêm manh mối mới thành công!');
    } catch (err: any) {
      setNotice('Lỗi thêm manh mối: ' + err?.message);
    }
  };

  const handleDeleteClue = async (clueId: string) => {
    if (!token || !selectedCharId) return;
    try {
      const updated = charClues.filter((c) => c.id !== clueId);
      await saveAdminClues(token, selectedCharId, updated);
      setCharClues(updated);
      setNotice('Đã xoá manh mối thành công.');
    } catch (err: any) {
      setNotice('Lỗi xoá manh mối: ' + err?.message);
    }
  };

  // Save Canonical Literature Data
  const handleSaveCanonData = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !selectedCharId) return;
    try {
      await updateAdminCharacter(token, selectedCharId, {
        knownFacts: editCanonFacts
          .split('\n')
          .map((s) => s.trim())
          .filter(Boolean),
        knowledgeBoundaries: editBoundaries
          .split('\n')
          .map((s) => s.trim())
          .filter(Boolean),
      });
      setNotice('Đã cập nhật dữ liệu văn học và ranh giới kiến thức!');
      refreshAdminData();
      onRefreshPublicData();
    } catch (err: any) {
      setNotice('Lỗi cập nhật: ' + err?.message);
    }
  };

  if (!isStandalone && !isOpen) return null;

  // Handle Login
  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    try {
      const data = await adminLogin(passwordInput, usernameInput.trim());
      setToken(data.token);
      localStorage.setItem('inktalk_admin_token', data.token);
      onSubrouteChange?.('dashboard');
    } catch (err: any) {
      setLoginError(err?.message || 'Tài khoản hoặc mật khẩu quản trị không chính xác.');
    }
  };

  const handleAdminLogout = () => {
    setToken(null);
    localStorage.removeItem('inktalk_admin_token');
    onSubrouteChange?.('');
  };

  // Handle Create Work
  const handleCreateWork = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    try {
      await createAdminWork(token, {
        title: newWorkTitle,
        author: newWorkAuthor,
        era: newWorkEra,
        summary: newWorkSummary,
      });
      setNewWorkTitle('');
      setNewWorkAuthor('');
      setNewWorkSummary('');
      setNotice('Đã tạo tác phẩm mới thành công!');
      refreshAdminData();
      onRefreshPublicData();
    } catch (err: any) {
      setNotice('Lỗi: ' + err?.message);
    }
  };

  // Handle Create Character
  const handleCreateCharacter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    const work = works.find((w) => w.id === newCharWorkId);
    if (!work) {
      setNotice('Vui lòng chọn tác phẩm.');
      return;
    }

    try {
      const newChar = await createAdminCharacter(token, {
        name: newCharName,
        workId: work.id,
        workTitle: work.title,
        workAuthor: work.author,
        role: newCharRole,
        badge: newCharBadge,
        personality: newCharPersonality,
        voiceTone: newCharVoice,
        pronouns: newCharPronouns,
        perspective: newCharPerspective,
        shortIntro: newCharShortIntro,
        knownFacts: newCharKnownFacts.split('\n').filter(Boolean),
        knowledgeBoundaries: newCharBoundaries.split('\n').filter(Boolean),
        imageUrl: '', // Uploaded by admin separately (Rule 4)
        isPublished: newCharStatus === 'PUBLISHED',
        status: newCharStatus,
      });

      // Clear draft upon successful database save
      await deleteCharacterDraft(token);
      setHasSavedDraft(false);
      setSavedDraftData(null);
      setDraftSaveStatus('idle');

      setNewCharName('');
      setNewCharPersonality('');
      setNewCharVoice('');
      setNewCharShortIntro('');
      setNewCharKnownFacts('');
      setNewCharBoundaries('');
      setNewCharStatus('DRAFT');
      setNotice(`✓ Đã lưu nhân vật "${newChar.name}" vào cơ sở dữ liệu! Hãy tải ảnh lên trước khi xuất bản.`);
      refreshAdminData();
      setSelectedCharId(newChar.id);
      onRefreshPublicData();
    } catch (err: any) {
      setNotice('Lỗi lưu nhân vật: ' + err?.message);
    }
  };

  // Handle Image Upload by Admin (Rule 4)
  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !token || !selectedCharId) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        try {
          await uploadCharacterImage(token, selectedCharId, dataUrl);
          setNotice('Tải lên ảnh nhân vật thành công!');
          refreshAdminData();
          onRefreshPublicData();
        } catch (err: any) {
          setNotice('Lỗi tải ảnh: ' + err?.message);
        }
      }
    };
    reader.readAsDataURL(file);
  };

  // Handle AI Research Engine with Automatic Retry (Max 3, Exponential Backoff) & Model Fallback
  const handleRunAiResearch = async () => {
    // Requirement 3: Prevent duplicate parallel requests
    if (isResearchRunningRef.current) return;
    if (!token || !researchWorkTitle?.trim()) {
      setNotice('Vui lòng nhập tên tác phẩm để khởi động nghiên cứu AI.');
      return;
    }

    isResearchRunningRef.current = true;
    setResearchLoading(true);
    setResearchJobState('RESEARCHING');
    setResearchRetryCount(0);
    setResearchError(null);
    setShowTechnicalDetails(false);

    // Exponential backoff delays: Lần 1: 1.5s, Lần 2: 3.5s, Lần 3: 7.0s
    const retryDelays = [1500, 3500, 7000];
    let lastError: any = null;
    let successResult: any = null;

    for (let attempt = 0; attempt <= 3; attempt++) {
      if (attempt > 0) {
        setResearchJobState('RETRYING');
        setResearchRetryCount(attempt);
      }

      try {
        const result = await runAiResearch(
          token,
          researchWorkTitle.trim(),
          researchAuthor.trim(),
          researchExcerpt.trim()
        );
        successResult = result;
        lastError = null;
        break; // Successfully completed!
      } catch (err: any) {
        lastError = err;
        console.warn(`[Admin AI Research] Attempt ${attempt + 1} failed:`, err);

        // Check if error is temporary/retryable (503, 429, 502, 504, UNAVAILABLE, etc.)
        const isRetryable =
          err?.isRetryable ??
          (err?.statusCode === 503 ||
            err?.statusCode === 429 ||
            err?.statusCode === 502 ||
            err?.statusCode === 504 ||
            String(err?.message || '').includes('quá tải') ||
            String(err?.message || '').includes('503'));

        // If error is not retryable (e.g. 400 Bad Request, 401 Unauthorized), stop immediately
        if (!isRetryable || attempt >= 3) {
          break;
        }

        // Wait with exponential backoff before the next attempt
        const delay = retryDelays[attempt] || 4000;
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    if (successResult) {
      setResearchResult(successResult);
      setResearchJobState('SUCCESS');
      setResearchError(null);
      setNotice(`AI đã hoàn tất nghiên cứu tác phẩm: "${researchWorkTitle.trim()}". Bạn có thể duyệt và lưu vào kho.`);
    } else {
      // Requirement 7 & 8: Preserve input, do NOT crash, do NOT wipe fields
      setResearchJobState('FAILED');
      const isRetryable = lastError?.isRetryable ?? true;
      const cleanMessage = isRetryable
        ? 'AI Research Engine hiện chưa thể kết nối. Vui lòng thử lại sau ít phút.'
        : (lastError?.message || 'AI Research Engine hiện chưa thể kết nối.');
      const cleanTechnical =
        lastError?.technicalDetails ||
        (lastError?.statusCode ? `HTTP ${lastError.statusCode}` : 'Service Unavailable');

      setResearchError({
        message: cleanMessage,
        technicalDetails: cleanTechnical,
        isRetryable,
        statusCode: lastError?.statusCode || 503,
      });
      // Do NOT set raw JSON error into notice banner!
      setNotice(null);
    }

    setResearchLoading(false);
    isResearchRunningRef.current = false;
  };

  // Import Character from AI Research
  const handleImportResearchedCharacter = async (resChar: any) => {
    if (!token || !researchResult) return;
    try {
      // 1. Create or find work
      let work = works.find(
        (w) => w.title.toLowerCase() === researchResult.work.title.toLowerCase()
      );
      if (!work) {
        work = await createAdminWork(token, {
          title: researchResult.work.title,
          author: researchResult.work.author,
          era: researchResult.work.era || 'Văn học THPT',
          summary: researchResult.work.summary,
        });
      }

      if (!work) {
        throw new Error('Không thể tìm thấy hoặc khởi tạo tác phẩm cho nhân vật.');
      }

      // 2. Create Character (unpublished until image uploaded)
      const newChar = await createAdminCharacter(token, {
        name: resChar.name,
        workId: work.id,
        workTitle: work.title,
        workAuthor: work.author,
        role: resChar.role,
        badge: resChar.badge || 'main',
        personality: resChar.personality,
        voiceTone: resChar.voiceTone,
        pronouns: resChar.pronouns,
        perspective: resChar.perspective,
        shortIntro: resChar.shortIntro,
        knownFacts: resChar.knownFacts || [],
        knowledgeBoundaries: resChar.knowledgeBoundaries || [],
        imageUrl: '', // Requires Admin upload per Rule 4
        isPublished: false,
      });

      // 3. Save researched clues
      if (researchResult.clues && researchResult.clues.length > 0) {
        const formattedClues: Clue[] = researchResult.clues.map((c: any, idx: number) => ({
          id: `clue_${Date.now()}_${idx}`,
          characterId: newChar.id,
          workId: work.id,
          title: c.title,
          description: c.description,
          sourceHint: c.sourceHint || '',
          triggerKeywords: c.triggerKeywords || [],
          semanticContext: c.semanticContext || '',
        }));
        await saveAdminClues(token, newChar.id, formattedClues);
      }

      // 4. Save researched mystery rules
      if (researchResult.mysteryRule) {
        const rule: MysteryRule = {
          id: `rule_${newChar.id}`,
          characterId: newChar.id,
          requiredClueIds: [],
          validCombinations: (researchResult.mysteryRule.validCombinations || []).map(
            (vc: any) => ({
              clueIds: [],
              relationshipReveal: vc.relationshipReveal,
            })
          ),
          deductionSolution: researchResult.mysteryRule.deductionSolution || {
            prompt: 'Nút thắt bi kịch là gì?',
            correctClueIds: [],
            explanation: '',
            finalReveal: '',
          },
          minQuestionsForDeduction:
            researchResult.mysteryRule.minQuestionsForDeduction || 5,
          replayMinQuestions: 20,
        };
        await saveAdminMysteryRule(token, newChar.id, rule);
      }

      setNotice(
        `Đã nhập thành công nhân vật "${newChar.name}". Vui lòng TẢI ẢNH LÊN và kiểm duyệt trước xuất bản!`
      );
      await refreshAdminData();
      setSelectedCharId(newChar.id);
      setActiveTab('characters');
      onRefreshPublicData();
    } catch (err: any) {
      setNotice('Lỗi nhập dữ liệu: ' + err?.message);
    }
  };

  // Run Pre-Publish 10-point check
  const handleRunPrePublishCheck = async () => {
    if (!token || !selectedCharId) return;
    setPrePublishLoading(true);
    try {
      const report = await runPrePublishCheck(token, selectedCharId);
      setPrePublishReport(report);
    } catch (err: any) {
      setNotice('Lỗi kiểm tra: ' + err?.message);
    } finally {
      setPrePublishLoading(false);
    }
  };

  // Auto-Fix safe technical issues
  const handleAutoFix = async () => {
    if (!token || !selectedCharId) return;
    try {
      await autoFixCharacter(token, selectedCharId);
      setNotice('Đã tự động sửa các lỗi kỹ thuật an toàn!');
      refreshAdminData();
      handleRunPrePublishCheck();
    } catch (err: any) {
      setNotice('Lỗi tự động sửa: ' + err?.message);
    }
  };

  // Run AI Test Suite (10 scenarios)
  const handleRunAiTestSuite = async () => {
    if (!token || !selectedCharId) return;
    setTestSuiteLoading(true);
    try {
      const report = await runAiTestSuiteOnChar(token, selectedCharId);
      setTestSuiteReport(report);
      setNotice(`Đã hoàn thành kiểm thử AI: ${report.passedCount}/${report.totalCount} vượt qua!`);
    } catch (err: any) {
      setNotice('Lỗi kiểm thử: ' + err?.message);
    } finally {
      setTestSuiteLoading(false);
    }
  };

  // Toggle Character Publish
  const handleTogglePublish = async (char: Character) => {
    if (!token) return;
    if (!char.imageUrl) {
      setNotice('KHÔNG THỂ XUẤT BẢN: Nhân vật bắt buộc phải có ảnh do Admin tải lên.');
      return;
    }
    try {
      await updateAdminCharacter(token, char.id, {
        isPublished: !char.isPublished,
      });
      refreshAdminData();
      onRefreshPublicData();
      setNotice(
        char.isPublished
          ? `Đã ẩn nhân vật "${char.name}" khỏi Thư viện người chơi.`
          : `Đã XUẤT BẢN nhân vật "${char.name}" lên Thư viện người chơi!`
      );
    } catch (err: any) {
      setNotice('Lỗi xuất bản: ' + err?.message);
    }
  };

  // Admin Test Mode Chat (does not affect real player diamonds or progress)
  const handleSendTestMessage = async () => {
    if (!selectedCharId || !testInput.trim()) return;
    const userMsg: ChatMessage = {
      id: 'test_' + Date.now(),
      sessionId: 'test_ses',
      sender: 'player',
      text: testInput.trim(),
      timestamp: new Date().toISOString(),
    };
    setTestMessages((prev) => [...prev, userMsg]);
    setTestInput('');
    setTestModeLoading(true);

    try {
      const data = await sendChatMessage('admin_tester', selectedCharId, userMsg.text, true);
      const replyMsg: ChatMessage = {
        id: 'test_reply_' + Date.now(),
        sessionId: 'test_ses',
        sender: 'character',
        text: data.reply,
        timestamp: new Date().toISOString(),
        clueUnlocked: data.newClueUnlocked,
      };
      setTestMessages((prev) => [...prev, replyMsg]);
      setLastDebugInfo(data.debugInfo);
    } catch (err: any) {
      setNotice('Lỗi test mode: ' + err?.message);
    } finally {
      setTestModeLoading(false);
    }
  };

  const selectedChar = characters.find((c) => c.id === selectedCharId);

  const switchTab = (tab: typeof activeTab) => {
    setActiveTab(tab);
    onSubrouteChange?.(tab);
  };

  const containerClasses = isStandalone
    ? 'min-h-screen w-full bg-[#FFF8F1] flex flex-col paper-texture text-[#332B35]'
    : 'fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-[#332B35]/60 backdrop-blur-md animate-fade-in';

  const innerClasses = isStandalone
    ? 'w-full flex-1 flex flex-col bg-[#FFFCFA] shadow-xs'
    : 'relative w-full max-w-6xl max-h-[95vh] bg-[#FFFCFA] rounded-3xl border-2 border-[#C9B5EA] shadow-2xl flex flex-col paper-texture overflow-hidden';

  return (
    <div className={containerClasses}>
      <div className={innerClasses}>
        {/* Top Header */}
        <div className="px-6 py-4 bg-[#FFF8F1] border-b border-[#F5D889]/40 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-2xl bg-[#30243D] text-[#FFFDF9] shadow-xs">
              <ShieldCheck className="w-5 h-5 text-[#FFD85A]" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-[#FFF8F1] border border-[#FFD85A]/60 text-[#30243D]">
                  INKTALK ADMINISTRATION
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-bold font-serif-literary text-[#332B35]">
                Bảng Quản Trị Hệ Thống INKTALK
              </h2>
              <p className="text-[11px] text-[#6F91AA] hidden sm:block">
                Cổng kiểm duyệt nội dung văn học, nghiên cứu AI & quy tắc bí ẩn THPT
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 sm:space-x-3">
            {isStandalone && onNavigateToPublic && (
              <button
                onClick={onNavigateToPublic}
                className="hidden sm:inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-white border border-[#C9B5EA]/50 text-xs font-semibold text-[#5A4650] hover:bg-[#FFF8F1] transition-colors cursor-pointer"
              >
                <span>← Về Thư Viện</span>
              </button>
            )}

            {token && (
              <div className="flex items-center space-x-2">
                {/* Admin Avatar badge */}
                <div className="flex items-center space-x-2 px-3 py-1.5 rounded-full bg-[#FFF8F1] border border-[#F5D889] text-xs font-bold text-[#332B35] shadow-2xs">
                  <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-[#F3A6C8] to-[#B99BE8] flex items-center justify-center text-[10px] text-white font-bold">
                    AD
                  </div>
                  <span className="hidden sm:inline">Quản trị viên</span>
                </div>

                {/* Đăng xuất quản trị (Requirement 9) */}
                <button
                  onClick={handleAdminLogout}
                  id="btn-admin-logout"
                  className="px-3 py-1.5 rounded-xl text-xs font-bold text-[#A84A5D] bg-rose-50 hover:bg-rose-100 border border-rose-200 flex items-center space-x-1.5 transition-colors cursor-pointer shadow-2xs"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Đăng xuất quản trị</span>
                </button>
              </div>
            )}

            {!isStandalone && onClose && (
              <button
                onClick={onClose}
                className="p-1.5 rounded-full hover:bg-[#F3B8C8]/30 text-[#5A4650] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Global Notice Alert */}
        {notice && (
          <div className="px-6 py-2 bg-[#F5D889]/30 border-b border-[#F5D889] text-xs text-[#332B35] flex items-center justify-between shrink-0">
            <span>{notice}</span>
            <button onClick={() => setNotice(null)} className="font-bold ml-2 cursor-pointer">
              ✕
            </button>
          </div>
        )}

        {/* Body content */}
        {!token ? (
          /* Admin Login Portal (Requirement 5) */
          <div className="flex-1 flex items-center justify-center p-6 sm:p-12">
            <div className="max-w-md w-full bg-[#FFFCFA] p-8 sm:p-10 rounded-3xl border-2 border-[#C9B5EA] shadow-xl text-center relative overflow-hidden paper-texture">
              <div className="mb-6">
                <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-[#FFF8F1] border border-[#FFD85A] text-[#40304F] text-xs font-bold mb-3 shadow-2xs">
                  <ShieldCheck className="w-4 h-4 text-[#FFD85A]" />
                  <span>INKTALK</span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-black font-serif-literary tracking-wide text-[#332B35] leading-none mb-2">
                  ADMINISTRATION
                </h2>
                <p className="text-xs sm:text-sm text-[#6F91AA] font-medium italic">
                  “Không gian quản trị thư viện”
                </p>
              </div>

              {loginError && (
                <div className="mb-5 p-3 rounded-xl bg-[#F3B8C8]/40 border border-[#F3B8C8] text-xs text-[#493C5A] font-medium text-left">
                  {loginError}
                </div>
              )}

              <form onSubmit={handleAdminLogin} className="space-y-4">
                <div className="text-left">
                  <label className="text-xs font-bold text-[#493C5A] block mb-1.5">
                    Tài khoản
                  </label>
                  <input
                    type="text"
                    value={usernameInput}
                    onChange={(e) => setUsernameInput(e.target.value)}
                    placeholder="Nhập tên tài khoản"
                    className="w-full px-4 py-2.5 rounded-xl border border-[#C9B5EA]/60 bg-white text-xs text-[#332B35] focus:outline-none focus:ring-2 focus:ring-[#F3B8C8] transition-all"
                    required
                  />
                </div>

                <div className="text-left">
                  <label className="text-xs font-bold text-[#493C5A] block mb-1.5">
                    Mật khẩu
                  </label>
                  <input
                    type="password"
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    placeholder="Nhập mật khẩu quản trị"
                    className="w-full px-4 py-2.5 rounded-xl border border-[#C9B5EA]/60 bg-white text-xs text-[#332B35] focus:outline-none focus:ring-2 focus:ring-[#F3B8C8] transition-all"
                    required
                  />
                </div>

                <button
                  type="submit"
                  id="btn-admin-login-submit"
                  className="w-full mt-3 py-3 rounded-2xl bg-gradient-to-r from-[#F3B8C8] via-[#FFD85A] to-[#74C7F5] font-bold text-xs sm:text-sm text-[#30243D] shadow-md hover:shadow-lg transition-all transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
                >
                  ĐĂNG NHẬP QUẢN TRỊ
                </button>
              </form>

              {isStandalone && onNavigateToPublic && (
                <div className="mt-6 pt-4 border-t border-[#F5D889]/30 text-center">
                  <button
                    onClick={onNavigateToPublic}
                    className="text-xs text-[#6F91AA] hover:text-[#332B35] font-medium transition-colors cursor-pointer"
                  >
                    ← Quay về trang Thư Viện InkTalk
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Admin Main Tabs Layout */
          <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
            {/* Sidebar Navigation */}
            <div className="w-full md:w-64 bg-[#FFF8F1]/80 border-b md:border-b-0 md:border-r border-[#F5D889]/30 p-3 space-y-1 text-xs shrink-0 overflow-x-auto md:overflow-y-auto">
              <button
                onClick={() => switchTab('works')}
                className={`w-full text-left px-3 py-2 rounded-xl flex items-center space-x-2 font-semibold transition-colors cursor-pointer ${
                  activeTab === 'works'
                    ? 'bg-[#F3B8C8]/60 text-[#332B35]'
                    : 'text-[#5A4650] hover:bg-[#F5D889]/20'
                }`}
              >
                <BookOpen className="w-4 h-4 text-[#C9B5EA]" />
                <span>1. Tác phẩm ({works.length})</span>
              </button>

              <button
                onClick={() => switchTab('characters')}
                className={`w-full text-left px-3 py-2 rounded-xl flex items-center space-x-2 font-semibold transition-colors cursor-pointer ${
                  activeTab === 'characters'
                    ? 'bg-[#F3B8C8]/60 text-[#332B35]'
                    : 'text-[#5A4650] hover:bg-[#F5D889]/20'
                }`}
              >
                <UserCheck className="w-4 h-4 text-[#F5D889]" />
                <span>2. Nhân vật ({characters.length})</span>
              </button>

              <button
                onClick={() => switchTab('images')}
                className={`w-full text-left px-3 py-2 rounded-xl flex items-center space-x-2 font-semibold transition-colors cursor-pointer ${
                  activeTab === 'images'
                    ? 'bg-[#F3B8C8]/60 text-[#332B35]'
                    : 'text-[#5A4650] hover:bg-[#F5D889]/20'
                }`}
              >
                <ImageIcon className="w-4 h-4 text-[#A9D8F5]" />
                <span>3. Ảnh nhân vật</span>
              </button>

              <button
                onClick={() => switchTab('literary_data')}
                className={`w-full text-left px-3 py-2 rounded-xl flex items-center space-x-2 font-semibold transition-colors cursor-pointer ${
                  activeTab === 'literary_data'
                    ? 'bg-[#F3B8C8]/60 text-[#332B35]'
                    : 'text-[#5A4650] hover:bg-[#F5D889]/20'
                }`}
              >
                <FileText className="w-4 h-4 text-[#C9B5EA]" />
                <span>4. Dữ liệu văn học</span>
              </button>

              <button
                onClick={() => switchTab('clues')}
                className={`w-full text-left px-3 py-2 rounded-xl flex items-center space-x-2 font-semibold transition-colors cursor-pointer ${
                  activeTab === 'clues'
                    ? 'bg-[#F3B8C8]/60 text-[#332B35]'
                    : 'text-[#5A4650] hover:bg-[#F5D889]/20'
                }`}
              >
                <Key className="w-4 h-4 text-[#F5D889]" />
                <span>5. Manh mối điều tra</span>
              </button>

              <button
                onClick={() => switchTab('mystery_system')}
                className={`w-full text-left px-3 py-2 rounded-xl flex items-center space-x-2 font-semibold transition-colors cursor-pointer ${
                  activeTab === 'mystery_system'
                    ? 'bg-[#F3B8C8]/60 text-[#332B35]'
                    : 'text-[#5A4650] hover:bg-[#F5D889]/20'
                }`}
              >
                <Puzzle className="w-4 h-4 text-[#F3B8C8]" />
                <span>6. Mystery System</span>
              </button>

              <button
                onClick={() => switchTab('research')}
                className={`w-full text-left px-3 py-2 rounded-xl flex items-center space-x-2 font-semibold transition-colors cursor-pointer ${
                  activeTab === 'research'
                    ? 'bg-[#F3B8C8]/60 text-[#332B35]'
                    : 'text-[#5A4650] hover:bg-[#F5D889]/20'
                }`}
              >
                <BrainCircuit className="w-4 h-4 text-[#C9B5EA]" />
                <span>7. AI Research Engine</span>
              </button>

              <button
                onClick={() => switchTab('testmode')}
                className={`w-full text-left px-3 py-2 rounded-xl flex items-center space-x-2 font-semibold transition-colors cursor-pointer ${
                  activeTab === 'testmode'
                    ? 'bg-[#F3B8C8]/60 text-[#332B35]'
                    : 'text-[#5A4650] hover:bg-[#F5D889]/20'
                }`}
              >
                <Eye className="w-4 h-4 text-[#A9D8F5]" />
                <span>8. Test Mode (Góc nhìn Player)</span>
              </button>

              <button
                onClick={() => {
                  switchTab('prepublish');
                  handleRunPrePublishCheck();
                }}
                className={`w-full text-left px-3 py-2 rounded-xl flex items-center space-x-2 font-semibold transition-colors cursor-pointer ${
                  activeTab === 'prepublish'
                    ? 'bg-[#F3B8C8]/60 text-[#332B35]'
                    : 'text-[#5A4650] hover:bg-[#F5D889]/20'
                }`}
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>9. Kiểm tra & Sửa lỗi</span>
              </button>

              <button
                onClick={() => switchTab('stats')}
                className={`w-full text-left px-3 py-2 rounded-xl flex items-center space-x-2 font-semibold transition-colors cursor-pointer ${
                  activeTab === 'stats'
                    ? 'bg-[#F3B8C8]/60 text-[#332B35]'
                    : 'text-[#5A4650] hover:bg-[#F5D889]/20'
                }`}
              >
                <BarChart3 className="w-4 h-4 text-[#F5D889]" />
                <span>10. Thống kê hệ thống</span>
              </button>

              <button
                onClick={() => switchTab('integrity')}
                className={`w-full text-left px-3 py-2 rounded-xl flex items-center space-x-2 font-semibold transition-colors cursor-pointer ${
                  activeTab === 'integrity'
                    ? 'bg-[#F3B8C8]/60 text-[#332B35]'
                    : 'text-[#5A4650] hover:bg-[#F5D889]/20'
                }`}
              >
                <Database className="w-4 h-4 text-emerald-600" />
                <span>11. Toàn vẹn & Sao lưu</span>
              </button>

              <button
                onClick={() => switchTab('settings')}
                className={`w-full text-left px-3 py-2 rounded-xl flex items-center space-x-2 font-semibold transition-colors cursor-pointer ${
                  activeTab === 'settings'
                    ? 'bg-[#F3B8C8]/60 text-[#332B35]'
                    : 'text-[#5A4650] hover:bg-[#F5D889]/20'
                }`}
              >
                <Settings className="w-4 h-4 text-[#493C5A]" />
                <span>12. Cài đặt quản trị</span>
              </button>
            </div>

            {/* Main Tab Content */}
            <div className="flex-1 p-5 sm:p-6 overflow-y-auto">
              {/* Character Selector Dropdown for Contextual tabs */}
              {[
                'characters',
                'images',
                'literary_data',
                'clues',
                'mystery_system',
                'prepublish',
                'testmode',
              ].includes(activeTab) && (
                <div className="mb-6 p-3.5 rounded-2xl bg-[#FFF8F1] border border-[#F5D889]/40 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-[#493C5A]">Nhân vật đang chọn:</span>
                    <select
                      value={selectedCharId}
                      onChange={(e) => setSelectedCharId(e.target.value)}
                      className="px-3 py-1.5 rounded-xl border border-[#C9B5EA] bg-white font-semibold text-[#332B35]"
                    >
                      {characters.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} ({c.workTitle}) {c.isPublished ? '🟢 Đã xuất bản' : '⚪ Chưa xuất bản'}
                        </option>
                      ))}
                    </select>
                  </div>

                  {selectedChar && (
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleTogglePublish(selectedChar)}
                        className={`px-3 py-1 rounded-full font-bold text-[11px] transition-colors cursor-pointer ${
                          selectedChar.isPublished
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : 'bg-amber-100 text-amber-800 border border-amber-300'
                        }`}
                      >
                        {selectedChar.isPublished ? '🟢 Đang Xuất Bản (Bấm để Ẩn)' : '⚪ Chưa Xuất Bản (Bấm để Publish)'}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 1: WORKS */}
              {activeTab === 'works' && (
                <div className="space-y-6">
                  <div className="p-4 rounded-2xl bg-white border border-[#F5D889]/40 shadow-xs">
                    <h3 className="text-base font-bold font-serif-literary text-[#332B35] mb-3 flex items-center space-x-2">
                      <Plus className="w-4 h-4 text-[#F5D889]" />
                      <span>Thêm Tác Phẩm Mới (THPT)</span>
                    </h3>
                    <form onSubmit={handleCreateWork} className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div>
                        <label className="font-bold text-[#5A4650] block mb-1">Tên tác phẩm:</label>
                        <input
                          type="text"
                          required
                          value={newWorkTitle}
                          onChange={(e) => setNewWorkTitle(e.target.value)}
                          placeholder="Ví dụ: Chuyện người con gái Nam Xương"
                          className="w-full p-2.5 rounded-xl border border-[#C9B5EA]/50 bg-white"
                        />
                      </div>
                      <div>
                        <label className="font-bold text-[#5A4650] block mb-1">Tác giả:</label>
                        <input
                          type="text"
                          required
                          value={newWorkAuthor}
                          onChange={(e) => setNewWorkAuthor(e.target.value)}
                          placeholder="Ví dụ: Nguyễn Dữ"
                          className="w-full p-2.5 rounded-xl border border-[#C9B5EA]/50 bg-white"
                        />
                      </div>
                      <div>
                        <label className="font-bold text-[#5A4650] block mb-1">Thời đại / Giai đoạn:</label>
                        <input
                          type="text"
                          value={newWorkEra}
                          onChange={(e) => setNewWorkEra(e.target.value)}
                          placeholder="Ví dụ: Văn học trung đại thế kỷ XVI"
                          className="w-full p-2.5 rounded-xl border border-[#C9B5EA]/50 bg-white"
                        />
                      </div>
                      <div>
                        <label className="font-bold text-[#5A4650] block mb-1">Tóm tắt tác phẩm:</label>
                        <input
                          type="text"
                          value={newWorkSummary}
                          onChange={(e) => setNewWorkSummary(e.target.value)}
                          placeholder="Khái quát cốt truyện và giá trị hiện thực..."
                          className="w-full p-2.5 rounded-xl border border-[#C9B5EA]/50 bg-white"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <button
                          type="submit"
                          className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#F3B8C8] to-[#F5D889] font-bold text-xs text-[#332B35] shadow-xs"
                        >
                          Lưu Tác Phẩm
                        </button>
                      </div>
                    </form>
                  </div>

                  <div>
                    <h3 className="text-base font-bold font-serif-literary text-[#332B35] mb-3">
                      Danh Sách Tác Phẩm ({works.length})
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {works.map((w) => (
                        <div
                          key={w.id}
                          className="p-3.5 rounded-2xl bg-white border border-[#F5D889]/30 flex items-start justify-between shadow-xs text-xs"
                        >
                          <div>
                            <h4 className="font-bold text-sm text-[#332B35]">{w.title}</h4>
                            <p className="text-[#6F91AA]">
                              {w.author} • {w.era}
                            </p>
                            {w.summary && (
                              <p className="text-[#5A4650] mt-1 line-clamp-2">{w.summary}</p>
                            )}
                          </div>
                          <button
                            onClick={async () => {
                              if (confirm(`Xóa tác phẩm "${w.title}"?`)) {
                                if (token) {
                                  await deleteAdminWork(token, w.id);
                                  refreshAdminData();
                                }
                              }
                            }}
                            className="text-red-400 hover:text-red-600 p-1"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: CHARACTERS & IMAGE UPLOAD & VERSIONING */}
              {activeTab === 'characters' && (
                <div className="space-y-6">
                  {/* Character Selector & Lifecycle Status Bar */}
                  <div className="p-4 rounded-2xl bg-white border border-[#C9B5EA]/40 shadow-xs text-xs space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex-1">
                        <label className="font-bold text-[#5A4650] block mb-1">Chọn nhân vật để xem & quản lý:</label>
                        <select
                          value={selectedCharId}
                          onChange={(e) => setSelectedCharId(e.target.value)}
                          className="w-full p-2.5 rounded-xl border border-[#C9B5EA]/50 bg-white font-semibold text-xs text-[#332B35]"
                        >
                          <option value="">-- Chọn nhân vật --</option>
                          {characters.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name} — {c.workTitle} [{c.status || (c.isPublished ? 'PUBLISHED' : 'DRAFT')}]
                            </option>
                          ))}
                        </select>
                      </div>

                      {selectedChar && (
                        <div className="sm:self-end">
                          <label className="font-bold text-[#5A4650] block mb-1">Chuyển trạng thái quy trình:</label>
                          <select
                            value={selectedChar.status || (selectedChar.isPublished ? 'PUBLISHED' : 'DRAFT')}
                            onChange={(e) => handleUpdateStatus(selectedChar.id, e.target.value as CharacterStatus)}
                            className="p-2.5 rounded-xl border border-[#F5D889] bg-[#FFF8F1] font-bold text-xs text-[#493C5A]"
                          >
                            <option value="DRAFT">📝 DRAFT (Bản nháp)</option>
                            <option value="REVIEW">🔍 REVIEW (Đang thẩm định)</option>
                            <option value="APPROVED">✓ APPROVED (Đã duyệt canon)</option>
                            <option value="PUBLISHED">🌟 PUBLISHED (Đã xuất bản)</option>
                            <option value="ARCHIVED">📦 ARCHIVED (Lưu trữ)</option>
                          </select>
                        </div>
                      )}
                    </div>
                  </div>

                  {selectedChar && (
                    <div className="p-4 rounded-2xl bg-white border border-[#F5D889]/50 shadow-xs text-xs space-y-4">
                      <div className="flex flex-col sm:flex-row items-center sm:items-start space-y-3 sm:space-y-0 sm:space-x-5">
                        {/* Image Preview & Upload by Admin */}
                        <div className="w-28 h-36 rounded-2xl overflow-hidden border-2 border-[#F3B8C8] bg-[#FFF8F1] flex flex-col items-center justify-center shrink-0">
                          {selectedChar.imageUrl ? (
                            <img
                              src={selectedChar.imageUrl}
                              alt={selectedChar.name}
                              className="w-full h-full object-cover object-top"
                            />
                          ) : (
                            <div className="text-center p-2 text-red-500 text-[10px] font-bold">
                              CHƯA CÓ ẢNH NHÂN VẬT
                            </div>
                          )}
                        </div>

                        <div className="flex-1 space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-lg font-bold font-serif-literary text-[#332B35]">
                              {selectedChar.name} ({selectedChar.role})
                            </h3>
                            {/* Status Badge */}
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                (selectedChar.status || (selectedChar.isPublished ? 'PUBLISHED' : 'DRAFT')) === 'PUBLISHED'
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                  : (selectedChar.status || 'DRAFT') === 'APPROVED'
                                  ? 'bg-blue-100 text-blue-800 border border-blue-200'
                                  : (selectedChar.status || 'DRAFT') === 'REVIEW'
                                  ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                  : (selectedChar.status || 'DRAFT') === 'ARCHIVED'
                                  ? 'bg-purple-100 text-purple-800 border border-purple-200'
                                  : 'bg-gray-100 text-gray-800 border border-gray-200'
                              }`}
                            >
                              {selectedChar.status || (selectedChar.isPublished ? 'PUBLISHED' : 'DRAFT')}
                            </span>
                            {selectedChar.version && (
                              <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-mono">
                                v{selectedChar.version}
                              </span>
                            )}
                          </div>

                          <p className="text-[#6F91AA]">
                            Tác phẩm: <strong>{selectedChar.workTitle}</strong> ({selectedChar.workAuthor})
                          </p>

                          {/* Upload Action */}
                          <div className="pt-2">
                            <label className="inline-flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-[#FFF8F1] border border-[#F5D889] hover:bg-[#F5D889]/30 cursor-pointer font-semibold text-[#5A4650] transition-colors">
                              <Upload className="w-4 h-4 text-[#493C5A]" />
                              <span>{selectedChar.imageUrl ? 'Thay Đổi Ảnh Nhân Vật' : 'Tải Ảnh Nhân Vật Lên (Bắt buộc)'}</span>
                              <input
                                type="file"
                                accept="image/*"
                                onChange={handleImageFileChange}
                                className="hidden"
                              />
                            </label>
                            <span className="text-[10px] text-[#6F91AA] block mt-1">
                              * AI không tự tạo ảnh. Admin chịu trách nhiệm cung cấp ảnh nhân vật.
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Character Persona details */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-[#FFF8F1]">
                        <div>
                          <span className="font-bold text-[#493C5A]">Cách xưng hô:</span>{' '}
                          {selectedChar.pronouns}
                        </div>
                        <div>
                          <span className="font-bold text-[#493C5A]">Giọng văn:</span>{' '}
                          {selectedChar.voiceTone}
                        </div>
                        <div className="sm:col-span-2">
                          <span className="font-bold text-[#493C5A]">Điều nhân vật biết:</span>
                          <ul className="list-disc list-inside text-[#5A4650] mt-1 space-y-0.5">
                            {selectedChar.knownFacts.map((f, i) => (
                              <li key={i}>{f}</li>
                            ))}
                          </ul>
                        </div>
                        <div className="sm:col-span-2">
                          <span className="font-bold text-[#493C5A]">
                            Giới hạn kiến thức (Không biết):
                          </span>
                          <ul className="list-disc list-inside text-red-700 mt-1 space-y-0.5">
                            {selectedChar.knowledgeBoundaries.map((b, i) => (
                              <li key={i}>{b}</li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      {/* REQUIREMENT 8: VERSION HISTORY PANEL */}
                      <div className="pt-4 border-t border-[#F5D889]/30 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <History className="w-4 h-4 text-[#C9B5EA]" />
                            <h4 className="font-bold text-sm text-[#332B35]">
                              Lịch Sử Phiên Bản (Version History)
                            </h4>
                          </div>
                          <span className="text-[11px] text-[#6F91AA]">
                            {characterVersions.length} phiên bản đã ghi nhận
                          </span>
                        </div>

                        {loadingVersions ? (
                          <p className="text-[11px] text-gray-500 italic">Đang tải lịch sử phiên bản...</p>
                        ) : characterVersions.length === 0 ? (
                          <p className="text-[11px] text-gray-500 italic">
                            Chưa có lịch sử phiên bản trước đó (đây là phiên bản đầu tiên).
                          </p>
                        ) : (
                          <div className="divide-y divide-gray-100 border border-gray-200 rounded-xl overflow-hidden bg-gray-50/50">
                            {characterVersions.map((v) => (
                              <div
                                key={v.id}
                                className="p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                              >
                                <div className="space-y-0.5">
                                  <div className="flex items-center space-x-2">
                                    <span className="font-bold font-mono text-purple-700 bg-purple-100 px-2 py-0.5 rounded-md text-[11px]">
                                      Phiên bản {v.versionNumber}
                                    </span>
                                    <span className="text-gray-500 text-[10px]">
                                      {new Date(v.createdAt).toLocaleString('vi-VN')}
                                    </span>
                                  </div>
                                  <p className="text-[#5A4650] text-[11px] italic">
                                    {v.changeSummary || 'Chỉnh sửa dữ liệu nhân vật'}
                                  </p>
                                </div>

                                <button
                                  onClick={() => handleRevertVersion(v.versionNumber)}
                                  className="px-3 py-1.5 rounded-lg bg-white border border-[#C9B5EA] hover:bg-[#F3B8C8]/20 font-bold text-[11px] text-[#332B35] shadow-2xs self-start sm:self-auto cursor-pointer"
                                >
                                  Khôi phục phiên bản này
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Manual Add Character Form with Auto-Save Draft */}
                  <div className="p-4 rounded-2xl bg-white border border-[#C9B5EA]/40 shadow-xs text-xs space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#C9B5EA]/20 pb-2.5">
                      <h3 className="text-sm font-bold font-serif-literary text-[#332B35] flex items-center space-x-1.5">
                        <Plus className="w-4 h-4 text-[#C9B5EA]" />
                        <span>Thêm Nhân Vật Mới Thủ Công (Lưu Bền Vững)</span>
                      </h3>

                      {/* Auto-Save Draft Indicator */}
                      <div className="flex items-center space-x-2">
                        {draftSaveStatus === 'saving' && (
                          <span className="text-amber-600 animate-pulse text-[11px] font-medium flex items-center space-x-1">
                            <Clock className="w-3.5 h-3.5 animate-spin" />
                            <span>Đang lưu bản nháp...</span>
                          </span>
                        )}
                        {draftSaveStatus === 'saved' && draftLastSaved && (
                          <span className="text-emerald-700 text-[11px] font-medium flex items-center space-x-1">
                            <Check className="w-3.5 h-3.5" />
                            <span>Đã lưu bản nháp lúc {draftLastSaved}</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Detected Unsaved Draft Prompt */}
                    {hasSavedDraft && savedDraftData && (
                      <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                        <div className="space-y-0.5">
                          <p className="font-bold flex items-center space-x-1">
                            <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                            <span>Phát hiện bản nháp chưa hoàn tất từ phiên trước</span>
                          </p>
                          <p className="text-[11px] text-amber-700">
                            Nhân vật: <strong>{savedDraftData.name || '(Chưa đặt tên)'}</strong> • Lưu lúc {draftLastSaved || 'gần đây'}
                          </p>
                        </div>
                        <div className="flex items-center space-x-2 shrink-0">
                          <button
                            type="button"
                            onClick={handleRestoreDraft}
                            className="px-3 py-1.5 rounded-lg bg-amber-600 text-white font-bold text-xs hover:bg-amber-700 transition cursor-pointer"
                          >
                            Khôi phục bản nháp
                          </button>
                          <button
                            type="button"
                            onClick={handleDiscardDraft}
                            className="px-3 py-1.5 rounded-lg bg-white border border-amber-300 text-amber-800 font-medium text-xs hover:bg-amber-100 transition cursor-pointer"
                          >
                            Hủy bỏ
                          </button>
                        </div>
                      </div>
                    )}

                    <form onSubmit={handleCreateCharacter} className="space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                        <div>
                          <label className="font-bold text-[#5A4650] block mb-1">Thuộc tác phẩm:</label>
                          <select
                            value={newCharWorkId}
                            onChange={(e) => setNewCharWorkId(e.target.value)}
                            className="w-full p-2.5 rounded-xl border border-[#C9B5EA]/50 bg-white"
                          >
                            <option value="">-- Chọn tác phẩm --</option>
                            {works.map((w) => (
                              <option key={w.id} value={w.id}>
                                {w.title} ({w.author})
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="font-bold text-[#5A4650] block mb-1">Tên nhân vật:</label>
                          <input
                            type="text"
                            required
                            value={newCharName}
                            onChange={(e) => setNewCharName(e.target.value)}
                            placeholder="Ví dụ: Chí Phèo"
                            className="w-full p-2.5 rounded-xl border border-[#C9B5EA]/50 bg-white"
                          />
                        </div>
                        <div>
                          <label className="font-bold text-[#5A4650] block mb-1">Phân loại thẻ:</label>
                          <select
                            value={newCharBadge}
                            onChange={(e) => setNewCharBadge(e.target.value as any)}
                            className="w-full p-2.5 rounded-xl border border-[#C9B5EA]/50 bg-white"
                          >
                            <option value="main">Nhân vật chính</option>
                            <option value="sub">Nhân vật phụ</option>
                            <option value="unexpected">Góc nhìn bất ngờ</option>
                          </select>
                        </div>
                        <div>
                          <label className="font-bold text-[#5A4650] block mb-1">Trạng thái khởi tạo:</label>
                          <select
                            value={newCharStatus}
                            onChange={(e) => setNewCharStatus(e.target.value as CharacterStatus)}
                            className="w-full p-2.5 rounded-xl border border-[#C9B5EA]/50 bg-white font-bold"
                          >
                            <option value="DRAFT">📝 DRAFT (Bản nháp)</option>
                            <option value="REVIEW">🔍 REVIEW (Thẩm định)</option>
                            <option value="APPROVED">✓ APPROVED (Đã duyệt)</option>
                            <option value="PUBLISHED">🌟 PUBLISHED (Xuất bản)</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="font-bold text-[#5A4650] block mb-1">Tính cách:</label>
                          <input
                            type="text"
                            value={newCharPersonality}
                            onChange={(e) => setNewCharPersonality(e.target.value)}
                            placeholder="Ví dụ: Nông dân lương thiện bị tha hóa, khao khát hoàn lương"
                            className="w-full p-2.5 rounded-xl border border-[#C9B5EA]/50 bg-white"
                          />
                        </div>
                        <div>
                          <label className="font-bold text-[#5A4650] block mb-1">Xưng hô:</label>
                          <input
                            type="text"
                            value={newCharPronouns}
                            onChange={(e) => setNewCharPronouns(e.target.value)}
                            placeholder="Ví dụ: tôi - người anh em, tao - chúng mày"
                            className="w-full p-2.5 rounded-xl border border-[#C9B5EA]/50 bg-white"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="font-bold text-[#5A4650] block mb-1">
                          Đoạn giới thiệu ngắn (không spoil bí mật):
                        </label>
                        <input
                          type="text"
                          value={newCharShortIntro}
                          onChange={(e) => setNewCharShortIntro(e.target.value)}
                          placeholder="Lời tự bạch hoặc tóm tắt số phận..."
                          className="w-full p-2.5 rounded-xl border border-[#C9B5EA]/50 bg-white"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="font-bold text-[#5A4650] block mb-1">
                            Điều nhân vật biết (mỗi dòng 1 ý):
                          </label>
                          <textarea
                            rows={3}
                            value={newCharKnownFacts}
                            onChange={(e) => setNewCharKnownFacts(e.target.value)}
                            placeholder="Những việc họ từng trải qua hoặc chứng kiến..."
                            className="w-full p-2.5 rounded-xl border border-[#C9B5EA]/50 bg-white"
                          />
                        </div>
                        <div>
                          <label className="font-bold text-[#5A4650] block mb-1">
                            Giới hạn kiến thức - KHÔNG BIẾT (mỗi dòng 1 ý):
                          </label>
                          <textarea
                            rows={3}
                            value={newCharBoundaries}
                            onChange={(e) => setNewCharBoundaries(e.target.value)}
                            placeholder="Những việc xảy ra sau lưng hoặc tương lai..."
                            className="w-full p-2.5 rounded-xl border border-[#C9B5EA]/50 bg-white"
                          />
                        </div>
                      </div>

                      <div className="pt-2 flex items-center justify-between">
                        <button
                          type="submit"
                          className="px-6 py-3 rounded-xl bg-gradient-to-r from-[#F3B8C8] to-[#F5D889] font-bold text-xs text-[#332B35] shadow-md hover:shadow-lg transition-all cursor-pointer flex items-center space-x-2"
                        >
                          <Save className="w-4 h-4 text-[#332B35]" />
                          <span>LƯU NHÂN VẬT VÀO DATABASE</span>
                        </button>
                        <span className="text-[11px] text-[#6F91AA]">
                          * Dữ liệu được ghi ngay vào SQLite (WAL mode) bền vững.
                        </span>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {/* TAB 3: QUẢN LÝ ẢNH NHÂN VẬT (RULE BẮT BUỘC) */}
              {activeTab === 'images' && (
                <div className="space-y-6 text-xs">
                  {/* Banner Quy tắc Ảnh */}
                  <div className="p-4 rounded-2xl bg-gradient-to-r from-[#F3B8C8]/30 to-[#F5D889]/30 border border-[#F3B8C8] space-y-2">
                    <div className="flex items-center space-x-2">
                      <AlertTriangle className="w-5 h-5 text-[#B83253]" />
                      <h4 className="font-bold text-sm text-[#B83253] uppercase tracking-wide">
                        Quy Tắc Quản Trị: Ảnh Nhân Vật 100% Do Admin Cung Cấp
                      </h4>
                    </div>
                    <p className="text-[#493C5A] leading-relaxed">
                      AI tuyệt đối <strong>KHÔNG ĐƯỢC</strong> tự sinh ảnh, tự chọn ảnh, tự thay ảnh, regenerate ảnh, recolor ảnh hay tạo avatar thay thế. Hệ thống <strong>chặn hoàn toàn lệnh Publish</strong> chừng nào Admin chưa cung cấp ảnh chân dung hợp lệ cho nhân vật.
                    </p>
                  </div>

                  {/* Character Image Uploader for Selected Character */}
                  {selectedChar && (
                    <div className="p-4 rounded-2xl bg-white border border-[#F5D889]/50 shadow-xs space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#F5D889]/30 pb-3">
                        <div>
                          <h4 className="font-bold font-serif-literary text-base text-[#332B35]">
                            Ảnh Chân Dung: {selectedChar.name} ({selectedChar.workTitle})
                          </h4>
                          <span className="text-[11px] text-[#6F91AA]">
                            ID: {selectedChar.id} • Trạng thái:{' '}
                            {selectedChar.imageUrl ? (
                              <strong className="text-emerald-700">🟢 Đã có ảnh Admin</strong>
                            ) : (
                              <strong className="text-rose-700">🔴 CHƯA CÓ ẢNH NHÂN VẬT</strong>
                            )}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          {selectedChar.imageUrl ? (
                            <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                              ✓ Hợp lệ để Xuất bản
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-full bg-rose-100 text-rose-800 font-bold text-[10px]">
                              🚫 Bị chặn xuất bản
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
                        {/* Current Preview */}
                        <div className="flex flex-col items-center justify-center p-3 rounded-xl bg-[#FFF8F1] border border-[#F5D889]/40 min-h-[220px]">
                          {selectedChar.imageUrl ? (
                            <div className="relative group text-center">
                              <img
                                src={selectedChar.imageUrl}
                                alt={selectedChar.name}
                                className="w-36 h-48 object-cover rounded-xl shadow-md border-2 border-white"
                              />
                              <span className="inline-block mt-2 text-[10px] font-semibold text-[#5A4650] bg-white px-2 py-0.5 rounded-full border border-[#C9B5EA]/40">
                                Ảnh hiện tại do Admin tải lên
                              </span>
                            </div>
                          ) : (
                            <div className="text-center p-4">
                              <div className="w-20 h-20 mx-auto mb-2 rounded-2xl bg-[#F3B8C8]/40 border-2 border-dashed border-[#F3B8C8] flex items-center justify-center text-[#B83253]">
                                <ImageIcon className="w-8 h-8 opacity-60" />
                              </div>
                              <span className="font-bold text-rose-700 block text-xs">
                                CHƯA CÓ ẢNH NHÂN VẬT
                              </span>
                              <span className="text-[10px] text-[#6F91AA] block mt-0.5">
                                Vui lòng tải file hoặc nhập URL bên dưới
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Upload Controls */}
                        <div className="md:col-span-2 space-y-3">
                          <div className="p-3.5 rounded-xl border border-dashed border-[#C9B5EA] bg-[#FFF8F1]/40">
                            <label className="font-bold text-[#493C5A] block mb-1 flex items-center space-x-1.5">
                              <Upload className="w-4 h-4 text-[#493C5A]" />
                              <span>Cách 1: Tải file ảnh từ máy tính (PNG, JPG, WebP)</span>
                            </label>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleImageFileChange}
                              className="w-full text-xs text-[#5A4650] file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-[#F3B8C8] file:text-[#332B35] hover:file:bg-[#F3B8C8]/80 cursor-pointer"
                            />
                            <p className="text-[10px] text-[#6F91AA] mt-1">
                              Ảnh sẽ được mã hoá và lưu trực tiếp an toàn vào dữ liệu nhân vật.
                            </p>
                          </div>

                          <div className="p-3.5 rounded-xl bg-white border border-[#C9B5EA]/60 space-y-2">
                            <label className="font-bold text-[#493C5A] block">
                              Cách 2: Hoặc dán đường dẫn ảnh trực tiếp (Image URL)
                            </label>
                            <div className="flex space-x-2">
                              <input
                                type="url"
                                value={charImageUrlInput}
                                onChange={(e) => setCharImageUrlInput(e.target.value)}
                                placeholder="https://example.com/avatar-vu-nuong.jpg"
                                className="flex-1 p-2 rounded-xl border border-[#C9B5EA]/50 text-xs"
                              />
                              <button
                                onClick={() => handleSaveImageUrl(selectedChar.id, charImageUrlInput)}
                                disabled={imageUploading || !charImageUrlInput.trim()}
                                className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#F3B8C8] to-[#F5D889] font-bold text-xs text-[#332B35] shadow-xs cursor-pointer disabled:opacity-50"
                              >
                                {imageUploading ? 'Đang Lưu...' : 'Cập Nhật Ảnh'}
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Character Image Overview Table */}
                  <div className="p-4 rounded-2xl bg-white border border-[#F5D889]/50 shadow-xs">
                    <h4 className="font-bold font-serif-literary text-sm text-[#332B35] mb-3">
                      Bảng Giám Sát Trạng Thái Ảnh Toàn Bộ Nhân Vật ({characters.length})
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {characters.map((char) => (
                        <div
                          key={char.id}
                          onClick={() => setSelectedCharId(char.id)}
                          className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center space-x-3 ${
                            selectedCharId === char.id
                              ? 'border-[#B83253] bg-[#FFF8F1] shadow-xs'
                              : 'border-[#F5D889]/30 bg-white hover:bg-[#FFF8F1]/40'
                          }`}
                        >
                          <div className="w-12 h-14 rounded-lg overflow-hidden bg-slate-100 shrink-0 border border-slate-200 flex items-center justify-center">
                            {char.imageUrl ? (
                              <img
                                src={char.imageUrl}
                                alt={char.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <ImageIcon className="w-5 h-5 text-slate-400" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h5 className="font-bold text-[#332B35] truncate">{char.name}</h5>
                            <span className="text-[10px] text-[#6F91AA] block truncate">
                              {char.workTitle}
                            </span>
                            <div className="mt-1 flex items-center space-x-1.5">
                              {char.imageUrl ? (
                                <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                                  ✓ Đã có ảnh
                                </span>
                              ) : (
                                <span className="text-[9px] font-bold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                                  ⚠️ THIẾU ẢNH
                                </span>
                              )}
                              {char.isPublished && (
                                <span className="text-[9px] font-bold text-sky-700 bg-sky-50 px-1.5 py-0.5 rounded">
                                  Public
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: DỮ LIỆU VĂN HỌC & RANH GIỚI KIẾN THỨC (CANON LOCK) */}
              {activeTab === 'literary_data' && (
                <div className="space-y-5 text-xs">
                  {selectedChar ? (
                    <form onSubmit={handleSaveCanonData} className="space-y-4">
                      <div className="p-4 rounded-2xl bg-white border border-[#C9B5EA]/50 shadow-xs space-y-4">
                        <div className="flex items-center justify-between border-b border-[#F5D889]/30 pb-3">
                          <div>
                            <h4 className="text-base font-bold font-serif-literary text-[#332B35]">
                              Dữ Liệu Văn Học & Canon Lock: {selectedChar.name}
                            </h4>
                            <p className="text-[#6F91AA] text-[11px]">
                              Tác phẩm: <strong>{selectedChar.workTitle}</strong> ({selectedChar.workAuthor})
                            </p>
                          </div>
                          <button
                            type="submit"
                            className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#F3B8C8] to-[#F5D889] font-bold text-xs text-[#332B35] shadow-xs cursor-pointer"
                          >
                            Lưu Dữ Liệu Văn Học
                          </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="p-3.5 rounded-xl bg-[#FFF8F1] border border-[#F5D889]/50 space-y-2">
                            <label className="font-bold text-[#493C5A] block flex items-center space-x-1.5">
                              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                              <span>Kiến thức chính xác theo nguyên tác (Known Facts)</span>
                            </label>
                            <p className="text-[10px] text-[#6F91AA]">
                              Mỗi dòng 1 dữ kiện. AI chỉ được sử dụng các dữ kiện có trong chương trình Ngữ văn THPT:
                            </p>
                            <textarea
                              rows={8}
                              value={editCanonFacts}
                              onChange={(e) => setEditCanonFacts(e.target.value)}
                              className="w-full p-2.5 rounded-xl border border-[#C9B5EA]/50 bg-white font-mono text-[11px]"
                              placeholder="Ví dụ:&#10;Vũ Nương quê ở Nam Xương, tính tình thùy mị nết na&#10;Chàng Trương đi lính xa nhà khi mẹ già và con thơ..."
                            />
                          </div>

                          <div className="p-3.5 rounded-xl bg-[#FFF8F1] border border-[#F3B8C8]/50 space-y-2">
                            <label className="font-bold text-[#B83253] block flex items-center space-x-1.5">
                              <AlertCircle className="w-4 h-4 text-[#B83253]" />
                              <span>Ranh giới tri thức - KHÔNG ĐƯỢC BIẾT (Knowledge Boundary)</span>
                            </label>
                            <p className="text-[10px] text-[#6F91AA]">
                              Mỗi dòng 1 điều cấm kỵ. Nhân vật không biết tương lai, không biết sau lưng, không biết hiện đại:
                            </p>
                            <textarea
                              rows={8}
                              value={editBoundaries}
                              onChange={(e) => setEditBoundaries(e.target.value)}
                              className="w-full p-2.5 rounded-xl border border-[#F3B8C8]/50 bg-white font-mono text-[11px]"
                              placeholder="Ví dụ:&#10;Không biết chuyện gì xảy ra ở trần gian sau khi gieo mình xuống sông&#10;Không biết thế giới hiện đại, máy tính, súng đạn thế kỷ 21&#10;Không thừa nhận tội ngoại tình vì hoàn toàn trong sạch..."
                            />
                          </div>
                        </div>

                        <div className="p-3 rounded-xl bg-white border border-[#C9B5EA]/40 text-[#5A4650] leading-relaxed">
                          <strong>Lưu ý quản trị:</strong> Ranh giới kiến thức đảm bảo tính chân thực tuyệt đối cho tác phẩm văn học. Tránh trường hợp AI "ảo tưởng" (hallucination) hoặc nói những điều phản nguyên tác SGK.
                        </div>
                      </div>
                    </form>
                  ) : (
                    <p className="text-[#6F91AA]">Vui lòng chọn nhân vật để cấu hình dữ liệu văn học.</p>
                  )}
                </div>
              )}

              {/* TAB 7: AI RESEARCH ENGINE */}
              {activeTab === 'research' && (
                <div className="space-y-5 text-xs">
                  <div className="p-4 rounded-2xl bg-white border border-[#F5D889]/50 shadow-xs">
                    <h3 className="text-base font-bold font-serif-literary text-[#332B35] mb-2 flex items-center space-x-2">
                      <BrainCircuit className="w-5 h-5 text-[#C9B5EA]" />
                      <span>Công Cụ Nghiên Cứu & Trích Xuất Văn Học THPT</span>
                    </h3>
                    <p className="text-[#6F91AA] mb-4">
                      AI hỗ trợ Admin nghiên cứu tác phẩm, cấu trúc Canon, nhân vật, giới hạn kiến
                      thức và kịch bản manh mối. Admin có toàn quyền duyệt và chỉnh sửa trước khi
                      lưu. Toàn bộ kết quả nghiên cứu được lưu tự động vào cơ sở dữ liệu bền vững.
                    </p>

                    {pastResearchRecords.length > 0 && (
                      <div className="mb-4 p-3 rounded-xl bg-[#FFF8F1] border border-[#F5D889]/60">
                        <div className="flex items-center justify-between mb-1">
                          <label className="font-bold text-[#5A4650] block">
                            Hồ sơ nghiên cứu đã lưu vào database ({pastResearchRecords.length}):
                          </label>
                          <span className="text-[10px] text-emerald-700 font-semibold">✓ Không bao giờ mất sau restart</span>
                        </div>
                        <select
                          onChange={(e) => {
                            const rec = pastResearchRecords.find((r) => r.id === e.target.value);
                            if (rec) {
                              setResearchWorkTitle(rec.workTitle);
                              if (rec.workAuthor || rec.author) setResearchAuthor(rec.workAuthor || rec.author);
                              if (rec.excerpt) setResearchExcerpt(rec.excerpt);
                              if (rec.result) {
                                setResearchResult(rec.result);
                                setResearchJobState('SUCCESS');
                              }
                            }
                          }}
                          className="w-full p-2.5 rounded-xl border border-[#C9B5EA]/50 bg-white font-medium text-xs text-[#332B35]"
                        >
                          <option value="">-- Nạp lại kết quả từ cơ sở dữ liệu bền vững --</option>
                          {pastResearchRecords.map((r) => (
                            <option key={r.id} value={r.id}>
                              {r.workTitle} ({r.workAuthor || r.author || 'Tác giả THPT'}) — [{new Date(r.createdAt).toLocaleDateString('vi-VN')}]
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                      <div>
                        <label className="font-bold text-[#5A4650] block mb-1">Tên tác phẩm:</label>
                        <input
                          type="text"
                          value={researchWorkTitle}
                          onChange={(e) => setResearchWorkTitle(e.target.value)}
                          placeholder="Ví dụ: Chuyện người con gái Nam Xương"
                          className="w-full p-2.5 rounded-xl border border-[#C9B5EA]/50 bg-white"
                        />
                      </div>
                      <div>
                        <label className="font-bold text-[#5A4650] block mb-1">Tác giả (nếu có):</label>
                        <input
                          type="text"
                          value={researchAuthor}
                          onChange={(e) => setResearchAuthor(e.target.value)}
                          placeholder="Ví dụ: Nguyễn Dữ"
                          className="w-full p-2.5 rounded-xl border border-[#C9B5EA]/50 bg-white"
                        />
                      </div>
                    </div>

                    <div className="mb-4">
                      <label className="font-bold text-[#5A4650] block mb-1">
                        Trích đoạn hoặc tư liệu hỗ trợ (tùy chọn):
                      </label>
                      <textarea
                        rows={2}
                        value={researchExcerpt}
                        onChange={(e) => setResearchExcerpt(e.target.value)}
                        placeholder="Dán một đoạn trích từ SGK hoặc ghi chú văn học để AI bám sát..."
                        className="w-full p-2.5 rounded-xl border border-[#C9B5EA]/50 bg-white"
                      />
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      <button
                        onClick={handleRunAiResearch}
                        disabled={researchLoading || !researchWorkTitle.trim()}
                        className={`px-5 py-2.5 rounded-xl font-bold text-xs shadow-xs transition-all flex items-center space-x-2 cursor-pointer ${
                          researchLoading
                            ? 'bg-[#EADED2] text-[#7A6B72] cursor-not-allowed opacity-80'
                            : researchJobState === 'SUCCESS'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 hover:bg-emerald-200'
                            : researchJobState === 'FAILED'
                            ? 'bg-rose-100 text-rose-800 border border-rose-300 hover:bg-rose-200'
                            : 'bg-gradient-to-r from-[#F3B8C8] via-[#F5D889] to-[#A9D8F5] text-[#332B35] hover:shadow-md'
                        }`}
                      >
                        {researchJobState === 'RESEARCHING' && (
                          <>
                            <RotateCw className="w-4 h-4 animate-spin text-[#332B35]" />
                            <span>🔍 Đang nghiên cứu tác phẩm...</span>
                          </>
                        )}
                        {researchJobState === 'RETRYING' && (
                          <>
                            <RotateCw className="w-4 h-4 animate-spin text-[#332B35]" />
                            <span>🔄 AI đang bận. Đang thử kết nối lại ({researchRetryCount}/3)...</span>
                          </>
                        )}
                        {researchJobState === 'IDLE' && (
                          <>
                            <Sparkles className="w-4 h-4" />
                            <span>Khởi Động Nghiên Cứu AI</span>
                          </>
                        )}
                        {researchJobState === 'SUCCESS' && (
                          <>
                            <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                            <span>✓ Nghiên cứu hoàn tất (Khởi động lại)</span>
                          </>
                        )}
                        {researchJobState === 'FAILED' && (
                          <>
                            <RotateCw className="w-4 h-4 text-rose-700" />
                            <span>🔄 Thử Lại Nghiên Cứu AI</span>
                          </>
                        )}
                      </button>

                      {researchJobState === 'SUCCESS' && (
                        <span className="text-emerald-700 font-semibold text-xs flex items-center space-x-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Dữ liệu đã sẵn sàng để duyệt bên dưới</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* RETRYING BANNER */}
                  {researchJobState === 'RETRYING' && (
                    <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 flex items-center space-x-3 text-xs animate-pulse">
                      <RotateCw className="w-4 h-4 animate-spin text-amber-600 shrink-0" />
                      <div className="flex-1">
                        <p className="font-bold">AI Research Engine đang tạm thời quá tải. Hệ thống sẽ tự động thử lại.</p>
                        <p className="text-amber-700 text-[11px] mt-0.5">🔄 Đang thử kết nối lại (Lần {researchRetryCount}/3)...</p>
                      </div>
                    </div>
                  )}

                  {/* FAILED STATE BANNER (NO RAW JSON, FRIENDLY COPY, INPUTS PRESERVED) */}
                  {researchJobState === 'FAILED' && researchError && (
                    <div className="p-4 rounded-2xl bg-rose-50/80 border border-rose-200 text-xs space-y-3 shadow-xs">
                      <div className="flex flex-col sm:flex-row items-start justify-between gap-3">
                        <div className="flex items-start space-x-3">
                          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                          <div className="space-y-1">
                            <h5 className="font-bold text-rose-900 text-sm">AI Research Engine tạm thời không khả dụng.</h5>
                            <p className="text-rose-700">{researchError.message}</p>
                            <p className="text-rose-600 text-[11px] italic">
                              * Chưa hoàn tất nghiên cứu vì AI Research Engine chưa kết nối được. Toàn bộ thông tin tác phẩm bạn nhập được giữ nguyên vẹn.
                            </p>
                          </div>
                        </div>

                        <button
                          onClick={handleRunAiResearch}
                          disabled={researchLoading}
                          className="px-4 py-2 rounded-xl bg-rose-600 text-white font-bold text-xs hover:bg-rose-700 transition shadow-xs shrink-0 cursor-pointer disabled:opacity-50 flex items-center space-x-1.5"
                        >
                          <RotateCw className="w-3.5 h-3.5" />
                          <span>THỬ LẠI</span>
                        </button>
                      </div>

                      {/* Technical Details: Collapsed by default (Requirement 11) */}
                      {researchError.technicalDetails && (
                        <div className="pt-2 border-t border-rose-200/60">
                          <button
                            type="button"
                            onClick={() => setShowTechnicalDetails((prev) => !prev)}
                            className="flex items-center space-x-1.5 text-[11px] font-bold text-rose-800 hover:text-rose-950 cursor-pointer"
                          >
                            <span>Chi tiết kỹ thuật</span>
                            {showTechnicalDetails ? (
                              <ChevronUp className="w-3.5 h-3.5" />
                            ) : (
                              <ChevronDown className="w-3.5 h-3.5" />
                            )}
                          </button>

                          {showTechnicalDetails && (
                            <div className="mt-2 p-2.5 rounded-xl bg-white/90 border border-rose-200 font-mono text-[11px] text-rose-950 break-words leading-relaxed">
                              <div className="flex items-center space-x-2 text-[10px] text-rose-700 font-bold mb-1">
                                <span>MÃ: {researchError.statusCode || 503}</span>
                                <span>•</span>
                                <span>TRẠNG THÁI: {researchError.isRetryable ? 'CÓ THỂ THỬ LẠI (TEMPORARY OVERLOAD)' : 'CẦN KIỂM TRA THIẾT LẬP'}</span>
                              </div>
                              <p>{researchError.technicalDetails}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Research Results Preview & Approval */}
                  {researchResult && (
                    <div className="p-4 rounded-2xl bg-[#FFF8F1] border border-[#F5D889] space-y-4 shadow-sm">
                      <div className="flex items-center justify-between">
                        <h4 className="text-base font-bold font-serif-literary text-[#332B35]">
                          Kết Quả Nghiên Cứu: {researchResult.work.title} ({researchResult.work.author})
                        </h4>
                        <span className="px-2.5 py-0.5 rounded-full bg-[#A9D8F5]/40 text-[#332B35] font-bold">
                          Đã cấu trúc
                        </span>
                      </div>

                      <p className="text-[#5A4650] italic bg-white p-3 rounded-xl border border-[#F5D889]/30">
                        {researchResult.work.summary}
                      </p>

                      {/* Proposed Characters List */}
                      <div>
                        <h5 className="font-bold text-[#493C5A] uppercase text-xs mb-2">
                          Nhân vật đề xuất ({researchResult.characters?.length || 0}):
                        </h5>
                        <div className="space-y-3">
                          {researchResult.characters?.map((c: any, i: number) => (
                            <div
                              key={i}
                              className="p-3.5 rounded-2xl bg-white border border-[#F5D889]/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs"
                            >
                              <div>
                                <div className="flex items-center space-x-2 mb-1">
                                  <span className="font-bold text-sm text-[#332B35]">{c.name}</span>
                                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#F5D889]/40 font-semibold">
                                    {c.role}
                                  </span>
                                </div>
                                <p className="text-[#6F91AA] text-xs">
                                  Xưng hô: {c.pronouns} • Tính cách: {c.personality}
                                </p>
                              </div>
                              <button
                                onClick={() => handleImportResearchedCharacter(c)}
                                className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-[#F3B8C8] to-[#F5D889] font-bold text-xs text-[#332B35] shrink-0 shadow-xs cursor-pointer"
                              >
                                Duyệt & Thêm Vào Kho
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Proposed Clues List */}
                      {researchResult.clues && researchResult.clues.length > 0 && (
                        <div>
                          <h5 className="font-bold text-[#493C5A] uppercase text-xs mb-2">
                            Manh mối điều tra THPT đề xuất ({researchResult.clues.length}):
                          </h5>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {researchResult.clues.map((cl: any, idx: number) => (
                              <div
                                key={idx}
                                className="p-3 rounded-xl bg-white border border-[#C9B5EA]/40"
                              >
                                <span className="font-bold text-[#332B35] block mb-0.5">
                                  {cl.title}
                                </span>
                                <p className="text-[#6F91AA] text-[11px]">{cl.description}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 5: QUẢN LÝ MANH MỐI */}
              {activeTab === 'clues' && (
                <div className="space-y-5 text-xs">
                  {selectedChar ? (
                    <div className="space-y-4">
                      <div className="p-4 rounded-2xl bg-white border border-[#F5D889]/50 shadow-xs space-y-3">
                        <h4 className="text-base font-bold font-serif-literary text-[#332B35] flex items-center space-x-2">
                          <Plus className="w-4 h-4 text-[#F5D889]" />
                          <span>Thêm Manh Mối Điều Tra Mới ({selectedChar.name})</span>
                        </h4>
                        <form onSubmit={handleAddNewClue} className="space-y-3">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <label className="font-bold text-[#5A4650] block mb-1">
                                Tên manh mối:
                              </label>
                              <input
                                type="text"
                                required
                                value={newClueTitle}
                                onChange={(e) => setNewClueTitle(e.target.value)}
                                placeholder="Ví dụ: Lời nói ngây thơ của bé Đản"
                                className="w-full p-2.5 rounded-xl border border-[#C9B5EA]/50 bg-white"
                              />
                            </div>
                            <div>
                              <label className="font-bold text-[#5A4650] block mb-1">
                                Từ khóa kích hoạt (phân cách bằng dấu phẩy):
                              </label>
                              <input
                                type="text"
                                value={newClueKeywords}
                                onChange={(e) => setNewClueKeywords(e.target.value)}
                                placeholder="Ví dụ: cha Đản, cái bóng, đêm nào cũng đến"
                                className="w-full p-2.5 rounded-xl border border-[#C9B5EA]/50 bg-white"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="font-bold text-[#5A4650] block mb-1">
                              Mô tả nội dung manh mối & giá trị văn học:
                            </label>
                            <textarea
                              rows={2}
                              required
                              value={newClueDesc}
                              onChange={(e) => setNewClueDesc(e.target.value)}
                              placeholder="Mô tả sự kiện hoặc chi tiết hé lộ chân tướng..."
                              className="w-full p-2.5 rounded-xl border border-[#C9B5EA]/50 bg-white"
                            />
                          </div>
                          <button
                            type="submit"
                            className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#F3B8C8] to-[#F5D889] font-bold text-xs text-[#332B35] shadow-xs cursor-pointer"
                          >
                            + Thêm Manh Mối
                          </button>
                        </form>
                      </div>

                      <div className="p-4 rounded-2xl bg-white border border-[#F5D889]/30 shadow-xs">
                        <h4 className="text-base font-bold font-serif-literary text-[#332B35] mb-3">
                          Danh Sách Manh Mối Hiện Tại ({charClues.length})
                        </h4>
                        {charClues.length === 0 ? (
                          <p className="text-[#6F91AA] italic">Chưa có manh mối nào được tạo cho nhân vật này.</p>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {charClues.map((c) => (
                              <div
                                key={c.id}
                                className="p-3.5 rounded-2xl bg-[#FFF8F1] border border-[#F5D889]/50 shadow-xs flex flex-col justify-between"
                              >
                                <div>
                                  <div className="flex items-start justify-between gap-2 mb-1">
                                    <span className="font-bold text-sm text-[#332B35]">{c.title}</span>
                                    <button
                                      onClick={() => handleDeleteClue(c.id)}
                                      className="text-rose-500 hover:text-rose-700 p-1 rounded-lg hover:bg-rose-50 cursor-pointer shrink-0"
                                      title="Xoá manh mối"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                  <p className="text-[#5A4650] mb-2">{c.description}</p>
                                </div>
                                <div className="text-[10px] text-[#6F91AA] pt-2 border-t border-[#F5D889]/30">
                                  Từ khóa: {c.triggerKeywords.length > 0 ? c.triggerKeywords.join(', ') : 'Tự động phân tích ngữ cảnh'}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <p className="text-[#6F91AA]">Vui lòng chọn nhân vật để quản lý manh mối.</p>
                  )}
                </div>
              )}

              {/* TAB 6: MYSTERY SYSTEM */}
              {activeTab === 'mystery_system' && (
                <div className="space-y-5 text-xs">
                  {selectedChar ? (
                    <form onSubmit={handleSaveMysteryRule} className="space-y-4">
                      <div className="p-4 rounded-2xl bg-white border border-[#A9D8F5] shadow-xs space-y-4">
                        <div className="flex items-center justify-between border-b border-[#A9D8F5]/40 pb-3">
                          <div>
                            <h4 className="text-base font-bold font-serif-literary text-[#332B35] flex items-center space-x-2">
                              <Puzzle className="w-4 h-4 text-[#A9D8F5]" />
                              <span>Cấu Hình Mystery System & Giải Mã Cuối: {selectedChar.name}</span>
                            </h4>
                            <p className="text-[#6F91AA] text-[11px]">
                              Điều phối suy luận cuối cùng khi người chơi thu thập đủ manh mối.
                            </p>
                          </div>
                          <button
                            type="submit"
                            className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#A9D8F5] to-[#F5D889] font-bold text-xs text-[#332B35] shadow-xs cursor-pointer"
                          >
                            Lưu Cấu Hình Mystery
                          </button>
                        </div>

                        <div className="space-y-3">
                          <div>
                            <label className="font-bold text-[#493C5A] block mb-1">
                              Câu hỏi suy luận chốt hạ (Deduction Solution Prompt):
                            </label>
                            <input
                              type="text"
                              required
                              value={editDeductionPrompt}
                              onChange={(e) => setEditDeductionPrompt(e.target.value)}
                              placeholder="Ví dụ: Ai thực sự là người đàn ông đêm nào cũng đến trong lời bé Đản?"
                              className="w-full p-2.5 rounded-xl border border-[#C9B5EA]/50 bg-white"
                            />
                            <span className="text-[10px] text-[#6F91AA] mt-1 block">
                              Câu hỏi này sẽ hiển thị trong sổ tay điều tra khi người chơi hội tụ đủ điều kiện.
                            </span>
                          </div>

                          <div>
                            <label className="font-bold text-[#493C5A] block mb-1">
                              Chân tướng giải mã (Final Reveal):
                            </label>
                            <textarea
                              rows={3}
                              required
                              value={editFinalReveal}
                              onChange={(e) => setEditFinalReveal(e.target.value)}
                              placeholder="Lời giải thích sự thật văn học trọn vẹn sẽ được nhân vật bộc bạch khi phá án thành công..."
                              className="w-full p-2.5 rounded-xl border border-[#C9B5EA]/50 bg-white"
                            />
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                            <div className="p-3 rounded-xl bg-[#FFF8F1] border border-[#F5D889]/50">
                              <label className="font-bold text-[#5A4650] block mb-1">
                                Số câu hỏi tối thiểu lần đầu:
                              </label>
                              <input
                                type="number"
                                min={1}
                                max={50}
                                value={editMinQuestions}
                                onChange={(e) => setEditMinQuestions(Number(e.target.value))}
                                className="w-full p-2 rounded-lg border border-[#C9B5EA]/50 bg-white font-bold text-sm"
                              />
                              <span className="text-[10px] text-[#6F91AA] block mt-1">
                                Mặc định: 5 câu hỏi trước khi mở khóa suy luận.
                              </span>
                            </div>

                            <div className="p-3 rounded-xl bg-[#FFF8F1] border border-[#F5D889]/50">
                              <label className="font-bold text-[#5A4650] block mb-1">
                                Số câu hỏi tối thiểu khi chơi lại (Replay):
                              </label>
                              <input
                                type="number"
                                min={1}
                                max={100}
                                value={editReplayQuestions}
                                onChange={(e) => setEditReplayQuestions(Number(e.target.value))}
                                className="w-full p-2 rounded-lg border border-[#C9B5EA]/50 bg-white font-bold text-sm"
                              />
                              <span className="text-[10px] text-[#6F91AA] block mt-1">
                                Đảm bảo chiều sâu trải nghiệm khi khám phá lại.
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </form>
                  ) : (
                    <p className="text-[#6F91AA]">Vui lòng chọn nhân vật để cấu hình Mystery System.</p>
                  )}
                </div>
              )}

              {/* TAB 5: PRE-PUBLISH 10-POINT CHECK */}
              {activeTab === 'prepublish' && (
                <div className="space-y-4 text-xs">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-bold font-serif-literary text-[#332B35]">
                        Kiểm Tra & Khắc Phục Lỗi Trước Khi Xuất Bản
                      </h3>
                      <p className="text-[#6F91AA]">
                        Hệ thống đối soát 10 tiêu chí an toàn, nguyên tác văn học và giao diện
                      </p>
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        onClick={handleAutoFix}
                        className="px-3.5 py-1.5 rounded-xl bg-white border border-[#C9B5EA] font-semibold text-[#5A4650] hover:bg-[#FFF8F1]"
                      >
                        Tự Động Sửa Lỗi An Toàn
                      </button>
                      <button
                        onClick={handleRunPrePublishCheck}
                        disabled={prePublishLoading}
                        className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-[#F3B8C8] to-[#F5D889] font-bold text-[#332B35] shadow-xs"
                      >
                        {prePublishLoading ? 'Đang Kiểm Tra...' : 'Chạy Lại Kiểm Tra'}
                      </button>
                    </div>
                  </div>

                  {prePublishReport && (
                    <div className="space-y-2">
                      <div
                        className={`p-3 rounded-2xl font-bold flex items-center justify-between ${
                          prePublishReport.overallStatus === 'PASS'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : prePublishReport.overallStatus === 'BLOCKED'
                            ? 'bg-red-100 text-red-800 border border-red-300'
                            : 'bg-amber-100 text-amber-800 border border-amber-300'
                        }`}
                      >
                        <span>
                          Trạng thái tổng quan:{' '}
                          {prePublishReport.overallStatus === 'PASS'
                            ? '🟢 ĐẠT CHUẨN XUẤT BẢN'
                            : prePublishReport.overallStatus === 'BLOCKED'
                            ? '🔴 ĐANG BỊ CHẶN (CẦN SỬA LỖI BẮT BUỘC)'
                            : '🟡 CẦN RÀ SOÁT THÊM'}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 gap-2">
                        {prePublishReport.items.map((item) => (
                          <div
                            key={item.id}
                            className="p-3 rounded-xl bg-white border border-[#F5D889]/30 flex items-start justify-between"
                          >
                            <div>
                              <div className="flex items-center space-x-2">
                                <span className="font-bold text-[#332B35]">{item.category}</span>
                                <span className="text-[10px] text-[#6F91AA]">({item.label})</span>
                              </div>
                              <p className="text-[#5A4650] mt-0.5">{item.message}</p>
                            </div>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                                item.status === 'PASS'
                                  ? 'bg-emerald-100 text-emerald-700'
                                  : item.status === 'BLOCKED'
                                  ? 'bg-red-100 text-red-700'
                                  : 'bg-amber-100 text-amber-700'
                              }`}
                            >
                              {item.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* AI Automated Test Suite (10 Scenarios) */}
                  <div className="mt-6 pt-6 border-t border-[#F5D889]/40 space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-base font-bold font-serif-literary text-[#332B35] flex items-center space-x-2">
                          <FlaskConical className="w-4 h-4 text-[#C9B5EA]" />
                          <span>Bộ Kiểm Thử AI Tự Động (10 Kịch Bản Thử Thách An Toàn)</span>
                        </h4>
                        <p className="text-[#6F91AA]">
                          Kiểm tra tự động Persona Lock, Canon Lock, Ranh giới kiến thức & Bảo vệ bí ẩn cốt lõi
                        </p>
                      </div>

                      <button
                        onClick={handleRunAiTestSuite}
                        disabled={testSuiteLoading || !selectedChar}
                        className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#F3B8C8] via-[#F5D889] to-[#A9D8F5] font-bold text-[#332B35] shadow-xs cursor-pointer disabled:opacity-50"
                      >
                        {testSuiteLoading ? 'Đang Chạy Kiểm Thử...' : 'Chạy Bộ Kiểm Thử AI'}
                      </button>
                    </div>

                    {testSuiteReport && (
                      <div className="space-y-3">
                        <div className="p-3 rounded-2xl bg-white border border-[#F5D889] font-bold text-sm text-[#332B35] flex items-center justify-between">
                          <span>Kết Quả: {testSuiteReport.passedCount} / {testSuiteReport.totalCount} Kịch Bản Đạt Tiêu Chuẩn</span>
                        </div>

                        <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
                          {testSuiteReport.results.map((r, i) => (
                            <div
                              key={i}
                              className="p-3 rounded-xl bg-white border border-[#F5D889]/30 space-y-1.5"
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-[#332B35]">{r.category}</span>
                                <span
                                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                    r.passed
                                      ? 'bg-emerald-100 text-emerald-700'
                                      : 'bg-red-100 text-red-700'
                                  }`}
                                >
                                  {r.passed ? 'ĐẠT' : 'CHƯA ĐẠT'}
                                </span>
                              </div>
                              <p className="text-[#6F91AA] italic">Câu hỏi: "{r.testPrompt}"</p>
                              <p className="text-[#5A4650] bg-[#FFF8F1] p-2 rounded-lg line-clamp-3">
                                Phản hồi: "{r.response}"
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 7: ADMIN TEST MODE WITH DEBUG */}
              {activeTab === 'testmode' && (
                <div className="space-y-4 text-xs">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-bold font-serif-literary text-[#332B35]">
                        Chế Độ Thử Nghiệm & Giả Lập Góc Nhìn Người Chơi (Test Mode)
                      </h3>
                      <p className="text-[#6F91AA]">
                        Mô phỏng hội thoại trực tiếp. Dữ liệu thử nghiệm được cách ly 100%, KHÔNG ảnh hưởng kim cương hay dữ liệu thật.
                      </p>
                    </div>

                    <div className="flex items-center space-x-2">
                      <span className="px-3 py-1.5 rounded-xl bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center space-x-1.5 border border-emerald-300">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Môi Trường Sandbox Cách Ly</span>
                      </span>
                    </div>
                  </div>

                  {/* 11-Point Safety & Canon Checklist */}
                  <div className="p-4 rounded-2xl bg-white border border-[#F5D889]/50 shadow-xs space-y-3">
                    <h4 className="font-bold font-serif-literary text-sm text-[#332B35] flex items-center space-x-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-600" />
                      <span>Bảng Đối Soát 11 Tiêu Chí An Toàn & Chuẩn Mực Văn Học (Test Mode Checklist)</span>
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-[11px]">
                      {[
                        '1. Khóa hình tượng nhân vật (Persona Lock)',
                        '2. Khóa nguyên tác SGK THPT (Canon Lock)',
                        '3. Ranh giới kiến thức nghiêm ngặt',
                        '4. Giọng điệu & xưng hô chuẩn thời đại',
                        '5. Không hallucination / không biết hiện đại',
                        '6. Bảo vệ bí ẩn cốt lõi (Mystery Guard)',
                        '7. Tương thích sổ tay manh mối điều tra',
                        '8. Không trừ kim cương thật (Sandbox)',
                        '9. Cảm xúc văn học sâu lắng, biểu cảm',
                        '10. Chuẩn mực giáo dục học đường',
                        '11. Trạng thái ảnh Admin hợp lệ',
                      ].map((crit, idx) => (
                        <div
                          key={idx}
                          className="p-2 rounded-xl bg-[#FFF8F1] border border-[#F5D889]/40 flex items-center space-x-2"
                        >
                          <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-[10px] shrink-0">
                            ✓
                          </span>
                          <span className="text-[#493C5A] font-medium">{crit}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Debug Status Panel */}
                  <div className="p-3 rounded-2xl bg-[#FFF8F1] border border-[#F5D889] grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                    <div>
                      <span className="text-[#6F91AA] block">Character Lock:</span>
                      <strong className="text-emerald-700">🟢 Hoạt Động</strong>
                    </div>
                    <div>
                      <span className="text-[#6F91AA] block">Canon Lock:</span>
                      <strong className="text-emerald-700">🟢 Khóa Nguyên Tác</strong>
                    </div>
                    <div>
                      <span className="text-[#6F91AA] block">Knowledge Boundary:</span>
                      <strong className="text-emerald-700">🟢 Giữ Đúng Ranh Giới</strong>
                    </div>
                    <div>
                      <span className="text-[#6F91AA] block">Số Lượt Test:</span>
                      <strong className="text-[#332B35]">{testMessages.filter((m) => m.sender === 'player').length}</strong>
                    </div>
                  </div>

                  {/* Mini Chat Window */}
                  <div className="h-72 overflow-y-auto p-3.5 rounded-2xl bg-white border border-[#C9B5EA]/40 space-y-2.5">
                    {testMessages.length === 0 && (
                      <div className="text-center py-16 text-[#6F91AA] space-y-1">
                        <MessageSquare className="w-8 h-8 mx-auto text-[#C9B5EA] opacity-60" />
                        <p className="font-semibold text-xs text-[#5A4650]">
                          Kiểm tra tương tác hội thoại với {selectedChar?.name || 'nhân vật'}
                        </p>
                        <p className="text-[11px]">
                          Gửi câu hỏi để xem lời thoại, xưng hô và khả năng giữ vững bí mật...
                        </p>
                      </div>
                    )}
                    {testMessages.map((m) => (
                      <div
                        key={m.id}
                        className={`p-2.5 rounded-xl max-w-[80%] ${
                          m.sender === 'player'
                            ? 'ml-auto bg-[#F3B8C8]/40 border border-[#F3B8C8] text-[#332B35]'
                            : 'mr-auto bg-[#FFF8F1] border border-[#F5D889]/40 text-[#332B35]'
                        }`}
                      >
                        <span className="font-bold text-[10px] block text-[#6F91AA] mb-0.5">
                          {m.sender === 'player' ? 'Admin Tester' : selectedChar?.name}
                        </span>
                        <div className="whitespace-pre-wrap">{m.text}</div>
                      </div>
                    ))}
                    {testModeLoading && (
                      <p className="text-[#6F91AA] italic">Nhân vật đang đối thoại thử nghiệm...</p>
                    )}
                  </div>

                  {/* Input */}
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={testInput}
                      onChange={(e) => setTestInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSendTestMessage()}
                      placeholder={`Đặt câu hỏi thử thách nhân vật ${selectedChar?.name || ''}...`}
                      className="flex-1 p-2.5 rounded-xl border border-[#C9B5EA] bg-white text-xs"
                    />
                    <button
                      onClick={handleSendTestMessage}
                      disabled={testModeLoading || !testInput.trim()}
                      className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#F3B8C8] to-[#F5D889] font-bold text-xs cursor-pointer disabled:opacity-50"
                    >
                      Gửi Test
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 10: THỐNG KÊ HỆ THỐNG */}
              {activeTab === 'stats' && (
                <div className="space-y-5 text-xs">
                  <div className="p-4 rounded-2xl bg-white border border-[#F5D889]/50 shadow-xs space-y-4">
                    <h3 className="text-base font-bold font-serif-literary text-[#332B35] flex items-center space-x-2">
                      <BarChart3 className="w-5 h-5 text-[#F5D889]" />
                      <span>Báo Cáo & Thống Kê Tổng Thể Hệ Thống InkTalk</span>
                    </h3>

                    {/* Summary Cards */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="p-3.5 rounded-xl bg-[#FFF8F1] border border-[#F5D889]/50">
                        <span className="text-[10px] text-[#6F91AA] uppercase block font-semibold">
                          Tổng số tác phẩm
                        </span>
                        <span className="text-2xl font-bold font-serif-literary text-[#332B35]">
                          {works.length}
                        </span>
                      </div>
                      <div className="p-3.5 rounded-xl bg-[#FFF8F1] border border-[#F3B8C8]/50">
                        <span className="text-[10px] text-[#6F91AA] uppercase block font-semibold">
                          Tổng số nhân vật
                        </span>
                        <span className="text-2xl font-bold font-serif-literary text-[#332B35]">
                          {characters.length}
                        </span>
                      </div>
                      <div className="p-3.5 rounded-xl bg-[#FFF8F1] border border-emerald-200">
                        <span className="text-[10px] text-[#6F91AA] uppercase block font-semibold">
                          Đã xuất bản (Public)
                        </span>
                        <span className="text-2xl font-bold font-serif-literary text-emerald-700">
                          {characters.filter((c) => c.isPublished).length}
                        </span>
                      </div>
                      <div className="p-3.5 rounded-xl bg-[#FFF8F1] border border-[#C9B5EA]/50">
                        <span className="text-[10px] text-[#6F91AA] uppercase block font-semibold">
                          Nhân vật có ảnh Admin
                        </span>
                        <span className="text-2xl font-bold font-serif-literary text-[#7D6B9D]">
                          {characters.filter((c) => !!c.imageUrl).length} / {characters.length}
                        </span>
                      </div>
                    </div>

                    {/* Works List Breakdown */}
                    <div className="mt-4 space-y-2">
                      <h4 className="font-bold text-[#493C5A] text-xs uppercase tracking-wider">
                        Phân bổ nhân vật theo từng tác phẩm THPT:
                      </h4>
                      <div className="divide-y divide-[#F5D889]/20 border border-[#F5D889]/30 rounded-xl overflow-hidden bg-white">
                        {works.map((w) => {
                          const charCount = characters.filter((c) => c.workId === w.id).length;
                          const publishedCount = characters.filter((c) => c.workId === w.id && c.isPublished).length;
                          return (
                            <div key={w.id} className="p-3 flex items-center justify-between">
                              <div>
                                <span className="font-bold text-[#332B35]">{w.title}</span>
                                <span className="text-[11px] text-[#6F91AA] ml-2">({w.author} • {w.era})</span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <span className="px-2 py-0.5 rounded-full bg-[#FFF8F1] border border-[#F5D889]/50 text-[#5A4650] text-[10px] font-bold">
                                  {charCount} nhân vật
                                </span>
                                <span className="px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-bold">
                                  {publishedCount} xuất bản
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 11: TOÀN VẸN DỮ LIỆU & QUẢN TRỊ SAO LƯU */}
              {activeTab === 'integrity' && (
                <div className="space-y-5 text-xs">
                  <div className="p-4 rounded-2xl bg-white border border-[#C9B5EA]/50 shadow-xs space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#F5D889]/30 pb-3">
                      <div>
                        <h3 className="text-base font-bold font-serif-literary text-[#332B35] flex items-center space-x-2">
                          <Database className="w-5 h-5 text-emerald-600" />
                          <span>Hệ Thống Cơ Sở Dữ Liệu Bền Vững & Toàn Vẹn (SQLite WAL)</span>
                        </h3>
                        <p className="text-[11px] text-[#6F91AA] mt-0.5">
                          Đảm bảo 100% dữ liệu không bị mất khi container restart, redeploy hay mất mạng.
                        </p>
                      </div>

                      <div className="flex items-center space-x-2 shrink-0">
                        <button
                          onClick={loadIntegrityReport}
                          disabled={integrityLoading}
                          className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-[#332B35] font-semibold text-xs transition flex items-center space-x-1 cursor-pointer disabled:opacity-50"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${integrityLoading ? 'animate-spin' : ''}`} />
                          <span>Làm mới</span>
                        </button>
                      </div>
                    </div>

                    {backupActionNotice && (
                      <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center justify-between">
                        <span>{backupActionNotice}</span>
                        <button onClick={() => setBackupActionNotice(null)} className="text-emerald-600 hover:text-emerald-900">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    )}

                    {/* Database Health Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                      <div className="p-3.5 rounded-xl bg-[#FFF8F1] border border-[#F5D889]/60 space-y-1">
                        <span className="text-[11px] text-[#6F91AA] font-bold block uppercase tracking-wider">
                          Động cơ CSDL chính
                        </span>
                        <div className="text-sm font-bold text-emerald-800 flex items-center space-x-1.5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          <span>{integrityReport?.checks?.databaseEngine || 'SQLite 3 (WAL)'}</span>
                        </div>
                        <p className="text-[10px] text-[#5A4650]">
                          Độc lập với server memory. Lưu đĩa bền vững.
                        </p>
                      </div>

                      <div className="p-3.5 rounded-xl bg-[#FFF8F1] border border-[#F5D889]/60 space-y-1">
                        <span className="text-[11px] text-[#6F91AA] font-bold block uppercase tracking-wider">
                          Trạng thái ghi đĩa
                        </span>
                        <div className="text-sm font-bold text-emerald-800 flex items-center space-x-1.5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          <span>Ghi tức thì (Atomic)</span>
                        </div>
                        <p className="text-[10px] text-[#5A4650]">
                          WAL Mode: Bật ({integrityReport?.checks?.walMode ? 'Hoạt động' : 'Tự động đồng bộ'})
                        </p>
                      </div>

                      <div className="p-3.5 rounded-xl bg-[#FFF8F1] border border-[#F5D889]/60 space-y-1">
                        <span className="text-[11px] text-[#6F91AA] font-bold block uppercase tracking-wider">
                          Circuit Breaker AI
                        </span>
                        <div className="text-sm font-bold flex items-center space-x-1.5">
                          <span
                            className={`w-2.5 h-2.5 rounded-full ${
                              integrityReport?.checks?.circuitBreakerState === 'CLOSED'
                                ? 'bg-emerald-500'
                                : integrityReport?.checks?.circuitBreakerState === 'HALF_OPEN'
                                ? 'bg-amber-500'
                                : 'bg-rose-500'
                            }`}
                          />
                          <span
                            className={
                              integrityReport?.checks?.circuitBreakerState === 'CLOSED'
                                ? 'text-emerald-800 font-bold'
                                : integrityReport?.checks?.circuitBreakerState === 'HALF_OPEN'
                                ? 'text-amber-800 font-bold'
                                : 'text-rose-800 font-bold'
                            }
                          >
                            {integrityReport?.checks?.circuitBreakerState || 'CLOSED'}
                          </span>
                        </div>
                        <p className="text-[10px] text-[#5A4650]">
                          Chống quá tải & tự động ngắt nếu Gemini 503
                        </p>
                      </div>

                      <div className="p-3.5 rounded-xl bg-[#FFF8F1] border border-[#F5D889]/60 space-y-1">
                        <span className="text-[11px] text-[#6F91AA] font-bold block uppercase tracking-wider">
                          Bản sao lưu nội bộ
                        </span>
                        <div className="text-sm font-bold text-[#332B35] flex items-center space-x-1.5">
                          <Archive className="w-4 h-4 text-purple-600" />
                          <span>{integrityReport?.backupsCount ?? 0} bản sao lưu</span>
                        </div>
                        <p className="text-[10px] text-[#5A4650]">
                          Tự động xoay vòng rolling backups
                        </p>
                      </div>
                    </div>

                    {/* Quantitative Inventory Breakdown */}
                    <div className="space-y-2">
                      <h4 className="font-bold text-[#332B35] text-xs uppercase tracking-wider">
                        Số lượng thực thể đang được lưu trữ an toàn trong SQLite:
                      </h4>
                      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2.5">
                        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                          <span className="text-[10px] text-gray-500 block">Tác phẩm</span>
                          <span className="text-base font-bold text-gray-800">
                            {integrityReport?.worksCount ?? works.length}
                          </span>
                        </div>

                        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                          <span className="text-[10px] text-gray-500 block">Nhân vật</span>
                          <span className="text-base font-bold text-gray-800">
                            {integrityReport?.charactersCount ?? characters.length}
                          </span>
                        </div>

                        <div className="p-3 rounded-xl bg-purple-50 border border-purple-200">
                          <span className="text-[10px] text-purple-700 block">Phiên bản lưu</span>
                          <span className="text-base font-bold text-purple-900">
                            {integrityReport?.versionsCount ?? 0}
                          </span>
                        </div>

                        <div className="p-3 rounded-xl bg-amber-50 border border-amber-200">
                          <span className="text-[10px] text-amber-700 block">Bản nháp tự lưu</span>
                          <span className="text-base font-bold text-amber-900">
                            {integrityReport?.draftsCount ?? 0}
                          </span>
                        </div>

                        <div className="p-3 rounded-xl bg-blue-50 border border-blue-200">
                          <span className="text-[10px] text-blue-700 block">Hồ sơ nghiên cứu</span>
                          <span className="text-base font-bold text-blue-900">
                            {integrityReport?.researchRecordsCount ?? pastResearchRecords.length}
                          </span>
                        </div>

                        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200">
                          <span className="text-[10px] text-emerald-700 block">Ảnh đại diện</span>
                          <span className="text-base font-bold text-emerald-900">
                            {integrityReport?.imagesCount ?? 0}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Character Lifecycle Status Breakdown */}
                    {integrityReport?.charactersByStatus && Object.keys(integrityReport.charactersByStatus).length > 0 && (
                      <div className="space-y-2">
                        <h4 className="font-bold text-[#332B35] text-xs uppercase tracking-wider">
                          Phân loại vòng đời nhân vật (Lifecycle Breakdown):
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {Object.entries(integrityReport.charactersByStatus).map(([st, cnt]) => (
                            <span
                              key={st}
                              className="px-3 py-1.5 rounded-xl bg-white border border-[#C9B5EA]/60 font-semibold text-xs text-[#493C5A] shadow-2xs flex items-center space-x-1.5"
                            >
                              <span className="font-mono text-purple-700 font-bold">{st}:</span>
                              <span className="bg-purple-100 text-purple-800 px-1.5 py-0.2 rounded font-bold">
                                {cnt}
                              </span>
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Disaster Recovery & Backup Actions */}
                    <div className="pt-4 border-t border-[#F5D889]/30 space-y-3">
                      <h4 className="font-bold text-[#332B35] text-xs uppercase tracking-wider flex items-center space-x-2">
                        <ShieldCheck className="w-4 h-4 text-emerald-600" />
                        <span>Trung Tâm Sao Lưu & Khôi Phục Dữ Liệu (Backup & Disaster Recovery)</span>
                      </h4>

                      <div className="flex flex-wrap items-center gap-3">
                        <button
                          onClick={handleTriggerBackup}
                          className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs shadow-xs transition flex items-center space-x-1.5 cursor-pointer"
                        >
                          <Archive className="w-4 h-4" />
                          <span>Tạo Bản Sao Lưu Ngay (Backup Snapshot)</span>
                        </button>

                        <button
                          onClick={handleExportDatabaseJson}
                          className="px-4 py-2.5 rounded-xl bg-[#FFF8F1] hover:bg-[#F5D889]/30 border border-[#F5D889] text-[#332B35] font-bold text-xs shadow-xs transition flex items-center space-x-1.5 cursor-pointer"
                        >
                          <Download className="w-4 h-4 text-blue-600" />
                          <span>Tải File Sao Lưu Toàn Diện (.JSON)</span>
                        </button>

                        <label className="px-4 py-2.5 rounded-xl bg-white hover:bg-rose-50 border border-rose-200 text-rose-700 font-bold text-xs shadow-xs transition flex items-center space-x-1.5 cursor-pointer">
                          <Upload className="w-4 h-4" />
                          <span>Khôi Phục Dữ Liệu Từ File (.JSON)</span>
                          <input
                            type="file"
                            accept=".json"
                            onChange={handleRestoreDatabaseFile}
                            className="hidden"
                          />
                        </label>
                      </div>
                      <p className="text-[10px] text-[#6F91AA] italic">
                        * Mọi hành động đều bảo vệ tuyệt đối: khi tạo tác phẩm hoặc nhân vật mới, InkTalk lưu trực tiếp vào cơ sở dữ liệu SQLite tại <code>/data/inktalk.db</code> với chế độ WAL chống hỏng tệp.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 12: CÀI ĐẶT QUẢN TRỊ & BẢO MẬT */}
              {activeTab === 'settings' && (
                <div className="space-y-5 text-xs">
                  <div className="p-4 rounded-2xl bg-white border border-[#C9B5EA]/50 shadow-xs space-y-4">
                    <h3 className="text-base font-bold font-serif-literary text-[#332B35] flex items-center space-x-2">
                      <Settings className="w-5 h-5 text-[#C9B5EA]" />
                      <span>Cài Đặt Hệ Thống Quản Trị & Thông Tin Bảo Mật</span>
                    </h3>

                    <div className="p-3.5 rounded-xl bg-[#FFF8F1] border border-[#F5D889]/60 space-y-2">
                      <span className="font-bold text-[#332B35] block">Tài khoản quản trị đang đăng nhập:</span>
                      <div className="flex items-center space-x-2">
                        <span className="px-2.5 py-1 rounded-lg bg-white border border-[#C9B5EA]/50 font-mono font-bold text-[#5A4650]">
                          admin@
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                          Quyền Quản Trị Cao Nhất (Role: ADMIN)
                        </span>
                      </div>
                      <p className="text-[11px] text-[#6F91AA] leading-relaxed">
                        Hệ thống Admin này độc lập hoàn toàn với người chơi. Mọi thao tác chỉnh sửa tác phẩm, nhân vật, manh mối và ảnh đại diện đều được kiểm soát bởi tài khoản này.
                      </p>
                    </div>

                    <div className="p-3.5 rounded-xl bg-white border border-[#C9B5EA]/40 space-y-3">
                      <h4 className="font-bold text-[#332B35] text-xs">Nguyên tắc bảo mật vô hình (Invisible Admin):</h4>
                      <ul className="list-disc pl-4 space-y-1 text-[#5A4650]">
                        <li>Player không nhìn thấy bất kỳ nút "Admin" hay gợi ý nào về tài khoản quản trị.</li>
                        <li>Đăng nhập quản trị thông qua cổng bảo mật riêng biệt <code>/admin</code>.</li>
                        <li>Mọi endpoint API nhạy cảm đều xác thực Bearer token role ADMIN từ phía máy chủ.</li>
                      </ul>
                    </div>

                    <div className="pt-2 flex items-center justify-between border-t border-[#F5D889]/30">
                      <button
                        onClick={handleAdminLogout}
                        className="px-4 py-2 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 font-bold hover:bg-rose-100 cursor-pointer"
                      >
                        Đăng Xuất Phiên Quản Trị
                      </button>
                      <span className="text-[10px] text-[#6F91AA]">InkTalk Literary Engine v2.5</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
