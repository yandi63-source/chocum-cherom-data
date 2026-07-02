/* ===========================
   처음처럼 - 이진구의 영상일기
   리디북스 스타일 Book Reader
   =========================== */

let INDEX = [];
let POSTS_CACHE = {};
let MUGUNG_IDS = [];

// 현재 상태
let pages = [];           // 현재 표시중인 페이지 HTML 배열
let currentPageIdx = 0;
let currentPostIndex = -1;
let currentPost = null;
let activeLayer = 1;      // 1 or 2 (교대 레이어)
let isFlipping = false;
let barsVisible = false;  // 기본 숨김 (책처럼)

// 설정
let fontSize = 18;
let isDark = false;
let colorTheme = 'warm';
let themeMode = 'light';
let imageSize = 'normal';
let fontFamily = 'noto-serif';
let flipStyle = 'flip3d';
let ttsVoice = 'female';  // 낭독 목소리 (female/male)

// === 초기화 ===
document.addEventListener('DOMContentLoaded', async () => {
  if (location.search.includes('reset=1')) {
    localStorage.removeItem('book-settings');
    location.replace(location.pathname);
    return;
  }
  restoreSettings();
  setupTouch();
  setupKeyboard();

  try {
    const resp = await fetch('data/index.json');
    INDEX = await resp.json();
    INDEX.sort((a, b) => a.id - b.id);
    MUGUNG_IDS = INDEX.filter(p => p.title && p.title.includes('무궁화')).map(p => p.id);
    initApp();
  } catch (e) {
    console.error('데이터 로드 실패:', e);
    getActiveLayer().innerHTML = '<div style="text-align:center;padding:40% 0;color:var(--text-muted);">데이터를 불러올 수 없습니다.</div>';
  }
});

function initApp() {
  buildTOC();
  setupTOCSearch();

  // URL 해시로 특정 글 열기
  if (location.hash && location.hash.startsWith('#post-')) {
    const id = parseInt(location.hash.replace('#post-', ''));
    if (id) { openPostById(id); return; }
  }

  // 새 글 알림 체크
  checkNewPosts();

  // 표지부터 시작
  showIntroPages();
}

// === 새 글 알림 ===
function checkNewPosts() {
  const lastSeen = parseInt(localStorage.getItem('book-last-seen-count') || '0');
  const bell = document.getElementById('newPostBell');

  if (lastSeen === 0) {
    // 첫 방문: 전체 글 수를 알려줌
    bell.textContent = `🔔 ${INDEX.length}편의 이야기`;
    bell.style.display = '';
    // 5초 후 자동으로 현재 수 기록
    setTimeout(() => {
      localStorage.setItem('book-last-seen-count', INDEX.length.toString());
    }, 5000);
  } else if (INDEX.length > lastSeen) {
    const newCount = INDEX.length - lastSeen;
    bell.textContent = `🔔 새 글 ${newCount}편`;
    bell.style.display = '';
  } else {
    bell.style.display = 'none';
  }
}

function goToLatestPost() {
  if (INDEX.length > 0) {
    openPostByIdx(INDEX.length - 1);
  }
  localStorage.setItem('book-last-seen-count', INDEX.length.toString());
  document.getElementById('newPostBell').style.display = 'none';
}

