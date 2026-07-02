/* ============================================================
   처음처럼 — AI 기능 확장 (v3 - bugfix)
   ============================================================ */

// ===== 전역 상태 =====
let TAGS = {};
let _timelineChart = null;
let _ttsActive = false;
let _searchTab = 'title';
let _categoryActive = null;
let _searchInputReady = false;

const CATEGORY_ICONS = {
  '가족': '👨‍👩‍👧', '자연': '🌿', '여행': '🗺️', '문화': '🏛️',
  '종교': '✝️', '역사': '📜', '일상': '☀️', '회고': '🌅',
};
const SEASON_CSS = { '봄': 'spring', '여름': 'summer', '가을': 'autumn', '겨울': 'winter' };

/* ============================================================
   초기화
   ============================================================ */
document.addEventListener('DOMContentLoaded', () => {
  // 계절 배경 div 생성
  const seasonDiv = document.createElement('div');
  seasonDiv.id = 'seasonBg';
  seasonDiv.className = 'season-bg';
  document.getElementById('book').appendChild(seasonDiv);

  // 태그 데이터 로드
  fetch('/api/tags')
    .then(r => { if (!r.ok) throw new Error('api/tags failed'); return r.json(); })
    .then(data => { TAGS = data; console.log('[AI] 태그 로드:', Object.keys(TAGS).length + '개'); })
    .catch(e => { console.warn('[AI] 태그 로드 실패:', e.message); TAGS = {}; });

  // openPostByIdx 래핑 — 글 열릴 때 계절배경+TTS 버튼 주입
  // (app.js가 이미 실행된 상태에서 DOMContentLoaded가 순서대로 실행됨)
  const _origOpen = window.openPostByIdx;
  if (typeof _origOpen === 'function') {
    window.openPostByIdx = async function(index) {
      stopTTS();
      await _origOpen.call(this, index);
      // INDEX는 app.js의 let 선언 → window.INDEX 아님, 직접 접근
      if (typeof INDEX !== 'undefined' && index >= 0 && index < INDEX.length) {
        const meta = INDEX[index];
        applySeasonBackground(meta.id);
        _injectTTSButton(meta.id, meta.title);
      }
    };
  }

  // app.js의 doSearch(title-only)가 text/ai 탭에서 결과를 덮어쓰지 않도록 막기
  const _origDoSearch = window.doSearch;
  if (typeof _origDoSearch === 'function') {
    window.doSearch = function(query) {
      if (_searchTab !== 'title') return;
      _origDoSearch(query);
    };
  }

  // 검색 input 이벤트 — text/ai 탭 처리
  const searchInput = document.getElementById('searchInput');
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      if (_searchTab === 'title') return;
      clearTimeout(window._aiSearchTimer);
      window._aiSearchTimer = setTimeout(() => _doSearchByTab(searchInput.value.trim()), 400);
    });
  }
});

/* ============================================================
   1. TTS 음성 낭독
   ============================================================ */
