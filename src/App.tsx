import React, { useState, useEffect, useCallback, useRef } from "react";
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
  name: string;
  moves: number;
  time: number;
  date: string;
  difficulty: "easy" | "medium" | "hard";
}

// Game configuration
const DIFFICULTY_SETTINGS = {
  easy: { pairs: 4, columns: 4, name: "Easy" },
  medium: { pairs: 6, columns: 6, name: "Medium" },
  hard: { pairs: 8, columns: 8, name: "Hard" },
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
  const [scores, setScores] = useState<Score[]>([]);
  const [showScores, setShowScores] = useState(false);
  const [timer, setTimer] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">(matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
  const [volume, setVolume] = useState(0.5);
  const [showTutorial, setShowTutorial] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [hoveredTile, setHoveredTile] = useState<number | null>(null);
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState("");
  const [hintCount, setHintCount] = useState(3);
  
  const audioRefs = useRef<Record<string, HTMLAudioElement>>({});
  const gameContainerRef = useRef<HTMLDivElement>(null);

  // Initialize audio references
  useEffect(() => {
    audioRefs.current = {
      match: new Audio("./bong.mp3"),
      flip: new Audio("https://www.myinstants.com/media/sounds/flip.mp3"),
      win: new Audio("./bell.mp3"),
      fail: new Audio("./fail.mp3"),
      rumble: new Audio("./win.mp3"),
      gameMusic: new Audio("./lobby.mp3"),
      punch: new Audio("./punch.mp3"),
      start: new Audio("./lobby.mp3"),
      click: new Audio("https://assets.mixkit.co/sfx/preview/mixkit-select-click-1109.mp3"),
      hint: new Audio("https://assets.mixkit.co/sfx/preview/mixkit-magic-sparkles-1681.mp3"),
    };

    // Set initial volume
    Object.values(audioRefs.current).forEach(audio => {
      audio.volume = volume;
    });

    // Load scores from localStorage
    const savedScores = localStorage.getItem("memoryGameScores");
    if (savedScores) {
      setScores(JSON.parse(savedScores));
    }

    return () => {
      // Cleanup audio elements
      Object.values(audioRefs.current).forEach(audio => {
        audio.pause();
        audio.src = "";
      });
    };
  }, []);

  // Update volume when changed
  useEffect(() => {
    Object.values(audioRefs.current).forEach(audio => {
      audio.volume = volume;
    });
  }, [volume]);

  // Save scores to localStorage when they change
  useEffect(() => {
    localStorage.setItem("memoryGameScores", JSON.stringify(scores));
  }, [scores]);

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

  // Generate random avatar images
  const generateAvatar = useCallback(() => {
    const seed = Math.random().toString(36).substring(7);
    return `https://api.dicebear.com/9.x/fun-emoji/svg?seed=${seed}`;
  }, []);

  // Generate default images based on difficulty
  const generateDefaultImages = useCallback(() => {
    const numPairs = DIFFICULTY_SETTINGS[difficulty].pairs;
    const avatars = [];
    for (let i = 0; i < numPairs; i++) {
      avatars.push(generateAvatar());
      avatars.push(generateAvatar());
    }
    return avatars;
  }, [generateAvatar, difficulty]);

  // Initialize game board
  const initializeGame = useCallback(() => {
    const { pairs } = DIFFICULTY_SETTINGS[difficulty];
    let imagePool: string[];

    if (customImages.length >= pairs) {
      imagePool = customImages.slice(0, pairs);
    } else if (customImages.length > 0) {
      const remaining = pairs - customImages.length;
      const generated = Array(remaining)
        .fill(null)
        .map(() => generateAvatar());
      imagePool = [...customImages, ...generated];
    } else {
      imagePool = generateDefaultImages();
    }

    const pairsArray = imagePool.slice(0, pairs);
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
  }, [customImages, generateAvatar, generateDefaultImages, difficulty]);

  // Start game after splash screen
  useEffect(() => {
    if (!showSplash) initializeGame();
  }, [initializeGame, showSplash]);

  // Check for win condition
  useEffect(() => {
    const { pairs } = DIFFICULTY_SETTINGS[difficulty];
    if (matches === pairs && gameStarted) {
      setIsTimerRunning(false);
      setGameOver(true);
      audioRefs.current.win.play();
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 5000);

      // Save score if player has a name
      if (playerName) {
        const newScore: Score = {
          name: playerName,
          moves,
          time: timer,
          date: new Date().toLocaleDateString(),
          difficulty,
        };
        setScores(prev => [...prev, newScore]
          .sort((a, b) => a.moves - b.moves || a.time - b.time)
          .slice(0, 10));
      }
    }
  }, [matches, difficulty, playerName, moves, timer, gameStarted]);

  // Handle tile click
  const handleTileClick = (index: number) => {
    if (
      flippedTiles.length === 2 ||
      tiles[index].isFlipped ||
      tiles[index].isMatched ||
      gameOver
    )
      return;

    audioRefs.current.flip.play();
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
  };

  // Check if flipped tiles match
  const checkForMatch = (i1: number, i2: number) => {
    if (tiles[i1].content === tiles[i2].content) {
      audioRefs.current.match.play();
      audioRefs.current.rumble.play();

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
      audioRefs.current.fail.play();
      setTiles(
        tiles.map((tile, i) =>
          i === i1 || i === i2 ? { ...tile, isFlipped: false, isHinted: false } : tile,
        ),
      );
    }
    setFlippedTiles([]);
  };

  // Show hint
  const showHint = useCallback(() => {
    if (hintCount <= 0 || flippedTiles.length > 0 || gameOver) return;
    
    audioRefs.current.hint.play();
    
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
  }, [tiles, hintCount, flippedTiles.length, gameOver]);

  // Handle image uploads
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files);
    if (files.length + customImages.length > DIFFICULTY_SETTINGS[difficulty].pairs) {
      alert(`You can only upload ${DIFFICULTY_SETTINGS[difficulty].pairs - customImages.length} more images for ${difficulty} difficulty`);
      return;
    }
    
    setImageUploads(prev => [...prev, ...files]);

    Promise.all(
      files.map((file) => {
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

    e.target.value = "";
  };

  // Game control functions
  const handleRestart = () => {
    audioRefs.current.gameMusic.pause();
    setShowSplash(true);
    setIsTimerRunning(false);
    setGameStarted(false);
  };

  const handleNewGame = () => {
    initializeGame();
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPlayerName(e.target.value);
  };

  const handleStartGame = () => {
    audioRefs.current.start.play();
    audioRefs.current.gameMusic.loop = true;
    audioRefs.current.gameMusic.play();
    setShowSplash(false);
  };

  // Helper functions
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const removeImage = (index: number) => {
    setCustomImages(prev => prev.filter((_, i) => i !== index));
    setImageUploads(prev => prev.filter((_, i) => i !== index));
  };

  const openImageModal = (image: string) => {
    setSelectedImage(image);
    setShowImageModal(true);
  };

  const clearScores = () => {
    if (window.confirm("Are you sure you want to clear all scores?")) {
      setScores([]);
      localStorage.removeItem("memoryGameScores");
    }
  };

  // Render
  return (
    <div
      className={`min-h-screen ${
        showSplash
          ? "bg-white"
          : theme === "light"
          ? "bg-gradient-to-br from-blue-100 via-purple-100 to-pink-100"
          : "bg-gradient-to-br from-gray-800 via-gray-700 to-gray-900"
      } flex items-center justify-center transition-colors duration-300`}
      style={
        showSplash
          ? {
              backgroundImage: "url(/logo.png)",
              backgroundSize: "cover",
              backgroundPosition: "center",
            }
          : {}
      }
      ref={gameContainerRef}
    >
      {showSplash ? (
        <div className={`text-center p-8 space-y-6 max-w-lg w-full rounded-xl shadow-lg ${
          theme === "light" 
            ? "bg-white/90 backdrop-blur-sm" 
            : "bg-gray-800/90 backdrop-blur-sm"
        }`}>
          <h1 className="text-4xl font-bold mb-4">
            <span className="bg-gradient-to-r from-purple-500 via-pink-500 to-red-500 bg-clip-text text-transparent drop-shadow-lg">
              Puzzle Pals
            </span>
          </h1>
          <p className="text-lg">A memory card matching game</p>
          
          <div className="flex justify-center my-4">
            <img
              src="./pals.svg"
              alt="Puzzle Pals Logo"
              className="w-64 h-64 mx-auto animate-bounce"
            />
          </div>

          <div className="space-y-4">
            <input
              type="text"
              value={playerName}
              onChange={handleNameChange}
              placeholder="Player Name (optional)"
              className="mt-2 p-3 w-full border rounded-md shadow-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />

            <div className="flex space-x-2">
              <button
                onClick={() => {
                  audioRefs.current.click.play();
                  setTheme(theme === "light" ? "dark" : "light");
                }}
                className="px-4 py-2 rounded-md bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 transition-colors"
              >
                {theme === "light" ? "🌙 Dark Mode" : "☀️ Light Mode"}
              </button>
              
              <div className="flex-1 flex items-center space-x-2">
                <span className="text-sm">🔊</span>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={volume}
                  onChange={(e) => setVolume(parseFloat(e.target.value))}
                  className="w-full"
                />
                <span className="text-sm">{Math.round(volume * 100)}%</span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {Object.entries(DIFFICULTY_SETTINGS).map(([key, setting]) => (
                <button
                  key={key}
                  onClick={() => {
                    audioRefs.current.click.play();
                    setDifficulty(key as "easy" | "medium" | "hard");
                  }}
                  className={`p-3 rounded-md transition-all ${
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
                >
                  {setting.name}
                  <div className="text-xs mt-1">
                    {setting.pairs} pairs
                  </div>
                </button>
              ))}
            </div>

            <div className="relative mt-4">
              <button 
                className="neumorphic-button w-full px-4 py-3 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg hover:from-purple-600 hover:to-pink-600 transition-all"
                onClick={() => audioRefs.current.click.play()}
              >
                + Add Custom Images ({customImages.length}/{DIFFICULTY_SETTINGS[difficulty].pairs})
              </button>
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handleImageUpload}
                className="absolute inset-0 opacity-0 cursor-pointer"
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
                        onClick={() => openImageModal(img)}
                      />
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          audioRefs.current.click.play();
                          removeImage(i);
                        }}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-600 transition-colors"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex flex-col items-center space-y-4 pt-4">
              <button
                onClick={() => {
                  audioRefs.current.punch.play();
                  handleStartGame();
                }}
                className="mt-2 px-8 py-4 text-xl font-bold text-white rounded-full bg-gradient-to-r from-purple-500 via-pink-500 to-red-500 shadow-lg hover:scale-105 transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={customImages.length > DIFFICULTY_SETTINGS[difficulty].pairs}
              >
                🎮 Start Game
              </button>

              <div className="flex space-x-4">
                <button
                  onClick={() => {
                    audioRefs.current.click.play();
                    setShowScores(!showScores);
                  }}
                  className="text-blue-600 hover:underline dark:text-blue-400"
                >
                  {showScores ? "Hide Scores" : "View High Scores"}
                </button>
                <button
                  onClick={() => {
                    audioRefs.current.click.play();
                    setShowTutorial(!showTutorial);
                  }}
                  className="text-purple-600 hover:underline dark:text-purple-400"
                >
                  {showTutorial ? "Hide Tutorial" : "How to Play"}
                </button>
              </div>
            </div>

            {showTutorial && (
              <div className={`mt-4 p-4 rounded-lg ${
                theme === "light" ? "bg-blue-50" : "bg-gray-700"
              }`}>
                <h3 className="font-bold mb-2">How to Play</h3>
                <ul className="text-left space-y-2 text-sm">
                  <li>• Click on tiles to flip them over and reveal the image</li>
                  <li>• Match two identical images to make them disappear</li>
                  <li>• Try to find all pairs in the fewest moves and shortest time</li>
                  <li>• Higher difficulties have more pairs to match</li>
                  <li>• You can upload your own images for a personalized game</li>
                  <li>• Use hints (💡) to reveal a matching pair temporarily</li>
                </ul>
              </div>
            )}

            {showScores && (
              <div className={`mt-4 rounded-lg p-4 ${
                theme === "light" ? "bg-white/90" : "bg-gray-700/90"
              }`}>
                <div className="flex justify-between items-center mb-2">
                  <h3 className="font-bold text-lg">Leaderboard</h3>
                  <button 
                    onClick={clearScores}
                    className="text-xs bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600 transition-colors"
                  >
                    Clear Scores
                  </button>
                </div>
                {scores.length === 0 ? (
                  <p className="text-gray-500">No scores yet! Play a game to appear here.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2">Rank</th>
                          <th className="text-left">Name</th>
                          <th className="text-left">Difficulty</th>
                          <th className="text-right">Moves</th>
                          <th className="text-right">Time</th>
                          <th className="text-right">Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {scores.map((score, i) => (
                          <tr 
                            key={i} 
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
                            <td>{score.name || "Anonymous"}</td>
                            <td>{DIFFICULTY_SETTINGS[score.difficulty].name}</td>
                            <td className="text-right">{score.moves}</td>
                            <td className="text-right">{formatTime(score.time)}</td>
                            <td className="text-right">{score.date}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="w-full max-w-5xl flex flex-col items-center relative p-4">
          {showConfetti && (
            <div className="confetti-container absolute top-0 left-0 w-full h-full pointer-events-none">
              {[...Array(150)].map((_, i) => (
                <div
                  key={i}
                  className="confetti"
                  style={{
                    left: `${Math.random() * 100}vw`,
                    animationDelay: `${Math.random() * 5}s`,
                    animationName: "fall",
                    animationDuration: `${Math.random() * 2 + 3}s`,
                    fontSize: `${Math.random() * 10 + 15}px`,
                    color: `hsl(${Math.random() * 360}, 100%, 50%)`,
                  }}
                >
                  {["🏆", "🎉", "✨", "🌟", "🎊", "💎", "🥇", "👑"][Math.floor(Math.random() * 8)]}
                </div>
              ))}
            </div>
          )}

          <div className="w-full flex justify-between items-center mb-6">
            <div className="flex items-center space-x-4">
              {playerName && (
                <div className="text-2xl md:text-4xl font-bold">
                  <span className="bg-gradient-to-r from-purple-600 via-pink-500 to-red-500 bg-clip-text text-transparent drop-shadow-md">
                    {playerName}
                  </span>
                </div>
              )}
              <span className={`text-lg px-3 py-1 rounded-full ${
                difficulty === "easy" 
                  ? "bg-green-100 text-green-800" 
                  : difficulty === "medium" 
                    ? "bg-blue-100 text-blue-800" 
                    : "bg-red-100 text-red-800"
              }`}>
                {DIFFICULTY_SETTINGS[difficulty].name}
              </span>
            </div>

            <div className="flex items-center space-x-4">
              <button
                onClick={() => {
                  audioRefs.current.click.play();
                  setTheme(theme === "light" ? "dark" : "light");
                }}
                className="p-2 rounded-full bg-white bg-opacity-30 hover:bg-opacity-50 transition-colors"
              >
                {theme === "light" ? "🌙" : "☀️"}
              </button>
              <button
                onClick={handleRestart}
                className="bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white font-bold py-2 px-4 rounded shadow transition-all"
              >
                🏠 Main Menu
              </button>
            </div>
          </div>

          <div className="mb-6 flex justify-between w-full px-6 text-xl font-semibold">
            <div className="flex flex-wrap gap-4 justify-center">
              <div className="bg-gradient-to-r from-purple-600 via-pink-500 to-red-500 bg-clip-text text-transparent drop-shadow-md">
                🏃 Moves: <b>{moves}</b>
              </div>
              <div className="bg-gradient-to-r from-purple-600 via-pink-500 to-red-500 bg-clip-text text-transparent drop-shadow-md">
                ✅ Matches: <b>{matches}/{DIFFICULTY_SETTINGS[difficulty].pairs}</b>
              </div>
              <div className="bg-gradient-to-r from-purple-600 via-pink-500 to-red-500 bg-clip-text text-transparent drop-shadow-md">
                ⏱️ Time: <b>{formatTime(timer)}</b>
              </div>
              <button
                onClick={showHint}
                disabled={hintCount <= 0 || flippedTiles.length > 0 || gameOver}
                className={`px-3 py-1 rounded-full flex items-center gap-1 ${
                  hintCount <= 0 || flippedTiles.length > 0 || gameOver
                    ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                    : "bg-yellow-500 text-white hover:bg-yellow-600 cursor-pointer"
                } transition-colors`}
              >
                💡 Hint ({hintCount})
              </button>
            </div>
          </div>

          {gameOver && (
            <div className="absolute inset-0 bg-black/70 flex items-center justify-center z-10 rounded-lg backdrop-blur-sm">
              <div className={`p-8 rounded-lg shadow-xl text-center max-w-md w-full ${
                theme === "light" ? "bg-white" : "bg-gray-800"
              }`}>
                <h2 className="text-3xl font-bold mb-4 bg-gradient-to-r from-purple-600 via-pink-500 to-red-500 bg-clip-text text-transparent">
                  🎉 You Win! 🎉
                </h2>
                <div className="space-y-2 mb-6">
                  <p className="text-xl">Completed in <b>{moves}</b> moves</p>
                  <p className="text-xl">Time: <b>{formatTime(timer)}</b></p>
                  <p className="text-xl">Difficulty: <b>{DIFFICULTY_SETTINGS[difficulty].name}</b></p>
                  <p className="text-xl">Hints remaining: <b>{hintCount}</b></p>
                </div>
                <div className="flex space-x-4 justify-center">
                  <button
                    onClick={() => {
                      audioRefs.current.click.play();
                      handleNewGame();
                    }}
                    className="px-6 py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg hover:from-blue-600 hover:to-purple-600 transition-all shadow"
                  >
                    🔄 Play Again
                  </button>
                  <button
                    onClick={() => {
                      audioRefs.current.click.play();
                      handleRestart();
                    }}
                    className="px-6 py-2 bg-gradient-to-r from-gray-500 to-gray-700 text-white rounded-lg hover:from-gray-600 hover:to-gray-800 transition-all shadow"
                  >
                    🏠 Main Menu
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className={`grid gap-3 w-full ${
            `grid-cols-${DIFFICULTY_SETTINGS[difficulty].columns}`
          }`}>
            {tiles.map((tile, index) => (
              <div
                key={tile.id}
                className={`tile-container aspect-square relative ${
                  tile.animate ? "spin-on-match pop-on-match" : ""
                } ${tile.isMatched ? "glow" : ""} ${
                  hoveredTile === index ? "scale-105" : ""
                } transition-transform duration-200`}
                onClick={() => handleTileClick(index)}
                onMouseEnter={() => setHoveredTile(index)}
                onMouseLeave={() => setHoveredTile(null)}
              >
                <div
                  className={`tile-inner ${
                    tile.isFlipped || tile.isMatched ? "tile-flipped" : ""
                  }`}
                >
                  <div className={`tile-face tile-front flex items-center justify-center ${
                    theme === "light" 
                      ? "border border-gray-300 bg-white" 
                      : "border border-gray-600 bg-gray-800"
                  } ${tile.isHinted ? "hint-glow" : ""}`}>
                    <span className="text-3xl opacity-70">❓</span>
                  </div>
                  <div className="tile-face tile-back flex items-center justify-center">
                    <img
                      src={tile.content}
                      alt="Tile Content"
                      className="w-full h-full object-cover rounded-lg"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 text-center">
            <button
              onClick={() => {
                audioRefs.current.click.play();
                handleNewGame();
              }}
              className="px-6 py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg hover:from-blue-600 hover:to-purple-600 transition-all shadow"
            >
              🔄 Restart Game
            </button>
          </div>
        </div>
      )}

      {showImageModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full p-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">Image Preview</h3>
              <button 
                onClick={() => {
                  audioRefs.current.click.play();
                  setShowImageModal(false);
                }}
                className="text-2xl hover:text-red-500"
              >
                &times;
              </button>
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