// === 인트로 페이지 (표지 + 저자) ===
function showIntroPages() {
  currentPostIndex = -1;
  currentPost = null;
  _tocCurrentYear = null;  // 목차 상태 초기화

  const totalImages = INDEX.reduce((s, p) => s + (p.img_count || 0), 0);
  const dates = INDEX.filter(p => p.date).map(p => p.date);
  let yearRange = '2009 — 2026';
  if (dates.length) {
    const years = [...new Set(dates.map(d => {
      const y = d.substring(0, 2);
      return parseInt(y) > 50 ? 1900 + parseInt(y) : 2000 + parseInt(y);
    }))].sort((a,b) => a-b);
    yearRange = `${years[0]} — ${years[years.length - 1]}`;
  }

  pages = [];

  // 1. 표지
  pages.push(`
    <div class="cover-page">
      <div class="cover-ornament">✦ ✦ ✦</div>
      <h1 class="cover-title">처음처럼</h1>
      <p class="cover-subtitle">영 상 일 기</p>
      <p class="cover-author">이 진 구</p>
      <p class="cover-role">안동문화회관 관장 · 향토사가</p>
      <div class="cover-stats">
        <div class="cover-stat">
          <span class="cover-stat-number">${INDEX.length}</span>
          <span class="cover-stat-label">편의 이야기</span>
        </div>
        <div class="cover-stat">
          <span class="cover-stat-number">${yearRange}</span>
          <span class="cover-stat-label">기록의 세월</span>
        </div>
        <div class="cover-stat">
          <span class="cover-stat-number">${totalImages.toLocaleString()}</span>
          <span class="cover-stat-label">장의 사진</span>
        </div>
      </div>
      <p class="cover-hint">넘겨서 읽기 →</p>
    </div>
  `);

  // 2. 저자 소개
  pages.push(`
    <div class="author-page">
      <h2>저자에 대하여</h2>
      <div class="author-bio">
        <p><strong>이진구</strong>(李鎭九, 세례명 시몬). 1940년 경북 안동에서 태어나 안동사법본과를 졸업하고 교사, 교육행정 분야에서 경력을 쌓았다.</p>
        <p>1978년 안동문화회관 제2대 관장으로 부임하여 안동 지역의 문화와 역사를 보존하고 알리는 일에 평생을 바쳤다. 안동시·군 향토사가협의회 위촉 향토사가이자 안동군 문화재보호위원으로 활동하며, 수백 년간 땅속에 묻혀 있던 임하사 7층 전탑지를 발굴하는 데 기여했다.</p>
        <p>2009년부터 다음 카페 '고타야(古陀耶)'에 <em>영상일기</em>를 연재하며, 안동의 산과 물, 서원과 고택, 축제와 사람들, 그리고 일상의 소소한 아름다움을 글과 사진으로 기록하고 있다.</p>
      </div>
      <div class="author-highlights">
        <div class="highlight-item">
          <div class="highlight-icon">🏛️</div>
          <div class="highlight-text">안동문화회관</div>
          <div class="highlight-label">제2대 관장</div>
        </div>
        <div class="highlight-item">
          <div class="highlight-icon">📜</div>
          <div class="highlight-text">향토사가</div>
          <div class="highlight-label">문화재보호위원</div>
        </div>
        <div class="highlight-item">
          <div class="highlight-icon">🏺</div>
          <div class="highlight-text">임하사 전탑지</div>
          <div class="highlight-label">유물 발굴 기여</div>
        </div>
        <div class="highlight-item">
          <div class="highlight-icon">🌺</div>
          <div class="highlight-text">안동무궁화</div>
          <div class="highlight-label">보존회 활동</div>
        </div>
      </div>
    </div>
  `);

  // 3. 목차 페이지들
  const tocPages = buildTOCPages();
  pages.push(...tocPages);

  currentPageIdx = 0;
  showPage(0);
  barsVisible = false;
  updateUI();
}

// === 인트로용 목차 페이지 (연도 클릭 → 해당 연도 글 목록 페이지로 이동) ===
let _tocCurrentYear = null;  // null=연도목록, '2009' 등=해당 연도 상세

function _getYearGroups() {
  const groups = {};
  INDEX.forEach((post, idx) => {
    let year = '미분류';
    if (post.date) {
      const y = post.date.substring(0, 2);
      year = (parseInt(y) > 50 ? '19' : '20') + y;
    }
    if (!groups[year]) groups[year] = [];
    groups[year].push({ ...post, _idx: idx });
  });
  return groups;
}

function buildTOCPages() {
  const result = [];
  if (_tocCurrentYear === null) {
    // 연도 목록 페이지
    const groups = _getYearGroups();
    const sortedYears = Object.keys(groups).sort();
    let html = '<div class="toc-page">';
    html += '<h2 class="toc-page-title">목 차</h2>';
    html += '<div class="toc-page-hint">연도를 누르시면 글 목록이 나옵니다</div>';
    sortedYears.forEach(year => {
      const posts = groups[year];
      html += `<div class="toc-year-row" onclick="openTocYear('${year}')">`;
      html += `<span class="toc-year-name">${year}년</span>`;
      html += `<span class="toc-year-dots"></span>`;
      html += `<span class="toc-year-info">${posts.length}편</span>`;
      html += `<span class="toc-year-arrow">▶</span>`;
      html += `</div>`;
    });
    html += `<div class="toc-page-total">총 ${INDEX.length}편의 이야기</div>`;
    html += '</div>';
    result.push(html);
  } else {
    // 연도 상세 페이지 (해당 연도의 전체 글 목록)
    const groups = _getYearGroups();
    const posts = groups[_tocCurrentYear] || [];
    let html = '<div class="toc-page toc-year-detail">';
    html += `<button class="toc-back-btn" onclick="closeTocYear()">← 목차로</button>`;
    html += `<h2 class="toc-page-title">${_tocCurrentYear}년</h2>`;
    html += `<div class="toc-page-hint">글 제목을 누르시면 본문이 나옵니다 (${posts.length}편)</div>`;
    html += '<div class="toc-year-list">';
    posts.forEach(p => {
      html += `<div class="toc-acc-item" onclick="openPostByIdx(${p._idx})">`;
      html += `<span class="toc-acc-date">${formatDateShort(p.date)}</span>`;
      html += `<span class="toc-acc-title">${escHtml(p.title)}</span>`;
      html += `</div>`;
    });
    html += '</div></div>';
    result.push(html);
  }
  return result;
}

