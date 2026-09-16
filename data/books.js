/*
 * BOOK MATCH - 도서 데이터
 * ------------------------------------------------------------
 * 나중에 실제 도서 정보로 교체할 때는 이 배열만 수정하면 됩니다.
 *
 *  id           : 고유 식별자 (문자열, 변경 가능하지만 유일해야 함)
 *  title        : 책 제목
 *  author       : 저자명            -> 미확인 도서는 임시값
 *  publisher    : 출판사            -> 미확인 도서는 빈 문자열
 *  tagline      : 레벨 시작 전 "책 소개" 팝업에 노출되는 한 줄 소개 문구
 *  coverImage   : 표지 이미지 경로 또는 URL
 *  libraryUrl   : "전자도서관에서 보기" 버튼 링크. 현재는 전자도서관 메인
 *                 페이지(https://coex.dkyobobook.co.kr/main.ink)로 통일 연결됨.
 *                 책마다 개별 상세페이지 URL을 받으면 각 항목에 따로 넣어주세요.
 *
 * 표지 이미지는 assets/covers/ 폴더의 실제 파일을 사용 중입니다.
 * coverImage를 비워두면(빈 문자열) 자동으로 컬러 플레이스홀더 표지가 생성됩니다.
 *
 * 참고: 삼체 2부(암흑의 숲)는 저자/출판사/소개 문구는 있으나 표지 이미지이
 * 아직 없어 이번 구성에서는 제외했습니다. covers 폴더에 표지를 추가하고
 * 아래에 항목을 하나 더 넣으면 12권 구성으로 확장할 수 있습니다. (그 경우
 * data/levels.js의 레벨별 사용 도서 수도 함께 검토해주세요.)
 * ------------------------------------------------------------
 */

// 전자도서관 메인 페이지. 책 상세페이지 URL을 받으면 각 도서의 libraryUrl에
// 개별로 넣어주고, 이 상수는 "중도포기하고 책 읽기"처럼 특정 도서와 무관한
// 곳에서 계속 사용됩니다.
const LIBRARY_URL = "https://coex.dkyobobook.co.kr/main.ink";

const BOOKS = [
  {
    id: "b01",
    title: "독성인간",
    author: "리앤 텐 브링크",
    publisher: "웅진지식하우스",
    tagline:
      "이상하게 만나고 나면 내가 잘못한 것 같은 사람, 주변에 있나요? 나르시시스트·마키아벨리언·사이코패스 등 교묘하게 타인을 조종하는 '독성 인간'을 알아보고 휘둘리지 않는 법.",
    coverImage: "assets/covers/독성인간.jpg",
    libraryUrl: LIBRARY_URL,
  },
  {
    id: "b02",
    title: "부자의 그릇",
    author: "이즈미 마사토",
    publisher: "다산북스",
    tagline:
      "왜 어떤 사람에게는 돈이 머물고, 어떤 사람에게서는 빠져나갈까? 돈을 다루는 능력과 사람의 '그릇'에 대한 이야기.",
    coverImage: "assets/covers/부자의그릇.jpg",
    libraryUrl: LIBRARY_URL,
  },
  {
    id: "b03",
    title: "삼체 1부(개정판)",
    author: "류츠신",
    publisher: "자음과모음",
    tagline: "어느 날, 지구 밖 문명으로부터 메시지가 도착했다. 인류의 운명을 뒤흔드는 접촉이 시작된다.",
    coverImage: "assets/covers/삼체1부.jpg",
    libraryUrl: LIBRARY_URL,
  },
  {
    id: "b04",
    title: "삼체 3부 - 사신의 영생(개정판)",
    author: "류츠신",
    publisher: "자음과모음",
    tagline:
      "인류가 우주 끝까지 살아남을 수 있다면, 우리는 무엇을 포기해야 할까? 시간과 문명의 끝까지 질주하는 《삼체》의 마지막 이야기.",
    coverImage: "assets/covers/삼체3부.jpg",
    libraryUrl: LIBRARY_URL,
  },
  {
    id: "b05",
    title: "실리콘밸리 프로세스의 힘",
    author: "신재은",
    publisher: "더퀘스트",
    tagline:
      "실리콘밸리는 정말 '천재들이 모여서' 성공한 걸까? 성과를 만드는 조직은 사람보다 '일하는 방식'이 다르다.",
    coverImage: "assets/covers/실리콘밸리프로세스의힘.jpg",
    libraryUrl: LIBRARY_URL,
  },
  {
    id: "b06",
    title: "월가의 영웅",
    author: "피터 린치 외 1명",
    publisher: "국일증권경제연구소",
    tagline:
      "당신이 매일 가는 카페와 마트에도 '대박 주식'의 힌트가 숨어 있다. 전설적인 투자자 피터 린치가 알려주는 투자법.",
    coverImage: "assets/covers/월가의영웅.jpg",
    libraryUrl: LIBRARY_URL,
  },
  {
    id: "b07",
    title: "이향인",
    author: "라미 카민스키",
    publisher: "21세기북스",
    tagline:
      "혼자가 좋은데, 외로운 건 싫다. 내향인도 외향인도 아닌 당신에게, 사람들과 적당히 연결되면서도 나답게 살아가는 법을 이야기하는 책.",
    coverImage: "assets/covers/이향인.jpg",
    libraryUrl: LIBRARY_URL,
  },
  {
    id: "b08",
    title: "일리아스",
    author: "호메로스",
    publisher: "아카넷",
    tagline:
      "3천 년 전 사람들도 사랑하고, 질투하고, 분노하고, 복수했다. 인간은 얼마나 달라졌고, 또 얼마나 그대로일까?",
    coverImage: "assets/covers/일리아스.jpg",
    libraryUrl: LIBRARY_URL,
  },
  {
    id: "b09",
    title: "초풍요의 시대",
    author: "피터 디아만디스 외 1명",
    publisher: "비즈니스북스",
    tagline:
      "돈을 벌기 위해 일하지 않아도 되는 시대가 정말 올까? AI와 폭발적인 기술 발전이 노동·의료·에너지·경제의 상식을 뒤집을 미래를 미리 들여다보는 책.",
    coverImage: "assets/covers/초풍요의시대.jpg",
    libraryUrl: LIBRARY_URL,
  },
  {
    id: "b10",
    title: "최소한의 삼국지",
    author: "최태성",
    publisher: "프런트페이지",
    tagline: "조조, 유비, 관우는 아는데 정작 삼국지는 모른다면? 이것만 읽어도 사람들과 삼국지 이야기에 끼어들 수 있다.",
    coverImage: "assets/covers/최소한의삼국지.jpg",
    libraryUrl: LIBRARY_URL,
  },
  {
    id: "b11",
    title: "새들의 사회성",
    author: "편혜영",
    publisher: "문학동네",
    tagline:
      "우리는 혼자 살아남는 법보다, 함께 버티는 법을 먼저 배웠는지도 모른다. 낯설고 불안한 일상 속에서도 결국 서로에게 기대어 살아가는 사람들의 이야기.",
    coverImage: "assets/covers/새들의사회성.jpg",
    libraryUrl: LIBRARY_URL,
  },
];
