class Cell {
    constructor(row, col) {
        this.row = row;
        this.col = col;
        this.bomb = false;
        this.revealed = false;
        this.flagged = false;
        this.disabled = false;
    }

    getAdjCells(board) {
        const adj = [];
        const lastRow = board.length - 1;
        const lastCol = board[0].length - 1;

        for (let i = this.row - 1; i <= this.row + 1; i++) {
            for (let j = this.col - 1; j <= this.col + 1; j++) {
                if (
                    i >= 0 && i <= lastRow &&
                    j >= 0 && j <= lastCol &&
                    !(i === this.row && j === this.col)
                ) {
                    adj.push(board[i][j]);
                }
            }
        }
        return adj;
    }

    calcAdjBombs(board) {
        const adjCells = this.getAdjCells(board);
        this.adjBombs = adjCells.reduce((count, cell) => count + (cell.bomb ? 1 : 0), 0);
    }

    reveal(board) {
        if (this.revealed || this.disabled) return false;
        this.revealed = true;

        if (this.bomb) return true;

        if (this.adjBombs === 0) {
            const adjCells = this.getAdjCells(board);
            adjCells.forEach(cell => cell.reveal(board));
        }

        return false;
    }
}

const size = 14;
const fixedBombPositions = [
    { row: 0, col: 1 }, { row: 2, col: 3 }, { row: 3, col: 1 }, { row: 4, col: 0 },
    { row: 5, col: 2 }, { row: 6, col: 3 }, { row: 7, col: 2 }, { row: 8, col: 8 },
    { row: 9, col: 1 }, { row: 10, col: 5 }, { row: 11, col: 3 }, { row: 12, col: 4 },
];
let board = [];

function buildBoard() {
    board = Array(size).fill().map((_, row) =>
        Array(size).fill().map((_, col) => new Cell(row, col))
    );

    fixedBombPositions.forEach(({ row, col }) => {
        board[row][col].bomb = true;
    });

    board.flat().forEach(cell => cell.calcAdjBombs(board));
}

function renderBoard() {
    const boardEl = document.getElementById('board');
    boardEl.innerHTML = '';

    board.forEach(row => {
        const rowEl = document.createElement('tr');
        row.forEach(cell => {
            const cellEl = document.createElement('td');
            cellEl.className = cell.disabled ? 'disabled' : 'game-cell';
            if (cell.revealed) {
                cellEl.textContent = cell.bomb ? '🗡️' : cell.adjBombs || '';
            }
            rowEl.appendChild(cellEl);
        });
        boardEl.appendChild(rowEl);
    });
}

buildBoard();
renderBoard();