document.addEventListener('DOMContentLoaded', () => {
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
        }

        getAdjCells() {
            var adj = [];
            var lastRow = board.length - 1;
            var lastCol = board[0].length - 1;
            if (this.row > 0 && this.col > 0) adj.push(board[this.row - 1][this.col - 1]);
            if (this.row > 0) adj.push(board[this.row - 1][this.col]);
            if (this.row > 0 && this.col < lastCol) adj.push(board[this.row - 1][this.col + 1]);
            if (this.col < lastCol) adj.push(board[this.row][this.col + 1]);
            if (this.row < lastRow && this.col < lastCol) adj.push(board[this.row + 1][this.col + 1]);
            if (this.row < lastRow) adj.push(board[this.row + 1][this.col]);
            if (this.row < lastRow && this.col > 0) adj.push(board[this.row + 1][this.col - 1]);
            if (this.col > 0) adj.push(board[this.row][this.col - 1]);       
            return adj;
        }

        calcAdjBombs() {
            var adjCells = this.getAdjCells();
            var adjBombs = adjCells.reduce(function(acc, cell) {
                return acc + (cell.bomb ? 1 : 0);
            }, 0);
            this.adjBombs = adjBombs;
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
                // Mark this bomb as revealed, but do not reveal others
                return true; // Indicate that a bomb was clicked
            }
            if (this.adjBombs === 0) {
                var adj = this.getAdjCells();
                adj.forEach(function(cell) {
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

    var sizeLookup = {
        '14': { totalBombs: fixedBombPositions.length, tableWidth: '420px' },
    };
    var bombImage = '🗡️';
    var flagImage = '❓';
    var wrongBombImage = '<img src="images/wrong-bomb.png">';

    var colors = [
        '',
        '#0000FA',
        '#4B802D',
        '#DB1300',
        '#202081',
        '#690400',
        '#457A7A',
        '#1B1B1B',
        '#7A7A7A',
    ];

    /*----- app's state (variables) -----*/
    var size = 14;
    var board;
    var bombCount;
    var timeElapsed;
    var adjBombs;
    var hitBomb;
    var elapsedTime;
    var timerId;
    var winner;

    /*----- cached element references -----*/
    var boardEl = document.getElementById('board');

    /*----- event listeners -----*/
    document.getElementById('size-btns').addEventListener('click', function(e) {
        size = parseInt(e.target.id.replace('size-', ''));
        init();
        render();
    });

    boardEl.addEventListener('click', function(e) {
        if (winner || hitBomb) return;
        var clickedEl = e.target.tagName.toLowerCase() === 'img' ? e.target.parentElement : e.target;
        if (clickedEl.classList.contains('game-cell')) {
            var row = parseInt(clickedEl.dataset.row);
            var col = parseInt(clickedEl.dataset.col);
            var cell = board[row][col];

            // Ignore disabled cells
            if (cell.disabled) return;

            if (!timerId) setTimer();
            if (e.shiftKey && !cell.revealed && bombCount > 0) {
                bombCount += cell.flag() ? -1 : 1;
            } else {
                hitBomb = cell.reveal();
                if (hitBomb) {
                    revealAll(row, col);
                    clearInterval(timerId);
                    clickedEl.style.backgroundColor = 'red';
                }
            }
            winner = getWinner();
            render();
        }
    });

    function createResetListener() { 
        document.getElementById('reset').addEventListener('click', function() {
            init();
            render();
        });
    }

    /*----- functions -----*/
    function setTimer () {
        timerId = setInterval(function(){
            elapsedTime += 1;
            document.getElementById('timer').innerText = elapsedTime.toString().padStart(3, '0');
        }, 1000);
    }

    function revealAll(clickedRow, clickedCol) {
        // Reveal only the clicked bomb
        var cell = board[clickedRow][clickedCol];
        if (cell.bomb) {
            cell.revealed = true;
        }
    }

    function buildTable() {
        var topRow = `
            <tr>
                <td class="menu" id="window-title-bar" colspan="${size}">
                    <div id="window-title">🛡️ Shieldsweeper</div>
                    <div id="window-controls">🕵️</div>
                </td>
            <tr>
                <td class="menu" id="folder-bar" colspan="${size}"></td>
            </tr>
            <tr>
                <td class="menu" colspan="${size}">
                    <section id="status-bar">
                        <div id="bomb-counter">000</div>
                        <div id="reset"> 🙂 </div>
                        <div id="timer">000</div>
                    </section>
                </td>
            </tr>
        `;
        boardEl.innerHTML = topRow + `<tr>${'<td class="game-cell"></td>'.repeat(size)}</tr>`.repeat(size);
        boardEl.style.width = sizeLookup[size].tableWidth;
        createResetListener();
        var cells = Array.from(document.querySelectorAll('td:not(.menu)'));
        cells.forEach(function(cell, idx) {
            cell.setAttribute('data-row', Math.floor(idx / size));
            cell.setAttribute('data-col', idx % size);
        });
    }

    function buildArrays() {
        var arr = Array(size).fill(null);
        arr = arr.map(function() {
            return new Array(size).fill(null);
        });
        return arr;
    }

    function buildCells() {
        board.forEach(function(rowArr, rowIdx) {
            rowArr.forEach(function(slot, colIdx) {
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
            cols.forEach(col => {
                board[row][col].disabled = true;
            });
        });

        addBombs();
        runCodeForAllCells(function(cell) {
            cell.calcAdjBombs();
        });

        board.forEach((rowArr, rowIdx) => {
            rowArr.forEach((cell, colIdx) => {
                if (cell.bomb && cell.disabled) {
                    console.error(`Bomb placed in disabled cell: row ${rowIdx}, col ${colIdx}`);
                }
            });
        });
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
    }

    function getBombCount() {
        var count = 0;
        board.forEach(function(row){
            count += row.filter(function(cell) {
                return cell.bomb;
            }).length;
        });
        return count;
    }

    function addBombs() {
        fixedBombPositions.forEach(({ row, col }) => {
            board[row][col].bomb = true; // Set the bomb property for predefined positions
        });
    }

    function getWinner() {
        for (var row = 0; row < board.length; row++) {
            for (var col = 0; col < board[0].length; col++) {
                var cell = board[row][col];
                if (!cell.revealed && !cell.bomb && !cell.disabled) {
                    return false; // Not all active cells are revealed yet
                }
            }
        }
        return true; // All active cells revealed
    }

    function render() {
        document.getElementById('bomb-counter').innerText = bombCount.toString().padStart(3, '0');
        var tdList = Array.from(document.querySelectorAll('[data-row]'));
        tdList.forEach(function(td) {
            var rowIdx = parseInt(td.getAttribute('data-row'));
            var colIdx = parseInt(td.getAttribute('data-col'));
            var cell = board[rowIdx][colIdx];

            if (cell.disabled) {
                td.className = 'disabled'; // Apply the disabled class
            } else if (cell.flagged) {
                td.innerHTML = flagImage;
            } else if (cell.revealed) {
                if (cell.bomb) {
                    td.innerHTML = bombImage;
                } else if (cell.adjBombs) {
                    td.className = 'revealed';
                    td.style.color = colors[cell.adjBombs];
                    td.textContent = cell.adjBombs;
                } else {
                    td.className = 'revealed';
                }
            } else {
                td.innerHTML = '';
            }
        });

        if (hitBomb) {
            document.getElementById('reset').innerHTML = '😵';
        } else if (winner) {
            document.getElementById('reset').innerHTML = '😎';
            clearInterval(timerId);

            // Display 🗝️ emoji in row 5, column 12
            var keyCell = document.querySelector('[data-row="5"][data-col="12"]');
            if (keyCell) {
                keyCell.innerHTML = '<span style="font-size: 16px;">🗝️</span>';
                keyCell.classList.add('revealed'); // Optional: apply revealed styling
            }
            var shieldCell = document.querySelector('[data-row="8"][data-col="4"]');
            if (shieldCell) {
                shieldCell.innerHTML = '<span style="font-size: 16px;">🛡️</span>';
                shieldCell.classList.add('revealed'); // Optional: apply revealed styling
            }
        }
    }

    function runCodeForAllCells(cb) {
        board.forEach(function(rowArr) {
            rowArr.forEach(function(cell) {
                cb(cell);
            });
        });
    }

    // Sound effect setup
    const tickSound = new Audio('tick.wav');

    function playTickSound() {
        if (!tickSound.paused) {
            tickSound.currentTime = 0;
        }
        tickSound.play();
    }

    // Attach sound to button clicks
    document.querySelectorAll('button').forEach(button => {
        button.addEventListener('click', playTickSound);
    });

    init();
    render();
});