// 연도 클릭 → 해당 연도 상세 페이지로
function openTocYear(year) {
  _tocCurrentYear = year;
  _rebuildTocPage();
}

// 목차로 돌아가기
function closeTocYear() {
  _tocCurrentYear = null;
  _rebuildTocPage();
}

// 현재 TOC 페이지만 다시 그림 (표지/저자 페이지는 유지)
function _rebuildTocPage() {
  const newTocPages = buildTOCPages();
  // pages 배열에서 목차 페이지들 교체 (표지=0, 저자=1, 목차=2~)
  pages = pages.slice(0, 2).concat(newTocPages);
  const targetIdx = 2;
  currentPageIdx = targetIdx;
  const layer = getActiveLayer();
  layer.innerHTML = pages[targetIdx];
  layer.scrollTop = 0;
  updateUI();
}

function toggleTocAccordion(year) {
  // deprecated, 하위 호환 (혹시 호출되면 새 구조로)
  openTocYear(year);
  return;
  const list = document.getElementById(`tocList_${year}`);
  const arrow = document.getElementById(`tocArrow_${year}`);
  if (!list) return;
  const isOpen = list.style.display !== 'none';
  list.style.display = isOpen ? 'none' : 'block';
  if (arrow) arrow.textContent = isOpen ? '▶' : '▼';
}

// === 개별 글 로드 ===
async function loadPost(id) {
  if (POSTS_CACHE[id]) return POSTS_CACHE[id];
  try {
    const resp = await fetch(`data/posts/${id}.json`);
    if (!resp.ok) return null;
    const post = await resp.json();
    POSTS_CACHE[id] = post;
    return post;
  } catch { return null; }
}

// === 글 열기 ===
async function openPostByIdx(index) {
  if (index < 0 || index >= INDEX.length) return;
  currentPostIndex = index;

  const layer = getActiveLayer();
  layer.innerHTML = '<div style="text-align:center;padding:40% 0;"><div class="loading-spinner"></div></div>';

  const post = await loadPost(INDEX[index].id);
  if (!post) {
    layer.innerHTML = '<div style="text-align:center;padding:40% 0;color:var(--text-muted);">글을 불러올 수 없습니다.</div>';
    return;
  }
  currentPost = post;
  buildPostPages(post);
  currentPageIdx = 0;
  showPage(0);
  // 글 읽기 시작하면 바 숨기기
  barsVisible = false;
  updateUI();
  history.replaceState(null, '', `#post-${post.id}`);
  closeTOC();
  closeSearch();
}

async function openPostById(id) {
  const idx = INDEX.findIndex(p => p.id === id);
  if (idx >= 0) await openPostByIdx(idx);
}

// === 글 → 페이지 분할 (동적: 실제 렌더링 높이 측정) ===
// 현재 글의 원본 데이터 보관 (글씨 크기 변경 시 재분할용)
let currentParagraphs = [];
let currentHeaderHtml = '';
let currentImages = [];

function buildPostPages(post) {
  // 헤더 HTML (날짜 + 제목)
  currentHeaderHtml = `
    <div class="post-header">
      <div class="post-date">${formatDate(post.date)}</div>
      <div class="post-title">${escHtml(post.title)}</div>
    </div>
  `;

  // 본문 문단 분리
  currentParagraphs = [];
  if (post.text) {
    const stanzas = post.text.split(/\n\s*\n/);
    currentParagraphs = stanzas
      .filter(s => s.trim())
      .map(s => {
        const lines = s.split('\n').map(l => escHtml(l)).filter(l => l.trim());
        return `<p>${lines.join('<br>')}</p>`;
      });
  }

  // 이미지 보관
  currentImages = (post.images && post.images.length > 0)
    ? post.images.slice(0, 40) : [];

  // 동적 페이지 분할 실행
  paginateByHeight();
}

