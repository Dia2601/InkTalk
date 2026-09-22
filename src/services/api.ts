import type {
  User,
  Work,
  Character,
  Clue,
  MysteryRule,
  ChatMessage,
  ReadingJourney,
  PrePublishReport,
  AiTestSuiteReport,
} from '../types';

const BASE_URL = '/api';

export async function registerPlayer(username: string, password: string, confirmPassword: string) {
  const res = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password, confirmPassword }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Đăng ký thất bại.');
  return data;
}

export async function loginPlayer(username: string, password: string) {
  const res = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Đăng nhập thất bại.');
  return data;
}

export async function dailyCheckin(userId: string) {
  const res = await fetch(`${BASE_URL}/auth/daily-checkin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Điểm danh thất bại.');
  return data;
}

export async function getWorks(): Promise<Work[]> {
  const res = await fetch(`${BASE_URL}/works`);
  if (!res.ok) return [];
  return res.json();
}

export async function getPublishedCharacters(): Promise<Character[]> {
  const res = await fetch(`${BASE_URL}/characters`);
  if (!res.ok) return [];
  return res.json();
}

export async function getCharacterById(id: string): Promise<Character | null> {
  const res = await fetch(`${BASE_URL}/characters/${id}`);
  if (!res.ok) return null;
  return res.json();
}

export async function getChatSession(userId: string, characterId: string) {
  const res = await fetch(`${BASE_URL}/chat/session/${userId}/${characterId}`);
  if (!res.ok) throw new Error('Không thể tải phiên trò chuyện.');
  return res.json();
}

export async function sendChatMessage(
  userId: string,
  characterId: string,
  messageText: string,
  isTestMode = false
) {
  const res = await fetch(`${BASE_URL}/chat/send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, characterId, messageText, isTestMode }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Có vẻ trang sách này vừa bị gián đoạn. Hãy thử gửi lại câu hỏi.');
  }
  return data;
}

export async function testClueConnection(sessionId: string, selectedClueIds: string[]) {
  const res = await fetch(`${BASE_URL}/mystery/test-connection`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId, selectedClueIds }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Thử nghiệm liên kết thất bại.');
  return data;
}

export async function submitDeduction(
  sessionId: string,
  selectedClueIds: string[],
  explanationText = ''
) {
  const res = await fetch(`${BASE_URL}/mystery/deduce`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId, selectedClueIds, explanationText }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Suy luận thất bại.');
  return data;
}

export async function replayMystery(userId: string, characterId: string) {
  const res = await fetch(`${BASE_URL}/mystery/replay`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, characterId }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Không thể chơi lại.');
  return data;
}

export async function getPlayerJourney(userId: string): Promise<ReadingJourney | null> {
  const res = await fetch(`${BASE_URL}/player/journey/${userId}`);
  if (!res.ok) return null;
  return res.json();
}

