"use strict";

export const boardCols = 40;
export const boardRows = 30;
export let gameStatus = "lobby";

const COLOR_MAP = {
  0: "<div class='bg-cell'></span>",
  1: "<span class='pulse'>🟦</span>",
  2: "🟩",
  3: "<span class='pulse'>🍎</span>",
  4: "🟥",
};

export function setGameStatus(newStatus) {
  gameStatus = newStatus;
}

export class GameState {
  constructor({ target, name, isLocal, isOptimistic }) {
    /**
     * 0 = empty
     * 1 = head
     * 2 = tail
     * 3 = food
     * 4 = dead
     */
    this.board = new Array(boardRows).fill(null).map(() => new Array(boardCols).fill(0));
    this.moves = [
      {
        r: 5,
        c: 5,
        dir: "east",
        step: 1,
      },
    ];
    this.headPos = { r: 5, c: 5 };
    this.nLength = 2;
    this.tailWipeQueue = [];
    this.target = target;
    this.name = name;
    this.step = 1;
    this.isLocal = isLocal;
    this.isOptimistic = isOptimistic;
    this.changesToDraw = new Map();
  }

  initDraw() {
    const el = document.getElementById(this.target);
    el.classList.add("game");

    for (let r = 0; r < boardRows; r++) {
      for (let c = 0; c < boardCols; c++) {
        const cell = document.createElement("div");
        cell.innerHTML = COLOR_MAP[this.board[r][c]];
        el.appendChild(cell);
      }
    }
    const parent = el.parentElement;
    const debugEl = document.createElement("pre", {});
    debugEl.id = this.target + "-debug";
    parent.appendChild(debugEl);
  }

  update({ r, c }, v) {
    this.board[r][c] = v;
    this.changesToDraw.set(`${r},${c}`, { pos: { r, c }, v });
    document.getElementById(this.target).childNodes[r * boardCols + c].innerHTML = COLOR_MAP[v];
  }

  drawDebug(liveTickDiff) {
    const el = document.getElementById(this.target + "-debug");
    el.textContent = `
step: ${this.step}
tick diff: ${liveTickDiff ?? 0}
`;
  }

  fullRedraw() {
    for (let r = 0; r < boardRows; r++) {
      for (let c = 0; c < boardCols; c++) {
        this.update({ r, c }, this.board[r][c]);
      }
    }
  }

  steal(gs2, liveTickDiff) {
    this.board = structuredClone(gs2.board);
    this.moves = structuredClone(gs2.moves);
    this.headPos = structuredClone(gs2.headPos);
    this.nLength = gs2.nLength;
    this.tailWipeQueue = structuredClone(gs2.tailWipeQueue);

    this.fullRedraw();
    if (liveTickDiff) {
      this.drawDebug(liveTickDiff);
    }
  }
}