function paginateByHeight() {
  pages = [];

  // 사용 가능한 높이 계산 (뷰포트 - 상단바 - 하단바 - 여유)
  const topH = 72, botH = 80, margin = 40;
  const availH = window.innerHeight - topH - botH - margin;

  // 측정용 숨겨진 div
  const measure = document.createElement('div');
  measure.className = 'post-text-page';
  measure.style.cssText = `
    position:absolute; top:-9999px; left:0;
    width:${Math.min(window.innerWidth, 680)}px;
    padding:8px 24px;
    font-size:${fontSize}px;
    line-height:2.1;
    visibility:hidden;
    font-family:${getComputedStyle(document.body).fontFamily};
  `;
  document.body.appendChild(measure);

  if (currentParagraphs.length > 0) {
    let i = 0;
    let isFirst = true;

    while (i < currentParagraphs.length) {
      measure.innerHTML = isFirst ? currentHeaderHtml : '';
      let count = 0;

      while (i + count < currentParagraphs.length) {
        // 다음 문단 추가해보기
        measure.innerHTML += currentParagraphs[i + count];
        if (measure.scrollHeight > availH && count > 0) {
          // 넘침 → 이 문단 빼기
          measure.innerHTML = (isFirst ? currentHeaderHtml : '') +
            currentParagraphs.slice(i, i + count).join('');
          break;
        }
        count++;
      }

      // 최소 1문단은 넣기
      if (count === 0) count = 1;

      const chunk = currentParagraphs.slice(i, i + count);
      const prefix = isFirst ? currentHeaderHtml : '';
      pages.push(`<div class="post-text-page">${prefix}${chunk.join('')}</div>`);

      i += count;
      isFirst = false;
    }
  } else {
    pages.push(`<div class="post-text-page">${currentHeaderHtml}</div>`);
  }

  document.body.removeChild(measure);

  // 이미지 페이지들 (1장씩)
  for (let i = 0; i < currentImages.length; i++) {
    pages.push(`
      <div class="post-image-page">
        <img src="${currentImages[i]}" alt="사진 ${i + 1}" loading="lazy"
             onerror="this.parentElement.style.display='none'">
      </div>
    `);
  }

  // 끝 페이지
  pages.push(`
    <div class="post-end-page">
      <div class="end-flowers">
        <div class="end-flower"><svg viewBox="0 0 24 24"><path d="M12 2C9.5 5 7 8 7 11c0 2.8 2.2 5 5 5s5-2.2 5-5c0-3-2.5-6-5-9zm-3.5 14.5C6 17.5 4 19 4 21h16c0-2-2-3.5-4.5-4.5L12 18l-3.5-1.5z" opacity=".7"/><circle cx="12" cy="11" r="2.5"/></svg></div>
        <div class="end-flower"><svg viewBox="0 0 24 24"><path d="M12 2C9.5 5 7 8 7 11c0 2.8 2.2 5 5 5s5-2.2 5-5c0-3-2.5-6-5-9zm-3.5 14.5C6 17.5 4 19 4 21h16c0-2-2-3.5-4.5-4.5L12 18l-3.5-1.5z" opacity=".7"/><circle cx="12" cy="11" r="2.5"/></svg></div>
        <div class="end-flower"><svg viewBox="0 0 24 24"><path d="M12 2C9.5 5 7 8 7 11c0 2.8 2.2 5 5 5s5-2.2 5-5c0-3-2.5-6-5-9zm-3.5 14.5C6 17.5 4 19 4 21h16c0-2-2-3.5-4.5-4.5L12 18l-3.5-1.5z" opacity=".7"/><circle cx="12" cy="11" r="2.5"/></svg></div>
      </div>
    </div>
  `);
}

// === 페이지 표시 ===
function getActiveLayer() {
  return document.getElementById(`pageLayer${activeLayer}`);
}
function getInactiveLayer() {
  return document.getElementById(`pageLayer${activeLayer === 1 ? 2 : 1}`);
}

