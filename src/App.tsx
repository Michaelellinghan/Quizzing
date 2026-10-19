/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
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

  const {
    room,
    connected,
    latencyMs,
    buzzIn,
    submitAnswer,
    submitLie,
    startBluffVote,
    toggleDoubleDown,
    setConfidence,
    setHeistTarget,
    toggleHeistMode,
    sabotagePlayer,
    clearSabotage,
    nextClue,
    startTimer,
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
    if (role === 'player') return;
    setRole(null);
    localStorage.removeItem('quizcast_role');
    const newUrl = new URL(window.location.href);
    newUrl.searchParams.delete('role');
    window.history.replaceState({}, '', newUrl.toString());
  };

  const activeQ = room?.questions[room.currentQIndex];

  if (role === 'tv') {
    return (
      <div id="tv-viewport-container" className="h-full w-full overflow-hidden bg-[#120924] text-white flex flex-col select-none">
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

  if (role === 'player') {
    return (
      <div className="h-full w-full overflow-hidden bg-[#120924] text-white flex flex-col select-none">
        <PlayerView
          room={room}
          playerId={playerId}
          playerName={playerName}
          onBuzzIn={buzzIn}
          onSubmitAnswer={submitAnswer}
          onSubmitLie={submitLie}
          onToggleDoubleDown={toggleDoubleDown}
          onSetConfidence={setConfidence}
          onSetHeistTarget={setHeistTarget}
          onSabotagePlayer={sabotagePlayer}
          onClearSabotage={clearSabotage}
          latencyMs={latencyMs}
          onUpdatePlayerName={(newName: string) => {
            const trimmed = newName.trim();
            setPlayerName(trimmed);
            localStorage.setItem('quizcast_player_name', trimmed);
            updatePlayerName(trimmed);
          }}
        />
      </div>
    );
  }

  return (
    <div className="h-full w-full overflow-hidden bg-[#120924] text-white flex flex-col">
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
          onStartTimer={startTimer}
          onNextClue={nextClue}
          onStartBluffVote={startBluffVote}
          onToggleHeistMode={toggleHeistMode}
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
