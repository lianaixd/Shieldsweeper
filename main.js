/*----- classes -----*/
class Cell {
  constructor(row, col, board) {
    this.row = row;
    this.col = col;
    this.bomb = false;
    this.board = board;
    this.revealed = false;
    this.flagged = false;
    this.disabled = false; // New property for disabled cells
    this.adjBombs = 0;
  }

  getAdjCells() {
    const adj = [];
    const lastRow = this.board.length - 1;
    const lastCol = this.board[0].length - 1;
    if (this.row > 0 && this.col > 0) adj.push(this.board[this.row - 1][this.col - 1]);
    if (this.row > 0) adj.push(this.board[this.row - 1][this.col]);
    if (this.row > 0 && this.col < lastCol) adj.push(this.board[this.row - 1][this.col + 1]);
    if (this.col < lastCol) adj.push(this.board[this.row][this.col + 1]);
    if (this.row < lastRow && this.col < lastCol) adj.push(this.board[this.row + 1][this.col + 1]);
    if (this.row < lastRow) adj.push(this.board[this.row + 1][this.col]);
    if (this.row < lastRow && this.col > 0) adj.push(this.board[this.row + 1][this.col - 1]);
    if (this.col > 0) adj.push(this.board[this.row][this.col - 1]);
    return adj;
  }

  calcAdjBombs() {
    const adjCells = this.getAdjCells();
    this.adjBombs = adjCells.reduce((acc, cell) => acc + (cell.bomb ? 1 : 0), 0);
  }

  flag() {
    if (!this.revealed) {
      this.flagged = !this.flagged;
      return this.flagged;
    }
  }

  reveal() {
    if (this.revealed && !hitBomb) return;
    this.revealed = true;
    if (this.bomb) {
      // Mark only this bomb as revealed
      return true;
    }
    if (this.adjBombs === 0) {
      this.getAdjCells().forEach((cell) => {
        if (!cell.revealed) cell.reveal();
      });
    }
    return false;
  }
}

/*----- constants -----*/
const fixedBombPositions = [
  { row: 0, col: 1 },
  { row: 2, col: 3 },
  { row: 2, col: 12 },
  { row: 3, col: 1 },
  { row: 4, col: 0 },
  { row: 5, col: 2 },
  { row: 4, col: 11 },
  { row: 6, col: 3 },
  { row: 6, col: 9 },
  { row: 7, col: 2 },
  { row: 7, col: 8 },
  { row: 9, col: 0 },
  { row: 9, col: 8 },
  { row: 10, col: 4 },
  { row: 11, col: 3 },
  { row: 12, col: 5 },
];

const sizeLookup = {
  "14": { totalBombs: fixedBombPositions.length },
};
let bombImage = "🗡️";
let flagImage = "❓";

const colors = [
  "",
  "#0000FA",
  "#4B802D",
  "#DB1300",
  "#202081",
  "#690400",
  "#457A7A",
  "#1B1B1B",
  "#7A7A7A",
];

/*----- app's state (variables) -----*/
let size = 14;
let board;
let bombCount;
let timeElapsed;
let hitBomb;
let elapsedTime;
let timerId;
let winner;

/*----- cached element references -----*/
const boardEl = document.getElementById("board");

// Audio (unchanged)
const tickSound = new Audio("tick.wav");
const loseSound = new Audio("lose.wav");
const winSound = new Audio("win.wav");
tickSound.load();
loseSound.load();
winSound.load();

function playSound(sound) {
  sound.currentTime = 0;
  sound.play().catch((error) => {
    console.error("Error playing sound:", error);
  });
}

/*————————————————————————————————————————————————————————
  DESKTOP CLICK HANDLER: click→reveal, Shift+Click→flag
————————————————————————————————————————————————————————*/
boardEl.addEventListener("click", function (e) {
  if (winner || hitBomb) return;

  // Identify the clicked <td> (ignore images inside)
  const clickedEl =
    e.target.tagName.toLowerCase() === "img"
      ? e.target.parentElement
      : e.target;
  if (!clickedEl.classList.contains("game-cell")) return;

  const row = parseInt(clickedEl.dataset.row, 10);
  const col = parseInt(clickedEl.dataset.col, 10);
  const cell = board[row][col];

  if (cell.disabled) return;

  if (!timerId) setTimer();

  if (e.shiftKey && !cell.revealed && bombCount > 0) {
    // Desktop flag
    if (cell.flagged) {
      cell.flagged = false;
      bombCount++;
    } else {
      cell.flagged = true;
      bombCount--;
    }
  } else {
    // Desktop reveal
    hitBomb = cell.reveal();
    if (hitBomb) {
      playSound(loseSound);
      revealOnlyClickedBomb(row, col);
      clearInterval(timerId);
      clickedEl.style.backgroundColor = "red";
    }
  }

  winner = checkWinner();
  if (winner && !hitBomb) {
    playSound(winSound);
  } else if (!hitBomb) {
    playSound(tickSound);
  }

  renderBoard();
  updateStatusBar();
});