function showPage(idx) {
  if (idx < 0 || idx >= pages.length) return;
  currentPageIdx = idx;
  const layer = getActiveLayer();
  layer.innerHTML = pages[idx];
  layer.scrollTop = 0;
  updateUI();
}

function flipTo(idx, direction) {
  if (isFlipping || idx < 0 || idx >= pages.length) return;

  const outLayer = getActiveLayer();
  const inLayer = getInactiveLayer();
  const shadow = document.getElementById('pageShadow');

  inLayer.innerHTML = pages[idx];
  inLayer.scrollTop = 0;

  if (flipStyle === 'instant') {
    outLayer.className = 'book-page-layer';
    outLayer.innerHTML = '';
    inLayer.className = 'book-page-layer active';
    activeLayer = activeLayer === 1 ? 2 : 1;
    currentPageIdx = idx;
    updateUI();
    return;
  }

  isFlipping = true;

  const durations = { flip3d: 550, slide: 350, fade: 300 };
  const dur = durations[flipStyle] || 500;
  const dirSuffix = direction === 'next' ? 'fwd' : 'bwd';

  if (flipStyle === 'flip3d') {
    shadow.className = 'page-shadow ' + (direction === 'next' ? 'show-fwd' : 'show-bwd');
  }

  const outClass = `${flipStyle}-out-${dirSuffix}`;
  const inClass = `${flipStyle}-in-${dirSuffix}`;

  outLayer.classList.remove('active');
  outLayer.classList.add(outClass);
  inLayer.classList.add(inClass);

  setTimeout(() => {
    outLayer.className = 'book-page-layer';
    outLayer.innerHTML = '';
    inLayer.className = 'book-page-layer active';
    shadow.className = 'page-shadow';

    activeLayer = activeLayer === 1 ? 2 : 1;
    currentPageIdx = idx;
    isFlipping = false;
    updateUI();
  }, dur);

  currentPageIdx = idx;
  updateUI();
}

// === 네비게이션 ===
function nextPage() {
  if (currentPageIdx < pages.length - 1) {
    flipTo(currentPageIdx + 1, 'next');
  } else {
    nextPost();
  }
}

function prevPage() {
  if (currentPageIdx > 0) {
    flipTo(currentPageIdx - 1, 'prev');
  } else if (currentPostIndex > 0) {
    prevPost();
  } else if (currentPostIndex === 0) {
    showIntroPages();
  }
}

async function nextPost() {
  if (currentPostIndex === -1) {
    if (INDEX.length > 0) await openPostByIdx(0);
  } else if (currentPostIndex < INDEX.length - 1) {
    await openPostByIdx(currentPostIndex + 1);
  }
}

async function prevPost() {
  if (currentPostIndex > 0) {
    await openPostByIdx(currentPostIndex - 1);
  } else if (currentPostIndex === 0) {
    showIntroPages();
  }
}

function goHome() {
  showIntroPages();
  history.replaceState(null, '', location.pathname);
}

// === 상단/하단 바 토글 ===
function toggleBars() {
  barsVisible = !barsVisible;
  document.getElementById('topbar').classList.toggle('hidden', !barsVisible);
  document.getElementById('bottombar').classList.toggle('hidden', !barsVisible);
}

// === UI 업데이트 ===
function updateUI() {
  const pageInd = document.getElementById('pageIndicator');
  const btnPrev = document.getElementById('btnPrev');
  const btnNext = document.getElementById('btnNext');
  const tbFontSize = document.getElementById('tbFontSize');
  const prevText = document.getElementById('btnPrevText');
  const nextText = document.getElementById('btnNextText');

  if (tbFontSize) tbFontSize.textContent = fontSize;

  if (currentPostIndex === -1) {
    // 인트로 (표지/저자)
    if (prevText) prevText.textContent = '이전';
    btnPrev.disabled = currentPageIdx === 0;
    if (currentPageIdx >= pages.length - 1) {
      if (nextText) nextText.textContent = '첫 글';
      btnNext.disabled = INDEX.length === 0;
    } else {
      if (nextText) nextText.textContent = '다음';
      btnNext.disabled = false;
    }
  } else {
    const isFirstPage = currentPageIdx === 0;
    const isLastPage = currentPageIdx >= pages.length - 1;
    const isFirstPost = currentPostIndex === 0;
    const isLastPost = currentPostIndex >= INDEX.length - 1;

    if (prevText) prevText.textContent = isFirstPage ? '이전 글' : '이전';
    btnPrev.disabled = isFirstPage && isFirstPost;

    if (isLastPage) {
      if (nextText) nextText.textContent = isLastPost ? '끝' : '다음 글';
      btnNext.disabled = isLastPost;
    } else {
      if (nextText) nextText.textContent = '다음';
      btnNext.disabled = false;
    }
  }

  pageInd.textContent = `${currentPageIdx + 1} / ${pages.length}`;

  document.getElementById('topbar').classList.toggle('hidden', !barsVisible);
  document.getElementById('bottombar').classList.toggle('hidden', !barsVisible);

  // 책 하단 페이지 번호 (바 숨김일 때만 보임)
  const bookPageNum = document.getElementById('bookPageNum');
  if (bookPageNum) {
    bookPageNum.textContent = currentPageIdx + 1;
    bookPageNum.style.opacity = barsVisible ? '0' : '0.4';
  }
}

