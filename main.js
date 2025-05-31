/*---------------------------------------------
  main.js  (updated)
---------------------------------------------*/

/*----- classes -----*/
class Cell {
  constructor(row, col, board) {
    this.row = row;
    this.col = col;
    this.bomb = false;
    this.board = board;
    this.revealed = false;
    this.flagged = false;
    this.disabled = false; // For “unselectable” cells
    this.adjBombs = 0;
  }

  getAdjCells() {
    const adj = [];
    const lastRow = this.board.length - 1;
    const lastCol = this.board[0].length - 1;
    if (this.row > 0 && this.col > 0)
      adj.push(this.board[this.row - 1][this.col - 1]);
    if (this.row > 0) adj.push(this.board[this.row - 1][this.col]);
    if (this.row > 0 && this.col < lastCol)
      adj.push(this.board[this.row - 1][this.col + 1]);
    if (this.col < lastCol) adj.push(this.board[this.row][this.col + 1]);
    if (this.row < lastRow && this.col < lastCol)
      adj.push(this.board[this.row + 1][this.col + 1]);
    if (this.row < lastRow) adj.push(this.board[this.row + 1][this.col]);
    if (this.row < lastRow && this.col > 0)
      adj.push(this.board[this.row + 1][this.col - 1]);
    if (this.col > 0) adj.push(this.board[this.row][this.col - 1]);
    return adj;
  }

