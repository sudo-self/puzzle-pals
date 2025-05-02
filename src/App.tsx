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

  const audioMatch = new Audio("./bong.mp3");
  const audioFlip = new Audio(
    "https://www.myinstants.com/media/sounds/flip.mp3"
  );
  const audioWin = new Audio("./bell.mp3");
  const audioFail = new Audio("./fail.mp3");
  const audioRumble = new Audio("./wee.mp3");
  const audioGameMusic = new Audio("./game.mp3");

  const generateAvatar = useCallback(() => {
    const seed = Math.random().toString(36).substring(7);
    return `https://api.dicebear.com/9.x/fun-emoji/svg?seed=${seed}`;
  }, []);

  const generateDefaultImages = useCallback(() => {
    const numPairs = 6;
    const avatars = [];
    for (let i = 0; i < numPairs; i++) {
      avatars.push(generateAvatar());
      avatars.push(generateAvatar());
    }
    return avatars;
  }, [generateAvatar]);

  const initializeGame = useCallback(() => {
    const numPairs = 6;
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
    setGameOver(false);
    setShowConfetti(false);
  }, [customImages, generateAvatar, generateDefaultImages]);

  useEffect(() => {
    if (!showSplash) initializeGame();
  }, [initializeGame, showSplash]);

  useEffect(() => {
    if (matches === 6) {
      setGameOver(true);
      audioWin.play();
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 5000);
    }
  }, [matches]);

  const handleTileClick = (index: number) => {
    if (
      flippedTiles.length === 2 ||
      tiles[index].isFlipped ||
      tiles[index].isMatched
    )
      return;

    audioFlip.play();
    const newFlipped = [...flippedTiles, index];
    setFlippedTiles(newFlipped);

    setTiles(
      tiles.map((tile, i) =>
        i === index ? { ...tile, isFlipped: true } : tile
      )
    );

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

      const newTiles = tiles.map((tile, i) =>
        i === i1 || i === i2
          ? { ...tile, isMatched: true, animate: true }
          : tile
      );
      setTiles(newTiles);

      setTimeout(() => {
        setTiles((prev) =>
          prev.map((tile) => ({ ...tile, animate: false }))
        );
      }, 750);
    } else {
      audioFail.play();
      setTiles(
        tiles.map((tile, i) =>
          i === i1 || i === i2 ? { ...tile, isFlipped: false } : tile
        )
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

  return (
    <div
      className={`min-h-screen ${
        showSplash
          ? "bg-white"
          : "bg-gradient-to-br from-blue-300 via-purple-200 to-pink-300"
      } flex items-center justify-center`}
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
        <div className="text-center p-8 space-y-6 max-w-lg w-full bg-gradient-to-br from-blue-300 via-purple-200 to-pink-300 rounded-xl shadow-lg">
          <p>puzzle.JesseJesse.com</p>
          <p className="mt-6 px-8 py-4 text-xl font-bold text-white rounded-full bg-gradient-to-r from-purple-500 via-pink-500 to-red-500 shadow-lg">
            Welcome to Puzzle Pals!
          </p>
          <img
            src="./pals.svg"
            alt="Puzzle Pals Logo"
            className="w-96 h-96 mx-auto"
          />
          <input
            type="text"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            placeholder="Player Name (optional)"
            className="mt-2 p-2 w-full border rounded-md shadow-sm"
          />
          <div className="relative mt-4">
            <button className="neumorphic-button w-full px-4 py-2 rounded-lg bg-white shadow-md border">
              + Add images
            </button>
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={handleImageUpload}
              className="absolute inset-0 opacity-0 cursor-pointer"
            />
          </div>
          <div className="grid grid-cols-4 gap-2 mt-4">
            {customImages.map((img, i) => (
              <img
                key={i}
                src={img}
                alt="Preview"
                className="w-16 h-16 rounded-lg object-cover"
              />
            ))}
          </div>
          <button
            onClick={() => setShowSplash(false)}
            className="mt-6 px-8 py-4 text-xl font-bold text-white rounded-full bg-gradient-to-r from-purple-500 via-pink-500 to-red-500 shadow-lg"
          >
            Start Game
          </button>
          <p>
            <i>Data of ANY kind is not saved by this app</i>
          </p>
        </div>
      ) : (
        <div className="w-full max-w-5xl flex flex-col items-center relative">
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
                  🎉
                </div>
              ))}
            </div>
          )}
          {playerName && (
            <div className="text-6xl font-bold text-gray-800 mb-6 animate-fade-in">
              <span className="bg-gradient-to-r from-purple-600 via-pink-500 to-red-500 bg-clip-text text-transparent drop-shadow-md">
                {playerName}
              </span>
            </div>
          )}
          <div className="mb-6 flex justify-between w-full px-6 text-xl font-semibold">
            <div className="bg-gradient-to-r from-purple-600 via-pink-500 to-red-500 bg-clip-text text-transparent drop-shadow-md">
              Moves: <b>{moves}</b> | Pals Made: <b>{matches}</b>
            </div>
            <button
              onClick={handleRestart}
              className="tgl-btn bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
            >
              X End Game
            </button>
          </div>

          <div className="grid grid-cols-4 gap-4">
            {tiles.map((tile, index) => (
              <div
                key={tile.id}
                className={`tile-container w-24 h-24 md:w-32 md:h-32 cursor-pointer ${
                  tile.animate ? "spin-on-match pop-on-match" : ""
                } ${tile.isMatched ? "glow" : ""}`}
                onClick={() => handleTileClick(index)}
              >
                <div
                  className={`tile-inner ${
                    tile.isFlipped || tile.isMatched ? "tile-flipped" : ""
                  }`}
                >
                  <div className="tile-face tile-front border border-gray-300 bg-white">
                    <span className="text-2xl text-gray-600">❓</span>
                  </div>
                  <div className="tile-face tile-back">
                    <img
                      src={tile.content}
                      alt={`Tile ${tile.id}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default MemoryTileGame;








