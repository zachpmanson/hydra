"use strict";

import { GameState, boardRows, boardCols, setGameStatus } from "./gamestate.js";
import { roomId, sendMsg } from "./conn.js";

let state1 = new GameState({
  name: `Local Game ${roomId}`,
  target: "game1",
  isLocal: true,
  isOptimistic: false,
});

let state2 = new GameState({
  name: `Remote Game ${roomId}`,
  target: "game2",
  isLocal: false,
  isOptimistic: false,
});

let state2Optimistic = new GameState({
  name: `Remote Game (Optimistic) ${roomId}`,
  target: "game3",
  isLocal: false,
  isOptimistic: true,
});

let foodDrops = [];
let localTick = 1;

const COLOR_MAP = {
  0: "⬜️",
  1: "<span class='pulse'>🟦</span>",
  2: "🟩",
  3: "<span class='pulse'>🍎</span>",
  4: "🟥",
};

function drawBoard(state) {
  let boardText = "";
  for (let r = 0; r < boardRows; r++) {
    boardText += "";
    for (let c = 0; c < boardCols; c++) {
      boardText += ` ${COLOR_MAP[state.board[r][c]]}`;
    }
    boardText += "\n";
  }
  boardText += `\n${state.name}\n`;
  boardText += `tick: ${localTick} ${state.tick}\n`;
  // html += `rows: ${boardRows} cols: ${boardCols}\n`;
  // html += `length: ${state.nLength}\n`;
  // html += `head: ${JSON.stringify(state1.headPos)}\n`;
  // html += "\n";
  // html += state.moves
  //   .slice()
  //   .reverse()`
  //   .map((m) => JSON.stringify(m))
  //   .join("\n");

  document.getElementById(state.target).innerHTML = boardText;
}

export function endGame(localWin, remote = false) {
  if (!localWin) {
    sendMsg({ type: "lost" });
  }
  clearInterval(tickLoop);
  setGameStatus("ended");
  if (confirm(`Game over! You ${localWin ? "won" : "lost"}${remote ? " (remotely)" : ""}`)) {
    location.reload();
  }
}

export function addFood(r, c) {
  state1.board[r][c] = 3;
  state2.board[r][c] = 3;
  state2Optimistic.board[r][c] = 3;
  foodDrops.push({
    r,
    c,
    tick: localTick,
  });
}

export function startGame() {
  tickLoop = setInterval(() => {
    tick(state1, localTick);
    tick(state2Optimistic, localTick);
    localTick++;

    // TODO move spawn food to backend
    if (localTick % 5 === 0 && Math.random() < 0.1) {
      let success = false;
      do {
        const r = Math.floor(Math.random() * boardRows);
        const c = Math.floor(Math.random() * boardCols);
        if (state1.board[r][c] === 0 && state2.board[r][c] === 0) {
          addFood(r, c);
          sendMsg({
            type: "food",
            payload: {
              r,
              c,
              tick: localTick,
            },
          });
          success = true;
        }
      } while (!success);
    }
  }, 200);
}

function runNTicks(state, nTicks) {
  for (let i = 0; i < nTicks; i++) {
    tick(state);
  }
}

