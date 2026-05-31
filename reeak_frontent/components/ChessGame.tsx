'use client';

import { useCallback, useMemo, useState } from 'react';
import styles from './ChessGame.module.css';
import { GameState, MoveHistoryItem, Player, RekBoard } from '@/types/chess';

const BOARD_SIZE = 8;
const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

type Square = {
  row: number;
  col: number;
};

function cloneBoard(board: RekBoard): RekBoard {
  return board.map((row) => row.map((piece) => (piece ? { ...piece } : null)));
}

function createInitialBoard(): RekBoard {
  const board: RekBoard = Array.from({ length: BOARD_SIZE }, () =>
    Array.from({ length: BOARD_SIZE }, () => null)
  );

  for (let col = 0; col < BOARD_SIZE; col += 1) {
    board[2][col] = { player: 'blue', role: 'commoner' };
    board[5][col] = { player: 'red', role: 'commoner' };

    if (col > 0) {
      board[0][col] = { player: 'blue', role: 'commoner' };
    }

    if (col < BOARD_SIZE - 1) {
      board[7][col] = { player: 'red', role: 'commoner' };
    }
  }

  board[1][0] = { player: 'blue', role: 'king' };
  board[6][7] = { player: 'red', role: 'king' };

  return board;
}

function squareName({ row, col }: Square): string {
  return `${FILES[col]}${BOARD_SIZE - row}`;
}

function isSameSquare(first: Square | null, second: Square): boolean {
  return first?.row === second.row && first.col === second.col;
}

function isPathClear(board: RekBoard, from: Square, to: Square): boolean {
  const rowStep = Math.sign(to.row - from.row);
  const colStep = Math.sign(to.col - from.col);
  let row = from.row + rowStep;
  let col = from.col + colStep;

  while (row !== to.row || col !== to.col) {
    if (board[row][col]) {
      return false;
    }

    row += rowStep;
    col += colStep;
  }

  return true;
}

function isLegalMove(board: RekBoard, from: Square, to: Square, turn: Player): boolean {
  const piece = board[from.row][from.col];
  const target = board[to.row][to.col];
  const movesInStraightLine = from.row === to.row || from.col === to.col;
  const staysStill = from.row === to.row && from.col === to.col;

  if (!piece || piece.player !== turn || piece.role === 'king' || !movesInStraightLine || staysStill) {
    return false;
  }

  if (target?.player === turn) {
    return false;
  }

  return isPathClear(board, from, to);
}

function getLegalMoves(board: RekBoard, from: Square | null, turn: Player): Square[] {
  if (!from) {
    return [];
  }

  return Array.from({ length: BOARD_SIZE }, (_, row) =>
    Array.from({ length: BOARD_SIZE }, (_, col) => ({ row, col }))
  )
    .flat()
    .filter((to) => isLegalMove(board, from, to, turn));
}

function getNextPlayer(player: Player): Player {
  return player === 'red' ? 'blue' : 'red';
}

function getPlayerLabel(player: Player): string {
  return player === 'red' ? 'Red' : 'Blue';
}