// === 터치/스와이프 ===
function setupTouch() {
  // 통합 클릭 핸들러: 인터랙티브 요소(버튼/링크/목차항목)는 건너뛰고,
  // 빈 공간 클릭 시에만 x좌표에 따라 이전/중앙/다음 처리
  document.getElementById('book').addEventListener('click', (e) => {
    // 인터랙티브 요소를 클릭한 경우 페이지 넘기기 무시 (원래 onclick이 동작)
    if (e.target.closest('button, a, [onclick], input, select, textarea, .toc-year-row, .toc-acc-item, .toc-back-btn')) {
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const w = rect.width;
    if (x < w * 0.3) prevPage();
    else if (x < w * 0.7) toggleBars();
    else nextPage();
  });

  let startX = 0, startY = 0, startTime = 0;

  document.getElementById('book').addEventListener('touchstart', (e) => {
    startX = e.changedTouches[0].screenX;
    startY = e.changedTouches[0].screenY;
    startTime = Date.now();
  }, { passive: true });

  document.getElementById('book').addEventListener('touchend', (e) => {
    const dx = e.changedTouches[0].screenX - startX;
    const dy = e.changedTouches[0].screenY - startY;
    const dt = Date.now() - startTime;

    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.3 && dt < 600) {
      if (dx > 0) prevPage();
      else nextPage();
    }
  }, { passive: true });
}

// === 키보드 ===
function setupKeyboard() {
  document.addEventListener('keydown', (e) => {
    if (document.getElementById('tocOverlay').classList.contains('open')) {
      if (e.key === 'Escape') closeTOC();
      return;
    }
    if (document.getElementById('searchOverlay').classList.contains('open')) {
      if (e.key === 'Escape') closeSearch();
      return;
    }
    if (document.getElementById('settingsSheet').classList.contains('open')) {
      if (e.key === 'Escape') closeSettings();
      return;
    }

    if (e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); nextPage(); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); prevPage(); }
    if (e.key === 'Escape') showIntroPages();
  });
}

// === 브라우저 뒤로가기 ===
window.addEventListener('popstate', () => {
  if (location.hash && location.hash.startsWith('#post-')) {
    const id = parseInt(location.hash.replace('#post-', ''));
    if (id) openPostById(id);
  } else {
    showIntroPages();
  }
});

// === 목차 ===
function buildTOC() {
  const body = document.getElementById('tocBody');
  const groups = {};
  INDEX.forEach((post, idx) => {
    let year = '미분류';
    if (post.date) {
      const y = post.date.substring(0, 2);
      year = (parseInt(y) > 50 ? '19' : '20') + y;
    }
    if (!groups[year]) groups[year] = [];
    groups[year].push({ ...post, _idx: idx });
  });

  const sortedYears = Object.keys(groups).sort();

  body.innerHTML = sortedYears.map(year => {
    const posts = groups[year];
    return `
      <div class="toc-year-group" data-year="${year}">
        <div class="toc-year-header" onclick="toggleYear(this)">
          <span class="toc-year-label">${year}년</span>
          <span class="toc-year-count">${posts.length}편</span>
          <span class="toc-year-toggle">▼</span>
        </div>
        <ul class="toc-post-list">
          ${posts.map(p => `
            <li class="toc-post-item" data-idx="${p._idx}" onclick="openPostByIdx(${p._idx})">
              <span class="toc-post-date">${formatDateShort(p.date)}</span>
              <span class="toc-post-title">${escHtml(p.title)}</span>
            </li>
          `).join('')}
        </ul>
      </div>
    `;
  }).join('');
}