/*————————————————————————————————————————————————————————
  RENDER BOARD + ATTACH TOUCH HANDLERS FOR MOBILE
————————————————————————————————————————————————————————*/
function renderBoard() {
  boardEl.innerHTML = ""; // clear existing rows

  board.forEach((rowArr) => {
    const rowEl = document.createElement("tr");
    rowArr.forEach((cell) => {
      const cellEl = document.createElement("td");
      cellEl.className = cell.disabled ? "disabled" : "game-cell";
      cellEl.dataset.row = cell.row;
      cellEl.dataset.col = cell.col;

      if (cell.revealed) {
        if (cell.bomb) {
          cellEl.innerHTML = bombImage;
        } else if (cell.adjBombs > 0) {
          cellEl.classList.add("revealed");
          cellEl.style.color = colors[cell.adjBombs];
          cellEl.textContent = cell.adjBombs;
        } else {
          cellEl.classList.add("revealed");
        }
      } else if (cell.flagged) {
        cellEl.innerHTML = flagImage;
      }

      /* MOBILE: long-press to toggle flag, tap to reveal */
      attachTouchHandlers(cellEl);

      rowEl.appendChild(cellEl);
    });
    boardEl.appendChild(rowEl);
  });
}

/*————————————————————————————————————————————————————————
  ATTACH TOUCH HANDLERS TO A SINGLE CELL
   • Long‐press (≥500 ms): toggle flag  
   • Quick tap: reveal  
————————————————————————————————————————————————————————*/
function attachTouchHandlers(cellEl) {
  let touchTimer = null;
  const row = parseInt(cellEl.dataset.row, 10);
  const col = parseInt(cellEl.dataset.col, 10);

  cellEl.addEventListener(
    "touchstart",
    (e) => {
      e.preventDefault();
      if (winner || hitBomb) return;
      touchTimer = setTimeout(() => {
        // LONG-PRESS → flag
        toggleFlagAt(row, col);
        renderBoard();
        updateStatusBar();
      }, 500);
    },
    { passive: false }
  );

  cellEl.addEventListener(
    "touchend",
    (e) => {
      e.preventDefault();
      if (winner || hitBomb) return;
      if (touchTimer) {
        // SHORT TAP → reveal
        clearTimeout(touchTimer);
        touchTimer = null;

        if (!timerId) setTimer();
        const cell = board[row][col];
        if (cell.disabled) return;

        hitBomb = cell.reveal();
        if (hitBomb) {
          playSound(loseSound);
          revealOnlyClickedBomb(row, col);
          clearInterval(timerId);
          cellEl.style.backgroundColor = "red";
        } else {
          playSound(tickSound);
        }

        winner = checkWinner();
        if (winner && !hitBomb) playSound(winSound);

        renderBoard();
        updateStatusBar();
      }
    },
    { passive: false }
  );

  cellEl.addEventListener("touchmove", () => {
    // if finger moves, cancel the long-press
    if (touchTimer) {
      clearTimeout(touchTimer);
      touchTimer = null;
    }
  });
}

/* Toggle flag at (r,c) – MOBILE variant of Shift+Click */
function toggleFlagAt(r, c) {
  const cell = board[r][c];
  if (cell.revealed || cell.disabled) return;
  if (cell.flagged) {
    cell.flagged = false;
    bombCount++;
  } else if (bombCount > 0) {
    cell.flagged = true;
    bombCount--;
  }
}

/*————————————————————————————————————————————————————————
  BUILD & INITIALIZE BOARD
————————————————————————————————————————————————————————*/
function buildTable() {
  // Insert status bar rows at the top
  const topRow = `
    <tr>
      <td class="menu" id="window-title-bar" colspan="${size}">
        <div id="window-title">🛡️ Shieldsweeper</div>
        <div id="window-controls">🕵️</div>
      </td>
    </tr>
    <tr>
      <td class="menu" id="folder-bar" colspan="${size}"></td>
    </tr>
    <tr>
      <td class="menu" colspan="${size}">
        <section id="status-bar">
          <div id="bomb-counter">000</div>
          <div id="reset">🙂</div>
          <div id="timer">000</div>
        </section>
      </td>
    </tr>
  `;
  boardEl.innerHTML = topRow;

  // Then append size×size empty <td class="game-cell"></td>
  for (let r = 0; r < size; r++) {
    const tr = document.createElement("tr");
    for (let c = 0; c < size; c++) {
      const td = document.createElement("td");
      td.className = "game-cell";
      td.dataset.row = r;
      td.dataset.col = c;
      tr.appendChild(td);
    }
    boardEl.appendChild(tr);
  }

  createResetListener();
}

