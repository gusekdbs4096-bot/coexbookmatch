/* ==========================================================
   BOOK MATCH - 게임 로직
   ========================================================== */

(function () {
  "use strict";

  // ---------- 레벨 데이터 무결성 검증 ----------
  function validateLevels() {
    LEVELS.forEach((lv) => {
      const total = lv.groups.reduce((a, b) => a + b, 0);
      const cells = lv.cols * lv.rows;
      if (total !== cells) {
        throw new Error(
          `[BOOK MATCH] 레벨 ${lv.level} 설정 오류: 카드 수(${cells})와 그룹 합(${total})이 일치하지 않습니다.`
        );
      }
      if (lv.groups.length > BOOKS.length) {
        console.warn(
          `[BOOK MATCH] 레벨 ${lv.level}: 그룹 수(${lv.groups.length})가 도서 수(${BOOKS.length})보다 많아 일부 책이 재사용됩니다.`
        );
      }
    });
  }
  validateLevels();

  // ---------- DOM 참조 ----------
  const $ = (sel) => document.querySelector(sel);
  const els = {
    intro: $("#screen-intro"),
    game: $("#screen-game"),
    allclear: $("#screen-allclear"),
    playBtn: $("#btn-play"),
    board: $("#board"),
    hudLevel: $("#hud-level"),
    hudMatch: $("#hud-match"),
    hudTime: $("#hud-time"),
    hudRemaining: $("#hud-remaining-count"),
    toastLayer: $("#toast-layer"),
    previewBanner: $("#preview-banner"),
    previewCount: $("#preview-count"),
    levelIntroOverlay: $("#overlay-level-intro"),
    levelIntroNum: $("#level-intro-num"),
    levelIntroDesc: $("#level-intro-desc"),
    levelIntroBooks: $("#level-intro-books"),
    levelIntroStart: $("#btn-level-start"),
    clearOverlay: $("#overlay-clear"),
    clearTime: $("#clear-time"),
    clearFlips: $("#clear-flips"),
    nextLevelBtn: $("#btn-next-level"),
    timeoutOverlay: $("#overlay-timeout"),
    retryBtn: $("#btn-retry"),
    gameoverOverlay: $("#overlay-gameover"),
    gameoverLevel: $("#gameover-level"),
    gameoverRestart: $("#btn-gameover-restart"),
    gameoverLibraryLink: $("#link-gameover-library"),
    timeoutLibraryLink: $("#link-timeout-library"),
    bookGallery: $("#book-gallery"),
    playAgainBtn: $("#btn-play-again"),
    coverPreviewOverlay: $("#overlay-cover-preview"),
    coverPreviewImage: $("#cover-preview-image"),
    coverPreviewTitle: $("#cover-preview-title"),
    coverPreviewMeta: $("#cover-preview-meta"),
    coverPreviewTagline: $("#cover-preview-tagline"),
    coverPreviewClose: $("#btn-close-cover-preview"),
  };

  els.gameoverLibraryLink.href = LIBRARY_URL;
  els.timeoutLibraryLink.href = LIBRARY_URL;

  // ---------- 상태 ----------
  let state = null; // 현재 레벨 진행 상태
  let levelIndex = 0;
  const MAX_LIVES = 3;
  let lives = MAX_LIVES; // 레벨을 넘어가도 유지되는, 게임 전체 목숨
  let introducedBookIds = new Set(); // 이번 플레이에서 이미 "NEW"로 소개된 책

  function resetLives() {
    lives = MAX_LIVES;
    document.querySelectorAll(".heart").forEach((h) => h.classList.remove("lost", "breaking"));
  }

  function resetRun() {
    resetLives();
    introducedBookIds = new Set();
  }

  function loseLife() {
    const lostIndex = lives - 1;
    lives = Math.max(0, lives - 1);
    const heartEl = document.querySelector(`.heart[data-i="${lostIndex}"]`);
    if (heartEl) {
      heartEl.classList.add("lost", "breaking");
      setTimeout(() => heartEl.classList.remove("breaking"), 400);
    }
  }

  function showScreen(el) {
    [els.intro, els.game, els.allclear].forEach((s) => s.classList.remove("active"));
    el.classList.add("active");
  }

  function formatTime(sec) {
    const s = Math.max(0, Math.ceil(sec));
    const m = Math.floor(s / 60);
    const r = s % 60;
    return `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
  }

  function matchLabel(groups) {
    const min = Math.min(...groups);
    const max = Math.max(...groups);
    return min === max ? `${min} MATCH` : `${min}-${max} MATCH`;
  }

  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  // ---------- 덱 생성 ----------
  function buildDeck(levelConfig) {
    const requiredCount = {};
    const cards = [];
    levelConfig.groups.forEach((count, i) => {
      const book = BOOKS[i % BOOKS.length];
      requiredCount[book.id] = count;
      for (let k = 0; k < count; k++) {
        cards.push({ bookId: book.id });
      }
    });
    shuffle(cards);
    cards.forEach((c, i) => (c.pos = i));
    return { cards, requiredCount, totalGroups: levelConfig.groups.length };
  }

  function bookById(id) {
    return BOOKS.find((b) => b.id === id);
  }

  // ---------- 카드 렌더 ----------
  function cardFrontContent(book) {
    if (book.coverImage) {
      const img = document.createElement("img");
      img.src = book.coverImage;
      img.alt = book.title;
      img.loading = "lazy";
      return img;
    }
    const div = document.createElement("div");
    div.className = "placeholder-cover";
    div.style.background = `linear-gradient(150deg, hsl(${hashHue(book.id)},60%,42%), hsl(${
      hashHue(book.id) + 40
    },55%,26%))`;
    const t = document.createElement("div");
    t.className = "p-title";
    t.textContent = book.title;
    div.appendChild(t);
    return div;
  }

  function hashHue(str) {
    let h = 0;
    for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) % 360;
    return h;
  }

  // 가로 폭뿐 아니라 세로 여유 공간까지 고려해 카드 크기를 계산한다.
  // (행이 많은 레벨 9-10을 세로 화면 모바일에서 열 때 보드가 화면 밖으로
  // 넘치는 것을 방지)
  function sizeBoard() {
    const cols = state.config.cols;
    const rows = state.config.rows;
    const gap = 11;
    const wrap = els.board.parentElement;
    const availW = wrap.clientWidth;
    const availH = wrap.clientHeight;
    const cellWByWidth = (availW - gap * (cols - 1)) / cols;
    const cellHByHeight = (availH - gap * (rows - 1)) / rows;
    const cellWByHeight = cellHByHeight * (3 / 4); // 카드 비율 3:4 (가로:세로)
    const cellW = Math.max(58, Math.min(cellWByWidth, cellWByHeight, 200));
    const boardWidth = cellW * cols + gap * (cols - 1);
    els.board.style.maxWidth = boardWidth + "px";
  }

  window.addEventListener("resize", () => {
    if (state) sizeBoard();
  });

  function renderBoard() {
    els.board.innerHTML = "";
    els.board.style.gridTemplateColumns = `repeat(${state.config.cols}, 1fr)`;
    sizeBoard();

    state.deck.cards.forEach((card, idx) => {
      const book = bookById(card.bookId);
      const cardEl = document.createElement("div");
      cardEl.className = "card";
      cardEl.dataset.idx = idx;

      const inner = document.createElement("div");
      inner.className = "card-inner";

      const back = document.createElement("div");
      back.className = "card-face card-back";

      const front = document.createElement("div");
      front.className = "card-face card-front";
      front.appendChild(cardFrontContent(book));

      inner.appendChild(back);
      inner.appendChild(front);
      cardEl.appendChild(inner);

      cardEl.addEventListener("click", () => onCardClick(idx));
      els.board.appendChild(cardEl);
    });
  }

  function getCardEl(idx) {
    return els.board.querySelector(`.card[data-idx="${idx}"]`);
  }

  // ---------- 레벨 시작 ----------
  function beginLevel(idx) {
    levelIndex = idx;
    const config = LEVELS[idx];
    const deck = buildDeck(config);
    state = {
      config,
      deck,
      remainingGroups: deck.totalGroups,
      selected: [],
      flips: 0,
      locked: true, // 인트로 오버레이 닫히기 전까지 잠금
      timeLeft: config.timeLimit,
      timerId: null,
      startedAt: null,
      finished: false,
    };

    showScreen(els.game);
    renderBoard();
    updateHud();
    showLevelIntro(config);
  }

  function showLevelIntro(config) {
    els.levelIntroNum.textContent = `LEVEL ${String(config.level).padStart(2, "0")}`;
    const label = matchLabel(config.groups);
    const bookCount = config.groups.length;
    els.levelIntroDesc.innerHTML = `같은 책 <b>${label}</b> &nbsp;·&nbsp; 카드 ${
      config.cols * config.rows
    }장 &nbsp;·&nbsp; 도서 ${bookCount}종<br/>제한시간 <b>${formatTime(
      config.timeLimit
    )}</b>`;
    renderLevelIntroBooks(config);
    els.levelIntroOverlay.classList.add("active");
  }

  // 이번 레벨에 등장하는 책들을 표지+한 줄 소개로 보여준다.
  // 이번 플레이에서 처음 등장하는 책에는 NEW 배지를 붙인다.
  function renderLevelIntroBooks(config) {
    els.levelIntroBooks.innerHTML = "";
    const bookIds = config.groups.map((_, i) => BOOKS[i % BOOKS.length].id);
    const uniqueIds = [...new Set(bookIds)];

    uniqueIds.forEach((id) => {
      const book = bookById(id);
      const isNew = !introducedBookIds.has(id);
      introducedBookIds.add(id);

      const row = document.createElement("div");
      row.className = "level-intro-book-row";

      const cover = document.createElement("div");
      cover.className = "row-cover";
      cover.appendChild(cardFrontContent(book));

      const text = document.createElement("div");
      text.className = "row-text";

      const titleLine = document.createElement("div");
      titleLine.className = "row-title-line";
      const title = document.createElement("div");
      title.className = "row-title";
      title.textContent = book.title;
      titleLine.appendChild(title);
      if (isNew) {
        const badge = document.createElement("span");
        badge.className = "row-new-badge";
        badge.textContent = "NEW";
        titleLine.appendChild(badge);
      }

      const tagline = document.createElement("div");
      tagline.className = "row-tagline";
      tagline.textContent = book.tagline || "";

      text.appendChild(titleLine);
      text.appendChild(tagline);
      row.appendChild(cover);
      row.appendChild(text);
      row.addEventListener("click", () => showCoverPreview(book));
      els.levelIntroBooks.appendChild(row);
    });
  }

  // ---------- 표지 확대 보기 ----------
  function showCoverPreview(book) {
    els.coverPreviewImage.innerHTML = "";
    els.coverPreviewImage.appendChild(cardFrontContent(book));
    els.coverPreviewTitle.textContent = book.title;
    els.coverPreviewMeta.textContent = [book.author, book.publisher].filter(Boolean).join(" · ");
    els.coverPreviewTagline.textContent = book.tagline || "";
    els.coverPreviewOverlay.classList.add("active");
  }

  function hideCoverPreview() {
    els.coverPreviewOverlay.classList.remove("active");
  }

  els.coverPreviewClose.addEventListener("click", hideCoverPreview);
  els.coverPreviewOverlay.addEventListener("click", (e) => {
    if (e.target === els.coverPreviewOverlay) hideCoverPreview();
  });

  els.levelIntroStart.addEventListener("click", () => {
    els.levelIntroOverlay.classList.remove("active");
    startPreview();
  });

  // 카드 수에 비례해 4~8초 동안 모든 카드를 공개했다가 뒤집으며 시작한다.
  function previewDuration(cardCount) {
    return Math.min(8, 3 + Math.ceil(cardCount / 8));
  }

  function startPreview() {
    const cardCount = state.config.cols * state.config.rows;
    const durationSec = previewDuration(cardCount);
    let secondsLeft = durationSec;

    state.locked = true;
    document.querySelectorAll("#board .card").forEach((el) => el.classList.add("flipped"));
    els.previewCount.textContent = secondsLeft;
    els.previewBanner.classList.add("show");

    const countdownId = setInterval(() => {
      secondsLeft -= 1;
      if (secondsLeft > 0) els.previewCount.textContent = secondsLeft;
    }, 1000);

    setTimeout(() => {
      clearInterval(countdownId);
      els.previewBanner.classList.remove("show");
      document.querySelectorAll("#board .card").forEach((el) => el.classList.remove("flipped"));
      setTimeout(() => {
        if (state.finished) return;
        state.locked = false;
        state.startedAt = Date.now();
        startTimer();
      }, 450);
    }, durationSec * 1000);
  }

  function startTimer() {
    clearInterval(state.timerId);
    state.timerId = setInterval(() => {
      state.timeLeft -= 1;
      if (state.timeLeft <= 0) {
        state.timeLeft = 0;
        updateHud();
        clearInterval(state.timerId);
        onTimeOver();
        return;
      }
      updateHud();
    }, 1000);
  }

  function updateHud() {
    const config = state.config;
    els.hudLevel.textContent = `LEVEL ${String(config.level).padStart(2, "0")}`;
    els.hudMatch.textContent = matchLabel(config.groups);
    els.hudTime.textContent = formatTime(state.timeLeft);
    els.hudTime.classList.toggle("time-low", state.timeLeft <= 10);
    els.hudRemaining.textContent = state.remainingGroups;
  }

  // ---------- 카드 클릭 처리 ----------
  function onCardClick(idx) {
    if (!state || state.locked || state.finished) return;
    const card = state.deck.cards[idx];
    const cardEl = getCardEl(idx);
    if (!cardEl || cardEl.classList.contains("flipped") || cardEl.classList.contains("matched"))
      return;
    if (state.selected.includes(idx)) return;

    cardEl.classList.add("flipped");
    state.flips += 1;
    state.selected.push(idx);

    if (state.selected.length === 1) return;

    const firstBookId = state.deck.cards[state.selected[0]].bookId;
    const allSame = state.selected.every((i) => state.deck.cards[i].bookId === firstBookId);

    if (!allSame) {
      state.locked = true;
      const toFlip = [...state.selected];
      loseLife();
      setTimeout(() => {
        toFlip.forEach((i) => {
          const el = getCardEl(i);
          el.classList.add("shake");
          setTimeout(() => el.classList.remove("shake"), 400);
        });
      }, 250);
      setTimeout(() => {
        toFlip.forEach((i) => getCardEl(i).classList.remove("flipped"));
        state.selected = [];
        if (lives <= 0) {
          triggerGameOver();
        } else {
          state.locked = false;
        }
      }, 700);
      return;
    }

    const required = state.deck.requiredCount[firstBookId];
    if (state.selected.length === required) {
      handleMatchSuccess(firstBookId, [...state.selected]);
      state.selected = [];
    }
  }

  function handleMatchSuccess(bookId, indices) {
    const book = bookById(bookId);
    indices.forEach((i) => {
      const el = getCardEl(i);
      el.classList.add("matched", "pop");
      setTimeout(() => el.classList.remove("pop"), 400);
    });
    state.remainingGroups -= 1;
    updateHud();
    showMatchToast(book.title);

    if (state.remainingGroups <= 0) {
      state.locked = true;
      state.finished = true;
      clearInterval(state.timerId);
      setTimeout(() => onLevelClear(), 550);
    }
  }

  function showMatchToast(title) {
    const toast = document.createElement("div");
    toast.className = "match-toast";
    toast.innerHTML = `<div class="mt-label">MATCH!</div><div class="mt-title">${escapeHtml(
      title
    )}</div>`;
    els.toastLayer.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add("show"));
    setTimeout(() => {
      toast.classList.remove("show");
      setTimeout(() => toast.remove(), 200);
    }, 950);
  }

  function escapeHtml(str) {
    const d = document.createElement("div");
    d.textContent = str;
    return d.innerHTML;
  }

  // ---------- 레벨 클리어 ----------
  function onLevelClear() {
    const elapsedMs = Date.now() - state.startedAt;
    const elapsedSec = elapsedMs / 1000;
    els.clearTime.textContent = formatTime(elapsedSec);
    els.clearFlips.textContent = state.flips;

    const isFinal = levelIndex === LEVELS.length - 1;
    els.nextLevelBtn.textContent = isFinal ? "결과 보기" : "NEXT LEVEL";
    els.clearOverlay.classList.add("active");
    spawnConfetti(isFinal ? 70 : 26);
  }

  els.nextLevelBtn.addEventListener("click", () => {
    els.clearOverlay.classList.remove("active");
    if (levelIndex === LEVELS.length - 1) {
      showAllClear();
    } else {
      beginLevel(levelIndex + 1);
    }
  });

  // ---------- 시간 초과 ----------
  function onTimeOver() {
    state.locked = true;
    els.timeoutOverlay.classList.add("active");
  }

  els.retryBtn.addEventListener("click", () => {
    els.timeoutOverlay.classList.remove("active");
    beginLevel(levelIndex);
  });

  // ---------- 게임 오버 (하트 소진) ----------
  function triggerGameOver() {
    clearInterval(state.timerId);
    state.locked = true;
    state.finished = true;
    els.gameoverLevel.textContent = `LEVEL ${String(state.config.level).padStart(2, "0")}`;
    els.gameoverOverlay.classList.add("active");
  }

  els.gameoverRestart.addEventListener("click", () => {
    els.gameoverOverlay.classList.remove("active");
    resetRun();
    beginLevel(0);
  });

  // ---------- ALL CLEAR ----------
  function showAllClear() {
    els.bookGallery.innerHTML = "";
    BOOKS.forEach((book) => {
      const item = document.createElement("div");
      item.className = "book-gallery-item";

      const cover = document.createElement("div");
      cover.className = "bg-cover";
      cover.appendChild(cardFrontContent(book));

      const title = document.createElement("div");
      title.className = "bg-title";
      title.textContent = book.title;

      const author = document.createElement("div");
      author.className = "bg-author";
      author.textContent = [book.author, book.publisher].filter(Boolean).join(" · ");

      const link = document.createElement("a");
      link.className = "bg-link";
      link.href = book.libraryUrl || "#";
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.textContent = "전자도서관에서 보기";

      item.appendChild(cover);
      item.appendChild(title);
      item.appendChild(author);
      item.appendChild(link);
      els.bookGallery.appendChild(item);
    });

    showScreen(els.allclear);
    spawnConfetti(90);
  }

  els.playAgainBtn.addEventListener("click", () => {
    resetRun();
    beginLevel(0);
  });

  // ---------- 컨페티 ----------
  function spawnConfetti(count) {
    const layer = document.createElement("div");
    layer.className = "confetti-layer";
    document.body.appendChild(layer);
    const colors = ["#ff8a4c", "#ffd166", "#59d29a", "#6c8dff", "#ff5d6c"];
    for (let i = 0; i < count; i++) {
      const piece = document.createElement("div");
      piece.className = "confetti-piece";
      piece.style.left = Math.random() * 100 + "vw";
      piece.style.background = colors[i % colors.length];
      const duration = 1.6 + Math.random() * 1.2;
      const delay = Math.random() * 0.4;
      piece.style.animationDuration = duration + "s";
      piece.style.animationDelay = delay + "s";
      piece.style.transform = `rotate(${Math.random() * 360}deg)`;
      layer.appendChild(piece);
    }
    setTimeout(() => layer.remove(), 3200);
  }

  // ---------- 시작 ----------
  els.playBtn.addEventListener("click", () => {
    resetRun();
    beginLevel(0);
  });
})();