// ------------------------------------
// ADMIN API
// ------------------------------------
export async function adminLogin(password: string, username: string = 'admin@') {
  const res = await fetch(`${BASE_URL}/auth/admin-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Đăng nhập quản trị thất bại.');
  return data;
}

export async function verifyAdminToken(token: string): Promise<boolean> {
  try {
    const res = await fetch(`${BASE_URL}/admin/verify`, {
      headers: adminHeaders(token),
    });
    return res.ok;
  } catch {
    return false;
  }
}

function adminHeaders(token: string) {
  return {
    'Content-Type': 'application/json',
    'x-admin-token': token,
  };
}

export async function getAdminCharacters(token: string): Promise<Character[]> {
  const res = await fetch(`${BASE_URL}/admin/characters`, {
    headers: adminHeaders(token),
  });
  if (!res.ok) return [];
  return res.json();
}

export async function createAdminWork(token: string, work: Partial<Work>) {
  const res = await fetch(`${BASE_URL}/admin/works`, {
    method: 'POST',
    headers: adminHeaders(token),
    body: JSON.stringify(work),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Không thể tạo tác phẩm.');
  return data;
}

export async function deleteAdminWork(token: string, id: string) {
  const res = await fetch(`${BASE_URL}/admin/works/${id}`, {
    method: 'DELETE',
    headers: adminHeaders(token),
  });
  return res.json();
}

export async function createAdminCharacter(token: string, char: Partial<Character>) {
  const res = await fetch(`${BASE_URL}/admin/characters`, {
    method: 'POST',
    headers: adminHeaders(token),
    body: JSON.stringify(char),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Không thể tạo nhân vật.');
  return data;
}

export async function updateAdminCharacter(token: string, id: string, updates: Partial<Character>) {
  const res = await fetch(`${BASE_URL}/admin/characters/${id}`, {
    method: 'PUT',
    headers: adminHeaders(token),
    body: JSON.stringify(updates),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Không thể cập nhật nhân vật.');
  return data;
}

export async function deleteAdminCharacter(token: string, id: string) {
  const res = await fetch(`${BASE_URL}/admin/characters/${id}`, {
    method: 'DELETE',
    headers: adminHeaders(token),
  });
  return res.json();
}

export async function uploadCharacterImage(token: string, characterId: string, imageDataUrl: string) {
  const res = await fetch(`${BASE_URL}/admin/characters/${characterId}/upload-image`, {
    method: 'POST',
    headers: adminHeaders(token),
    body: JSON.stringify({ imageDataUrl }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Upload ảnh thất bại.');
  return data;
}

export async function runAiResearch(
  token: string,
  workTitle: string,
  author: string,
  excerpt?: string
) {
  const res = await fetch(`${BASE_URL}/admin/ai-research`, {
    method: 'POST',
    headers: adminHeaders(token),
    body: JSON.stringify({ workTitle, author, excerpt }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Nghiên cứu văn học AI thất bại.');
  return data;
}

export async function runPrePublishCheck(
  token: string,
  characterId: string
): Promise<PrePublishReport> {
  const res = await fetch(`${BASE_URL}/admin/pre-publish-check/${characterId}`, {
    method: 'POST',
    headers: adminHeaders(token),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Kiểm tra trước xuất bản thất bại.');
  return data;
}

export async function autoFixCharacter(token: string, characterId: string) {
  const res = await fetch(`${BASE_URL}/admin/auto-fix/${characterId}`, {
    method: 'POST',
    headers: adminHeaders(token),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Tự động sửa lỗi thất bại.');
  return data;
}

export async function runAiTestSuiteOnChar(
  token: string,
  characterId: string
): Promise<AiTestSuiteReport> {
  const res = await fetch(`${BASE_URL}/admin/ai-test-suite/${characterId}`, {
    method: 'POST',
    headers: adminHeaders(token),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Chạy bộ kiểm thử AI thất bại.');
  return data;
}

export async function saveAdminClues(token: string, characterId: string, clues: Clue[]) {
  const res = await fetch(`${BASE_URL}/admin/clues/${characterId}`, {
    method: 'POST',
    headers: adminHeaders(token),
    body: JSON.stringify({ clues }),
  });
  return res.json();
}

export async function getAdminClues(token: string, characterId: string): Promise<Clue[]> {
  const res = await fetch(`${BASE_URL}/admin/clues/${characterId}`, {
    headers: adminHeaders(token),
  });
  if (!res.ok) return [];
  return res.json();
}

export async function saveAdminMysteryRule(
  token: string,
  characterId: string,
  rule: MysteryRule
) {
  const res = await fetch(`${BASE_URL}/admin/mystery-rules/${characterId}`, {
    method: 'POST',
    headers: adminHeaders(token),
    body: JSON.stringify({ rule }),
  });
  return res.json();
}

export async function getAdminMysteryRule(
  token: string,
  characterId: string
): Promise<MysteryRule | null> {
  const res = await fetch(`${BASE_URL}/admin/mystery-rules/${characterId}`, {
    headers: adminHeaders(token),
  });
  if (!res.ok) return null;
  return res.json();
}