function buildArrays() {
  const arr = Array(size).fill(null).map(() => Array(size).fill(null));
  return arr;
}

function buildCells() {
  board.forEach((rowArr, rowIdx) => {
    rowArr.forEach((_, colIdx) => {
      board[rowIdx][colIdx] = new Cell(rowIdx, colIdx, board);
    });
  });

  // Disable specific cells
  const disabledCells = [
    { row: 0, cols: [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13] },
    { row: 1, cols: [4, 5, 6, 7, 8, 9, 10] },
    { row: 2, cols: [4, 5, 6, 7, 8, 9, 10] },
    { row: 3, cols: [4, 5, 6, 7, 8, 9, 10] },
    { row: 4, cols: [4, 5, 6, 7, 8, 9] },
    { row: 5, cols: [4, 5, 6, 7, 8, 13] },
    { row: 6, cols: [4, 5, 6, 7, 12, 13] },
    { row: 7, cols: [4, 12, 13] },
    { row: 8, cols: [10, 11, 12, 13] },
    { row: 9, cols: [9, 10, 11, 12, 13] },
    { row: 10, cols: [7, 8, 9, 10, 11, 12, 13] },
    { row: 11, cols: [7, 8, 9, 10, 11, 12, 13] },
    { row: 12, cols: [7, 8, 9, 10, 11, 12, 13] },
    { row: 13, cols: [0, 1, 5, 6, 7, 8, 9, 10, 11, 12, 13] },
  ];

  disabledCells.forEach(({ row, cols }) => {
    cols.forEach((col) => {
      board[row][col].disabled = true;
    });
  });

  addBombs();
  runCodeForAllCells((cell) => cell.calcAdjBombs());
}

function init() {
  buildTable();
  board = buildArrays();
  buildCells();
  bombCount = getBombCount();
  elapsedTime = 0;
  clearInterval(timerId);
  timerId = null;
  hitBomb = false;
  winner = false;

  // Finally render the freshly built board:
  renderBoard();
  updateStatusBar();
}

function getBombCount() {
  let count = 0;
  board.forEach((row) => {
    row.forEach((cell) => {
      if (cell.bomb) count++;
    });
  });
  return count;
}

function addBombs() {
  fixedBombPositions.forEach(({ row, col }) => {
    board[row][col].bomb = true;
  });
}

function checkWinner() {
  return board.flat().every((c) => c.bomb || c.revealed || c.disabled);
}

function revealOnlyClickedBomb(clickedRow, clickedCol) {
  board.forEach((rowArr, r) => {
    rowArr.forEach((cell, c) => {
      if (cell.bomb) {
        cell.revealed = r === clickedRow && c === clickedCol;
      }
    });
  });
}

/*————————————————————————————————————————————————————————
  UPDATE STATUS BAR (bomb count, reset face, timer)
————————————————————————————————————————————————————————*/
function updateStatusBar() {
  document.getElementById("bomb-counter").innerText = String(bombCount).padStart(3, "0");
  const resetEl = document.getElementById("reset");
  if (hitBomb) {
    resetEl.innerHTML = "😵";
  } else if (winner) {
    resetEl.innerHTML = "😎";
    clearInterval(timerId);

    // On win, place 🗝️ and 🛡️
    const keyCell = document.querySelector('[data-row="5"][data-col="12"]');
    if (keyCell) {
      keyCell.innerHTML = '<span style="font-size:16px;">🗝️</span>';
      keyCell.classList.add("revealed");
    }
    const shieldCell = document.querySelector('[data-row="8"][data-col="4"]');
    if (shieldCell) {
      shieldCell.innerHTML = '<span style="font-size:16px;">🛡️</span>';
      shieldCell.classList.add("revealed");
    }
  }
}

function runCodeForAllCells(cb) {
  board.forEach((rowArr) => {
    rowArr.forEach((cell) => cb(cell));
  });
}

function createResetListener() {
  document.getElementById("reset").addEventListener("click", function () {
    init();
  });
}

function setTimer() {
  timerId = setInterval(() => {
    elapsedTime += 1;
    document.getElementById("timer").innerText = String(elapsedTime).padStart(3, "0");
  }, 1000);
}

// Start the very first game:
document.addEventListener("DOMContentLoaded", () => {
  init();
});
