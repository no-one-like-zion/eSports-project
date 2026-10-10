/* The Sixty-Four | playable hero board
   Rules (legal moves, check, castling, en passant, promotion, draws)
   come from chess.js, loaded in index.html. */
(function () {
  "use strict";

  var PIECE_IMAGES = false;
  var PIECE_PATH = "media/images/pieces/";

  var boardEl = document.getElementById("heroBoard");
  if (!boardEl) return;

  var statusEl = document.getElementById("boardStatus");
  var noteEl = document.getElementById("boardNote");
  var movesEl = document.getElementById("boardMoves");
  var promoEl = document.getElementById("promo");
  var undoBtn = document.getElementById("undoBtn");
  var newBtn = document.getElementById("newGameBtn");
  var flipBtn = document.getElementById("flipBtn");

  if (typeof Chess === "undefined") {
    statusEl.textContent = "The board could not load its rules.";
    noteEl.textContent = "Check your internet connection and refresh the page.";
    return;
  }

  var game = new Chess();
  var FILES = "abcdefgh";
  var NAMES = { p: "pawn", n: "knight", b: "bishop", r: "rook", q: "queen", k: "king" };
  var COLORS = { w: "white", b: "black" };

  var selected = null;
  var targets = [];
  var flipped = false;
  var lastMove = null;
  var focusSq = "e2";
  var noteTimer = null;
  var promoOpen = false;

  /* ---------- piece placeholder ---------- */
  function pieceNode(color, type) {
    var s = document.createElement("span");
    s.className = "piece " + color;
    s.setAttribute("aria-hidden", "true");
    if (PIECE_IMAGES) {
      var img = new Image();
      img.alt = "";
      img.src = PIECE_PATH + color + type.toUpperCase() + ".png";
      img.onerror = function () {
        img.remove();
        s.classList.remove("has-img");
        s.textContent = type.toUpperCase();
      };
      s.classList.add("has-img");
      s.appendChild(img);
    } else {
      s.textContent = type.toUpperCase();
    }
    return s;
  }

  function findKing(color) {
    var b = game.board();
    for (var r = 0; r < 8; r++) {
      for (var c = 0; c < 8; c++) {
        var p = b[r][c];
        if (p && p.type === "k" && p.color === color) return FILES[c] + (8 - r);
      }
    }
    return null;
  }

  /* ---------- rendering ---------- */
  function render() {
    var hadFocus = boardEl.contains(document.activeElement);
    boardEl.innerHTML = "";

    var position = game.board();
    var kingInCheck = game.in_check() ? findKing(game.turn()) : null;
    var targetMap = {};
    targets.forEach(function (m) { targetMap[m.to] = m; });

    for (var r = 0; r < 8; r++) {
      for (var c = 0; c < 8; c++) {
        var rr = flipped ? 7 - r : r;
        var cc = flipped ? 7 - c : c;
        var name = FILES[cc] + (8 - rr);
        var piece = position[rr][cc];

        var btn = document.createElement("button");
        btn.type = "button";
        btn.dataset.sq = name;
        btn.className = "sq " + (((rr + cc) % 2) ? "dark" : "light");
        btn.tabIndex = name === focusSq ? 0 : -1;

        var label = name + ", " + (piece ? COLORS[piece.color] + " " + NAMES[piece.type] : "empty");
        btn.setAttribute("aria-label", label);

        if (lastMove && (name === lastMove.from || name === lastMove.to)) btn.classList.add("last");
        if (name === selected) btn.classList.add("selected");
        if (name === kingInCheck) btn.classList.add("in-check");
        if (targetMap[name]) {
          btn.classList.add("target");
          if (piece || targetMap[name].flags.indexOf("e") > -1) btn.classList.add("capture");
        }

        if (c === 0) {
          var rank = document.createElement("span");
          rank.className = "coord rank";
          rank.textContent = String(8 - rr);
          btn.appendChild(rank);
        }
        if (r === 7) {
          var file = document.createElement("span");
          file.className = "coord file";
          file.textContent = FILES[cc];
          btn.appendChild(file);
        }
        if (piece) btn.appendChild(pieceNode(piece.color, piece.type));

        boardEl.appendChild(btn);
      }
    }

    if (hadFocus) {
      var f = boardEl.querySelector('[data-sq="' + focusSq + '"]');
      if (f) f.focus();
    }
  }

  function setNote(text, transient) {
    clearTimeout(noteTimer);
    noteEl.textContent = text || "";
    if (text && transient) {
      noteTimer = setTimeout(function () { noteEl.textContent = ""; }, 3500);
    }
  }

  function flash(sq) {
    var el = boardEl.querySelector('[data-sq="' + sq + '"]');
    if (!el) return;
    el.classList.add("illegal");
    setTimeout(function () {
      var again = boardEl.querySelector('[data-sq="' + sq + '"]');
      if (again) again.classList.remove("illegal");
    }, 450);
  }

  function updateStatus() {
    var side = game.turn() === "w" ? "White" : "Black";
    var other = side === "White" ? "Black" : "White";
    var text;

    if (game.in_checkmate()) {
      text = other + " wins by checkmate.";
    } else if (game.in_stalemate()) {
      text = "Draw by stalemate.";
    } else if (game.in_draw()) {
      if (game.insufficient_material()) text = "Draw. Neither side has enough material to checkmate.";
      else if (game.in_threefold_repetition()) text = "Draw by threefold repetition.";
      else text = "Draw by the fifty-move rule.";
    } else {
      text = side + " to move." + (game.in_check() ? " Check." : "");
    }
    statusEl.textContent = text;

    // Move list
    var hist = game.history();
    if (!hist.length) {
      movesEl.textContent = "No moves yet.";
    } else {
      var html = "";
      for (var i = 0; i < hist.length; i += 2) {
        html += '<span class="mv"><b>' + (i / 2 + 1) + ".</b> " + hist[i] + (hist[i + 1] ? " " + hist[i + 1] : "") + "</span> ";
      }
      movesEl.innerHTML = html;
      movesEl.scrollTop = movesEl.scrollHeight;
    }
    undoBtn.disabled = hist.length === 0;
  }

  /* ---------- moving ---------- */
  function doMove(from, to, promotion) {
    var made = game.move({ from: from, to: to, promotion: promotion });
    if (!made) return;
    lastMove = { from: made.from, to: made.to };
    selected = null;
    targets = [];
    focusSq = made.to;
    render();
    updateStatus();

    if (made.flags.indexOf("e") > -1) setNote("En passant capture.", true);
    else if (made.flags.indexOf("k") > -1) setNote("Castled kingside.", true);
    else if (made.flags.indexOf("q") > -1) setNote("Castled queenside.", true);
    else if (made.flags.indexOf("p") > -1) setNote("Pawn promoted to " + NAMES[made.promotion] + ".", true);
    else setNote("");
  }

  function showPromotion(from, to) {
    var color = game.turn();
    promoOpen = true;
    promoEl.innerHTML = "";

    var title = document.createElement("p");
    title.className = "promo-title";
    title.textContent = "Promote your pawn to";
    promoEl.appendChild(title);

    var row = document.createElement("div");
    row.className = "promo-choices";
    ["q", "r", "b", "n"].forEach(function (t) {
      var b = document.createElement("button");
      b.type = "button";
      b.setAttribute("aria-label", "Promote to " + NAMES[t]);
      b.appendChild(pieceNode(color, t));
      var span = document.createElement("span");
      span.textContent = NAMES[t];
      b.appendChild(span);
      b.addEventListener("click", function () {
        closePromotion();
        doMove(from, to, t);
      });
      row.appendChild(b);
    });
    promoEl.appendChild(row);

    var cancel = document.createElement("button");
    cancel.type = "button";
    cancel.className = "promo-cancel";
    cancel.textContent = "Cancel";
    cancel.addEventListener("click", closePromotion);
    promoEl.appendChild(cancel);

    promoEl.hidden = false;
    row.firstChild.focus();
  }

  function closePromotion() {
    promoOpen = false;
    promoEl.hidden = true;
    promoEl.innerHTML = "";
    var f = boardEl.querySelector('[data-sq="' + focusSq + '"]');
    if (f) f.focus();
  }

  promoEl.addEventListener("keydown", function (e) {
    if (e.key === "Escape") closePromotion();
  });

  function select(sq) {
    var moves = game.moves({ square: sq, verbose: true });
    if (!moves.length) {
      selected = null;
      targets = [];
      render();
      flash(sq);
      setNote(game.in_check()
        ? "Your king is in check. This piece cannot resolve it."
        : "This piece has no legal moves right now.", true);
      return;
    }
    selected = sq;
    targets = moves;
    setNote("");
    render();
  }

  function onSquare(sq) {
    if (promoOpen || game.game_over()) return;
    focusSq = sq;
    var piece = game.get(sq);
    var turn = game.turn();

    if (selected) {
      var matching = targets.filter(function (m) { return m.to === sq; });
      if (matching.length) {
        if (matching[0].flags.indexOf("p") > -1) showPromotion(selected, sq);
        else doMove(selected, sq);
        return;
      }
      if (sq === selected) {
        selected = null; targets = []; render(); return;
      }
      if (piece && piece.color === turn) { select(sq); return; }

      // Invalid move
      selected = null; targets = [];
      render();
      flash(sq);
      setNote(game.in_check()
        ? "Your king is in check. Choose a move that gets it out of check."
        : "That move is not legal. It must follow the piece's movement and keep your king safe.", true);
      return;
    }

    if (piece && piece.color === turn) {
      select(sq);
    } else if (piece) {
      flash(sq);
      setNote("It is " + (turn === "w" ? "White" : "Black") + "'s turn.", true);
    }
  }

  /* ---------- events ---------- */
  boardEl.addEventListener("click", function (e) {
    var sqEl = e.target.closest(".sq");
    if (sqEl) onSquare(sqEl.dataset.sq);
  });

  boardEl.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && selected) {
      selected = null; targets = []; render(); return;
    }
    var step = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -8, ArrowDown: 8 }[e.key];
    if (!step) return;
    var squares = Array.prototype.slice.call(boardEl.children);
    var i = squares.indexOf(document.activeElement);
    if (i < 0) return;
    if ((e.key === "ArrowLeft" && i % 8 === 0) || (e.key === "ArrowRight" && i % 8 === 7)) return;
    var n = i + step;
    if (n < 0 || n > 63) return;
    e.preventDefault();
    squares[i].tabIndex = -1;
    squares[n].tabIndex = 0;
    focusSq = squares[n].dataset.sq;
    squares[n].focus();
  });

  undoBtn.addEventListener("click", function () {
    if (promoOpen) closePromotion();
    game.undo();
    var h = game.history({ verbose: true });
    lastMove = h.length ? { from: h[h.length - 1].from, to: h[h.length - 1].to } : null;
    selected = null; targets = [];
    setNote("");
    render();
    updateStatus();
  });

  newBtn.addEventListener("click", function () {
    if (promoOpen) closePromotion();
    game.reset();
    lastMove = null; selected = null; targets = [];
    focusSq = "e2";
    setNote("");
    render();
    updateStatus();
  });

  flipBtn.addEventListener("click", function () {
    flipped = !flipped;
    render();
  });

  render();
  updateStatus();
})();
