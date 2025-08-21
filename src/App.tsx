import React, { useMemo, useState, useEffect } from "react";

const PLAYERS = {
  1: { name: "Azul", short: "AZ", color: "#2563eb" },
  2: { name: "Vermelho", short: "VM", color: "#dc2626" },
};

type Owner = 0 | 1 | 2;

type Action = "CEL";

function range(n: number) {
  return Array.from({ length: n }, (_, i) => i);
}

function classNames(...xs: Array<string | undefined | false>) {
  return xs.filter(Boolean).join(" ");
}

function generateMatrix(exclude: string[]): { mat: number[][]; det: number } {
  let matrix: number[][];
  let det: number;
  let key: string;
  do {
    matrix = [
      [Math.floor(Math.random() * 9) + 1, Math.floor(Math.random() * 9) + 1],
      [Math.floor(Math.random() * 9) + 1, Math.floor(Math.random() * 9) + 1],
    ];
    det = matrix[0][0] * matrix[1][1] - matrix[0][1] * matrix[1][0];
    key = `${matrix[0][0]},${matrix[0][1]};${matrix[1][0]},${matrix[1][1]}`;
  } while (exclude.includes(key));
  exclude.push(key);
  return { mat: matrix, det };
}

export default function PintandoMatriz() {
  const [N, setN] = useState(6);
  const [turn, setTurn] = useState<1 | 2>(1);
  const [board, setBoard] = useState<Owner[]>(() => Array(36).fill(0));
  const [score, setScore] = useState({ 1: 0, 2: 0 });
  const [painted, setPainted] = useState(0);
  const [winner, setWinner] = useState<0 | 1 | 2>(0);
  const [quiz, setQuiz] = useState<{ open: boolean; mat: number[][]; det: number; message?: string }>({ open: false, mat: [], det: 0 });
  const [usedMatrices, setUsedMatrices] = useState<string[]>([]);
  const [pendingClick, setPendingClick] = useState<{ row: number; col: number } | null>(null);
  const [timeLeft, setTimeLeft] = useState(240); // 4 minutos em segundos

  const resetBoard = (size = N) => {
    setBoard(Array(size * size).fill(0));
    setScore({ 1: 0, 2: 0 });
    setPainted(0);
    setTurn(1);
    setWinner(0);
    setUsedMatrices([]);
    setTimeLeft(240);
  };

  const total = useMemo(() => N * N, [N]);
  const idxOf = (row: number, col: number) => row * N + col;

  const applyPaint = (idx: number, player: 1 | 2) => {
    setBoard((prev) => {
      const next = [...prev];
      const before = next[idx];
      if (before === player) return prev;

      setScore((s) => {
        const ns = { ...s } as any;
        if (before === 1) ns[1] = Math.max(0, ns[1] - 1);
        if (before === 2) ns[2] = Math.max(0, ns[2] - 1);
        ns[player] = ns[player] + 1;
        return ns;
      });
      if (before === 0) setPainted((p) => p + 1);
      next[idx] = player;
      return next;
    });
  };

  const applyPaintBomb2x2 = (row: number, col: number, player: 1 | 2) => {
    for (let r = 0; r < 2; r++) {
      for (let c = 0; c < 2; c++) {
        const newRow = row + r;
        const newCol = col + c;
        if (newRow >= 0 && newRow < N && newCol >= 0 && newCol < N) {
          const idx = idxOf(newRow, newCol);
          applyPaint(idx, player);
        }
      }
    }
  };

  const endTurn = () => {
    setPainted((p) => {
      const willEnd = p >= total;
      if (willEnd) {
        setWinner(score[1] === score[2] ? 0 : score[1] > score[2] ? 1 : 2);
        return p;
      }
      setTurn((t) => (t === 1 ? 2 : 1));
      return p;
    });
  };

  const askQuiz = () => {
    const { mat, det } = generateMatrix(usedMatrices);
    setQuiz({ open: true, mat, det, message: '' });
  };

  const resolveQuiz = (ok: boolean) => {
    if (!pendingClick) return;
    const player = turn;
    if (ok) {
      const chance = Math.random();
      if (chance < 0.3) {
        setQuiz((q) => ({ ...q, message: 'BOMBA DE TINTA!!!!💣💣' }));
        setTimeout(() => {
          applyPaintBomb2x2(pendingClick.row, pendingClick.col, player);
          endTurn();
          setQuiz({ open: false, mat: [], det: 0, message: '' });
          setPendingClick(null);
        }, 1000);
      } else {
        setQuiz((q) => ({ ...q, message: 'Resposta correta!' }));
        setTimeout(() => {
          const idx = idxOf(pendingClick.row, pendingClick.col);
          applyPaint(idx, player);
          endTurn();
          setQuiz({ open: false, mat: [], det: 0, message: '' });
          setPendingClick(null);
        }, 1000);
      }
    } else {
      setQuiz((q) => ({ ...q, message: `Resposta errada! Determinante correto: ${quiz.det}` }));
      setTimeout(() => {
        endTurn();
        setQuiz({ open: false, mat: [], det: 0, message: '' });
        setPendingClick(null);
      }, 1500);
    }
  };

  const handleCellClick = (row: number, col: number) => {
    if (winner || quiz.open) return;
    setPendingClick({ row, col });
    askQuiz();
  };

  const handleResize = (size: number) => {
    setN(size);
    setTimeout(() => resetBoard(size), 0);
  };

  // Temporizador de 4 minutos
  useEffect(() => {
    if (winner !== 0) return;
    if (timeLeft <= 0) {
      endGameByTime();
      return;
    }
    const timer = setInterval(() => setTimeLeft(t => t - 1), 1000);
    return () => clearInterval(timer);
  }, [timeLeft, winner]);

  const endGameByTime = () => {
    const winnerByTime = score[1] === score[2] ? 0 : score[1] > score[2] ? 1 : 2;
    setWinner(winnerByTime);
  };

  return (
    <div className="min-h-screen w-full bg-slate-950 text-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-[1fr,340px] gap-6">
        <div className="bg-slate-900 rounded-2xl p-4 shadow-xl border border-slate-800">
          <header className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <h1 className="text-xl md:text-2xl font-bold">Pintando a Matriz</h1>
            <div className="flex items-center gap-2 text-sm">
              {[4, 5, 6, 7, 8].map((s) => (
                <button key={s} onClick={() => handleResize(s)} className={classNames("px-3 py-1 rounded-full border", s === N ? "bg-slate-100 text-slate-900 border-slate-100" : "bg-slate-800 border-slate-700 hover:bg-slate-700")}>{s}×{s}</button>
              ))}
              <button onClick={() => resetBoard()} className="ml-2 px-3 py-1 rounded-full bg-slate-100 text-slate-900 hover:bg-white transition border border-slate-100">Reiniciar</button>
            </div>
          </header>

          <div className="mx-auto rounded-xl overflow-hidden border border-slate-800 bg-slate-900" style={{ width: Math.min(N * 60, 720) }}>
            <div className="grid" style={{ gridTemplateColumns: `repeat(${N}, minmax(0, 1fr))` }}>
              {range(N).map((r) => range(N).map((c) => {
                const idx = r * N + c;
                const owner = board[idx];
                const color = owner === 0 ? "#0f172a" : PLAYERS[owner].color;
                return (
                  <button key={`${r}-${c}`} onClick={() => handleCellClick(r, c)} className="aspect-square relative border flex items-center justify-center transition border-slate-800 hover:brightness-110" style={{ backgroundColor: color }}>
                    {owner !== 0 && <span className="absolute bottom-1 right-1 text-[10px] opacity-80">{PLAYERS[owner].short}</span>}
                  </button>
                );
              }))}
            </div>
          </div>
        </div>

        <aside className="bg-slate-900 rounded-2xl p-4 shadow-xl border border-slate-800 flex flex-col gap-4">
          <section className="space-y-2">
            <h2 className="text-lg font-semibold">Status</h2>
            <div className="p-3 rounded-xl border border-slate-800 bg-slate-950 flex items-center justify-between font-bold">
              <div className="flex items-center gap-2">
                <span className="inline-block w-4 h-4 rounded-full" style={{ backgroundColor: PLAYERS[turn].color }} />
                Vez de: {PLAYERS[turn].name}
              </div>
            </div>
            <div className="mt-2 font-bold">Progresso: {painted} / {total}</div>
            <div className="mt-1 font-bold">Tempo: {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')}</div>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold">Placar</h2>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="p-3 rounded-xl border border-slate-800 bg-slate-950 flex items-center justify-between">
                <div className="flex items-center gap-2"><span className="inline-block w-3 h-3 rounded-full" style={{ backgroundColor: PLAYERS[1].color }} />Azul</div>
                <div className="font-bold">{score[1]}</div>
              </div>
              <div className="p-3 rounded-xl border border-slate-800 bg-slate-950 flex items-center justify-between">
                <div className="flex items-center gap-2"><span className="inline-block w-3 h-3 rounded-full" style={{ backgroundColor: PLAYERS[2].color }} />Vermelho</div>
                <div className="font-bold">{score[2]}</div>
              </div>
            </div>
          </section>
        </aside>
      </div>

      {quiz.open && pendingClick && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-2xl text-center">
            <h3 className="text-lg font-semibold mb-2">Resolva o Determinante 2×2</h3>
            <p className="text-sm text-slate-200 mb-3">Matriz: [[{quiz.mat[0][0]}, {quiz.mat[0][1]}], [{quiz.mat[1][0]}, {quiz.mat[1][1]}]]</p>
            <input autoFocus type="number"
              className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 outline-none focus:border-slate-600"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const val = parseInt((e.target as HTMLInputElement).value, 10);
                  resolveQuiz(val === quiz.det);
                }
              }}
              placeholder="Digite o determinante"
            />
            {quiz.message && <p className="mt-2 text-sm font-semibold">{quiz.message}</p>}
          </div>
        </div>
      )}

      {winner !== 0 && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-40">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl text-center">
            <h3 className="text-2xl font-extrabold mb-2">Fim de jogo</h3>
            <p className="text-slate-200 mb-6">
              {winner === 0 ? "Empate!" : `${PLAYERS[winner].name} Ganhou!`}
            </p>
            <button onClick={() => resetBoard()} className="px-4 py-2 rounded-lg bg-slate-100 text-slate-900 font-semibold hover:bg-white">Jogar novamente</button>
          </div>
        </div>
      )}
    </div>
  );
}
