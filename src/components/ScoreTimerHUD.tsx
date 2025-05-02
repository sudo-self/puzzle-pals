import React, { useState, useEffect } from "react";

interface Props {
  gameOver: boolean;
  resetTrigger: any;
  onGameEnd: (finalScore: number) => void;
}

const MAX_TIME = 120; // seconds
const STRIKE_LIMIT = 3;

const ScoreTimerHUD: React.FC<Props> = ({ gameOver, resetTrigger, onGameEnd }) => {
  const [score, setScore] = useState(0);
  const [consecutiveMatches, setConsecutiveMatches] = useState(0);
  const [strikes, setStrikes] = useState(0);
  const [timeLeft, setTimeLeft] = useState(MAX_TIME);
  const [highScore, setHighScore] = useState(0);

  // Timer
  useEffect(() => {
    if (gameOver) return;

    const timer = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(timer);
          onGameEnd(score);
          return 0;
        }
        return t - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [gameOver]);

  // Reset handler
  useEffect(() => {
    setScore(0);
    setConsecutiveMatches(0);
    setStrikes(0);
    setTimeLeft(MAX_TIME);
  }, [resetTrigger]);

  // Game over final score handling
  useEffect(() => {
    if (gameOver) {
      if (score > highScore) setHighScore(score);
      onGameEnd(score);
    }
  }, [gameOver]);

  // Call this from parent when match found
  const registerMatch = () => {
    const basePoints = 100;
    const bonus = 25 * consecutiveMatches;
    const total = basePoints + bonus;

    setScore((prev) => prev + total);
    setConsecutiveMatches((prev) => prev + 1);
    setStrikes(0);
  };

  // Call this from parent when no match
  const registerMiss = () => {
    const newStrikes = strikes + 1;
    setStrikes(newStrikes);
    setConsecutiveMatches(0);

    if (newStrikes >= STRIKE_LIMIT) {
      setScore((prev) => Math.max(0, prev - 100));
      setStrikes(0);
    }
  };

  return (
    <div className="w-full flex justify-between items-center bg-white rounded-lg shadow px-4 py-2 mb-4 text-lg font-medium">
      <div>⏱ Time: {timeLeft}s</div>
      <div>🎯 Score: {score}</div>
      <div>🏆 High Score: {highScore}</div>
    </div>
  );
};

export default ScoreTimerHUD;