async function playTTS(postId, title, text) {
  if (_ttsActive) { stopTTS(); return; }
  _setTTSBtnPlaying(true);
  const ttsText = `${title}.\n\n${text}`.substring(0, 3000);

  // 서버 edge-tts 시도
  const voiceKey = (typeof ttsVoice !== 'undefined' && ttsVoice === 'male') ? 'male' : 'female';
  // 프리페치된 Blob URL 있으면 즉시 재생
  const prefetchKey = `${postId}_${voiceKey}`;
  if (window._ttsPrefetchCache && window._ttsPrefetchCache[prefetchKey]) {
    const audio = new Audio(window._ttsPrefetchCache[prefetchKey]);
    _ttsActive = true;
    _showTTSPlayer(title);
    audio.onended = () => { _ttsActive = false; _hideTTSPlayer(); _setTTSBtnPlaying(false); };
    audio.onerror = () => { _ttsActive = false; _hideTTSPlayer(); _setTTSBtnPlaying(false); };
    audio.play();
    window._ttsAudio = audio;
    return;
  }
  try {
    const resp = await fetch(`/api/tts/${postId}?voice=${voiceKey}`);
    if (resp.ok) {
      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      _ttsActive = true;
      _showTTSPlayer(title);
      audio.onended = () => { _ttsActive = false; _hideTTSPlayer(); _setTTSBtnPlaying(false); URL.revokeObjectURL(url); };
      audio.onerror = () => { _ttsActive = false; _hideTTSPlayer(); _setTTSBtnPlaying(false); URL.revokeObjectURL(url); };
      audio.play();
      window._ttsAudio = audio;
      return;
    }
  } catch (e) { /* fallback */ }

  // 브라우저 Web Speech API
  if (!window.speechSynthesis) {
    alert('음성 낭독을 지원하지 않는 브라우저입니다.');
    _setTTSBtnPlaying(false);
    return;
  }
  window.speechSynthesis.cancel();
  const utt = new SpeechSynthesisUtterance(ttsText);
  utt.lang = 'ko-KR';
  utt.rate = 0.85;
  // 한국어 음성 선택 (브라우저 fallback - 성별은 이름으로 추정)
  const voices = window.speechSynthesis.getVoices();
  const koVoices = voices.filter(v => v.lang && v.lang.startsWith('ko'));
  const wantMale = voiceKey === 'male';
  const maleHints = /male|남|junho|inho|InJoon/i;
  const femaleHints = /female|여|yuna|sunhi|heami|SunHi/i;
  let pick = null;
  if (wantMale) pick = koVoices.find(v => maleHints.test(v.name));
  else pick = koVoices.find(v => femaleHints.test(v.name));
  if (!pick && koVoices.length) pick = koVoices[0];
  if (pick) utt.voice = pick;
  utt.onstart  = () => { _ttsActive = true;  _showTTSPlayer(title); };
  utt.onend    = () => { _ttsActive = false; _hideTTSPlayer(); _setTTSBtnPlaying(false); };
  utt.onerror  = () => { _ttsActive = false; _hideTTSPlayer(); _setTTSBtnPlaying(false); };
  window._ttsUtterance = utt;
  window.speechSynthesis.speak(utt);
}

function stopTTS() {
  if (window.speechSynthesis) window.speechSynthesis.cancel();
  if (window._ttsAudio) { window._ttsAudio.pause(); window._ttsAudio = null; }
  _ttsActive = false;
  _hideTTSPlayer();
  _setTTSBtnPlaying(false);
}

function _setTTSBtnPlaying(playing) {
  const btn = document.getElementById('ttsListenBtn');
  if (!btn) return;
  btn.classList.toggle('playing', playing);
  btn.textContent = playing ? '⏹ 멈춤' : '🔊 듣기';
}

function _showTTSPlayer(title) {
  const player = document.getElementById('ttsPlayer');
  if (!player) return;
  const prog = document.getElementById('ttsProgress');
  if (prog) prog.textContent = `"${title || ''}" 낭독 중`;
  player.style.display = 'flex';
}

function _hideTTSPlayer() {
  const p = document.getElementById('ttsPlayer');
  if (p) p.style.display = 'none';
}

function _injectTTSButton(postId, titleFallback) {
  // 이미 있으면 skip
  if (document.getElementById('ttsListenBtn')) return;
  const header = document.querySelector('.post-header');
  if (!header) return;

  const btn = document.createElement('button');
  btn.id = 'ttsListenBtn';
  btn.className = 'tts-listen-btn';
  btn.textContent = '🔊 듣기';
  btn.onclick = async () => {
    if (_ttsActive) { stopTTS(); return; }
    // 이미 currentPost가 있으면 재사용 (fetch 생략)
    if (typeof currentPost !== 'undefined' && currentPost && currentPost.id === postId) {
      playTTS(currentPost.id, currentPost.title, currentPost.text || '');
      return;
    }
    try {
      const r = await fetch(`data/posts/${postId}.json`);
      const p = await r.json();
      playTTS(p.id, p.title, p.text || '');
    } catch(e) {
      playTTS(postId, titleFallback || '', '');
    }
  };
  header.appendChild(btn);

  // 백그라운드 프리페치: 서버 TTS 캐시 워밍 (클릭 전에 MP3 준비)
  _prefetchTTS(postId);
}