function toggleYear(header) {
  header.parentElement.classList.toggle('open');
}

function openTOC() {
  document.getElementById('tocOverlay').classList.add('open');
  document.querySelectorAll('.toc-post-item').forEach(el => {
    el.classList.toggle('current', parseInt(el.dataset.idx) === currentPostIndex);
  });
}

function closeTOC() {
  document.getElementById('tocOverlay').classList.remove('open');
}


function setupTOCSearch() {
  const input = document.getElementById('tocSearchInput');
  let timer;
  input.addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      const q = input.value.trim().toLowerCase();
      document.querySelectorAll('.toc-year-group').forEach(group => {
        let hasMatch = false;
        group.querySelectorAll('.toc-post-item').forEach(item => {
          const title = item.querySelector('.toc-post-title').textContent.toLowerCase();
          const match = q.length < 2 || title.includes(q);
          item.style.display = match ? '' : 'none';
          if (match) hasMatch = true;
        });
        if (q.length >= 2) {
          group.classList.toggle('open', hasMatch);
          group.style.display = hasMatch ? '' : 'none';
        } else {
          group.style.display = '';
        }
      });
    }, 200);
  });
}

// === 검색 ===
function openSearch() {
  document.getElementById('searchOverlay').classList.add('open');
  const input = document.getElementById('searchInput');
  input.value = '';
  input.focus();
  document.getElementById('searchResults').innerHTML = '';
  setupSearchInput();
}

function closeSearch() {
  document.getElementById('searchOverlay').classList.remove('open');
}

let _searchSetup = false;
function setupSearchInput() {
  if (_searchSetup) return;
  _searchSetup = true;
  const input = document.getElementById('searchInput');
  let timer;
  input.addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(() => doSearch(input.value.trim()), 300);
  });
}

function doSearch(query) {
  const results = document.getElementById('searchResults');
  if (query.length < 2) {
    results.innerHTML = '<div style="text-align:center;color:rgba(255,255,255,0.4);padding:40px 0;">2글자 이상 입력하세요</div>';
    return;
  }
  const q = query.toLowerCase();
  const matches = INDEX.filter(p => p.title && p.title.toLowerCase().includes(q));

  if (matches.length === 0) {
    results.innerHTML = '<div style="text-align:center;color:rgba(255,255,255,0.4);padding:40px 0;">검색 결과가 없습니다</div>';
    return;
  }

  results.innerHTML = matches.map(p => {
    const idx = INDEX.findIndex(x => x.id === p.id);
    const title = escHtml(p.title).replace(new RegExp(`(${escRegex(query)})`, 'gi'), '<mark>$1</mark>');
    return `
      <div class="search-result-item" onclick="openPostByIdx(${idx})">
        <div class="search-result-date">${formatDate(p.date)}</div>
        <div class="search-result-title">${title}</div>
      </div>
    `;
  }).join('');
}

function escRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// === 설정 ===
function restoreSettings() {
  const saved = localStorage.getItem('book-settings');
  if (saved) {
    const s = JSON.parse(saved);
    if (s.fontSize) fontSize = s.fontSize;
    if (s.themeMode) themeMode = s.themeMode;
    if (s.colorTheme) colorTheme = s.colorTheme;
    if (s.imageSize) imageSize = s.imageSize;
    if (s.fontFamily) fontFamily = s.fontFamily;
    if (s.flipStyle) flipStyle = s.flipStyle;
    if (s.ttsVoice) ttsVoice = s.ttsVoice;
  }
  applyFontSize();
  applyThemeMode();
  applyColorTheme();
  applyImageSize();
  applyFont();
}

function saveSettings() {
  localStorage.setItem('book-settings', JSON.stringify({
    fontSize, themeMode, colorTheme, imageSize, fontFamily, flipStyle, ttsVoice,
    volume: audioPlayer ? Math.round(audioPlayer.volume * 100) : 25
  }));
}

function openSettings() {
  document.getElementById('settingsSheet').classList.add('open');
  document.getElementById('settingsBackdrop').classList.add('open');
  syncSettingsUI();
}

function closeSettings() {
  document.getElementById('settingsSheet').classList.remove('open');
  document.getElementById('settingsBackdrop').classList.remove('open');
}

