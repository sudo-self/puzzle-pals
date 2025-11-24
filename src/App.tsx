import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import "./animations.css";

// Type definitions
interface Tile {
  id: number;
  content: string;
  isFlipped: boolean;
  isMatched: boolean;
  animate: boolean;
  rumble?: boolean;
  isHinted?: boolean;
}

interface Score {
  id: string;
  name: string;
  moves: number;
  time: number;
  date: string;
  difficulty: "easy" | "medium" | "hard";
}

interface GameConfig {
  pairs: number;
  columns: number;
  name: string;
}

// Game configuration
const DIFFICULTY_SETTINGS: Record<"easy" | "medium" | "hard", GameConfig> = {
  easy: { pairs: 4, columns: 4, name: "Easy" },
  medium: { pairs: 6, columns: 6, name: "Medium" },
  hard: { pairs: 8, columns: 8, name: "Hard" },
};

// Audio configuration
const AUDIO_SOURCES = {
  match: "./bong.mp3",
  flip: "https://www.myinstants.com/media/sounds/flip.mp3",
  win: "./bell.mp3",
  fail: "./fail.mp3",
  rumble: "./win.mp3",
  gameMusic: "./lobby.mp3",
  punch: "./punch.mp3",
  start: "./lobby.mp3",
  click: "https://assets.mixkit.co/sfx/preview/mixkit-select-click-1109.mp3",
  hint: "https://assets.mixkit.co/sfx/preview/mixkit-magic-sparkles-1681.mp3",
};

// Custom hooks
const useAudio = (sources: Record<string, string>, volume: number) => {
  const audioRefs = useRef<Record<string, HTMLAudioElement>>({});

  useEffect(() => {
    Object.entries(sources).forEach(([key, src]) => {
      audioRefs.current[key] = new Audio(src);
    });

    return () => {
      Object.values(audioRefs.current).forEach(audio => {
        audio.pause();
        audio.src = "";
      });
    };
  }, []);

  useEffect(() => {
    Object.values(audioRefs.current).forEach(audio => {
      audio.volume = volume;
    });
  }, [volume]);

  const play = useCallback((sound: string) => {
    audioRefs.current[sound]?.play().catch(() => {
      // Handle autoplay restrictions silently
    });
  }, []);

  return { play };
};

const useLocalStorage = <T,>(key: string, initialValue: T) => {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch {
      return initialValue;
    }
  });

  const setValue = useCallback((value: T | ((val: T) => T)) => {
    setStoredValue(prev => {
      const newValue = value instanceof Function ? value(prev) : value;
      localStorage.setItem(key, JSON.stringify(newValue));
      return newValue;
    });
  }, [key]);

  return [storedValue, setValue] as const;
};

// Utility functions
const generateId = () => Math.random().toString(36).substring(2) + Date.now().toString(36);
const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
};

const generateAvatar = () => {
  const seed = Math.random().toString(36).substring(7);
  return `https://api.dicebear.com/9.x/fun-emoji/svg?seed=${seed}`;
};