// TTS 프리페치 (백그라운드에서 MP3 미리 만들어놓기)
let _prefetchedPostId = null;
let _prefetchedVoice = null;
function _prefetchTTS(postId) {
  const voiceKey = (typeof ttsVoice !== 'undefined' && ttsVoice === 'male') ? 'male' : 'female';
  // 같은 글 + 같은 목소리면 스킵
  if (_prefetchedPostId === postId && _prefetchedVoice === voiceKey) return;
  _prefetchedPostId = postId;
  _prefetchedVoice = voiceKey;
  // 네트워크 idle 잠깐 기다렸다가 프리페치 (글 이미지 로딩 방해 방지)
  setTimeout(() => {
    fetch(`/api/tts/${postId}?voice=${voiceKey}`, { method: 'GET' })
      .then(r => r.blob())
      .then(blob => {
        // 캐시로 저장 (HTTP 응답 자체로 재사용되도록)
        window._ttsPrefetchCache = window._ttsPrefetchCache || {};
        const key = `${postId}_${voiceKey}`;
        // 기존 URL revoke
        if (window._ttsPrefetchCache[key]) URL.revokeObjectURL(window._ttsPrefetchCache[key]);
        window._ttsPrefetchCache[key] = URL.createObjectURL(blob);
      })
      .catch(() => {});
  }, 400);
}

/* ============================================================
   5. 계절 배경
   ============================================================ */
function applySeasonBackground(postId) {
  const tag = TAGS[String(postId)];
  const season = tag ? (SEASON_CSS[tag.season] || null) : null;
  const div = document.getElementById('seasonBg');
  if (!div) return;
  div.classList.remove('visible', 'spring', 'summer', 'autumn', 'winter');
  if (!season) return;
  setTimeout(() => div.classList.add(season, 'visible'), 100);
}

/* ============================================================
   3. 타임라인
   ============================================================ */
function openTimeline() {
  document.getElementById('timelineOverlay').classList.add('open');
  _renderTimeline();
}

function closeTimeline() {
  document.getElementById('timelineOverlay').classList.remove('open');
}

function _renderTimeline() {
  if (typeof INDEX === 'undefined' || !INDEX.length) {
    document.getElementById('timelineList').innerHTML =
      '<div style="text-align:center;color:rgba(255,255,255,0.4);padding:30px;">데이터 로딩 중...</div>';
    return;
  }

  // 연도별 집계
  const yearCount = {};
  INDEX.forEach(p => {
    if (!p.date) return;
    const y = p.date.substring(0, 2);
    const year = (parseInt(y) > 50 ? '19' : '20') + y;
    yearCount[year] = (yearCount[year] || 0) + 1;
  });
  const years = Object.keys(yearCount).sort();

  if (typeof Chart !== 'undefined') {
    _renderTimelineChart(years, yearCount);
  } else {
    const wrap = document.querySelector('.timeline-chart-wrap');
    if (wrap) wrap.style.display = 'none';
  }
  _showTimelineAll(years, yearCount);
}

function _renderTimelineChart(years, yearCount) {
  if (_timelineChart) { _timelineChart.destroy(); _timelineChart = null; }
  const canvas = document.getElementById('timelineChart');
  if (!canvas) return;

  _timelineChart = new Chart(canvas.getContext('2d'), {
    type: 'bar',
    data: {
      labels: years.map(y => y + '년'),
      datasets: [{
        label: '편수',
        data: years.map(y => yearCount[y]),
        backgroundColor: 'rgba(184,134,11,0.65)',
        borderColor: 'rgba(184,134,11,0.9)',
        borderWidth: 1,
        borderRadius: 4,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: c => `${c.parsed.y}편` } }
      },
      scales: {
        x: { ticks: { color: 'rgba(255,255,255,0.6)', font: { size: 11 } }, grid: { color: 'rgba(255,255,255,0.05)' } },
        y: { ticks: { color: 'rgba(255,255,255,0.5)', font: { size: 11 } }, grid: { color: 'rgba(255,255,255,0.07)' }, beginAtZero: true }
      },
      onClick: (e, els) => { if (els.length) _showTimelineYear(years[els[0].index]); },
      onHover: (e, els) => { e.native.target.style.cursor = els.length ? 'pointer' : 'default'; }
    }
  });
}