  calcAdjBombs() {
    const adjCells = this.getAdjCells();
    this.adjBombs = adjCells.reduce(
      (acc, cell) => acc + (cell.bomb ? 1 : 0),
      0
    );
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
      // Only this bomb is revealed
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

/*----- app’s state -----*/
let size = 14;
let board;
let bombCount;
let timeElapsed;
let hitBomb;
let elapsedTime;
let timerId;
let winner;

/*----- cached DOM refs -----*/
const boardEl = document.getElementById("board");

// Audio files (unchanged)
const tickSound = new Audio("tick.wav");
const loseSound = new Audio("lose.wav");
const winSound = new Audio("win.wav");
tickSound.load();
loseSound.load();
winSound.load();
function playSound(sound) {
  sound.currentTime = 0;
  sound.play().catch((err) => {});
}

/*————— BUILD THE TABLE’S HEADER + EMPTY CELLS —————*/
function buildTable() {
  // 1) Insert the top‐three “header” rows exactly as before:
  const topRows = `
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
  boardEl.innerHTML = topRows;

  // 2) Now append size × size “empty” <td> cells:
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

  // 3) “🙂” reset listener
  createResetListener();
}

/*————— BUILD THE BOARD DATA (Cell instances) —————*/
function buildArrays() {
  return Array(size)
    .fill(null)
    .map(() => Array(size).fill(null));
}
function buildCells() {
  board.forEach((rowArr, r) => {
    rowArr.forEach((_, c) => {
      board[r][c] = new Cell(r, c, board);
    });
  });
  // Mark disabled cells:
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

/*————————————————————————————————————————————————————————
  INITIALIZE OR “RESET” THE GAME
————————————————————————————————————————————————————————*/
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
  renderBoard(); // Draw the cells
  updateStatusBar();
}

/*————————————————————————————————————————————————————————
  RENDER ONLY THE BODY ROWS (rows 4+).  Keep top‐3 headers intact.
————————————————————————————————————————————————————————*/
function renderBoard() {
  // Remove any existing “body” rows (all <tr> beyond the first 3):
  while (boardEl.rows.length > 3) {
    boardEl.deleteRow(3);
  }

  // Rebuild each row of cells:
  board.forEach((rowArr, r) => {
    const tr = boardEl.insertRow(-1); // append at bottom
    rowArr.forEach((cell) => {
      const td = tr.insertCell(-1);
      td.className = cell.disabled ? "disabled" : "game-cell";
      td.dataset.row = cell.row;
      td.dataset.col = cell.col;

      if (cell.revealed) {
        if (cell.bomb) {
          td.innerHTML = bombImage;
        } else if (cell.adjBombs > 0) {
          td.classList.add("revealed");
          td.style.color = colors[cell.adjBombs];
          td.textContent = cell.adjBombs;
        } else {
          td.classList.add("revealed");
        }
      } else if (cell.flagged) {
        td.innerHTML = flagImage;
      }

      // Attach mobile “long‐press / tap” handlers:
      attachTouchHandlers(td);
    });
  });
}

/*————————————————————————————————————————————————————————
  DESKTOP CLICK: reveal (no Shift) or flag (with Shift)
————————————————————————————————————————————————————————*/
boardEl.addEventListener("click", (e) => {
  if (winner || hitBomb) return;
  // Identify the clicked <td>
  const clickedEl =
    e.target.tagName.toLowerCase() === "img"
      ? e.target.parentElement
      : e.target;
  if (!clickedEl.classList.contains("game-cell")) return;

  const r = parseInt(clickedEl.dataset.row, 10);
  const c = parseInt(clickedEl.dataset.col, 10);
  const cell = board[r][c];
  if (cell.disabled) return;

  if (!timerId) setTimer();

  if (e.shiftKey && !cell.revealed && bombCount > 0) {
    // Desktop: toggle flag
    if (cell.flagged) {
      cell.flagged = false;
      bombCount++;
    } else {
      cell.flagged = true;
      bombCount--;
    }
  } else {
    // Desktop: reveal
    hitBomb = cell.reveal();
    if (hitBomb) {
      playSound(loseSound);
      revealOnlyClickedBomb(r, c);
      clearInterval(timerId);
      clickedEl.style.backgroundColor = "red";
    } else {
      playSound(tickSound);
    }
  }

  winner = checkWinner();
  if (winner && !hitBomb) playSound(winSound);

  renderBoard();
  updateStatusBar();
});

/*————————————————————————————————————————————————————————
  MOBILE: long‐press (≥ 500 ms) toggles flag; quick tap reveals
————————————————————————————————————————————————————————*/
function attachTouchHandlers(cellEl) {
  let touchTimer = null;
  const r = parseInt(cellEl.dataset.row, 10);
  const c = parseInt(cellEl.dataset.col, 10);

  cellEl.addEventListener(
    "touchstart",
    (e) => {
      e.preventDefault();
      if (winner || hitBomb) return;
      touchTimer = setTimeout(() => {
        // LONG‐PRESS → toggle flag
        toggleFlagAt(r, c);
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
        clearTimeout(touchTimer);
        touchTimer = null;
        // SHORT TAP → reveal
        if (!timerId) setTimer();
        const cell = board[r][c];
        if (cell.disabled) return;

        hitBomb = cell.reveal();
        if (hitBomb) {
          playSound(loseSound);
          revealOnlyClickedBomb(r, c);
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
    // cancel long‐press if finger moves away
    if (touchTimer) {
      clearTimeout(touchTimer);
      touchTimer = null;
    }
  });
}

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
  REVEAL ONLY THE CLICKED BOMB (when user hits a bomb)
————————————————————————————————————————————————————————*/
function revealOnlyClickedBomb(clickedRow, clickedCol) {
  board.forEach((rowArr, rr) => {
    rowArr.forEach((cell, cc) => {
      if (cell.bomb) {
        cell.revealed = rr === clickedRow && cc === clickedCol;
      }
    });
  });
}

/*————————————————————————————————————————————————————————
  UPDATE STATUS BAR (bomb‐count, reset face, timer)
————————————————————————————————————————————————————————*/
function updateStatusBar() {
  document.getElementById("bomb-counter").innerText = String(bombCount).padStart(3, "0");
  const face = document.getElementById("reset");
  if (hitBomb) {
    face.innerHTML = "😵";
  } else if (winner) {
    face.innerHTML = "😎";
    clearInterval(timerId);
    // place key + shield on win
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

/*————————————————————————————————————————————————————————
  CHECK FOR WIN (all non‐bomb, non‐disabled squares revealed)
————————————————————————————————————————————————————————*/
function checkWinner() {
  return board.flat().every((c) => c.bomb || c.revealed || c.disabled);
}

/*————————————————————————————————————————————————————————
  ADD BOMBS TO FIXED POSITIONS
————————————————————————————————————————————————————————*/
function addBombs() {
  fixedBombPositions.forEach(({ row, col }) => {
    board[row][col].bomb = true;
  });
}

function getBombCount() {
  let cnt = 0;
  board.forEach((rowArr) => {
    rowArr.forEach((c) => {
      if (c.bomb) cnt++;
    });
  });
  return cnt;
}

function runCodeForAllCells(cb) {
  board.forEach((rowArr) => {
    rowArr.forEach((cell) => cb(cell));
  });
}

/*————————————————————————————————————————————————————————
  RESET LISTENER (🙂 button)
————————————————————————————————————————————————————————*/
function createResetListener() {
  document.getElementById("reset").addEventListener("click", () => {
    init();
  });
}

/*————————————————————————————————————————————————————————
  TIMER (once first click or first tap)
————————————————————————————————————————————————————————*/
function setTimer() {
  timerId = setInterval(() => {
    elapsedTime += 1;
    document.getElementById("timer").innerText = String(elapsedTime).padStart(3, "0");
  }, 1000);
}

document.addEventListener("DOMContentLoaded", () => {
  // If device is “non‐touch” (desktop), override to "Shift + Click"
  if (!("ontouchstart" in window) && navigator.maxTouchPoints === 0) {
    document.getElementById("clock").innerHTML =
      `<em>"Shift + Click"</em> to place a ❓`;
  }
  init();
});
/*————————————————————————————————————————————————————————
  INITIALIZE THE VERY FIRST GAME
————————————————————————————————————————————————————————*/
document.addEventListener("DOMContentLoaded", () => {
  init();
});
