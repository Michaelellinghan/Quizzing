/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useQuizSync } from './services/quizSync';
import { Header } from './components/Header';
import { TVView } from './components/TVView';
import { HostView } from './components/HostView';
import { PlayerView } from './components/PlayerView';
import { RoleSelectModal } from './components/RoleSelectModal';
import { AIChatModal } from './components/AIChatModal';
import { QuizStudioModal } from './components/QuizStudioModal';
import { Loader2 } from 'lucide-react';

export default function App() {
  // Parse URL query params if present (e.g. ?room=QUIZ&role=player)
  const queryParams = new URLSearchParams(window.location.search);
  const urlRoom = queryParams.get('room');
  const urlRole = queryParams.get('role') as 'tv' | 'host' | 'player' | null;

  const [roomCode, setRoomCode] = useState<string>(() => {
    return (urlRoom || localStorage.getItem('quizcast_room') || 'QUIZ').trim().toUpperCase();
  });

  const [role, setRole] = useState<'tv' | 'host' | 'player' | null>(() => {
    if (urlRole && ['tv', 'host', 'player'].includes(urlRole)) {
      return urlRole;
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

  // Sync with server / socket
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
    updatePlayerName
  } = useQuizSync({
    roomCode,
    role,
    playerId,
    playerName
  });

  // Handle launching role from modal
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

    if (newPlayerName) {
      setPlayerName(newPlayerName);
      localStorage.setItem('quizcast_player_name', newPlayerName);
    }

    // Update URL query params without reloading
    const newUrl = new URL(window.location.href);
    newUrl.searchParams.set('room', cleanCode);
    newUrl.searchParams.set('role', selectedRole);
    window.history.replaceState({}, '', newUrl.toString());
  };

  const handleSwitchRole = () => {
    setRole(null);
    localStorage.removeItem('quizcast_role');
    const newUrl = new URL(window.location.href);
    newUrl.searchParams.delete('role');
    window.history.replaceState({}, '', newUrl.toString());
  };

  const activeQ = room?.questions[room.currentQIndex];

  // Dedicated TV Spectator 16:9 Viewport (Strictly zero-scroll and full 16:9 frame)
  if (role === 'tv') {
    return (
      <div id="tv-viewport-container" className="h-screen w-screen max-h-screen max-w-screen overflow-hidden bg-slate-950 text-slate-100 flex flex-col font-sans select-none">
        <TVView
          room={room}
          onSwitchRole={handleSwitchRole}
          onOpenAIChat={() => setIsAIChatOpen(true)}
          connected={connected}
          latencyMs={latencyMs}
        />
        <AIChatModal
          isOpen={isAIChatOpen}
          onClose={() => setIsAIChatOpen(false)}
          currentQuestion={activeQ?.question}
          currentAnswer={activeQ?.answer}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Bar Navigation */}
      <Header
        roomCode={roomCode}
        role={role}
        onSwitchRole={handleSwitchRole}
        onOpenAIChat={() => setIsAIChatOpen(true)}
        onOpenQuizStudio={() => setIsQuizStudioOpen(true)}
        connected={connected}
        latencyMs={latencyMs}
      />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col items-center justify-center">
        {!role ? (
          <RoleSelectModal
            initialRoomCode={roomCode}
            onLaunchRole={handleLaunchRole}
            onOpenQuizStudio={() => setIsQuizStudioOpen(true)}
          />
        ) : role === 'host' ? (
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
          />
        ) : (
          <PlayerView
            room={room}
            playerId={playerId}
            playerName={playerName || 'Player'}
            onBuzzIn={buzzIn}
            onSubmitAnswer={submitAnswer}
            latencyMs={latencyMs}
            onUpdatePlayerName={(newName: string) => {
              setPlayerName(newName);
              localStorage.setItem('quizcast_player_name', newName);
              updatePlayerName(newName);
            }}
          />
        )}
      </main>

      {/* Gemini AI Chatbot Modal */}
      <AIChatModal
        isOpen={isAIChatOpen}
        onClose={() => setIsAIChatOpen(false)}
        currentQuestion={activeQ?.question}
        currentAnswer={activeQ?.answer}
      />

      {/* Custom Quiz & Question Writer Studio */}
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