function _showTimelineAll(years, yearCount) {
  const list = document.getElementById('timelineList');
  let html = '<div class="timeline-selected-year">연도를 클릭하면 해당 글 목록을 볼 수 있습니다</div>';
  years.forEach(y => {
    html += `<div class="timeline-year-title" onclick="_showTimelineYear('${y}')" style="cursor:pointer;">`
      + `${y}년 <span style="font-size:13px;font-weight:400;color:rgba(255,255,255,0.45);">${yearCount[y]}편</span></div>`;
  });
  list.innerHTML = html;
}

function _showTimelineYear(year) {
  if (typeof INDEX === 'undefined') return;
  const posts = INDEX.filter(p => {
    if (!p.date) return false;
    const y = p.date.substring(0, 2);
    return ((parseInt(y) > 50 ? '19' : '20') + y) === year;
  });

  const list = document.getElementById('timelineList');
  let html = `<div class="timeline-selected-year">${year}년 — ${posts.length}편</div>`;
  posts.forEach(p => {
    const idx = INDEX.findIndex(x => x.id === p.id);
    html += `<div class="timeline-post-item" onclick="openPostByIdx(${idx});closeTimeline();">`;
    html += `<span class="timeline-post-date">${_fmtDateShort(p.date)}</span>`;
    html += `<span class="timeline-post-title">${_escHtml(p.title)}</span>`;
    html += `</div>`;
  });
  list.innerHTML = html;
}

/* ============================================================
   2. 주제 필터
   ============================================================ */
function openCategoryFilter() {
  document.getElementById('categoryOverlay').classList.add('open');
  _renderCategoryChips();
  if (_categoryActive) {
    _showCategoryResults(_categoryActive);
  } else {
    document.getElementById('categoryResults').innerHTML =
      '<div class="category-empty">위 주제를 선택하세요</div>';
  }
}

function closeCategoryFilter() {
  document.getElementById('categoryOverlay').classList.remove('open');
}

function _renderCategoryChips() {
  const chips = document.getElementById('categoryChips');
  const tagVals = Object.values(TAGS);

  if (!tagVals.length) {
    chips.innerHTML = '<div style="color:rgba(255,255,255,0.4);font-size:13px;padding:8px 0;">태그 데이터 로딩 중...</div>';
    return;
  }

  // 카테고리별 집계
  const cats = {};
  tagVals.forEach(t => { cats[t.category] = (cats[t.category] || 0) + 1; });

  const order = ['자연', '문화', '일상', '여행', '가족', '역사', '회고', '종교'];
  const sorted = [...order.filter(c => cats[c]), ...Object.keys(cats).filter(c => !order.includes(c))];

  chips.innerHTML = '';

  // 전체
  const allBtn = document.createElement('button');
  allBtn.className = 'category-chip' + (_categoryActive === null ? ' active' : '');
  allBtn.textContent = `전체 (${typeof INDEX !== 'undefined' ? INDEX.length : tagVals.length})`;
  allBtn.onclick = () => {
    _categoryActive = null;
    _renderCategoryChips();
    document.getElementById('categoryResults').innerHTML =
      '<div class="category-empty">위 주제를 선택하세요</div>';
  };
  chips.appendChild(allBtn);

  sorted.forEach(cat => {
    const btn = document.createElement('button');
    btn.className = 'category-chip' + (_categoryActive === cat ? ' active' : '');
    btn.textContent = `${CATEGORY_ICONS[cat] || '📌'} ${cat} (${cats[cat]})`;
    btn.onclick = () => { _categoryActive = cat; _renderCategoryChips(); _showCategoryResults(cat); };
    chips.appendChild(btn);
  });
}

function _showCategoryResults(category) {
  const results = document.getElementById('categoryResults');

  if (!Object.keys(TAGS).length) {
    results.innerHTML = '<div class="category-empty">태그 데이터를 불러오는 중입니다.</div>';
    return;
  }
  if (typeof INDEX === 'undefined' || !INDEX.length) {
    results.innerHTML = '<div class="category-empty">데이터 로딩 중...</div>';
    return;
  }

  const posts = INDEX.filter(p => {
    const tag = TAGS[String(p.id)];
    return tag && tag.category === category;
  });

  if (!posts.length) {
    results.innerHTML = '<div class="category-empty">해당 주제의 글이 없습니다</div>';
    return;
  }

  const icon = CATEGORY_ICONS[category] || '📌';
  let html = `<div style="padding:4px 0 10px;font-size:13px;color:rgba(255,255,255,0.4);">${icon} ${category} — ${posts.length}편</div>`;
  posts.forEach(p => {
    const idx = INDEX.findIndex(x => x.id === p.id);
    html += `<div class="category-result-item" onclick="openPostByIdx(${idx});closeCategoryFilter();">`;
    html += `<span class="category-result-date">${_fmtDateShort(p.date)}</span>`;
    html += `<span class="category-result-title">${_escHtml(p.title)}</span>`;
    html += `</div>`;
  });
  results.innerHTML = html;
}

