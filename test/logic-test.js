// 순수 로직 검증 스크립트 (DOM 없이 node로 실행)
// game.js의 매칭 상태머신을 동일하게 재현하여 레벨 1~10 전체를 시뮬레이션합니다.
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const sandbox = {};
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(__dirname, "../data/books.js"), "utf8"), sandbox);
vm.runInContext(fs.readFileSync(path.join(__dirname, "../data/levels.js"), "utf8"), sandbox);
// 브라우저의 <script> 전역 스코프와 달리 vm 컨텍스트의 top-level const는
// 컨텍스트 객체의 own property가 아니므로, 같은 컨텍스트에서 평가해 꺼내온다.
const { BOOKS, LEVELS } = vm.runInContext("({ BOOKS, LEVELS })", sandbox);

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function buildDeck(levelConfig) {
  const requiredCount = {};
  const cards = [];
  levelConfig.groups.forEach((count, i) => {
    const book = BOOKS[i % BOOKS.length];
    requiredCount[book.id] = count;
    for (let k = 0; k < count; k++) cards.push({ bookId: book.id });
  });
  shuffle(cards);
  return { cards, requiredCount, totalGroups: levelConfig.groups.length };
}

// game.js의 onCardClick 상태머신을 재현
function simulateClickSequence(deck, clickOrder) {
  let selected = [];
  let remainingGroups = deck.totalGroups;
  let matchedIdx = new Set();
  let mismatchEvents = 0;
  let matchEvents = 0;

  for (const idx of clickOrder) {
    if (matchedIdx.has(idx) || selected.includes(idx)) continue; // 이미 처리된 카드는 클릭 불가 (실제 게임과 동일)
    selected.push(idx);
    if (selected.length === 1) continue;

    const firstBookId = deck.cards[selected[0]].bookId;
    const allSame = selected.every((i) => deck.cards[i].bookId === firstBookId);

    if (!allSame) {
      mismatchEvents++;
      selected = [];
      continue;
    }
    const required = deck.requiredCount[firstBookId];
    if (selected.length === required) {
      selected.forEach((i) => matchedIdx.add(i));
      matchEvents++;
      remainingGroups--;
      selected = [];
    }
  }
  return { remainingGroups, matchedIdx, mismatchEvents, matchEvents };
}

// "완벽한 플레이어" 클릭 순서 생성: 같은 책끼리 뭉쳐서 순서대로 공개 (정상 매치 경로 검증)
function perfectOrder(deck) {
  const byBook = {};
  deck.cards.forEach((c, i) => {
    (byBook[c.bookId] = byBook[c.bookId] || []).push(i);
  });
  return Object.values(byBook).flat();
}

let allPass = true;

LEVELS.forEach((lv) => {
  const cells = lv.cols * lv.rows;
  const groupSum = lv.groups.reduce((a, b) => a + b, 0);
  const mathOk = cells === groupSum;

  const deck = buildDeck(lv);
  const order = perfectOrder(deck);
  const result = simulateClickSequence(deck, order);

  const fullyMatched = result.remainingGroups === 0 && result.matchedIdx.size === cells;
  const noMismatchInPerfectRun = result.mismatchEvents === 0;

  const status = mathOk && fullyMatched && noMismatchInPerfectRun ? "PASS" : "FAIL";
  if (status === "FAIL") allPass = false;

  console.log(
    `Lv${String(lv.level).padStart(2, "0")} [${status}] cells=${cells} groupSum=${groupSum} groups=${lv.groups.length}` +
      ` matchEvents=${result.matchEvents}/${deck.totalGroups} matchedCards=${result.matchedIdx.size}/${cells}` +
      ` label=${Math.min(...lv.groups)}-${Math.max(...lv.groups)} time=${lv.timeLimit}s`
  );
});

// mismatch 경로 별도 검증: 서로 다른 책 카드를 일부러 섞어 클릭했을 때
// 매치가 잘못 인정되지 않는지 확인 (2 MATCH / 3 MATCH 각각 대표 레벨로 테스트)
function testMismatchRejection(levelIndex, label) {
  const lv = LEVELS[levelIndex];
  const deck = buildDeck(lv);
  // 서로 다른 책 두 장을 찾아 mismatch 유발
  const bookIds = Object.keys(deck.requiredCount);
  const idxA = deck.cards.findIndex((c) => c.bookId === bookIds[0]);
  const idxB = deck.cards.findIndex((c) => c.bookId === bookIds[1]);
  const result = simulateClickSequence(deck, [idxA, idxB]);
  const ok = result.mismatchEvents === 1 && result.matchEvents === 0;
  console.log(`Mismatch-rejection test (${label}, Lv${lv.level}): ${ok ? "PASS" : "FAIL"}`);
  if (!ok) allPass = false;
}
testMismatchRejection(0, "2 MATCH"); // Lv1
testMismatchRejection(6, "3 MATCH"); // Lv7 (3 MATCH 전환 첫 레벨)
testMismatchRejection(9, "3 MATCH"); // Lv10 (FINAL)

// 3 MATCH에서 "필요한 수까지 모으기 전에는 실패 처리 안 됨" 검증
function testPartialProgressAllowed(levelIndex, label) {
  const lv = LEVELS[levelIndex];
  const deck = buildDeck(lv);
  const required = Math.max(...lv.groups);
  const bookId = Object.keys(deck.requiredCount).find((id) => deck.requiredCount[id] === required);
  const idxs = deck.cards.map((c, i) => (c.bookId === bookId ? i : -1)).filter((i) => i >= 0);
  // required-1 장만 먼저 클릭 (아직 매치 안 됨), 그 다음 마지막 한 장 클릭 -> 매치 성공해야 함
  const order = idxs.slice(0, required);
  const result = simulateClickSequence(deck, order);
  const ok = result.matchEvents === 1 && result.mismatchEvents === 0;
  console.log(`Partial-progress test (${label} requires ${required}, Lv${lv.level}): ${ok ? "PASS" : "FAIL"}`);
  if (!ok) allPass = false;
}
testPartialProgressAllowed(6, "3 MATCH"); // Lv7
testPartialProgressAllowed(9, "3 MATCH"); // Lv10 (FINAL, 책 재사용 그룹 포함)

console.log("\n" + (allPass ? "ALL TESTS PASSED" : "SOME TESTS FAILED"));
process.exit(allPass ? 0 : 1);
