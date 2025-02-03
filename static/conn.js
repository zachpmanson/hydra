"use strict";

import { addFood, endGame, reconcileRemoteState, startGame } from "./game.js";
import { gameStatus, setGameStatus } from "./gamestate.js";

export let conn;
export const roomId = window.location.pathname.split("/")[2];

const log = document.getElementById("log");

function appendLog(item) {
  let doScroll = log.scrollTop > log.scrollHeight - log.clientHeight - 1;
  log.appendChild(item);
  if (doScroll) {
    log.scrollTop = log.scrollHeight - log.clientHeight;
  }
}

export function sendMsg(msg) {
  console.log("Sending", msg);
  conn.send(JSON.stringify(msg));
}

let pingReady;
const startButton = document.getElementById("start-button");
function startReady() {
  setGameStatus("ready");
  pingReady = setInterval(() => {
    sendMsg({ type: "ready" });
  }, 1000);
  startButton.style.display = "none";
}
startButton.addEventListener("click", startReady);

if (window["WebSocket"]) {
  const socketPrefix = location.protocol === "https:" ? "wss" : "ws";
  conn = new WebSocket(socketPrefix + "://" + document.location.host + "/room/ws/" + roomId);
  conn.onclose = (evt) => {
    let item = document.createElement("div");
    item.innerHTML = "<b>Connection closed.</b>";
    appendLog(item);
  };
  conn.onmessage = (evt) => {
    let messages = evt.data.split("\n");
    for (let i = 0; i < messages.length; i++) {
      let item = document.createElement("div");

      item.innerText = messages[i];
      appendLog(item);

      const { type, payload } = JSON.parse(messages[i]);

      switch (type) {
        case "move": {
          if (gameStatus === "playing") {
            reconcileRemoteState(payload);
          }
          break;
        }
        case "ready": {
          if (gameStatus === "ready") {
            clearInterval(pingReady);
            sendMsg({ type: "ready" });
            setGameStatus("playing");
            startGame();
            document.getElementById("lobby").style.display = "none";
          }
          break;
        }
        case "lost": {
          if (gameStatus === "playing") {
            setGameStatus("ended");
            endGame(true, true);
          }
          break;
        }
        case "food": {
          addFood(payload.r, payload.c);
          break;
        }
      }
    }
  };
} else {
  let item = document.createElement("div");
  item.innerHTML = "<b>Your browser does not support WebSockets.</b>";
  appendLog(item);
}
