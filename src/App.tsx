import React, { useState, useEffect } from 'react';
import type { Character, GameSession, User, Clue } from './types';
import { SplashView } from './components/SplashView';
import { Navbar, NavTab } from './components/Navbar';
import { AuthModal } from './components/AuthModal';
import { CharacterLibrary } from './components/CharacterLibrary';
import { CharacterDetail } from './components/CharacterDetail';
import { ChatRoom } from './components/ChatRoom';
import { ClueNotebookModal } from './components/ClueNotebookModal';
import { ReadingJourneyView } from './components/ReadingJourneyView';
import { SearchView } from './components/SearchView';
import { AdminPortal } from './components/AdminPortal';
import {
  getPublishedCharacters,
  dailyCheckin,
  getChatSession,
  getAdminClues,
} from './services/api';
import { Sparkles } from 'lucide-react';

export function App() {
  // Path-based routing for dedicated /admin entry point
  const [currentPath, setCurrentPath] = useState(() => window.location.pathname);

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigate = (path: string) => {
    window.history.pushState({}, '', path);
    setCurrentPath(path);
  };

  // Navigation & View States for Player
  const [hasStarted, setHasStarted] = useState<boolean>(() => {
    return localStorage.getItem('inktalk_has_started') === 'true';
  });
  const [currentTab, setCurrentTab] = useState<NavTab>('library');
  const [activeView, setActiveView] = useState<'home' | 'detail' | 'chat'>('home');

  // Auth States
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('inktalk_user');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return null;
      }
    }
    return null;
  });
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [welcomeToast, setWelcomeToast] = useState<string | null>(null);

  // Characters & Selection
  const [characters, setCharacters] = useState<Character[]>([]);
  const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(null);

  // Session & Notebook States
  const [activeSession, setActiveSession] = useState<GameSession | null>(null);
  const [showNotebookModal, setShowNotebookModal] = useState(false);
  const [currentClues, setCurrentClues] = useState<Clue[]>([]);
  const [totalCluesCount, setTotalCluesCount] = useState(0);

  // Load published characters
  const loadCharacters = async () => {
    try {
      const data = await getPublishedCharacters();
      setCharacters(data);
    } catch (err) {
      console.error('Failed to load published characters:', err);
    }
  };

  useEffect(() => {
    loadCharacters();
  }, [currentPath]);

  // Load active session clues when character is selected
  const refreshSessionData = async () => {
    if (!currentUser || !selectedCharacter) return;
    try {
      const data = await getChatSession(currentUser.id, selectedCharacter.id);
      setActiveSession(data.session);
      setCurrentClues(data.unlockedClues || []);
      setTotalCluesCount(data.totalCluesCount || 0);
    } catch (err) {
      console.error('Failed to load session details:', err);
    }
  };

  useEffect(() => {
    if (selectedCharacter && currentUser) {
      refreshSessionData();
    }
  }, [selectedCharacter, currentUser]);

  // Auth Handlers
  const handleAuthSuccess = (user: User, isNewRegistration?: boolean) => {
    const cleanUser = { ...user, role: 'PLAYER' as const };
    setCurrentUser(cleanUser);
    localStorage.setItem('inktalk_user', JSON.stringify(cleanUser));
    setHasStarted(true);
    localStorage.setItem('inktalk_has_started', 'true');
    setActiveView('home');

    if (isNewRegistration) {
      setWelcomeToast('Chào mừng bạn đến với InkTalk! Bạn đã nhận được +500 💎 quà khởi đầu.');
    } else {
      setWelcomeToast(`Chào mừng bạn quay lại, ${cleanUser.username}!`);
    }
  };

  // Player Logout Handler (Requirement 1 & 8)
  const handleLogout = () => {
    // Clear Player session / token from browser
    setCurrentUser(null);
    localStorage.removeItem('inktalk_user');
    localStorage.removeItem('inktalk_has_started');
    // Return to Splash Screen without auto-login
    setHasStarted(false);
    setActiveView('home');
    setSelectedCharacter(null);
    setCurrentTab('library');
    setWelcomeToast('Bạn đã đăng xuất thành công.');
  };

  const handleUpdateUserDiamonds = (newDiamonds: number) => {
    if (!currentUser) return;
    const updated = { ...currentUser, diamonds: newDiamonds };
    setCurrentUser(updated);
    localStorage.setItem('inktalk_user', JSON.stringify(updated));
  };

  const handleDailyCheckin = async () => {
    if (!currentUser) {
      setShowAuthModal(true);
      return;
    }
    try {
      const result = await dailyCheckin(currentUser.id);
      if (result.diamondsAdded > 0) {
        setWelcomeToast(`✨ Điểm danh hằng ngày thành công! Bạn nhận được +${result.diamondsAdded} 💎.`);
        setCurrentUser(result.user);
        localStorage.setItem('inktalk_user', JSON.stringify(result.user));
      } else {
        setWelcomeToast('Hôm nay bạn đã hoàn thành điểm danh rồi. Hãy quay lại vào ngày mai nhé!');
      }
    } catch (err: any) {
      setWelcomeToast(err?.message || 'Không thể điểm danh lúc này.');
    }
  };

  // View Navigation Handlers
  const handleStartFromSplash = () => {
    if (currentUser) {
      setHasStarted(true);
      localStorage.setItem('inktalk_has_started', 'true');
      setActiveView('home');
    } else {
      setShowAuthModal(true);
    }
  };

  const handleSelectCharacter = (char: Character) => {
    setSelectedCharacter(char);
    setActiveView('detail');
  };

  const handleStartChat = () => {
    if (!currentUser) {
      setShowAuthModal(true);
      return;
    }
    setActiveView('chat');
  };

  const handleSelectNavTab = (tab: NavTab) => {
    setCurrentTab(tab);
    if (tab === 'library') {
      setActiveView('home');
      setSelectedCharacter(null);
    } else if (tab === 'clues') {
      if (!currentUser) {
        setShowAuthModal(true);
        return;
      }
      if (selectedCharacter) {
        setShowNotebookModal(true);
      } else if (characters.length > 0) {
        setSelectedCharacter(characters[0]);
        setShowNotebookModal(true);
      } else {
        setWelcomeToast('Chưa có nhân vật nào trong thư viện để mở sổ manh mối.');
      }
    }
  };

  // ----------------------------------------------------
  // PRIVATE ADMIN ROUTING (/admin, /admin/*)
  // ----------------------------------------------------
  if (currentPath.startsWith('/admin')) {
    const rawSub = currentPath.replace(/^\/admin\/?/, '').split('/')[0];
    const subroute = rawSub || 'dashboard';

    return (
      <AdminPortal
        isStandalone={true}
        subroute={subroute}
        onSubrouteChange={(newSub) => {
          const target = newSub ? `/admin/${newSub}` : '/admin';
          navigate(target);
        }}
        onNavigateToPublic={() => navigate('/')}
        onRefreshPublicData={loadCharacters}
      />
    );
  }

  // ----------------------------------------------------
  // PLAYER FLOW: Splash Screen if not yet started
  // ----------------------------------------------------
  if (!hasStarted) {
    return (
      <>
        <SplashView onStart={handleStartFromSplash} />
        <AuthModal
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
          onSuccess={handleAuthSuccess}
        />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-[#FFF8F1] text-[#332B35] flex flex-col justify-between selection:bg-[#F3B8C8] selection:text-[#332B35]">
      {/* Top Navigation - Strictly Player UI without any Admin shortcuts */}
      <Navbar
        currentTab={currentTab}
        onSelectTab={handleSelectNavTab}
        user={currentUser}
        onOpenAuth={() => setShowAuthModal(true)}
        onLogout={handleLogout}
        onDailyCheckin={handleDailyCheckin}
        hideMobileNav={activeView === 'chat'}
      />

      {/* Floating Welcome Toast */}
      {welcomeToast && (
        <div className="sticky top-20 z-40 max-w-xl mx-auto px-4 mt-2 animate-fade-in">
          <div className="p-3 rounded-2xl bg-gradient-to-r from-[#F3B8C8] via-[#F5D889] to-[#A9D8F5] p-0.5 shadow-md">
            <div className="bg-[#FFFCFA] px-4 py-2 rounded-[14px] flex items-center justify-between text-xs text-[#332B35]">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-[#F5D889] shrink-0" />
                <span>{welcomeToast}</span>
              </div>
              <button
                onClick={() => setWelcomeToast(null)}
                className="ml-3 font-bold text-[#6F91AA] hover:text-[#332B35] cursor-pointer"
              >
                ✕
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Router */}
      <main className="flex-1">
        {currentTab === 'library' && (
          <>
            {activeView === 'home' && (
              <CharacterLibrary
                characters={characters}
                onSelectCharacter={handleSelectCharacter}
              />
            )}

            {activeView === 'detail' && selectedCharacter && (
              <CharacterDetail
                character={selectedCharacter}
                onBack={() => {
                  setActiveView('home');
                  setSelectedCharacter(null);
                }}
                onStartChat={handleStartChat}
              />
            )}

            {activeView === 'chat' && selectedCharacter && currentUser && (
              <ChatRoom
                character={selectedCharacter}
                user={currentUser}
                onBack={() => setActiveView('detail')}
                onOpenNotebook={() => setShowNotebookModal(true)}
                onUpdateUserDiamonds={handleUpdateUserDiamonds}
              />
            )}
          </>
        )}

        {currentTab === 'search' && (
          <SearchView
            characters={characters}
            onSelectCharacter={(char) => {
              setSelectedCharacter(char);
              setCurrentTab('library');
              setActiveView('detail');
            }}
          />
        )}

        {(currentTab === 'profile' || currentTab === 'achievements') && (
          currentUser ? (
            <ReadingJourneyView
              user={currentUser}
              onUpdateUser={(updated) => {
                setCurrentUser(updated);
                localStorage.setItem('inktalk_user', JSON.stringify(updated));
              }}
              onLogout={handleLogout}
            />
          ) : (
            <div className="max-w-md mx-auto my-20 p-8 rounded-3xl bg-[#FFFCFA] border border-[#F5D889] text-center paper-texture shadow-xs">
              <h3 className="text-xl font-bold font-serif-literary text-[#332B35] mb-2">
                Vui lòng đăng nhập
              </h3>
              <p className="text-xs text-[#6F91AA] mb-6">
                Đăng nhập hoặc đăng ký để lưu lại Hành Trình Đọc và danh hiệu của bạn.
              </p>
              <button
                onClick={() => setShowAuthModal(true)}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#F3B8C8] to-[#F5D889] font-bold text-xs text-[#332B35] shadow-xs cursor-pointer"
              >
                Đăng Nhập / Đăng Ký
              </button>
            </div>
          )
        )}
      </main>

      {/* Clue Notebook Modal */}
      {selectedCharacter && currentUser && (
        <ClueNotebookModal
          isOpen={showNotebookModal}
          onClose={() => setShowNotebookModal(false)}
          user={currentUser}
          characterId={selectedCharacter.id}
          characterName={selectedCharacter.name}
          session={activeSession}
          unlockedClues={currentClues}
          totalCluesCount={totalCluesCount}
          onSessionUpdated={refreshSessionData}
          onUpdateUserDiamonds={handleUpdateUserDiamonds}
        />
      )}

      {/* Auth Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSuccess={handleAuthSuccess}
      />

      {/* Footer */}
      {activeView !== 'chat' && (
        <footer className="border-t border-[#F5D889]/30 py-6 text-center text-xs text-[#6F91AA] bg-[#FFF8F1]">
          <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
            <p>© 2026 InkTalk — Văn học & Manh mối THPT. Khám phá tác phẩm qua lăng kính đối thoại.</p>
            <div className="flex items-center space-x-3 text-[11px]">
              <span>Chương trình Ngữ văn THPT</span>
              <span>•</span>
              <span>Khóa vai nhân vật</span>
            </div>
          </div>
        </footer>
      )}
    </div>
  );
}
export default App;
