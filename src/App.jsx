import { useMemo, useState } from "react";
import Board3D from "./Board3D.jsx";

const WINNING_LINES = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

function getResult(squares) {
  for (const line of WINNING_LINES) {
    const [first, second, third] = line;
    if (
      squares[first] &&
      squares[first] === squares[second] &&
      squares[first] === squares[third]
    ) {
      return { winner: squares[first], line };
    }
  }
  return null;
}

export default function App() {
  const [squares, setSquares] = useState(Array(9).fill(null));
  const [currentPlayer, setCurrentPlayer] = useState("X");
  const result = useMemo(() => getResult(squares), [squares]);
  const isDraw = !result && squares.every(Boolean);
  const isFinished = Boolean(result || isDraw);

  const statusText = result
    ? `Player ${result.winner} wins!`
    : isDraw
      ? "The game is a draw."
      : `Player ${currentPlayer}'s turn.`;

  function makeMove(index) {
    if (isFinished || squares[index]) return;
    const nextSquares = [...squares];
    nextSquares[index] = currentPlayer;
    setSquares(nextSquares);
    setCurrentPlayer(currentPlayer === "X" ? "O" : "X");
  }

  function resetGame() {
    setSquares(Array(9).fill(null));
    setCurrentPlayer("X");
  }

  return (
    <main className="page">
      <section className="game-shell" aria-labelledby="game-title">
        <header className="game-header">
          <div className="eyebrow">
            <span className="eyebrow-dot" />
            A CLASSIC, REIMAGINED IN 3D
          </div>
          <h1 id="game-title">
            Tic-Tac-Toe <span>3D</span>
          </h1>
          <p>One board, two players. Take turns and make your line.</p>
        </header>

        <section className="game-card" aria-label="Tic-Tac-Toe game">
          <div className="game-topline">
            <div className="players" aria-label="Players">
              <span className={`player player-x ${!isFinished && currentPlayer === "X" ? "player-active" : ""}`}>
                <span className="player-mark">×</span> Player 1
              </span>
              <span className="versus">VS</span>
              <span className={`player player-o ${!isFinished && currentPlayer === "O" ? "player-active" : ""}`}>
                <span className="player-mark">○</span> Player 2
              </span>
            </div>
            <p
              className={`status ${result ? "status-won" : ""} ${!isFinished ? `status-${currentPlayer.toLowerCase()}` : ""}`}
              role="status"
            >
              {statusText}
            </p>
          </div>

          <Board3D
            squares={squares}
            winningLine={result?.line ?? []}
            onMove={makeMove}
            statusText={statusText}
          />

          <p className="instructions" id="board-instructions">
            Click a tile, or use <kbd>1</kbd>–<kbd>9</kbd> (top-left to bottom-right).
            Arrow keys move the highlight; <kbd>Enter</kbd> places a mark.
          </p>

          <button className="reset-button" type="button" onClick={resetGame}>
            <span aria-hidden="true">↻</span>
            New game
          </button>
        </section>

        <footer className="game-footer">
          <span className="footer-line" />
          <p>Built with React &amp; Three.js</p>
          <span className="footer-line" />
        </footer>
      </section>
    </main>
  );
}