export default function ChessGame() {
  const [board, setBoard] = useState<RekBoard>(() => createInitialBoard());
  const [turn, setTurn] = useState<Player>('red');
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
  const [gameState, setGameState] = useState<GameState>('active');
  const [winner, setWinner] = useState<Player | null>(null);
  const [moveHistory, setMoveHistory] = useState<MoveHistoryItem[]>([]);
  const [boardHistory, setBoardHistory] = useState<RekBoard[]>([]);

  const legalMoves = useMemo(
    () => getLegalMoves(board, selectedSquare, turn),
    [board, selectedSquare, turn]
  );

  const resetGame = useCallback((): void => {
    setBoard(createInitialBoard());
    setTurn('red');
    setSelectedSquare(null);
    setGameState('active');
    setWinner(null);
    setMoveHistory([]);
    setBoardHistory([]);
  }, []);

  const undoMove = useCallback((): void => {
    const previousBoard = boardHistory.at(-1);

    if (!previousBoard) {
      return;
    }

    setBoard(previousBoard);
    setBoardHistory((prev) => prev.slice(0, -1));
    setMoveHistory((prev) => prev.slice(0, -1));
    setTurn((prev) => getNextPlayer(prev));
    setSelectedSquare(null);
    setGameState('active');
    setWinner(null);
  }, [boardHistory]);

  const makeMove = useCallback((from: Square, to: Square): void => {
    if (!isLegalMove(board, from, to, turn)) {
      return;
    }

    const nextBoard = cloneBoard(board);
    const piece = nextBoard[from.row][from.col];
    const captured = nextBoard[to.row][to.col];

    if (!piece) {
      return;
    }

    nextBoard[to.row][to.col] = piece;
    nextBoard[from.row][from.col] = null;

    setBoardHistory((prev) => [...prev, cloneBoard(board)]);
    setBoard(nextBoard);
    setMoveHistory((prev) => [
      ...prev,
      {
        from: squareName(from),
        to: squareName(to),
        piece: piece.role,
        player: piece.player,
        captured: captured?.role,
      },
    ]);
    setSelectedSquare(null);

    if (captured?.role === 'king') {
      setWinner(piece.player);
      setGameState('finished');
      return;
    }

    setTurn(getNextPlayer(turn));
  }, [board, turn]);

  const handleSquareClick = useCallback((square: Square): void => {
    if (gameState === 'finished') {
      return;
    }

    const piece = board[square.row][square.col];

    if (selectedSquare && isLegalMove(board, selectedSquare, square, turn)) {
      makeMove(selectedSquare, square);
      return;
    }

    if (piece?.player === turn) {
      setSelectedSquare(square);
      return;
    }

    setSelectedSquare(null);
  }, [board, gameState, makeMove, selectedSquare, turn]);

  const statusMessage = winner
    ? `${getPlayerLabel(winner)} captured the king and wins`
    : `${getPlayerLabel(turn)} to move`;

  return (
    <div className={styles.container}>
      <div className={styles.gameInfo}>
        <h1>Leung Rek</h1>
        <div className={styles.status}>{statusMessage}</div>
        <div className={styles.buttonGroup}>
          <button onClick={resetGame} className={styles.resetButton}>
            New Game
          </button>
          <button
            onClick={undoMove}
            className={styles.undoButton}
            disabled={moveHistory.length === 0}
          >
            Undo Move
          </button>
        </div>
      </div>

      <div className={styles.boardWrapper}>
        <div className={styles.board} role="grid" aria-label="Leung Rek board">
          {board.map((row, rowIndex) =>
            row.map((piece, colIndex) => {
              const square = { row: rowIndex, col: colIndex };
              const selected = isSameSquare(selectedSquare, square);
              const legal = legalMoves.some((move) => isSameSquare(move, square));
              const capturable = legal && Boolean(piece && piece.player !== turn);

              return (
                <button
                  key={`${rowIndex}-${colIndex}`}
                  className={[
                    styles.square,
                    (rowIndex + colIndex) % 2 === 0 ? styles.lightSquare : styles.darkSquare,
                    selected ? styles.selectedSquare : '',
                    legal ? styles.legalSquare : '',
                    capturable ? styles.captureSquare : '',
                  ].join(' ')}
                  onClick={() => handleSquareClick(square)}
                  type="button"
                  role="gridcell"
                  aria-label={squareName(square)}
                >
                  {piece && (
                    <span className={`${styles.piece} ${styles[piece.player]}`}>
                      <span className={styles.pieceRole}>
                        {piece.role === 'king' ? 'SD' : 'KON'}
                      </span>
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>

        {moveHistory.length > 0 && (
          <div className={styles.moveHistory}>
            <h3>Move History</h3>
            <div className={styles.moveList}>
              {moveHistory.map((move, index) => (
                <div key={`${move.from}-${move.to}-${index}`} className={styles.moveItem}>
                  <span className={styles.moveNumber}>{index + 1}</span>
                  <span className={styles.moveSan}>
                    {getPlayerLabel(move.player)} {move.piece === 'king' ? 'Sdach' : 'Kon'}{' '}
                    {move.from}-{move.to}
                    {move.captured ? ` x ${move.captured === 'king' ? 'Sdach' : 'Kon'}` : ''}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
