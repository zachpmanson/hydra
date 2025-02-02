"use strict";

export const boardCols = 40;
export const boardRows = 30;
export let gameStatus = "ready";

export function setGameStatus(newStatus) {
  gameStatus = newStatus;
}

export class GameState {
  constructor({ target, name, isLocal, isOptimistic }) {
    this.board = new Array(boardRows).fill(null).map(() => new Array(boardCols).fill(0));
    this.moves = [
      {
        r: 5,
        c: 5,
        dir: "east",
        tick: 1,
      },
    ];
    this.headPos = { r: 5, c: 5 };
    this.nLength = 2;
    this.tailWipeQueue = [];
    this.target = target;
    this.name = name;
    this.tick = 1;
    this.isLocal = isLocal;
    this.isOptimistic = isOptimistic;
  }
}
