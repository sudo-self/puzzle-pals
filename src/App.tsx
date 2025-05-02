import React, { useState, useEffect, useCallback } from "react";
import "./animations.css";

interface Tile {
  id: number;
  content: string;
  isFlipped: boolean;
  isMatched: boolean;
  animate: boolean;
  rumble?: boolean;
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
  const [level, setLevel] = useState(1); // ← NEW

  const audioMatch = new Audio("./bong.mp3");
  const audioFlip = new Audio("https://www.myinstants.com/media/sounds/flip.mp3");
  const audioWin = new Audio("./bell.mp3");
  const audioFail = new Audio("./fail.mp3");
  const audioRumble = new Audio("./wee.mp3");
  const audioGameMusic = new Audio("./game.mp3");

  const generateAvatar = useCallback(() => {
    const seed = Math.random().toString(36).substring(7);
    return level === 2
      ? `https://api.dicebear.com/9.x/bottts-neutral/svg?seed=${seed}`
      : `https://api.dicebear.com/9.x/fun-emoji/svg?seed=${seed}`;
  }, [level]);

  const generateDefaultImages = useCallback(() => {
    const numPairs = level === 2 ? 8 : 6;
    const avatars = [];
    for (let i = 0; i < numPairs; i++) {
      const avatar = generateAvatar();
      avatars.push(avatar, avatar);
    }
    return avatars;
  }, [generateAvatar, level]);

  const initializeGame = useCallback(() => {
    const numPairs = level === 2 ? 8 : 6;
    let imagePool: string[];

    if (customImages.length >= numPairs) {
      imagePool = customImages.slice(0, numPairs);
    } else if (customImages.length > 0) {
      const remaining = numPairs - customImages.length;
      const generated = Array(remaining).fill(null).map(() => generateAvatar());
      imagePool = [...customImages, ...generated];
    } else {
      imagePool = Array(numPairs).fill(null).map(() => generateAvatar());
    }

    const duplicatedPairs = [...imagePool, ...imagePool];
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
    setGameOver(false);
    setShowConfetti(false);
  }, [customImages, generateAvatar, level]);

  useEffect(() => {
    if (!showSplash) initializeGame();
  }, [initializeGame, showSplash]);

  useEffect(() => {
    const winCondition = level === 2 ? 8 : 6;
    if (matches === winCondition) {
      setGameOver(true);
      audioWin.play();
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 5000);
    }
  }, [matches, level]);

  const handleTileClick = (index: number) => {
    if (
      flippedTiles.length === 2 ||
      tiles[index].isFlipped ||
      tiles[index].isMatched
    ) return;

    audioFlip.play();
    const newFlipped = [...flippedTiles, index];
    setFlippedTiles(newFlipped);

    setTiles(tiles.map((tile, i) => i === index ? { ...tile, isFlipped: true } : tile));

    if (newFlipped.length === 2) {
      setMoves((m) => m + 1);
      setTimeout(() => checkForMatch(newFlipped[0], newFlipped[1]), 800);
    }
  };

  const checkForMatch = (i1: number, i2: number) => {
    if (tiles[i1].content === tiles[i2].content) {
      audioMatch.play();
      audioRumble.play();
      setMatches((m) => m + 1);
      const updated = tiles.map((tile, i) =>
        i === i1 || i === i2 ? { ...tile, isMatched: true, animate: true } : tile
      );
      setTiles(updated);
      setTimeout(() => {
        setTiles((prev) => prev.map((tile) => ({ ...tile, animate: false })));
      }, 750);
    } else {
      audioFail.play();
      setTiles(tiles.map((tile, i) =>
        i === i1 || i === i2 ? { ...tile, isFlipped: false } : tile
      ));
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
            event.target?.result ? resolve(event.target.result as string) : reject();
          };
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
      })
    )
      .then((images) => setCustomImages((prev) => [...prev, ...images]))
      .catch(console.error);

    e.target.value = "";
  };

  const handleRestart = () => {
    setShowSplash(true);
    setCustomImages([]);
    setImageUploads([]);
    setPlayerName("");
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPlayerName(e.target.value);
  };

  const audioStart = new Audio("./start.mp3");

  const handleStartGame = () => {
    audioStart.play();
    audioGameMusic.loop = true;
    audioGameMusic.play();
    setShowSplash(false);
  };

  const nextLevel = () => {
    setLevel(2);
    initializeGame();
  };

  return (
    <div className="p-4">
      {showSplash ? (
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-4">Memory Game</h1>
          <input
            type="text"
            placeholder="Enter your name"
            value={playerName}
            onChange={handleNameChange}
            className="border p-2"
          />
          <button onClick={handleStartGame} className="ml-4 bg-blue-500 text-white p-2 rounded">
            Start Game
          </button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-4 md:grid-cols-6 gap-2">
            {tiles.map((tile) => (
              <div
                key={tile.id}
                onClick={() => handleTileClick(tile.id)}
                className={`cursor-pointer w-24 h-24 border rounded shadow ${
                  tile.isFlipped || tile.isMatched ? "bg-white" : "bg-gray-300"
                } ${tile.animate ? "animate-bounce" : ""}`}
              >
                {(tile.isFlipped || tile.isMatched) && (
                  <img src={tile.content} alt="tile" className="w-full h-full object-contain" />
                )}
              </div>
            ))}
          </div>
          <div className="mt-4 flex justify-between items-center">
            <p>Moves: {moves}</p>
            {gameOver && level === 1 && (
              <button onClick={nextLevel} className="bg-green-500 text-white px-4 py-2 rounded">
                Go to Level 2
              </button>
            )}
            {gameOver && level === 2 && (
              <button onClick={handleRestart} className="bg-purple-500 text-white px-4 py-2 rounded">
                Play Again
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default MemoryTileGame;