// Touch-friendly button component
const TouchButton: React.FC<{
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
  size?: "sm" | "md" | "lg";
}> = ({ onClick, children, className = "", disabled = false, size = "md" }) => {
  const sizeClasses = {
    sm: "px-3 py-2 text-sm min-h-[44px]",
    md: "px-4 py-3 text-base min-h-[48px]",
    lg: "px-6 py-4 text-lg min-h-[52px]"
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        ${sizeClasses[size]}
        touch-manipulation select-none
        active:scale-95 transition-transform duration-150
        disabled:opacity-50 disabled:active:scale-100
        ${className}
      `}
      style={{ WebkitTapHighlightColor: 'transparent' }}
    >
      {children}
    </button>
  );
};

// Components
const SplashScreen: React.FC<{
  theme: "light" | "dark";
  playerName: string;
  difficulty: "easy" | "medium" | "hard";
  customImages: string[];
  imageUploads: File[];
  scores: Score[];
  showTutorial: boolean;
  showScores: boolean;
  onNameChange: (name: string) => void;
  onThemeChange: () => void;
  onDifficultyChange: (difficulty: "easy" | "medium" | "hard") => void;
  onImageUpload: (files: FileList | null) => void;
  onRemoveImage: (index: number) => void;
  onStartGame: () => void;
  onToggleTutorial: () => void;
  onToggleScores: () => void;
  onClearScores: () => void;
  volume: number;
  onVolumeChange: (volume: number) => void;
  playSound: (sound: string) => void;
}> = ({
  theme, playerName, difficulty, customImages, imageUploads, scores,
  showTutorial, showScores, onNameChange, onThemeChange, onDifficultyChange,
  onImageUpload, onRemoveImage, onStartGame, onToggleTutorial, onToggleScores,
  onClearScores, volume, onVolumeChange, playSound
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUploadClick = () => {
    playSound("click");
    fileInputRef.current?.click();
  };

  return (
    <div className={`text-center p-4 md:p-8 space-y-6 max-w-lg w-full rounded-xl shadow-lg ${
      theme === "light" 
        ? "bg-white/90 backdrop-blur-sm" 
        : "bg-gray-800/90 backdrop-blur-sm"
    }`}>
      <h1 className="text-3xl md:text-4xl font-bold mb-4">
        <span className="bg-gradient-to-r from-purple-500 via-pink-500 to-red-500 bg-clip-text text-transparent drop-shadow-lg">
          Puzzle Pals
        </span>
      </h1>
      <p className="text-base md:text-lg">A memory card matching game</p>
      
      <div className="flex justify-center my-4">
        <img
          src="./pals.svg"
          alt="Puzzle Pals Logo"
          className="w-48 h-48 md:w-64 md:h-64 mx-auto animate-bounce"
        />
      </div>

      <div className="space-y-4">
        <input
          type="text"
          value={playerName}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder="Player Name (optional)"
          className="mt-2 p-3 w-full border rounded-md shadow-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent text-base md:text-lg min-h-[48px]"
        />

        <div className="flex flex-col md:flex-row gap-2">
          <TouchButton
            onClick={() => {
              playSound("click");
              onThemeChange();
            }}
            className="flex-1 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 transition-colors"
            size="md"
          >
            {theme === "light" ? "🌙 Dark Mode" : "☀️ Light Mode"}
          </TouchButton>
          
          <div className="flex-1 flex items-center space-x-2 bg-gray-100 dark:bg-gray-700 rounded-md px-3 min-h-[48px]">
            <span className="text-sm">🔊</span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={volume}
              onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
              className="w-full h-2 bg-gray-300 rounded-lg appearance-none cursor-pointer"
            />
            <span className="text-sm w-12">{Math.round(volume * 100)}%</span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {Object.entries(DIFFICULTY_SETTINGS).map(([key, setting]) => (
            <TouchButton
              key={key}
              onClick={() => {
                playSound("click");
                onDifficultyChange(key as "easy" | "medium" | "hard");
              }}
              className={`transition-all ${
                difficulty === key 
                  ? key === "easy" 
                    ? "bg-green-500 text-white shadow-lg" 
                    : key === "medium" 
                      ? "bg-blue-500 text-white shadow-lg" 
                      : "bg-red-500 text-white shadow-lg"
                  : theme === "light" 
                    ? "bg-gray-200 hover:bg-gray-300" 
                    : "bg-gray-700 hover:bg-gray-600"
              }`}
              size="sm"
            >
              {setting.name}
              <div className="text-xs mt-1">
                {setting.pairs} pairs
              </div>
            </TouchButton>
          ))}
        </div>

        <div className="relative">
          <TouchButton
            className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg hover:from-purple-600 hover:to-pink-600"
            onClick={handleImageUploadClick}
            size="md"
          >
            + Add Custom Images ({customImages.length}/{DIFFICULTY_SETTINGS[difficulty].pairs})
          </TouchButton>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*"
            onChange={(e) => onImageUpload(e.target.files)}
            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
          />
        </div>

        {customImages.length > 0 && (
          <div className="mt-4">
            <h3 className="text-sm font-semibold mb-2">Selected Images:</h3>
            <div className="grid grid-cols-4 gap-2">
              {customImages.map((img, i) => (
                <div key={i} className="relative group">
                  <img
                    src={img}
                    alt="Preview"
                    className="w-16 h-16 rounded-lg object-cover border cursor-pointer hover:opacity-80 transition-opacity"
                  />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      playSound("click");
                      onRemoveImage(i);
                    }}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600 transition-colors touch-manipulation"
                    style={{ WebkitTapHighlightColor: 'transparent' }}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-col items-center space-y-4 pt-4">
          <TouchButton
            onClick={() => {
              playSound("punch");
              onStartGame();
            }}
            className="mt-2 text-xl font-bold text-white rounded-full bg-gradient-to-r from-purple-500 via-pink-500 to-red-500 shadow-lg hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={customImages.length > DIFFICULTY_SETTINGS[difficulty].pairs}
            size="lg"
          >
            🎮 Start Game
          </TouchButton>

          <div className="flex flex-col sm:flex-row gap-4 w-full">
            <TouchButton
              onClick={() => {
                playSound("click");
                onToggleScores();
              }}
              className="text-blue-600 hover:underline dark:text-blue-400 bg-transparent"
              size="md"
            >
              {showScores ? "Hide Scores" : "View High Scores"}
            </TouchButton>
            <TouchButton
              onClick={() => {
                playSound("click");
                onToggleTutorial();
              }}
              className="text-purple-600 hover:underline dark:text-purple-400 bg-transparent"
              size="md"
            >
              {showTutorial ? "Hide Tutorial" : "How to Play"}
            </TouchButton>
          </div>
        </div>

        {showTutorial && (
          <div className={`mt-4 p-4 rounded-lg ${
            theme === "light" ? "bg-blue-50" : "bg-gray-700"
          }`}>
            <h3 className="font-bold mb-2">How to Play</h3>
            <ul className="text-left space-y-2 text-sm">
              <li>• Tap on tiles to flip them over and reveal the image</li>
              <li>• Match two identical images to make them disappear</li>
              <li>• Try to find all pairs in the fewest moves and shortest time</li>
              <li>• Higher difficulties have more pairs to match</li>
              <li>• You can upload your own images for a personalized game</li>
              <li>• Use hints (💡) to reveal a matching pair temporarily</li>
            </ul>
          </div>
        )}

        {showScores && (
          <ScoresList 
            scores={scores}
            playerName={playerName}
            theme={theme}
            onClearScores={onClearScores}
          />
        )}
      </div>
    </div>
  );
};

const ScoresList: React.FC<{
  scores: Score[];
  playerName: string;
  theme: "light" | "dark";
  onClearScores: () => void;
}> = ({ scores, playerName, theme, onClearScores }) => {
  return (
    <div className={`mt-4 rounded-lg p-4 ${
      theme === "light" ? "bg-white/90" : "bg-gray-700/90"
    }`}>
      <div className="flex justify-between items-center mb-2">
        <h3 className="font-bold text-lg">Leaderboard</h3>
        <TouchButton
          onClick={onClearScores}
          className="bg-red-500 text-white hover:bg-red-600 transition-colors"
          size="sm"
        >
          Clear Scores
        </TouchButton>
      </div>
      {scores.length === 0 ? (
        <p className="text-gray-500">No scores yet! Play a game to appear here.</p>
      ) : (
        <div className="overflow-x-auto touch-pan-x">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2">Rank</th>
                <th className="text-left">Name</th>
                <th className="text-left">Difficulty</th>
                <th className="text-right">Moves</th>
                <th className="text-right">Time</th>
              </tr>
            </thead>
            <tbody>
              {scores.map((score, i) => (
                <tr 
                  key={score.id}
                  className={`border-b ${
                    i < 3 ? "font-bold" : ""
                  } ${
                    score.name === playerName && playerName !== "" 
                      ? theme === "light" 
                        ? "bg-blue-100" 
                        : "bg-blue-900/50" 
                      : ""
                  }`}
                >
                  <td className="py-2">
                    {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : i + 1}
                  </td>
                  <td className="truncate max-w-[80px]">{score.name || "Anonymous"}</td>
                  <td>{DIFFICULTY_SETTINGS[score.difficulty].name}</td>
                  <td className="text-right">{score.moves}</td>
                  <td className="text-right">{formatTime(score.time)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

const Confetti: React.FC<{ show: boolean }> = ({ show }) => {
  if (!show) return null;

  return (
    <div className="confetti-container">
      {[...Array(150)].map((_, i) => {
        const randomHue = Math.random() * 360;
        const randomDelay = Math.random() * 5;
        const randomTX = (Math.random() - 0.5) * 2;
        
        return (
          <div
            key={i}
            className="confetti"
            style={{
              '--delay': `${randomDelay}s`,
              '--tx': randomTX,
              left: `${Math.random() * 100}vw`,
              background: `hsl(${randomHue}, 100%, 50%)`,
              animationDelay: `${randomDelay}s`,
            } as React.CSSProperties}
          />
        );
      })}

      {[...Array(50)].map((_, i) => (
        <div
          key={`fallback-${i}`}
          className="confetti-basic"
          style={{
            left: `${Math.random() * 100}vw`,
            animationDelay: `${Math.random() * 5}s`,
            fontSize: `${Math.random() * 10 + 15}px`,
            color: `hsl(${Math.random() * 360}, 100%, 50%)`,
            '--tx': (Math.random() - 0.5) * 2,
          } as React.CSSProperties}
        >
          {["🏆", "🎉", "✨", "🌟", "🎊", "💎", "🥇", "👑"][Math.floor(Math.random() * 8)]}
        </div>
      ))}
    </div>
  );
};

const GameBoard: React.FC<{
  tiles: Tile[];
  difficulty: "easy" | "medium" | "hard";
  theme: "light" | "dark";
  onTileClick: (index: number) => void;
}> = ({ tiles, difficulty, theme, onTileClick }) => {
  const [touchedTile, setTouchedTile] = useState<number | null>(null);

  const getGridCols = () => {
    const cols = DIFFICULTY_SETTINGS[difficulty].columns;
    return `grid-cols-${cols} sm:grid-cols-${cols} md:grid-cols-${cols}`;
  };

  return (
    <div className={`grid gap-2 sm:gap-3 w-full max-w-full overflow-hidden ${getGridCols()} p-2`}>
      {tiles.map((tile, index) => (
        <div
          key={tile.id}
          className={`
            tile-container aspect-square relative
            ${tile.animate ? "spin-on-match pop-on-match" : ""} 
            ${tile.isMatched ? "glow" : ""}
            ${touchedTile === index ? "scale-105" : ""}
            transition-transform duration-200
            touch-manipulation
          `}
          onClick={() => onTileClick(index)}
          onTouchStart={() => setTouchedTile(index)}
          onTouchEnd={() => setTouchedTile(null)}
          style={{ WebkitTapHighlightColor: 'transparent' }}
        >
          <div
            className={`tile-inner w-full h-full ${
              tile.isFlipped || tile.isMatched ? "tile-flipped" : ""
            }`}
          >
            <div className={`tile-face tile-front flex items-center justify-center ${
              theme === "light" 
                ? "border border-gray-300 bg-white" 
                : "border border-gray-600 bg-gray-800"
            } ${tile.isHinted ? "hint-glow" : ""}`}>
              <span className="text-2xl sm:text-3xl opacity-70">❔</span>
            </div>
            <div className="tile-face tile-back flex items-center justify-center">
              <img
                src={tile.content}
                alt="Tile Content"
                className="w-full h-full object-cover rounded-lg select-none"
                loading="lazy"
                draggable={false}
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

// Main component
const MemoryTileGame = () => {
  // Game state
  const [tiles, setTiles] = useState<Tile[]>([]);
  const [flippedTiles, setFlippedTiles] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [matches, setMatches] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [customImages, setCustomImages] = useState<string[]>([]);
  const [imageUploads, setImageUploads] = useState<File[]>([]);
  const [showConfetti, setShowConfetti] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  const [playerName, setPlayerName] = useState("");
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard">("medium");
  const [scores, setScores] = useLocalStorage<Score[]>("memoryGameScores", []);
  const [showScores, setShowScores] = useState(false);
  const [timer, setTimer] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">(
    () => matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
  );
  const [volume, setVolume] = useState(0.5);
  const [showTutorial, setShowTutorial] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState("");
  const [hintCount, setHintCount] = useState(3);
  
  const { play: playSound } = useAudio(AUDIO_SOURCES, volume);

  // Memoized game configuration
  const gameConfig = useMemo(() => DIFFICULTY_SETTINGS[difficulty], [difficulty]);

  // Generate default images based on difficulty
  const generateDefaultImages = useCallback(() => {
    return Array(gameConfig.pairs * 2).fill(null).map(generateAvatar);
  }, [gameConfig.pairs]);

  // Initialize game board
  const initializeGame = useCallback(() => {
    let imagePool: string[];

    if (customImages.length >= gameConfig.pairs) {
      imagePool = customImages.slice(0, gameConfig.pairs);
    } else if (customImages.length > 0) {
      const remaining = gameConfig.pairs - customImages.length;
      const generated = Array(remaining).fill(null).map(generateAvatar);
      imagePool = [...customImages, ...generated];
    } else {
      imagePool = Array(gameConfig.pairs).fill(null).map(generateAvatar);
    }

    const pairsArray = imagePool.slice(0, gameConfig.pairs);
    const duplicatedPairs = [...pairsArray, ...pairsArray];
    const shuffled = duplicatedPairs.sort(() => Math.random() - 0.5);

    const initialTiles: Tile[] = shuffled.map((content, index) => ({
      id: index,
      content,
      isFlipped: false,
      isMatched: false,
      animate: false,
      isHinted: false,
    }));

    setTiles(initialTiles);
    setFlippedTiles([]);
    setMoves(0);
    setMatches(0);
    setTimer(0);
    setHintCount(3);
    setIsTimerRunning(true);
    setGameOver(false);
    setShowConfetti(false);
    setGameStarted(true);
  }, [customImages, gameConfig.pairs]);

  // Start game after splash screen
  useEffect(() => {
    if (!showSplash) initializeGame();
  }, [initializeGame, showSplash]);

  // Timer logic
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isTimerRunning) {
      interval = setInterval(() => {
        setTimer(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning]);

  // Check for win condition
  useEffect(() => {
    if (matches === gameConfig.pairs && gameStarted) {
      setIsTimerRunning(false);
      setGameOver(true);
      playSound("win");
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 5000);

      // Save score if player has a name
      if (playerName.trim()) {
        const newScore: Score = {
          id: generateId(),
          name: playerName.trim(),
          moves,
          time: timer,
          date: new Date().toLocaleDateString(),
          difficulty,
        };
        setScores(prev => 
          [...prev, newScore]
            .sort((a, b) => a.moves - b.moves || a.time - b.time)
            .slice(0, 10)
        );
      }
    }
  }, [matches, gameConfig.pairs, gameStarted, playerName, moves, timer, difficulty, setScores, playSound]);

  // Handle tile click
  const handleTileClick = useCallback((index: number) => {
    if (
      flippedTiles.length === 2 ||
      tiles[index].isFlipped ||
      tiles[index].isMatched ||
      gameOver
    )
      return;

    playSound("flip");
    const newFlipped = [...flippedTiles, index];
    setFlippedTiles(newFlipped);

    setTiles(
      tiles.map((tile, i) =>
        i === index ? { ...tile, isFlipped: true, isHinted: false } : tile,
      ),
    );

    if (newFlipped.length === 2) {
      setMoves((m) => m + 1);
      setTimeout(() => checkForMatch(newFlipped[0], newFlipped[1]), 800);
    }
  }, [tiles, flippedTiles, gameOver, playSound]);

  // Check if flipped tiles match
  const checkForMatch = useCallback((i1: number, i2: number) => {
    if (tiles[i1].content === tiles[i2].content) {
      playSound("match");
      playSound("rumble");

      setMatches((m) => m + 1);

      const newTiles = tiles.map((tile, i) =>
        i === i1 || i === i2
          ? { ...tile, isMatched: true, animate: true, isHinted: false }
          : tile,
      );
      setTiles(newTiles);

      setTimeout(() => {
        setTiles((prev) => prev.map((tile) => ({ ...tile, animate: false })));
      }, 750);
    } else {
      playSound("fail");
      setTiles(
        tiles.map((tile, i) =>
          i === i1 || i === i2 ? { ...tile, isFlipped: false, isHinted: false } : tile,
        ),
      );
    }
    setFlippedTiles([]);
  }, [tiles, playSound]);

  // Show hint
  const showHint = useCallback(() => {
    if (hintCount <= 0 || flippedTiles.length > 0 || gameOver) return;
    
    playSound("hint");
    
    const unmatchedTiles = tiles.filter(t => !t.isMatched && !t.isFlipped);
    if (unmatchedTiles.length < 2) return;
    
    const randomTile = unmatchedTiles[Math.floor(Math.random() * unmatchedTiles.length)];
    const match = tiles.find(t => 
      t.id !== randomTile.id && 
      t.content === randomTile.content && 
      !t.isMatched &&
      !t.isFlipped
    );

    if (!match) return;

    setHintCount(prev => prev - 1);
    setTiles(tiles.map(t => 
      t.id === randomTile.id || t.id === match.id 
        ? { ...t, isHinted: true } 
        : t
    ));

    setTimeout(() => {
      setTiles(tiles.map(t => ({ ...t, isHinted: false })));
    }, 2000);
  }, [tiles, hintCount, flippedTiles.length, gameOver, playSound]);

  // Handle image uploads
  const handleImageUpload = useCallback((files: FileList | null) => {
    if (!files) return;
    const fileArray = Array.from(files);
    const remainingSlots = gameConfig.pairs - customImages.length;
    
    if (fileArray.length > remainingSlots) {
      alert(`You can only upload ${remainingSlots} more images for ${difficulty} difficulty`);
      return;
    }
    
    setImageUploads(prev => [...prev, ...fileArray]);

    Promise.all(
      fileArray.map((file) => {
        return new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (event) => {
            event.target?.result
              ? resolve(event.target.result as string)
              : reject();
          };
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
      }),
    )
      .then((images) => setCustomImages((prev) => [...prev, ...images]))
      .catch(console.error);
  }, [customImages.length, gameConfig.pairs, difficulty]);

  // Game control functions
  const handleRestart = useCallback(() => {
    playSound("click");
    setShowSplash(true);
    setIsTimerRunning(false);
    setGameStarted(false);
  }, [playSound]);

  const handleNewGame = useCallback(() => {
    playSound("click");
    initializeGame();
  }, [initializeGame, playSound]);

  const handleStartGame = useCallback(() => {
    playSound("start");
    setShowSplash(false);
  }, [playSound]);

  const removeImage = useCallback((index: number) => {
    playSound("click");
    setCustomImages(prev => prev.filter((_, i) => i !== index));
    setImageUploads(prev => prev.filter((_, i) => i !== index));
  }, [playSound]);

  const clearScores = useCallback(() => {
    playSound("click");
    if (window.confirm("Are you sure you want to clear all scores?")) {
      setScores([]);
    }
  }, [setScores, playSound]);

  const openImageModal = useCallback((image: string) => {
    setSelectedImage(image);
    setShowImageModal(true);
  }, []);

  const closeImageModal = useCallback(() => {
    playSound("click");
    setShowImageModal(false);
  }, [playSound]);

  // Background style for splash screen
  const splashBackground = showSplash ? {
    backgroundImage: "url(/logo.png)",
    backgroundSize: "cover",
    backgroundPosition: "center",
  } : {};

  return (
    <div
      className={`min-h-screen safe-area-inset ${
        showSplash
          ? "bg-white"
          : theme === "light"
          ? "bg-gradient-to-br from-blue-100 via-purple-100 to-pink-100"
          : "bg-gradient-to-br from-gray-800 via-gray-700 to-gray-900"
      } flex items-center justify-center transition-colors duration-300 overflow-hidden`}
      style={splashBackground}
    >
      {showSplash ? (
        <div className="w-full h-full overflow-y-auto">
          <SplashScreen
            theme={theme}
            playerName={playerName}
            difficulty={difficulty}
            customImages={customImages}
            imageUploads={imageUploads}
            scores={scores}
            showTutorial={showTutorial}
            showScores={showScores}
            onNameChange={setPlayerName}
            onThemeChange={() => setTheme(theme === "light" ? "dark" : "light")}
            onDifficultyChange={setDifficulty}
            onImageUpload={handleImageUpload}
            onRemoveImage={removeImage}
            onStartGame={handleStartGame}
            onToggleTutorial={() => setShowTutorial(!showTutorial)}
            onToggleScores={() => setShowScores(!showScores)}
            onClearScores={clearScores}
            volume={volume}
            onVolumeChange={setVolume}
            playSound={playSound}
          />
        </div>
      ) : (
        <div className="w-full max-w-5xl flex flex-col items-center relative p-2 sm:p-4 h-full">
          <Confetti show={showConfetti} />

          {/* Game Header */}
          <div className="w-full flex flex-col sm:flex-row justify-between items-center mb-4 sm:mb-6 gap-2">
            <div className="flex items-center space-x-2 sm:space-x-4">
              {playerName && (
                <div className="text-xl sm:text-2xl md:text-4xl font-bold">
                  <span className="bg-gradient-to-r from-purple-600 via-pink-500 to-red-500 bg-clip-text text-transparent drop-shadow-md">
                    {playerName}
                  </span>
                </div>
              )}
              <span className={`text-sm sm:text-lg px-2 sm:px-3 py-1 rounded-full ${
                difficulty === "easy" 
                  ? "bg-green-100 text-green-800" 
                  : difficulty === "medium" 
                    ? "bg-blue-100 text-blue-800" 
                    : "bg-red-100 text-red-800"
              }`}>
                {gameConfig.name}
              </span>
            </div>

            <div className="flex items-center space-x-2 sm:space-x-4">
              <TouchButton
                onClick={() => {
                  playSound("click");
                  setTheme(theme === "light" ? "dark" : "light");
                }}
                className="p-2 rounded-full bg-white bg-opacity-30 hover:bg-opacity-50 transition-colors"
                size="sm"
              >
                {theme === "light" ? "🌙" : "☀️"}
              </TouchButton>
              <TouchButton
                onClick={handleRestart}
                className="bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white font-bold rounded shadow transition-all"
                size="sm"
              >
                🏠 Main Menu
              </TouchButton>
            </div>
          </div>

          {/* Game Stats */}
          <div className="mb-4 sm:mb-6 w-full px-2">
            <div className="flex flex-wrap gap-2 sm:gap-4 justify-center text-base sm:text-xl font-semibold">
              <div className="bg-gradient-to-r from-purple-600 via-pink-500 to-red-500 bg-clip-text text-transparent drop-shadow-md">
                🏃 Moves: <b>{moves}</b>
              </div>
              <div className="bg-gradient-to-r from-purple-600 via-pink-500 to-red-500 bg-clip-text text-transparent drop-shadow-md">
                ✅ Matches: <b>{matches}/{gameConfig.pairs}</b>
              </div>
              <div className="bg-gradient-to-r from-purple-600 via-pink-500 to-red-500 bg-clip-text text-transparent drop-shadow-md">
                ⏱️ Time: <b>{formatTime(timer)}</b>
              </div>
              <TouchButton
                onClick={showHint}
                disabled={hintCount <= 0 || flippedTiles.length > 0 || gameOver}
                className={`rounded-full flex items-center gap-1 ${
                  hintCount <= 0 || flippedTiles.length > 0 || gameOver
                    ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                    : "bg-yellow-500 text-white hover:bg-yellow-600 cursor-pointer"
                } transition-colors`}
                size="sm"
              >
                💡 Hint ({hintCount})
              </TouchButton>
            </div>
          </div>

          {/* Game Over Modal */}
          {gameOver && (
            <div className="absolute inset-0 bg-black/70 flex items-center justify-center z-10 rounded-lg backdrop-blur-sm p-4">
              <div className={`p-6 sm:p-8 rounded-lg shadow-xl text-center max-w-md w-full ${
                theme === "light" ? "bg-white" : "bg-gray-800"
              }`}>
                <h2 className="text-2xl sm:text-3xl font-bold mb-4 bg-gradient-to-r from-purple-600 via-pink-500 to-red-500 bg-clip-text text-transparent">
                  🎉 You Win! 🎉
                </h2>
                <div className="space-y-2 mb-6 text-base sm:text-xl">
                  <p>Completed in <b>{moves}</b> moves</p>
                  <p>Time: <b>{formatTime(timer)}</b></p>
                  <p>Difficulty: <b>{gameConfig.name}</b></p>
                  <p>Hints remaining: <b>{hintCount}</b></p>
                </div>
                <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4 justify-center">
                  <TouchButton
                    onClick={handleNewGame}
                    className="bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg hover:from-blue-600 hover:to-purple-600 transition-all shadow"
                    size="md"
                  >
                    🔄 Play Again
                  </TouchButton>
                  <TouchButton
                    onClick={handleRestart}
                    className="bg-gradient-to-r from-gray-500 to-gray-700 text-white rounded-lg hover:from-gray-600 hover:to-gray-800 transition-all shadow"
                    size="md"
                  >
                    🏠 Main Menu
                  </TouchButton>
                </div>
              </div>
            </div>
          )}

          {/* Game Board */}
          <div className="w-full flex-1 flex items-center justify-center overflow-auto">
            <GameBoard
              tiles={tiles}
              difficulty={difficulty}
              theme={theme}
              onTileClick={handleTileClick}
            />
          </div>
        </div>
      )}

      {/* Image Modal */}
      {showImageModal && (
        <div 
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
          onClick={closeImageModal}
        >
          <div 
            className="bg-white rounded-lg max-w-2xl w-full p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">Image Preview</h3>
              <TouchButton
                onClick={closeImageModal}
                className="text-2xl hover:text-red-500 bg-transparent"
                size="sm"
              >
                &times;
              </TouchButton>
            </div>
            <img 
              src={selectedImage} 
              alt="Full size preview" 
              className="w-full h-auto max-h-[70vh] object-contain"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default MemoryTileGame;
