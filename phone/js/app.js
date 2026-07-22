/* ===================================================================
   원무 전화응대 도우미 — app.js
   모든 데이터는 이 기기(localStorage)에만 저장됩니다. 서버 전송 없음.
   =================================================================== */
(function () {
  'use strict';

  var LS_KEY = 'wonmu_phone_v1';

  /* ---------------- 기본 응대 스크립트 (예시 — 병원에 맞게 수정) --------------- */
  var SEED_SCRIPTS = [
    // 진료·접수
    { cat: '진료·접수', q: '진료시간이 어떻게 되나요?',
      a: '평일 09:00~18:00 / 토요일 09:00~13:00\n점심시간 13:00~14:00 · 일요일·공휴일 휴진\n(예시입니다 — 우리 병원 시간으로 수정하세요)' },
    { cat: '진료·접수', q: '접수는 몇 시까지 하나요?',
      a: '진료 마감 30분 전까지 접수해 주세요. 초진(처음 오시는 분)은 접수·문진 시간이 있어 조금 더 일찍 오시면 좋습니다.' },
    { cat: '진료·접수', q: '예약 없이 그냥 가도 되나요?',
      a: '네, 당일 방문 접수 가능합니다. 다만 대기가 있을 수 있어 예약을 권해드립니다.' },
    { cat: '진료·접수', q: '주차 되나요?',
      a: '건물 주차장을 이용하실 수 있습니다. 진료 시 ○시간 무료 주차 도장을 받으세요. (예시 — 수정하세요)' },
    { cat: '진료·접수', q: '위치가 어디예요? 어떻게 가나요?',
      a: '○○시 ○○로 ○○, ○○빌딩 ○층입니다. ○○역 ○번 출구에서 도보 ○분. (예시 — 주소로 수정하세요)' },

    // 예약·변경
    { cat: '예약·변경', q: '예약하고 싶어요.',
      a: '성함·생년월일·연락처와 원하시는 날짜·시간을 확인해 예약해 드립니다. 초진이시면 증상도 함께 여쭤봅니다.' },
    { cat: '예약·변경', q: '예약을 변경/취소하고 싶어요.',
      a: '예약하신 성함과 날짜를 확인 후 변경·취소해 드립니다. 가능하면 하루 전까지 알려주시면 다른 분께 도움이 됩니다.' },

    // 검사 안내
    { cat: '검사 안내', q: '위내시경 검사 전에 어떻게 준비하나요?',
      a: '검사 전날 저녁 9시 이후 금식(물·껌·담배 포함)입니다.\n혈압·심장약 등 꼭 드셔야 하는 약은 소량의 물과 함께 미리 상의하세요.\n수면(진정) 내시경은 검사 후 운전이 안 되니 보호자·대중교통을 준비하세요. (예시 — 수정하세요)' },
    { cat: '검사 안내', q: '대장내시경은 어떻게 준비하나요?',
      a: '검사 2~3일 전부터 씨앗·질긴 채소·김치를 피하고, 전날/당일 장정결제를 복용합니다. 정결제 복용법은 예약 시 따로 안내드립니다. (예시 — 수정하세요)' },
    { cat: '검사 안내', q: '피검사(혈액검사) 금식해야 하나요?',
      a: '공복 혈당·지질 검사가 포함되면 8~12시간 금식이 필요합니다. 물은 조금 드셔도 됩니다. 검사 종류에 따라 다르니 확인해 드릴게요.' },
    { cat: '검사 안내', q: '복부초음파 준비물이 있나요?',
      a: '검사 6~8시간 전부터 금식하시면 담낭 등이 잘 보입니다. 오전 검사면 아침 금식, 오후 검사면 가벼운 아침 후 금식으로 안내드립니다. (예시 — 수정하세요)' },
    { cat: '검사 안내', q: '건강검진(공단검진) 되나요?',
      a: '국가건강검진·개인검진 모두 가능합니다. 대상자 조회 후 예약 도와드릴게요. 검진표(안내문)와 신분증을 지참해 주세요.' },

    // 결과·서류
    { cat: '결과·서류', q: '검사 결과 언제 나오나요?',
      a: '피검사는 보통 ○일, 조직검사는 ○~○일 정도 걸립니다. 결과는 내원 또는 전화로 안내드립니다. (예시 — 수정하세요)' },
    { cat: '결과·서류', q: '결과를 전화로 알려줄 수 있나요?',
      a: '개인정보 보호를 위해 본인 확인 후, 간단한 결과는 전화 안내가 가능합니다. 자세한 상담·처방은 내원이 필요할 수 있습니다.' },
    { cat: '결과·서류', q: '진단서/진료확인서를 떼고 싶어요.',
      a: '본인 신분증을 지참해 방문해 주세요. 서류 종류에 따라 수수료가 있습니다. 대리 발급은 위임장·가족관계 증빙이 필요합니다.' },
    { cat: '결과·서류', q: '실비(실손)보험 서류가 필요해요.',
      a: '보통 진료비 세부내역서·진료비 영수증이면 청구 가능하고, 보험사에 따라 진단서·통원확인서가 필요할 수 있습니다. 보험사에 필요한 서류를 먼저 확인해 오시면 빠릅니다.' },

    // 비용·수납
    { cat: '비용·수납', q: '진료비가 얼마예요?',
      a: '진료 항목에 따라 다릅니다. 초진 진찰료 본인부담은 대략 ○○원 선이며, 검사·처치가 더해지면 달라집니다. 정확한 금액은 진료 후 안내드려요. (예시 — 수정하세요)' },
    { cat: '비용·수납', q: '카드 되나요? 현금영수증 되나요?',
      a: '네, 신용·체크카드 결제 가능하고 현금영수증도 발행해 드립니다.' }
  ];

  /* ---------------- 기본 문자 템플릿 (예시 — 병원에 맞게 수정) --------------- */
  var SEED_TEMPLATES = [
    { name: '부재중 회신 안내',
      text: '안녕하세요, {병원명}입니다. 부재중 전화 확인하고 연락드립니다. 통화가 어려우시면 이 번호로 문자 주시거나 {대표전화}로 연락 부탁드립니다. 감사합니다.' },
    { name: '예약 확인',
      text: '{환자명}님, {날짜} {시간} 예약이 확인되었습니다. 방문 시 신분증을 지참해 주세요. 변경이 필요하면 미리 연락 부탁드립니다. — {병원명}' },
    { name: '예약 하루 전 알림',
      text: '{환자명}님, 내일 {시간} {병원명} 예약 안내드립니다. 방문이 어려우시면 미리 연락 주세요. 감사합니다.' },
    { name: '내시경 검사 준비 안내',
      text: '{환자명}님, {날짜} {시간} 내시경 검사 예정입니다. 검사 전날 저녁 9시 이후 금식(물 포함)해 주세요. 복용 중인 약이 있으면 미리 알려주시고, 수면검사는 보호자 또는 대중교통을 준비해 주세요. — {병원명}' },
    { name: '검사 결과 내원 안내',
      text: '{환자명}님, 검사 결과 관련하여 안내드릴 내용이 있습니다. {병원명}({대표전화})로 연락 부탁드립니다.' },
    { name: '건강검진 예약 안내',
      text: '{환자명}님, 건강검진 예약이 {날짜} {시간}으로 접수되었습니다. 검진 전 8시간 이상 금식하시고 신분증·검진표를 지참해 주세요. — {병원명}' },
    { name: '증명서 발급 안내',
      text: '증명서(진단서·진료확인서 등)는 본인 신분증 지참 후 방문 발급해 드립니다. 대리 발급은 위임장과 가족관계 증빙이 필요합니다. — {병원명}' }
  ];

  /* ======================= 상태 / 저장 ======================= */
  function defaultState() {
    return {
      v: 1,
      clinic: { name: '', phone: '' },
      theme: 'auto',
      calls: [],
      scripts: null,     // null = 기본값 사용
      templates: null
    };
  }
  function load() {
    try {
      var s = JSON.parse(localStorage.getItem(LS_KEY));
      if (!s || typeof s !== 'object') return defaultState();
      var d = defaultState();
      return {
        v: 1,
        clinic: Object.assign(d.clinic, s.clinic || {}),
        theme: s.theme || 'auto',
        calls: Array.isArray(s.calls) ? s.calls : [],
        scripts: Array.isArray(s.scripts) ? s.scripts : null,
        templates: Array.isArray(s.templates) ? s.templates : null
      };
    } catch (e) { return defaultState(); }
  }
  var state = load();
  function save() {
    try { localStorage.setItem(LS_KEY, JSON.stringify(state)); }
    catch (e) { toast('저장 공간이 부족합니다'); }
  }
  function getScripts() { return state.scripts || SEED_SCRIPTS.map(withId); }
  function getTemplates() { return state.templates || SEED_TEMPLATES.map(withId); }
  function withId(o, i) { return Object.assign({ id: uid() }, o); }

  /* ======================= 유틸 ======================= */
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  var _c = 0;
  function uid() { return 'i' + Date.now().toString(36) + (_c++).toString(36) + Math.floor(Math.random() * 1e6).toString(36); }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (m) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m];
    });
  }
  var toastTimer;
  function toast(msg) {
    var t = $('#toast');
    t.textContent = msg; t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.hidden = true; }, 2200);
  }
  function digits(s) { return String(s || '').replace(/[^\d]/g, ''); }
  function formatPhone(raw) {
    var d = digits(raw);
    if (!d) return String(raw || '');
    if (d.indexOf('02') === 0) {                       // 서울
      if (d.length === 9) return d.replace(/(\d{2})(\d{3})(\d{4})/, '$1-$2-$3');
      if (d.length === 10) return d.replace(/(\d{2})(\d{4})(\d{4})/, '$1-$2-$3');
    }
    if (d.length === 8) return d.replace(/(\d{4})(\d{4})/, '$1-$2');        // 15xx 등
    if (d.length === 10) return d.replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3');
    if (d.length === 11) return d.replace(/(\d{3})(\d{4})(\d{4})/, '$1-$2-$3');
    return d;
  }
  function isIOS() { return /iP(hone|ad|od)|Macintosh/.test(navigator.userAgent) && 'ontouchend' in document; }
  function telHref(num) { return 'tel:' + digits(num); }
  function smsHref(num, body) {
    var sep = isIOS() ? '&' : '?';
    var n = num ? digits(num) : '';
    return 'sms:' + n + (body ? (sep + 'body=' + encodeURIComponent(body)) : '');
  }
  function fillTemplate(text, opts) {
    opts = opts || {};
    var clinicName = state.clinic.name || '저희 병원';
    var clinicPhone = state.clinic.phone || '병원';
    var out = String(text)
      .replace(/\{병원명\}/g, clinicName)
      .replace(/\{대표전화\}/g, clinicPhone);
    if (opts.vars) {
      var v = readVars();
      out = out
        .replace(/\{환자명\}/g, v['환자명'] || '{환자명}')
        .replace(/\{날짜\}/g, v['날짜'] || '{날짜}')
        .replace(/\{시간\}/g, v['시간'] || '{시간}');
    }
    return out;
  }
  function readVars() {
    var v = {};
    $$('.tpl-var').forEach(function (el) { v[el.getAttribute('data-var')] = el.value.trim(); });
    return v;
  }
  function fmtTime(ts) {
    var d = new Date(ts), now = new Date();
    var hm = ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2);
    var sameDay = d.toDateString() === now.toDateString();
    if (sameDay) return '오늘 ' + hm;
    var y = new Date(now); y.setDate(now.getDate() - 1);
    if (d.toDateString() === y.toDateString()) return '어제 ' + hm;
    return (d.getMonth() + 1) + '월 ' + d.getDate() + '일 ' + hm;
  }
  function isToday(ts) { return new Date(ts).toDateString() === new Date().toDateString(); }
  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text).then(function () { toast('복사했습니다'); },
        function () { fallbackCopy(text); });
    }
    fallbackCopy(text);
    return Promise.resolve();
  }
  function fallbackCopy(text) {
    var ta = document.createElement('textarea');
    ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); toast('복사했습니다'); } catch (e) { toast('복사 실패'); }
    document.body.removeChild(ta);
  }
  /* 통화기록 붙여넣기 → 연락처 추출 */
  function extractContacts(text) {
    var out = [], seen = {};
    String(text).split(/\r?\n/).forEach(function (line) {
      var m = line.match(/0\d{1,2}[-.\s]?\d{3,4}[-.\s]?\d{4}/);
      if (!m) return;
      var phone = digits(m[0]);
      if (phone.length < 9 || seen[phone]) return;
      seen[phone] = 1;
      var rest = line.replace(m[0], '').replace(/[·|,\t]+/g, ' ').trim();
      var name = '';
      var nm = rest.match(/[가-힣]{2,4}/);
      if (nm) name = nm[0];
      out.push({ phone: phone, name: name });
    });
    return out;
  }

  /* ======================= 탭 전환 ======================= */
  function initTabs() {
    $$('.tab').forEach(function (btn) {
      btn.addEventListener('click', function () { switchTab(btn.getAttribute('data-tab')); });
    });
    $('#headerStats').addEventListener('click', function (e) {
      var b = e.target.closest('[data-goto]'); if (b) { switchTab(b.getAttribute('data-goto')); setCallFilter('pending'); }
    });
  }
  function switchTab(name) {
    $$('.tab').forEach(function (b) { b.classList.toggle('active', b.getAttribute('data-tab') === name); });
    $$('.tab-panel').forEach(function (p) { p.classList.toggle('active', p.id === 'panel-' + name); });
    window.scrollTo({ top: 0 });
  }

  /* ======================= 부재중 콜백 ======================= */
  var callFilter = 'pending', callQuery = '';
  function initCallback() {
    $('#callAddForm').addEventListener('submit', function (e) {
      e.preventDefault();
      var phone = $('#callPhone').value.trim();
      if (!digits(phone)) { toast('전화번호를 입력하세요'); return; }
      state.calls.unshift({
        id: uid(), phone: digits(phone), name: $('#callName').value.trim(),
        memo: $('#callMemo').value.trim(), urgent: $('#callUrgent').checked,
        status: 'pending', ts: Date.now()
      });
      save();
      e.target.reset();
      $('#callPhone').focus();
      renderCallback();
      toast('등록했습니다');
    });

    $('#bulkToggle').addEventListener('click', function () {
      var box = $('#bulkBox'); box.hidden = !box.hidden; if (!box.hidden) $('#bulkText').focus();
    });
    $('#bulkCancelBtn').addEventListener('click', function () { $('#bulkBox').hidden = true; });
    $('#bulkAddBtn').addEventListener('click', function () {
      var found = extractContacts($('#bulkText').value);
      if (!found.length) { toast('번호를 찾지 못했습니다'); return; }
      var added = 0;
      found.forEach(function (c) {
        state.calls.unshift({ id: uid(), phone: c.phone, name: c.name, memo: '', urgent: false, status: 'pending', ts: Date.now() });
        added++;
      });
      save(); $('#bulkText').value = ''; $('#bulkBox').hidden = true; renderCallback();
      toast(added + '건 등록했습니다');
    });

    $('#callFilters').addEventListener('click', function (e) {
      var c = e.target.closest('.chip'); if (c) setCallFilter(c.getAttribute('data-filter'));
    });
    $('#callSearch').addEventListener('input', function () { callQuery = this.value.trim(); renderCallback(); });

    $('#callList').addEventListener('click', onCallListClick);
    document.addEventListener('click', function (e) {
      if (!e.target.closest('.call-more')) closeAllMenus();
    });
  }
  function setCallFilter(f) {
    callFilter = f;
    $$('#callFilters .chip').forEach(function (c) { c.classList.toggle('active', c.getAttribute('data-filter') === f); });
    renderCallback();
  }
  function closeAllMenus() { $$('.call-menu').forEach(function (m) { m.remove(); }); }

  function onCallListClick(e) {
    var item = e.target.closest('.call-item'); if (!item) return;
    var id = item.getAttribute('data-id');
    var call = state.calls.find(function (c) { return c.id === id; });
    if (!call) return;

    if (e.target.closest('.act-done')) {
      call.status = call.status === 'done' ? 'pending' : 'done';
      save(); renderCallback(); return;
    }
    if (e.target.closest('.call-menu-btn')) {
      e.stopPropagation();
      var existing = item.querySelector('.call-menu');
      closeAllMenus();
      if (existing) return;
      var menu = document.createElement('div');
      menu.className = 'call-menu';
      menu.innerHTML =
        '<button data-m="hold">' + (call.status === 'hold' ? '보류 해제' : '보류로 표시') + '</button>' +
        '<button data-m="edit">메모·이름 편집</button>' +
        '<button data-m="del" class="danger">삭제</button>';
      item.querySelector('.call-more').appendChild(menu);
      menu.addEventListener('click', function (ev) {
        var m = ev.target.getAttribute('data-m'); if (!m) return;
        if (m === 'hold') { call.status = call.status === 'hold' ? 'pending' : 'hold'; save(); renderCallback(); }
        else if (m === 'edit') { editCall(call); }
        else if (m === 'del') { state.calls = state.calls.filter(function (c) { return c.id !== id; }); save(); renderCallback(); toast('삭제했습니다'); }
      });
      return;
    }
  }

  function editCall(call) {
    openModal('콜백 편집',
      field('이름', 'text', 'm_name', call.name) +
      field('전화번호', 'tel', 'm_phone', formatPhone(call.phone)) +
      field('메모', 'textarea', 'm_memo', call.memo) +
      '<label><input type="checkbox" id="m_urgent"' + (call.urgent ? ' checked' : '') + '> 급함으로 표시</label>',
      function () {
        call.name = $('#m_name').value.trim();
        call.phone = digits($('#m_phone').value) || call.phone;
        call.memo = $('#m_memo').value.trim();
        call.urgent = $('#m_urgent').checked;
        save(); renderCallback(); closeModal(); toast('저장했습니다');
      });
  }

  function renderCallback() {
    var all = state.calls;
    var counts = { all: all.length, pending: 0, done: 0, hold: 0 };
    all.forEach(function (c) { counts[c.status] = (counts[c.status] || 0) + 1; });
    $('#cntAll').textContent = counts.all;
    $('#cntPending').textContent = counts.pending;
    $('#cntDone').textContent = counts.done;
    $('#cntHold').textContent = counts.hold;

    var pendingToday = all.filter(function (c) { return c.status === 'pending'; }).length;
    $('#statPending').textContent = pendingToday;
    $('#headerStats').querySelector('.hstat').classList.toggle('has-pending', pendingToday > 0);

    var list = all.filter(function (c) {
      if (callFilter !== 'all' && c.status !== callFilter) return false;
      if (callQuery) {
        var hay = (c.name + ' ' + c.phone + ' ' + formatPhone(c.phone) + ' ' + c.memo).toLowerCase();
        if (hay.indexOf(callQuery.toLowerCase()) === -1) return false;
      }
      return true;
    });
    // 정렬: 미처리 우선 → 급함 우선 → 최신순
    var rank = { pending: 0, hold: 1, done: 2 };
    list.sort(function (a, b) {
      if (rank[a.status] !== rank[b.status]) return rank[a.status] - rank[b.status];
      if (a.status === 'pending' && a.urgent !== b.urgent) return a.urgent ? -1 : 1;
      return b.ts - a.ts;
    });

    var wrap = $('#callList');
    wrap.innerHTML = list.map(callItemHTML).join('');
    $('#callEmpty').hidden = list.length !== 0;
    if (list.length === 0 && (callQuery || callFilter !== 'pending')) {
      $('#callEmpty').querySelector('.empty-title').textContent = '해당하는 콜백이 없습니다';
      $('#callEmpty').querySelector('.empty-desc').textContent = '필터나 검색어를 바꿔보세요.';
    } else {
      $('#callEmpty').querySelector('.empty-title').textContent = '부재중 콜백이 없습니다';
      $('#callEmpty').querySelector('.empty-desc').textContent = '위에서 번호를 등록하거나 통화기록을 붙여넣어 시작하세요.';
    }
  }
  function callItemHTML(c) {
    var badges = '';
    if (c.status === 'done') badges += '<span class="badge badge-done">완료</span>';
    else if (c.status === 'hold') badges += '<span class="badge badge-hold">보류</span>';
    else if (c.urgent) badges += '<span class="badge badge-urgent">급함</span>';
    var smsBody = fillTemplate(defaultCallbackSms());
    return '' +
      '<div class="call-item ' + c.status + (c.urgent && c.status === 'pending' ? ' urgent' : '') + '" data-id="' + c.id + '">' +
        '<div class="call-main">' +
          '<div class="call-line1">' +
            (c.name ? '<span class="call-name">' + esc(c.name) + '</span>' : '') +
            '<a class="call-phone" href="' + telHref(c.phone) + '">' + esc(formatPhone(c.phone)) + '</a>' +
            badges +
          '</div>' +
          (c.memo ? '<div class="call-memo">' + esc(c.memo) + '</div>' : '') +
          '<div class="call-time">' + fmtTime(c.ts) + '</div>' +
        '</div>' +
        '<div class="call-actions">' +
          '<a class="act act-call" href="' + telHref(c.phone) + '" title="전화걸기">📞</a>' +
          '<a class="act act-sms" href="' + smsHref(c.phone, smsBody) + '" title="문자보내기">✉️</a>' +
          '<button class="act act-done' + (c.status === 'done' ? ' is-on' : '') + '" title="완료">✓</button>' +
          '<div class="call-more"><button class="call-menu-btn" title="더보기">⋯</button></div>' +
        '</div>' +
      '</div>';
  }
  function defaultCallbackSms() {
    var t = getTemplates().find(function (x) { return /부재중/.test(x.name); });
    return t ? t.text : '안녕하세요, {병원명}입니다. 부재중 전화 확인하고 연락드립니다.';
  }

  /* ======================= 응대 스크립트 ======================= */
  var scriptEdit = false, scriptQuery = '';
  function initScripts() {
    $('#scriptSearch').addEventListener('input', function () { scriptQuery = this.value.trim(); renderScripts(); });
    $('#scriptEditToggle').addEventListener('click', function () {
      scriptEdit = !scriptEdit;
      this.classList.toggle('on', scriptEdit);
      $('#scriptEditBanner').hidden = !scriptEdit;
      renderScripts();
    });
    $('#scriptAddBtn').addEventListener('click', function () { editScript(null); });
    $('#scriptBody').addEventListener('click', onScriptClick);
  }
  function onScriptClick(e) {
    var idAttr = e.target.closest('[data-sid]');
    if (e.target.closest('.a-copy')) {
      var it = getScripts().find(function (s) { return s.id === idAttr.getAttribute('data-sid'); });
      if (it) copyText(it.a); return;
    }
    if (e.target.closest('.s-edit')) { editScript(idAttr.getAttribute('data-sid')); return; }
    if (e.target.closest('.s-del')) {
      var id = idAttr.getAttribute('data-sid');
      state.scripts = getScripts().filter(function (s) { return s.id !== id; });
      save(); renderScripts(); toast('삭제했습니다'); return;
    }
    var head = e.target.closest('.script-q');
    if (head && !scriptEdit) head.parentNode.classList.toggle('open');
  }
  function editScript(id) {
    var list = getScripts();
    var it = id ? list.find(function (s) { return s.id === id; }) : { cat: '', q: '', a: '' };
    openModal(id ? '스크립트 편집' : '스크립트 추가',
      field('분류 (예: 진료·접수)', 'text', 'm_cat', it.cat) +
      field('질문 / 상황', 'text', 'm_q', it.q) +
      field('안내 내용', 'textarea', 'm_a', it.a),
      function () {
        var cat = $('#m_cat').value.trim() || '기타';
        var q = $('#m_q').value.trim(), a = $('#m_a').value.trim();
        if (!q) { toast('질문을 입력하세요'); return; }
        if (id) { it.cat = cat; it.q = q; it.a = a; }
        else { list = list.slice(); list.push({ id: uid(), cat: cat, q: q, a: a }); }
        state.scripts = id ? list : list;
        save(); renderScripts(); closeModal(); toast('저장했습니다');
      });
  }
  function renderScripts() {
    var list = getScripts();
    var q = scriptQuery.toLowerCase();
    var filtered = list.filter(function (s) {
      if (!q) return true;
      return (s.q + ' ' + s.a + ' ' + s.cat).toLowerCase().indexOf(q) !== -1;
    });
    $('#scriptEmpty').hidden = filtered.length !== 0;

    // 분류별 그룹화 (등장 순서 유지)
    var groups = [], byCat = {};
    filtered.forEach(function (s) {
      if (!byCat[s.cat]) { byCat[s.cat] = []; groups.push(s.cat); }
      byCat[s.cat].push(s);
    });
    var html = groups.map(function (cat) {
      var items = byCat[cat].map(function (s) {
        return '' +
          '<div class="script-item" data-sid="' + s.id + '">' +
            '<button class="script-q" type="button"><span class="qmark">Q</span>' + esc(s.q) +
              '<span class="chev">›</span></button>' +
            '<div class="script-a">' + esc(s.a) +
              '<div class="a-actions"><button class="btn btn-sm btn-ghost a-copy">📋 안내문 복사</button></div>' +
            '</div>' +
            (scriptEdit ? '<div class="script-edit-row">' +
              '<button class="btn btn-sm btn-ghost s-edit">✏️ 편집</button>' +
              '<button class="btn btn-sm btn-danger s-del">삭제</button></div>' : '') +
          '</div>';
      }).join('');
      return '<div class="script-cat-title">' + esc(cat) + '</div>' + items;
    }).join('');
    $('#scriptBody').innerHTML = html;
  }

  /* ======================= 문자 템플릿 ======================= */
  var tplEdit = false, tplQuery = '';
  function initTemplates() {
    $('#tplSearch').addEventListener('input', function () { tplQuery = this.value.trim(); renderTemplates(); });
    $('#tplEditToggle').addEventListener('click', function () {
      tplEdit = !tplEdit;
      this.classList.toggle('on', tplEdit);
      $('#tplEditBanner').hidden = !tplEdit;
      renderTemplates();
    });
    $('#tplAddBtn').addEventListener('click', function () { editTpl(null); });
    $$('.tpl-var').forEach(function (el) { el.addEventListener('input', renderTemplates); });
    $('#tplList').addEventListener('click', onTplClick);
  }
  function onTplClick(e) {
    var box = e.target.closest('[data-tid]'); if (!box) return;
    var id = box.getAttribute('data-tid');
    var t = getTemplates().find(function (x) { return x.id === id; });
    if (!t) return;
    if (e.target.closest('.t-copy')) { copyText(fillTemplate(t.text, { vars: true })); return; }
    if (e.target.closest('.t-sms')) { return; } // sms 링크는 href로 직접 동작
    if (e.target.closest('.t-edit')) { editTpl(id); return; }
    if (e.target.closest('.t-del')) {
      state.templates = getTemplates().filter(function (x) { return x.id !== id; });
      save(); renderTemplates(); toast('삭제했습니다'); return;
    }
  }
  function editTpl(id) {
    var list = getTemplates();
    var it = id ? list.find(function (s) { return s.id === id; }) : { name: '', text: '' };
    openModal(id ? '템플릿 편집' : '템플릿 추가',
      field('제목', 'text', 'm_name', it.name) +
      field('문자 내용', 'textarea', 'm_text', it.text) +
      '<p class="set-desc" style="margin:0">사용 가능한 치환: <code>{환자명}</code> <code>{날짜}</code> <code>{시간}</code> <code>{병원명}</code> <code>{대표전화}</code></p>',
      function () {
        var name = $('#m_name').value.trim(), text = $('#m_text').value.trim();
        if (!text) { toast('문자 내용을 입력하세요'); return; }
        if (id) { it.name = name || '(제목 없음)'; it.text = text; }
        else { list = list.slice(); list.push({ id: uid(), name: name || '(제목 없음)', text: text }); }
        state.templates = list;
        save(); renderTemplates(); closeModal(); toast('저장했습니다');
      });
  }
  function renderTemplates() {
    var list = getTemplates();
    var q = tplQuery.toLowerCase();
    var filtered = list.filter(function (t) { return !q || (t.name + ' ' + t.text).toLowerCase().indexOf(q) !== -1; });
    $('#tplList').innerHTML = filtered.map(function (t) {
      var filled = fillTemplate(t.text, { vars: true });
      return '' +
        '<div class="tpl-item" data-tid="' + t.id + '">' +
          '<div class="tpl-name">' + esc(t.name) + '</div>' +
          '<div class="tpl-text">' + esc(filled) + '</div>' +
          '<div class="tpl-actions">' +
            '<button class="btn btn-sm btn-primary t-copy">📋 복사</button>' +
            '<a class="btn btn-sm btn-ghost t-sms" href="' + smsHref('', filled) + '">✉️ 문자앱 열기</a>' +
            (tplEdit ? '<button class="btn btn-sm btn-ghost t-edit">✏️ 편집</button>' +
                       '<button class="btn btn-sm btn-danger t-del">삭제</button>' : '') +
          '</div>' +
        '</div>';
    }).join('');
  }

  /* ======================= 설정 ======================= */
  function initSettings() {
    $('#setClinicName').value = state.clinic.name;
    $('#setClinicPhone').value = state.clinic.phone;
    $('#saveClinicBtn').addEventListener('click', function () {
      state.clinic.name = $('#setClinicName').value.trim();
      state.clinic.phone = $('#setClinicPhone').value.trim();
      save(); applyClinic(); renderTemplates(); renderCallback();
      toast('저장했습니다');
    });

    $('#themeSeg').addEventListener('click', function (e) {
      var b = e.target.closest('[data-theme-mode]'); if (!b) return;
      state.theme = b.getAttribute('data-theme-mode'); save(); applyTheme();
    });

    $('#exportBtn').addEventListener('click', exportData);
    $('#importFile').addEventListener('change', importData);
    $('#clearDoneBtn').addEventListener('click', function () {
      var n = state.calls.filter(function (c) { return c.status === 'done'; }).length;
      if (!n) { toast('완료된 콜백이 없습니다'); return; }
      if (!confirm('완료된 콜백 ' + n + '건을 지울까요?')) return;
      state.calls = state.calls.filter(function (c) { return c.status !== 'done'; });
      save(); renderCallback(); toast(n + '건 정리했습니다');
    });
    $('#resetBtn').addEventListener('click', function () {
      if (!confirm('모든 콜백·병원정보·수정한 스크립트를 지우고 처음 상태로 되돌립니다. 계속할까요?')) return;
      state = defaultState(); save();
      applyAll(); toast('초기화했습니다');
    });
  }
  function applyClinic() {
    var name = state.clinic.name || '원무 전화응대 도우미';
    $('#clinicName').textContent = name;
    $('#clinicSub').textContent = state.clinic.phone ? ('대표 ' + formatPhone(state.clinic.phone)) : '전화 데스크 지원 도구';
    document.title = name + ' — 전화응대';
  }
  function applyTheme() {
    document.documentElement.setAttribute('data-theme', state.theme);
    $$('#themeSeg button').forEach(function (b) {
      b.classList.toggle('active', b.getAttribute('data-theme-mode') === state.theme);
    });
  }
  function exportData() {
    var blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    var d = new Date();
    var stamp = d.getFullYear() + ('0' + (d.getMonth() + 1)).slice(-2) + ('0' + d.getDate()).slice(-2);
    a.href = url; a.download = '전화응대_백업_' + stamp + '.json';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast('백업 파일을 내려받았습니다');
  }
  function importData(e) {
    var file = e.target.files && e.target.files[0]; if (!file) return;
    var reader = new FileReader();
    reader.onload = function () {
      try {
        var data = JSON.parse(reader.result);
        if (!data || typeof data !== 'object') throw 0;
        if (!confirm('백업을 불러오면 현재 기기의 데이터를 덮어씁니다. 계속할까요?')) return;
        localStorage.setItem(LS_KEY, JSON.stringify(data));
        state = load(); applyAll(); toast('백업을 불러왔습니다');
      } catch (err) { toast('올바른 백업 파일이 아닙니다'); }
      e.target.value = '';
    };
    reader.readAsText(file);
  }

  /* ======================= 모달 ======================= */
  var modalSaveFn = null;
  function field(label, type, id, val) {
    if (type === 'textarea')
      return '<label>' + esc(label) + '</label><textarea class="inp" id="' + id + '">' + esc(val || '') + '</textarea>';
    return '<label>' + esc(label) + '</label><input class="inp" type="' + type + '" id="' + id + '" value="' + esc(val || '') + '">';
  }
  function openModal(title, bodyHTML, onSave) {
    $('#modalTitle').textContent = title;
    $('#modalBody').innerHTML = bodyHTML;
    modalSaveFn = onSave;
    $('#modalBackdrop').hidden = false;
    var first = $('#modalBody').querySelector('input,textarea'); if (first) first.focus();
  }
  function closeModal() { $('#modalBackdrop').hidden = true; modalSaveFn = null; }
  function initModal() {
    $('#modalClose').addEventListener('click', closeModal);
    $('#modalCancel').addEventListener('click', closeModal);
    $('#modalSave').addEventListener('click', function () { if (modalSaveFn) modalSaveFn(); });
    $('#modalBackdrop').addEventListener('click', function (e) { if (e.target === this) closeModal(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !$('#modalBackdrop').hidden) closeModal(); });
  }

  /* ======================= 초기화 ======================= */
  function applyAll() {
    applyClinic(); applyTheme();
    $('#setClinicName').value = state.clinic.name;
    $('#setClinicPhone').value = state.clinic.phone;
    renderCallback(); renderScripts(); renderTemplates();
  }
  function init() {
    initTabs(); initCallback(); initScripts(); initTemplates(); initSettings(); initModal();
    applyAll();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
