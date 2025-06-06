import React, { useState, useEffect, useCallback, useRef } from "react";
import "./animations.css";

interface Tile {
  id: number;
  content: string;
  isFlipped: boolean;
  isMatched: boolean;
  animate: boolean;
  rumble?: boolean;
}

interface Score {
  name: string;
  moves: number;
  date: string;
}

const MemoryTileGame = () => {
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
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [volume, setVolume] = useState(0.7);
  const audioRefs = useRef<Record<string, HTMLAudioElement>>({});

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
    };

    // Set initial volume
    Object.values(audioRefs.current).forEach(audio => {
      audio.volume = volume;
    });

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

  const generateAvatar = useCallback(() => {
    const seed = Math.random().toString(36).substring(7);
    return `https://api.dicebear.com/9.x/fun-emoji/svg?seed=${seed}`;
  }, []);

  const generateDefaultImages = useCallback(() => {
    const numPairs = difficulty === "easy" ? 4 : difficulty === "medium" ? 6 : 8;
    const avatars = [];
    for (let i = 0; i < numPairs; i++) {
      avatars.push(generateAvatar());
      avatars.push(generateAvatar());
    }
    return avatars;
  }, [generateAvatar, difficulty]);

  const initializeGame = useCallback(() => {
    const numPairs = difficulty === "easy" ? 4 : difficulty === "medium" ? 6 : 8;
    let imagePool: string[];

    if (customImages.length >= numPairs) {
      imagePool = customImages.slice(0, numPairs);
    } else if (customImages.length > 0) {
      const remaining = numPairs - customImages.length;
      const generated = Array(remaining)
        .fill(null)
        .map(() => generateAvatar());
      imagePool = [...customImages, ...generated];
    } else {
      imagePool = generateDefaultImages();
    }

    const pairs = imagePool.slice(0, numPairs);
    const duplicatedPairs = [...pairs, ...pairs];
    const shuffled = duplicatedPairs.sort(() => Math.random() - 0.5);

    const initialTiles: Tile[] = shuffled.map((content, index) => ({
      id: index,
      content,
      isFlipped: false,
      isMatched: false,
      animate: false,
    }));

    setTiles(initialTiles);
    setFlippedTiles([]);
    setMoves(0);
    setMatches(0);
    setTimer(0);
    setIsTimerRunning(true);
    setGameOver(false);
    setShowConfetti(false);
  }, [customImages, generateAvatar, generateDefaultImages, difficulty]);

  useEffect(() => {
    if (!showSplash) initializeGame();
  }, [initializeGame, showSplash]);

  useEffect(() => {
    const totalPairs = difficulty === "easy" ? 4 : difficulty === "medium" ? 6 : 8;
    if (matches === totalPairs) {
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
          date: new Date().toLocaleDateString(),
        };
        setScores(prev => [...prev, newScore].sort((a, b) => a.moves - b.moves).slice(0, 10));
      }
    }
  }, [matches, difficulty, playerName, moves]);

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
        i === index ? { ...tile, isFlipped: true } : tile,
      ),
    );

    if (newFlipped.length === 2) {
      setMoves((m) => m + 1);
      setTimeout(() => checkForMatch(newFlipped[0], newFlipped[1]), 800);
    }
  };

  const checkForMatch = (i1: number, i2: number) => {
    if (tiles[i1].content === tiles[i2].content) {
      audioRefs.current.match.play();
      audioRefs.current.rumble.play();

      setMatches((m) => m + 1);

      const newTiles = tiles.map((tile, i) =>
        i === i1 || i === i2
          ? { ...tile, isMatched: true, animate: true }
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
          i === i1 || i === i2 ? { ...tile, isFlipped: false } : tile,
        ),
      );
    }
    setFlippedTiles([]);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files);
    setImageUploads(files);

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

  const handleRestart = () => {
    setShowSplash(true);
    setIsTimerRunning(false);
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

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const removeImage = (index: number) => {
    setCustomImages(prev => prev.filter((_, i) => i !== index));
    setImageUploads(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div
      className={`min-h-screen ${
        showSplash
          ? "bg-white"
          : theme === "light"
          ? "bg-gradient-to-br from-blue-300 via-purple-200 to-pink-300"
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
    >
      {showSplash ? (
        <div className={`text-center p-8 space-y-6 max-w-lg w-full rounded-xl shadow-lg ${
          theme === "light" 
            ? "bg-gradient-to-br from-blue-300 via-purple-200 to-pink-300" 
            : "bg-gradient-to-br from-gray-700 via-gray-800 to-gray-900"
        }`}>
          <h1 className="text-3xl font-bold mb-4">
            <span className="bg-gradient-to-r from-purple-500 via-pink-500 to-red-500 bg-clip-text text-transparent">
              Puzzle Pals
            </span>
          </h1>
          <p className="text-lg">A memory card flip game</p>
          
          <div className="flex justify-center my-4">
            <img
              src="./pals.svg"
              alt="Puzzle Pals Logo"
              className="w-64 h-64 mx-auto"
            />
          </div>

          <div className="space-y-4">
            <input
              type="text"
              value={playerName}
              onChange={handleNameChange}
              placeholder="Player Name (optional)"
              className="mt-2 p-2 w-full border rounded-md shadow-sm"
            />

            <div className="flex space-x-2">
              <button
                onClick={() => setTheme(theme === "light" ? "dark" : "light")}
                className="px-4 py-2 rounded-md bg-gray-200 hover:bg-gray-300"
              >
                {theme === "light" ? "🌙 Dark" : "☀️ Light"}
              </button>
              
              <div className="flex-1">
                <label className="block text-sm mb-1">Volume</label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={volume}
                  onChange={(e) => setVolume(parseFloat(e.target.value))}
                  className="w-full"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => setDifficulty("easy")}
                className={`p-2 rounded-md ${difficulty === "easy" ? "bg-green-500 text-white" : "bg-gray-200"}`}
              >
                Easy
              </button>
              <button
                onClick={() => setDifficulty("medium")}
                className={`p-2 rounded-md ${difficulty === "medium" ? "bg-blue-500 text-white" : "bg-gray-200"}`}
              >
                Medium
              </button>
              <button
                onClick={() => setDifficulty("hard")}
                className={`p-2 rounded-md ${difficulty === "hard" ? "bg-red-500 text-white" : "bg-gray-200"}`}
              >
                Hard
              </button>
            </div>

            <div className="relative mt-4">
              <button className="neumorphic-button w-full px-4 py-2 rounded-lg bg-white shadow-md border">
                + Add Custom Images ({customImages.length}/{difficulty === "easy" ? 4 : difficulty === "medium" ? 6 : 8})
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
                    <div key={i} className="relative">
                      <img
                        src={img}
                        alt="Preview"
                        className="w-16 h-16 rounded-lg object-cover border"
                      />
                      <button
                        onClick={() => removeImage(i)}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={() => {
                audioRefs.current.punch.play();
                handleStartGame();
              }}
              className="mt-6 px-8 py-4 text-xl font-bold text-white rounded-full bg-gradient-to-r from-purple-500 via-pink-500 to-red-500 shadow-lg hover:scale-105 transition-transform"
              disabled={customImages.length > (difficulty === "easy" ? 4 : difficulty === "medium" ? 6 : 8)}
            >
              Start Game
            </button>

            <button
              onClick={() => setShowScores(!showScores)}
              className="text-blue-600 hover:underline mt-4"
            >
              {showScores ? "Hide High Scores" : "View High Scores"}
            </button>

            {showScores && (
              <div className="mt-4 bg-white bg-opacity-80 rounded-lg p-4">
                <h3 className="font-bold mb-2">Leaderboard</h3>
                {scores.length === 0 ? (
                  <p>No scores yet!</p>
                ) : (
                  <ul className="space-y-1">
                    {scores.map((score, i) => (
                      <li key={i} className="flex justify-between">
                        <span>{score.name}</span>
                        <span>{score.moves} moves</span>
                        <span className="text-gray-500 text-sm">{score.date}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            <p className="text-xs italic mt-4">Data is only stored in your browser</p>
          </div>
        </div>
      ) : (
        <div className="w-full max-w-5xl flex flex-col items-center relative p-4">
          {showConfetti && (
            <div className="confetti-container absolute top-0 left-0 w-full h-full pointer-events-none">
              {[...Array(100)].map((_, i) => (
                <div
                  key={i}
                  className="confetti"
                  style={{
                    left: `${Math.random() * 100}vw`,
                    animationDelay: `${Math.random() * 5}s`,
                    animationName: "fall",
                    animationDuration: `${Math.random() * 2 + 3}s`,
                    fontSize: `${Math.random() * 10 + 15}px`,
                  }}
                >
                  {["🏆", "🎉", "✨", "🌟", "🎊"][Math.floor(Math.random() * 5)]}
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
              <span className="text-lg">
                {difficulty === "easy" ? "Easy" : difficulty === "medium" ? "Medium" : "Hard"}
              </span>
            </div>

            <div className="flex items-center space-x-4">
              <button
                onClick={() => setTheme(theme === "light" ? "dark" : "light")}
                className="p-2 rounded-full bg-white bg-opacity-30 hover:bg-opacity-50"
              >
                {theme === "light" ? "🌙" : "☀️"}
              </button>
              <button
                onClick={handleRestart}
                className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
              >
                Menu
              </button>
            </div>
          </div>

          <div className="mb-6 flex justify-between w-full px-6 text-xl font-semibold">
            <div className="flex space-x-6">
              <div className="bg-gradient-to-r from-purple-600 via-pink-500 to-red-500 bg-clip-text text-transparent drop-shadow-md">
                Moves: <b>{moves}</b>
              </div>
              <div className="bg-gradient-to-r from-purple-600 via-pink-500 to-red-500 bg-clip-text text-transparent drop-shadow-md">
                Matches: <b>{matches}/{difficulty === "easy" ? 4 : difficulty === "medium" ? 6 : 8}</b>
              </div>
              <div className="bg-gradient-to-r from-purple-600 via-pink-500 to-red-500 bg-clip-text text-transparent drop-shadow-md">
                Time: <b>{formatTime(timer)}</b>
              </div>
            </div>
          </div>

          {gameOver && (
            <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-10 rounded-lg">
              <div className="bg-white p-8 rounded-lg shadow-xl text-center max-w-md w-full">
                <h2 className="text-3xl font-bold mb-4 bg-gradient-to-r from-purple-600 via-pink-500 to-red-500 bg-clip-text text-transparent">
                  You Win!
                </h2>
                <p className="text-xl mb-2">Completed in {moves} moves</p>
                <p className="text-lg mb-4">Time: {formatTime(timer)}</p>
                <div className="flex space-x-4 justify-center">
                  <button
                    onClick={handleNewGame}
                    className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                  >
                    Play Again
                  </button>
                  <button
                    onClick={handleRestart}
                    className="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
                  >
                    Main Menu
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className={`grid ${
            difficulty === "easy" ? "grid-cols-4" : 
            difficulty === "medium" ? "grid-cols-4 md:grid-cols-6" : 
            "grid-cols-4 md:grid-cols-8"
          } gap-3 w-full`}>
            {tiles.map((tile, index) => (
              <div
                key={tile.id}
                className={`tile-container aspect-square ${
                  tile.animate ? "spin-on-match pop-on-match" : ""
                } ${tile.isMatched ? "glow" : ""}`}
                onClick={() => handleTileClick(index)}
              >
                <div
                  className={`tile-inner ${
                    tile.isFlipped || tile.isMatched ? "tile-flipped" : ""
                  }`}
                >
                  <div className={`tile-face tile-front ${
                    theme === "light" 
                      ? "border border-gray-300 bg-white" 
                      : "border border-gray-600 bg-gray-800"
                  }`}>
                    <span className="text-2xl">🔍</span>
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
              onClick={handleNewGame}
              className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
            >
              Restart
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MemoryTileGame;