function syncSettingsUI() {
  document.querySelectorAll('[data-theme-mode]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.themeMode === themeMode);
  });
  document.querySelectorAll('[data-color]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.color === colorTheme);
  });

  const fontSelect = document.getElementById('fontSelect');
  if (fontSelect) fontSelect.value = fontFamily;
  const flipSelect = document.getElementById('flipSelect');
  if (flipSelect) flipSelect.value = flipStyle;
  const imgSelect = document.getElementById('imgSelect');
  if (imgSelect) imgSelect.value = imageSize;

  document.querySelectorAll('[data-tts-voice]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.ttsVoice === ttsVoice);
  });
}

// 글씨 크기
function changeFontSize(delta) {
  setFontSize(Math.max(14, Math.min(32, fontSize + delta)));
}
function setFontSize(val) {
  fontSize = Math.max(14, Math.min(32, val));
  applyFontSize();
  saveSettings();
  // 글 읽는 중이면 현재 페이지 위치 기준으로 재분할
  if (currentPost && currentParagraphs.length > 0) {
    const oldTotal = pages.length;
    const oldIdx = currentPageIdx;
    const ratio = oldTotal > 1 ? oldIdx / (oldTotal - 1) : 0;
    paginateByHeight();
    const newIdx = Math.min(Math.round(ratio * (pages.length - 1)), pages.length - 1);
    currentPageIdx = newIdx;
    showPage(newIdx);
  }
}
function applyFontSize() {
  document.documentElement.style.setProperty('--font-size-base', fontSize + 'px');
  document.body.style.fontSize = fontSize + 'px';
  const label = document.getElementById('fontSizeLabel');
  if (label) label.textContent = fontSize;
  const tbLabel = document.getElementById('tbFontSize');
  if (tbLabel) tbLabel.textContent = fontSize;
}

// 테마 모드
function setThemeMode(mode) {
  themeMode = mode;
  applyThemeMode();
  saveSettings();
  syncSettingsUI();
}
function applyThemeMode() {
  if (themeMode === 'auto') isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  else isDark = (themeMode === 'dark');
  document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
}
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
  if (themeMode === 'auto') applyThemeMode();
});

// 색감
function setColorTheme(theme) { colorTheme = theme; applyColorTheme(); saveSettings(); syncSettingsUI(); }
function applyColorTheme() { document.documentElement.setAttribute('data-color', colorTheme); }

// 사진
function setImageSize(size) { imageSize = size; applyImageSize(); saveSettings(); syncSettingsUI(); }
function applyImageSize() { document.documentElement.setAttribute('data-img-size', imageSize); }

// 글꼴
function setFont(font) { fontFamily = font; applyFont(); saveSettings(); syncSettingsUI(); }
function applyFont() { document.documentElement.setAttribute('data-font', fontFamily); }

// 넘김 스타일
function setFlipStyle(style) { flipStyle = style; saveSettings(); syncSettingsUI(); }

// 낭독 목소리 (여자/남자)
function setTtsVoice(v) {
  ttsVoice = (v === 'male') ? 'male' : 'female';
  saveSettings();
  syncSettingsUI();
  // 재생 중이면 멈춤 (다음 재생부터 새 목소리 적용)
  if (typeof stopTTS === 'function') stopTTS();
}

// 볼륨
function setVolume(val) { if (audioPlayer) audioPlayer.volume = val / 100; saveSettings(); }

// === 화면 크기 변경 시 재분할 ===
let _resizeTimer;
window.addEventListener('resize', () => {
  clearTimeout(_resizeTimer);
  _resizeTimer = setTimeout(() => {
    if (currentPost && currentParagraphs.length > 0) {
      const ratio = pages.length > 1 ? currentPageIdx / (pages.length - 1) : 0;
      paginateByHeight();
      const newIdx = Math.min(Math.round(ratio * (pages.length - 1)), pages.length - 1);
      currentPageIdx = newIdx;
      showPage(newIdx);
    }
  }, 300);
});

// === 유틸리티 ===
function escHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const parts = dateStr.split('.');
  if (parts.length < 3) return dateStr;
  let year = parts[0];
  if (year.length === 2) year = (parseInt(year) > 50 ? '19' : '20') + year;
  return `${year}년 ${parseInt(parts[1])}월 ${parseInt(parts[2])}일`;
}

function formatDateShort(dateStr) {
  if (!dateStr) return '';
  const parts = dateStr.split('.');
  if (parts.length < 3) return dateStr;
  return `${parseInt(parts[1])}/${parseInt(parts[2])}`;
}
