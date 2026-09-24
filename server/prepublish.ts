import type {
  Character,
  Clue,
  MysteryRule,
  PrePublishReport,
  PrePublishItem,
  CheckStatus,
} from '../src/types.js';

export function runPrePublishSystemCheck(
  character: Character,
  clues: Clue[],
  mysteryRule?: MysteryRule
): PrePublishReport {
  const items: PrePublishItem[] = [];

  // A. Character Data
  if (
    character.name.trim() &&
    character.workTitle.trim() &&
    character.role.trim() &&
    character.personality.trim()
  ) {
    items.push({
      id: 'check_a',
      category: 'A. Dữ liệu nhân vật',
      label: 'Thông tin cơ bản của nhân vật',
      status: 'PASS',
      message: `Tên nhân vật "${character.name}", vai trò "${character.role}" và tính cách đã được điền đầy đủ.`,
    });
  } else {
    items.push({
      id: 'check_a',
      category: 'A. Dữ liệu nhân vật',
      label: 'Thông tin cơ bản của nhân vật',
      status: 'BLOCKED',
      message: 'Thiếu tên nhân vật, vai trò hoặc tính cách cốt lõi.',
    });
  }

  // B. Canon
  if (character.workAuthor.trim()) {
    items.push({
      id: 'check_b',
      category: 'B. Tác phẩm & Tác giả nguyên tác',
      label: 'Cơ sở nguyên tác văn học THPT',
      status: 'PASS',
      message: `Được liên kết với tác phẩm "${character.workTitle}" của tác giả ${character.workAuthor}.`,
    });
  } else {
    items.push({
      id: 'check_b',
      category: 'B. Tác phẩm & Tác giả nguyên tác',
      label: 'Cơ sở nguyên tác văn học THPT',
      status: 'NEED_REVIEW',
      message: 'Chưa xác nhận tác giả nguyên tác.',
    });
  }

  // C. Character Knowledge & Boundaries
  if (character.knowledgeBoundaries && character.knowledgeBoundaries.length > 0) {
    items.push({
      id: 'check_c',
      category: 'C. Giới hạn kiến thức (Knowledge Boundary)',
      label: 'Ranh giới những điều nhân vật không biết',
      status: 'PASS',
      message: `Đã thiết lập ${character.knowledgeBoundaries.length} giới hạn kiến thức để ngăn AI biết trước tương lai hoặc bí mật ngoài tầm nhìn.`,
    });
  } else {
    items.push({
      id: 'check_c',
      category: 'C. Giới hạn kiến thức (Knowledge Boundary)',
      label: 'Ranh giới những điều nhân vật không biết',
      status: 'WARNING',
      message: 'Chưa có ranh giới kiến thức rõ ràng. Nhân vật có nguy cơ trả lời vượt quá những gì họ chứng kiến.',
      canAutoFix: true,
    });
  }

  // D. Events & Voice
  if (character.voiceTone && character.pronouns) {
    items.push({
      id: 'check_d',
      category: 'D. Cách xưng hô & Ngữ điệu',
      label: 'Chuẩn mực xưng hô văn học',
      status: 'PASS',
      message: `Xưng hô chuẩn: "${character.pronouns}", ngữ điệu: "${character.voiceTone}".`,
    });
  } else {
    items.push({
      id: 'check_d',
      category: 'D. Cách xưng hô & Ngữ điệu',
      label: 'Chuẩn mực xưng hô văn học',
      status: 'NEED_REVIEW',
      message: 'Cần bổ sung cách xưng hô phù hợp bối cảnh lịch sử văn học.',
      canAutoFix: true,
    });
  }

  // E. Perspective
  if (character.perspective) {
    items.push({
      id: 'check_e',
      category: 'E. Góc nhìn nhân vật',
      label: 'Điểm nhìn chủ quan',
      status: 'PASS',
      message: 'Đã xác định góc nhìn nội tâm của nhân vật.',
    });
  } else {
    items.push({
      id: 'check_e',
      category: 'E. Góc nhìn nhân vật',
      label: 'Điểm nhìn chủ quan',
      status: 'WARNING',
      message: 'Nên bổ sung góc nhìn chủ quan để tăng tính cá nhân hóa trong hội thoại.',
    });
  }

  // F. Clues (Manh mối bí ẩn)
  if (clues && clues.length >= 2) {
    items.push({
      id: 'check_f',
      category: 'F. Hệ thống Manh mối (Clues)',
      label: 'Manh mối điều tra THPT',
      status: 'PASS',
      message: `Đã cấu hình ${clues.length} manh mối văn học gắn liền kịch bản.`,
    });
  } else {
    items.push({
      id: 'check_f',
      category: 'F. Hệ thống Manh mối (Clues)',
      label: 'Manh mối điều tra THPT',
      status: 'WARNING',
      message: 'Chưa đủ manh mối điều tra (tối thiểu 2 manh mối cho một tác phẩm).',
    });
  }

  // G. AI Response Logic & Mystery Rule
  if (mysteryRule?.deductionSolution?.finalReveal) {
    items.push({
      id: 'check_g',
      category: 'G. Logic Suy luận cuối (End Game)',
      label: 'Điểm suy luận và giải mã bi kịch',
      status: 'PASS',
      message: 'Đã có kịch bản phá đảo và phần thưởng kết thúc hành trình.',
    });
  } else {
    items.push({
      id: 'check_g',
      category: 'G. Logic Suy luận cuối (End Game)',
      label: 'Điểm suy luận và giải mã bi kịch',
      status: 'NEED_REVIEW',
      message: 'Chưa cấu hình điểm suy luận kết thúc câu chuyện.',
    });
  }

  // H. Image Upload (RULE 4: Ảnh nhân vật phải do ADMIN upload hoặc lựa chọn)
  if (character.imageUrl && character.imageUrl.trim().length > 0) {
    items.push({
      id: 'check_h',
      category: 'H. Hình ảnh nhân vật',
      label: 'Kiểm duyệt ảnh do Admin cung cấp',
      status: 'PASS',
      message: 'Admin đã tải lên và duyệt hình ảnh hợp lệ cho nhân vật.',
    });
  } else {
    items.push({
      id: 'check_h',
      category: 'H. Hình ảnh nhân vật',
      label: 'Kiểm duyệt ảnh do Admin cung cấp',
      status: 'WARNING',
      message: 'Chưa có ảnh nhân vật do Admin tải lên. Khi xuất bản, người chơi sẽ nhìn thấy ảnh minh họa mặc định. Bạn có thể bổ sung ảnh bất cứ lúc nào.',
      canAutoFix: false,
    });
  }

  // I. Database & IDs
  if (character.id && character.workId) {
    items.push({
      id: 'check_i',
      category: 'I. Toàn vẹn cơ sở dữ liệu',
      label: 'Mã định danh và liên kết quan hệ',
      status: 'PASS',
      message: 'Các khóa chính và khóa ngoại hệ thống chuẩn xác.',
    });
  } else {
    items.push({
      id: 'check_i',
      category: 'I. Toàn vẹn cơ sở dữ liệu',
      label: 'Mã định danh và liên kết quan hệ',
      status: 'BLOCKED',
      message: 'Lỗi liên kết cơ sở dữ liệu.',
    });
  }

  // J. UI & Text safety
  if (character.shortIntro && character.shortIntro.length < 300) {
    items.push({
      id: 'check_j',
      category: 'J. Thẩm mỹ giao diện & Trình bày',
      label: 'Độ dài đoạn giới thiệu và hiển thị thẻ',
      status: 'PASS',
      message: 'Đoạn giới thiệu ngắn gọn, phù hợp hiển thị trên di động và máy tính.',
    });
  } else {
    items.push({
      id: 'check_j',
      category: 'J. Thẩm mỹ giao diện & Trình bày',
      label: 'Độ dài đoạn giới thiệu và hiển thị thẻ',
      status: 'WARNING',
      message: 'Đoạn giới thiệu có thể quá dài hoặc chưa tối ưu thẻ bài.',
      canAutoFix: true,
    });
  }

  // Determine overall status
  let overallStatus: CheckStatus = 'PASS';
  if (items.some((i) => i.status === 'BLOCKED')) {
    overallStatus = 'BLOCKED';
  } else if (items.some((i) => i.status === 'NEED_REVIEW')) {
    overallStatus = 'NEED_REVIEW';
  } else if (items.some((i) => i.status === 'WARNING')) {
    overallStatus = 'WARNING';
  }

  return {
    overallStatus,
    items,
  };
}