/* ============================================================
   4. 검색 탭 (제목 / 본문 / AI 질문)
   ============================================================ */
function setSearchTab(tab) {
  _searchTab = tab;
  document.querySelectorAll('.search-tab').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tab);
  });
  const hint = document.getElementById('searchAIHint');
  if (hint) hint.style.display = tab === 'ai' ? 'block' : 'none';

  const input = document.getElementById('searchInput');
  if (input) {
    const ph = { title: '제목으로 검색...', text: '본문 내용으로 검색...', ai: '예: 아버지가 즐겨 찾으신 곳은?' };
    input.placeholder = ph[tab] || '검색어를 입력하세요...';
    const q = input.value.trim();
    if (q.length >= 2) {
      if (tab === 'title') {
        // app.js의 doSearch 직접 호출
        if (typeof doSearch === 'function') doSearch(q);
      } else {
        _doSearchByTab(q);
      }
    } else {
      document.getElementById('searchResults').innerHTML = '';
    }
  }
}

function _doSearchByTab(query) {
  if (!query || query.length < 2) {
    document.getElementById('searchResults').innerHTML =
      '<div style="text-align:center;color:rgba(255,255,255,0.4);padding:40px 0;">2글자 이상 입력하세요</div>';
    return;
  }
  document.getElementById('searchResults').innerHTML =
    '<div style="text-align:center;color:rgba(255,255,255,0.4);padding:30px 0;">🔍 검색 중...</div>';

  fetch('/api/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, mode: _searchTab === 'ai' ? 'ai' : 'text' }),
  })
    .then(r => r.json())
    .then(results => _renderSearchResults(results, query))
    .catch(() => {
      document.getElementById('searchResults').innerHTML =
        '<div style="text-align:center;color:rgba(255,255,255,0.4);padding:40px 0;">검색 오류가 발생했습니다</div>';
    });
}

function _renderSearchResults(results, query) {
  const container = document.getElementById('searchResults');
  if (!results || !results.length) {
    container.innerHTML = '<div style="text-align:center;color:rgba(255,255,255,0.4);padding:40px 0;">검색 결과가 없습니다</div>';
    return;
  }
  const escQ = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`(${escQ})`, 'gi');

  container.innerHTML = results.map(p => {
    // INDEX 직접 접근 (window.INDEX 아님)
    const idx = (typeof INDEX !== 'undefined') ? INDEX.findIndex(x => x.id === p.id) : -1;
    const titleHtml = _escHtml(p.title).replace(re, '<mark>$1</mark>');
    const snippetHtml = p.snippet ? _escHtml(p.snippet).replace(re, '<mark>$1</mark>') : '';
    return `<div class="search-result-item" onclick="openPostByIdx(${idx})">
      <div class="search-result-date">${_fmtDate(p.date)}</div>
      <div class="search-result-title">${titleHtml}</div>
      ${snippetHtml ? `<div class="search-result-snippet">${snippetHtml}</div>` : ''}
    </div>`;
  }).join('');
}

/* ============================================================
   유틸리티
   ============================================================ */
function _escHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function _fmtDate(d) {
  if (!d) return '';
  const p = d.split('.');
  if (p.length < 3) return d;
  const y = p[0].length === 2 ? (parseInt(p[0]) > 50 ? '19' : '20') + p[0] : p[0];
  return `${y}년 ${parseInt(p[1])}월 ${parseInt(p[2])}일`;
}
function _fmtDateShort(d) {
  if (!d) return '';
  const p = d.split('.');
  if (p.length < 3) return d;
  return `${parseInt(p[1])}/${parseInt(p[2])}`;
}
