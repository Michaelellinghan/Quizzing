/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useQuizSync } from './services/quizSync';
import { TVView } from './components/TVView';
import { HostView } from './components/HostView';
import { PlayerView } from './components/PlayerView';
import { RoleSelectModal } from './components/RoleSelectModal';
import { AIChatModal } from './components/AIChatModal';
import { QuizStudioModal } from './components/QuizStudioModal';

export default function App() {
  const queryParams = new URLSearchParams(window.location.search);
  const urlRoom = queryParams.get('room');
  const urlRole = queryParams.get('role') as 'tv' | 'host' | 'player' | null;

  const [roomCode, setRoomCode] = useState<string>(() => {
    return (urlRoom || localStorage.getItem('quizcast_room') || 'QUIZ').trim().toUpperCase();
  });

  // If a user scans a QR code (?room=XXXX), default them to 'player' and lock them there
  const [role, setRole] = useState<'tv' | 'host' | 'player' | null>(() => {
    if (urlRole && ['tv', 'host', 'player'].includes(urlRole)) {
      return urlRole;
    }
    if (urlRoom) {
      return 'player';
    }
    const saved = localStorage.getItem('quizcast_role');
    return (saved as any) || null;
  });

  const [playerId] = useState<string>(() => {
    let id = localStorage.getItem('quizcast_player_id');
    if (!id) {
      id = `p_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      localStorage.setItem('quizcast_player_id', id);
    }
    return id;
  });

  const [playerName, setPlayerName] = useState<string>(() => {
    return localStorage.getItem('quizcast_player_name') || '';
  });

  const [isAIChatOpen, setIsAIChatOpen] = useState<boolean>(false);
  const [isQuizStudioOpen, setIsQuizStudioOpen] = useState<boolean>(false);

  // Screen Wake Lock so phones don't sleep during a game
  useEffect(() => {
    let wakeLock: any = null;
    const requestWakeLock = async () => {
      if ('wakeLock' in navigator && document.visibilityState === 'visible') {
        try {
          wakeLock = await (navigator as any).wakeLock.request('screen');
        } catch (e) {}
      }
    };
    requestWakeLock();
    document.addEventListener('visibilitychange', requestWakeLock);
    return () => {
      document.removeEventListener('visibilitychange', requestWakeLock);
      if (wakeLock) wakeLock.release().catch(() => {});
    };
  }, []);

  const {
    room,
    connected,
    latencyMs,
    buzzIn,
    submitAnswer,
    setPhase,
    toggleLock,
    changeQuestion,
    resetBuzzes,
    adjudicate,
    adjustScore,
    updateQuestions,
    addQuestion,
    editQuestion,
    deleteQuestion,
    triggerSound,
    kickPlayer,
    updatePlayerName,
    startTimer,
    pauseTimer,
    resetTimer,
    setTimerDuration,
    toggleAutoLock,
    triggerSabotage,
    clearSabotage,
    revealNextClue,
    toggleBluffMode,
    setBluffPhase,
    submitBluff,
    voteBluff
  } = useQuizSync({
    roomCode,
    role,
    playerId,
    playerName
  });

  const handleLaunchRole = (
    selectedRole: 'tv' | 'host' | 'player',
    newRoomCode: string,
    newPlayerName?: string
  ) => {
    const cleanCode = newRoomCode.trim().toUpperCase() || 'QUIZ';
    setRoomCode(cleanCode);
    setRole(selectedRole);
    localStorage.setItem('quizcast_room', cleanCode);
    localStorage.setItem('quizcast_role', selectedRole);

    if (newPlayerName !== undefined) {
      setPlayerName(newPlayerName);
      localStorage.setItem('quizcast_player_name', newPlayerName);
    }

    const newUrl = new URL(window.location.href);
    newUrl.searchParams.set('room', cleanCode);
    newUrl.searchParams.set('role', selectedRole);
    window.history.replaceState({}, '', newUrl.toString());
  };

  const handleSwitchRole = () => {
    // Players are not permitted to switch roles to Host or TV
    if (role === 'player') return;
    setRole(null);
    localStorage.removeItem('quizcast_role');
    const newUrl = new URL(window.location.href);
    newUrl.searchParams.delete('role');
    window.history.replaceState({}, '', newUrl.toString());
  };

  const activeQ = room?.questions[room.currentQIndex];

  // 1. TV Display
  if (role === 'tv') {
    return (
      <div id="tv-viewport-container" className="h-[100dvh] w-screen overflow-hidden bg-[#120924] text-white flex flex-col select-none">
        <TVView
          room={room}
          onSwitchRole={handleSwitchRole}
          onOpenAIChat={() => setIsAIChatOpen(true)}
          connected={connected}
          latencyMs={latencyMs}
        />
      </div>
    );
  }

  // 2. Player Handset (Locked to Player mode — no Header, no role switcher, no scrolling)
  if (role === 'player') {
    return (
      <div className="h-[100dvh] w-screen overflow-hidden bg-[#120924] text-white flex flex-col select-none">
        <PlayerView
          room={room}
          playerId={playerId}
          playerName={playerName}
          onBuzzIn={buzzIn}
          onSubmitAnswer={submitAnswer}
          latencyMs={latencyMs}
          onUpdatePlayerName={(newName: string) => {
            const trimmed = newName.trim();
            setPlayerName(trimmed);
            localStorage.setItem('quizcast_player_name', trimmed);
            updatePlayerName(trimmed);
          }}
          onTriggerSabotage={triggerSabotage}
          onClearSabotage={clearSabotage}
          onSubmitBluff={submitBluff}
          onVoteBluff={voteBluff}
        />
      </div>
    );
  }

  // 3. Host Controller or Initial Role Selection
  return (
    <div className="h-[100dvh] w-screen overflow-hidden bg-[#120924] text-white flex flex-col">
      {!role ? (
        <div className="flex-1 overflow-y-auto flex items-center justify-center p-4">
          <RoleSelectModal
            initialRoomCode={roomCode}
            onLaunchRole={handleLaunchRole}
            onOpenQuizStudio={() => setIsQuizStudioOpen(true)}
          />
        </div>
      ) : (
        <HostView
          room={room}
          onSetPhase={setPhase}
          onToggleLock={toggleLock}
          onChangeQuestion={changeQuestion}
          onResetBuzzes={resetBuzzes}
          onAdjudicate={adjudicate}
          onAdjustScore={adjustScore}
          onUpdateQuestions={updateQuestions}
          onAddQuestion={addQuestion}
          onEditQuestion={editQuestion}
          onDeleteQuestion={deleteQuestion}
          onTriggerSound={triggerSound}
          onKickPlayer={kickPlayer}
          onOpenAIChat={() => setIsAIChatOpen(true)}
          onOpenQuizStudio={() => setIsQuizStudioOpen(true)}
          onSwitchRole={handleSwitchRole}
          onStartTimer={startTimer}
          onPauseTimer={pauseTimer}
          onResetTimer={resetTimer}
          onSetTimerDuration={setTimerDuration}
          onToggleAutoLock={toggleAutoLock}
          onRevealNextClue={revealNextClue}
          onToggleBluffMode={toggleBluffMode}
          onSetBluffPhase={setBluffPhase}
        />
      )}

      <AIChatModal
        isOpen={isAIChatOpen}
        onClose={() => setIsAIChatOpen(false)}
        currentQuestion={activeQ?.question}
        currentAnswer={activeQ?.answer}
      />

      <QuizStudioModal
        isOpen={isQuizStudioOpen}
        onClose={() => setIsQuizStudioOpen(false)}
        currentQuestions={room?.questions || []}
        currentPackTitle={room?.currentPackTitle || 'Custom Quiz'}
        onApplyQuestions={updateQuestions}
      />
    </div>
  );
}