function tick(state) {
  const pastTicks = state.moves.filter((m) => m.tick <= state.tick);
  if (state.name === "Remote Game") {
    console.log("Tick", state.tick);
    console.log(state.board.map((r) => r.map((c) => c.toString(2)).join("")).join("\n"));
  }
  // alert(JSON.stringify(pastTicks));
  let currentDir = pastTicks.at(-1)?.dir;

  state.board[state.headPos.r][state.headPos.c] = 2;
  state.tailWipeQueue.push({ ...state.headPos });

  let newHeadPos = { ...state.headPos };

  if (currentDir === "north") {
    newHeadPos.r -= 1;
  } else if (currentDir === "south") {
    newHeadPos.r += 1;
  } else if (currentDir === "east") {
    newHeadPos.c += 1;
  } else if (currentDir === "west") {
    newHeadPos.c -= 1;
  }

  const isEdge = newHeadPos.r < 0 || newHeadPos.r >= boardRows || newHeadPos.c < 0 || newHeadPos.c >= boardCols;

  const isCollision =
    (!isEdge && state.board.at(newHeadPos.r)?.at(newHeadPos.c) === 1) ||
    state.board.at(newHeadPos.r)?.at(newHeadPos.c) === 2;

  if (isEdge) {
    state.board[state.headPos.r][state.headPos.c] = 4;
    if (!state.isOptimistic) {
      setTimeout(() => endGame(!state.isLocal), 200);
    }
  } else if (isCollision) {
    state.board[newHeadPos.r][newHeadPos.c] = 4;
    if (!state.isOptimistic) {
      setTimeout(() => endGame(!state.isLocal), 200);
    }
  } else {
    state.headPos = newHeadPos;

    const isEating = state.board[state.headPos.r][state.headPos.c] === 3;
    if (isEating) {
      // if any screen eats it, remove it from local game
      if (state1.board[state.headPos.r][state.headPos.c] === 3) {
        state1.board[state.headPos.r][state.headPos.c] = 0;
      }

      // if any real player eats it, remove it from remote screen
      if (!state.isOptimistic && state2.board[state.headPos.r][state.headPos.c] === 3) {
        state2.board[state.headPos.r][state.headPos.c] = 0;
      }

      // if optimistic player eats it, remove it from optimistic screen
      if (state2Optimistic.board[state.headPos.r][state.headPos.c] === 3) {
        state2Optimistic.board[state.headPos.r][state.headPos.c] = 0;
      }
    }

    state.board[state.headPos.r][state.headPos.c] = 1;

    if (!isEating && state.tick > 2) {
      let resetCoords = state.tailWipeQueue.shift();
      if (resetCoords) {
        state.board[resetCoords.r][resetCoords.c] = 0;
      }
    }
  }

  drawBoard(state);
  state.tick++;
}

const DIR_MAP = {
  ArrowUp: "north",
  ArrowDown: "south",
  ArrowLeft: "west",
  ArrowRight: "east",
};
const OPPOSITE_MAP = {
  north: "south",
  south: "north",
  east: "west",
  west: "east",
};
const MIRROR_MAP = {
  north: "south",
  south: "north",
};

function handleKey(keyname) {
  const lastMove = state1.moves[state1.moves.length - 1];
  if (lastMove.tick === localTick) {
    return;
  }

  const currentDir = lastMove.dir;

  const newDir = DIR_MAP[keyname];
  if (currentDir === newDir) {
    return;
  }

  if (newDir === OPPOSITE_MAP[currentDir]) {
    return;
  }

  const newMove = {
    r: state1.headPos.r,
    c: state1.headPos.c,
    dir: DIR_MAP[keyname],
    tick: localTick,
  };
  state1.moves.push(newMove);
  sendMsg({
    type: "move",
    payload: {
      ...newMove,
      // dir: MIRROR_MAP[newMove.dir] ?? newMove.dir,
    },
  });
}

export function reconcileRemoteState(newMove) {
  // Add move to remote game state
  state2.moves.push(newMove);

  // figure out how many ticks between the last two moves
  const newMaxTick = state2.moves.at(-1).tick;
  const oldMaxTick = state2.moves.at(-2).tick;
  const tickDiff = newMaxTick - oldMaxTick;

  // fast forward the remote game state to the new max tick
  runNTicks(state2, tickDiff);

  // rollback optimistc game state to the new confirmed remote state
  state2Optimistic = structuredClone(state2);
  state2Optimistic.name = "Remote Game (Optimistic)";
  state2Optimistic.target = "game3";
  state2Optimistic.isOptimistic = true;

  // figure out difference between local and new remote tick
  const liveTickDiff = localTick - newMaxTick;
  // fast forward optimistic game to local tick
  runNTicks(state2Optimistic, liveTickDiff);
}

addEventListener("keydown", (e) => {
  if (e.key in DIR_MAP) {
    handleKey(e.key);
    e.preventDefault();
  }
});
document.getElementById("up-button").addEventListener("click", () => handleKey("ArrowUp"));
document.getElementById("down-button").addEventListener("click", () => handleKey("ArrowDown"));
document.getElementById("left-button").addEventListener("click", () => handleKey("ArrowLeft"));
document.getElementById("right-button").addEventListener("click", () => handleKey("ArrowRight"));

let tickLoop;
