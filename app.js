/*
 * 卓移動 KDS — 長崎店専用 (Classic Ivory & Beige Theme)
 *
 * ・古い iPad (iOS 9 の Safari) でも動くよう ES5 で記述しています。
 * ・データ保存先: /kds/stores/nagasaki (他店舗とは完全に分離)
 */

var FIREBASE_DB_URL = 'https://table-transfer-kds-default-rtdb.asia-southeast1.firebasedatabase.app';
var DB_ROOT = '/kds/stores/nagasaki';

// 卓エリア別の上品なカラープリセット
var COLOR_PRESETS = [
    { id: 'camel',  name: 'Aエリア (キャメル)', cls: 'tbl-area-a',   dot: '#B89772' },
    { id: 'sage',   name: 'Bエリア (セージ)',   cls: 'tbl-area-b',   dot: '#6E9480' },
    { id: 'mauve',  name: 'Sエリア (モーヴ)',   cls: 'tbl-area-s',   dot: '#8E82A6' },
    { id: 'slate',  name: 'Oエリア (スレート)', cls: 'tbl-area-o',   dot: '#6D88A3' },
    { id: 'gold',   name: 'Vエリア (ゴールド)', cls: 'tbl-area-v',   dot: '#B8894A' },
    { id: 'stone',  name: 'ストーン (標準)',    cls: 'tbl-area-sub', dot: '#8C847B' }
];

// 移動の区分（ワンタップ選択 / WCAG AA コントラスト準拠）
var MOVE_TYPES = [
    { id: '相席開始',     label: '相席開始',     sub: '新規合流', bg: '#EFE6D8', border: '#C49E6C', text: '#4F3616' },
    { id: 'チェンジ',     label: 'チェンジ',     sub: '組替え',   bg: '#E8EFEA', border: '#94B0A1', text: '#214030' },
    { id: '相席解除',     label: '相席解除',     sub: '単独席へ', bg: '#EFECE6', border: '#C2B9AC', text: '#453F3A' },
    { id: '席替え',       label: '席替え',       sub: '通常移動', bg: '#ECF0F3', border: '#A6B8C7', text: '#283A4A' },
    { id: 'VIP移動',      label: 'VIP移動',      sub: '',         bg: '#F5EBD6', border: '#B8894A', text: '#4D310E' },
    { id: 'ダーツ移動',   label: 'ダーツ移動',   sub: '',         bg: '#EFEBF2', border: '#B4A6C4', text: '#3B2E4A' },
    { id: 'カラオケ移動', label: 'カラオケ移動', sub: '単独',     bg: '#F4ECEB', border: '#CFA8A4', text: '#5C2E2A' }
];

// ワンタップ定型タグ（複数選択可）
var QUICK_TAGS = [
    { id: '荷物・カゴあり',   urgent: false },
    { id: '上着・コートあり', urgent: false },
    { id: '下げもの多め',     urgent: false },
    { id: 'お急ぎ対応',       urgent: true  }
];

// 長崎店 6行×5列 フロア配置 (null は空マス「—」)
var FLOOR_LAYOUT = [
    ['A1', null, 'B1', 'B2', 'B3'],
    ['A3', 'A4', 'A5', 'A6', 'B4'],
    ['S5', 'S4', 'S3', 'B5', null],
    ['S6', 'S2', 'S1', 'B6', null],
    ['S7', 'O2', 'O1', 'V1', null],
    ['V5', 'V4', 'V3', 'V2', null]
];

function guessDefaultColorId(name) {
    var ch = String(name || '').charAt(0).toUpperCase();
    if (ch === 'A') return 'camel';
    if (ch === 'B') return 'sage';
    if (ch === 'S') return 'mauve';
    if (ch === 'O') return 'slate';
    if (ch === 'V') return 'gold';
    return 'stone';
}

// 初期の24卓リスト
var DEFAULT_TABLES = (function () {
    var list = [];
    for (var r = 0; r < FLOOR_LAYOUT.length; r++) {
        for (var c = 0; c < FLOOR_LAYOUT[r].length; c++) {
            var name = FLOOR_LAYOUT[r][c];
            if (name) {
                list.push({ name: name, colorId: guessDefaultColorId(name) });
            }
        }
    }
    return list;
})();

// State
var registeredTables = cloneTables(DEFAULT_TABLES);
var orders = [];
var currentTab = 'ACTIVE';
var soundEnabled = true;

// Selection State
var selectedGender = '男性';
var selectedMoveType = '相席開始';
var selectedFromTable = 'A1';
var selectedToTable = 'B1';
var selectedTags = [];

// ===================== ユーティリティ =====================
function findBy(arr, fn) {
    for (var i = 0; i < arr.length; i++) { if (fn(arr[i])) return arr[i]; }
    return null;
}
function someBy(arr, fn) { return !!findBy(arr, fn); }
function indexOfStr(arr, val) {
    for (var i = 0; i < arr.length; i++) { if (arr[i] === val) return i; }
    return -1;
}
function cloneTables(list) {
    var out = [];
    for (var i = 0; i < list.length; i++) {
        var name = String(list[i].name).replace(/^※/, '');
        out.push({ name: name, colorId: list[i].colorId || guessDefaultColorId(name) });
    }
    return out;
}
function pad(n) { return n < 10 ? '0' + n : String(n); }
function escapeHtml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function escapeJsAttr(s) {
    return escapeHtml(String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'"));
}
function formatHM(ts) {
    var d = new Date(ts);
    return pad(d.getHours()) + ':' + pad(d.getMinutes());
}
function genId() {
    var t = Date.now().toString(36);
    var r = Math.random().toString(36).slice(2, 8);
    return 'o' + t + r;
}
function genDisplayNo() {
    return 'TRF-' + Math.floor(100 + Math.random() * 900);
}

// ===================== 起動 =====================
window.onload = function () {
    detectFlexGap();
    lucide.createIcons();
    startClock();
    initAudioUnlock();
    switchMainTab('ACTIVE');
    setInterval(updateTimersUI, 1000);
    Sync.start();
};

function detectFlexGap() {
    var d = document.createElement('div');
    d.style.display = 'flex';
    d.style.flexDirection = 'column';
    d.style.rowGap = '1px';
    d.appendChild(document.createElement('div'));
    d.appendChild(document.createElement('div'));
    document.body.appendChild(d);
    var ok = d.scrollHeight === 1;
    document.body.removeChild(d);
    if (!ok) document.documentElement.className += ' no-flexgap';
}

function startClock() {
    var clockEl = document.getElementById('clock');
    function update() {
        var d = new Date();
        clockEl.textContent = pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds());
    }
    update();
    setInterval(update, 1000);
}

function getTableColorObj(tblName) {
    var found = findBy(registeredTables, function (t) { return t.name === tblName; });
    var colorId = found ? found.colorId : guessDefaultColorId(tblName);
    return findBy(COLOR_PRESETS, function (p) { return p.id === colorId; }) || COLOR_PRESETS[0];
}

function getMoveTypeObj(typeId) {
    return findBy(MOVE_TYPES, function (m) { return m.id === typeId; }) || MOVE_TYPES[0];
}

// ===================== 通知音 (落ち着いたチャイム音) =====================
var audioCtx = null;
function getAudioCtx() {
    if (!audioCtx) {
        var AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return null;
        try { audioCtx = new AC(); } catch (e) { return null; }
    }
    return audioCtx;
}
function initAudioUnlock() {
    var unlock = function () {
        var ctx = getAudioCtx();
        if (!ctx) return;
        try {
            if (ctx.resume) ctx.resume();
            var buf = ctx.createBuffer(1, 1, 22050);
            var src = ctx.createBufferSource();
            src.buffer = buf;
            src.connect(ctx.destination);
            if (src.start) src.start(0); else src.noteOn(0);
        } catch (e) {}
        document.removeEventListener('touchend', unlock, false);
        document.removeEventListener('click', unlock, false);
    };
    document.addEventListener('touchend', unlock, false);
    document.addEventListener('click', unlock, false);
}

function playChime(type) {
    type = type || 'push';
    if (!soundEnabled) return;
    try {
        var ctx = getAudioCtx();
        if (!ctx) return;
        var t = ctx.currentTime;
        var osc = ctx.createOscillator();
        var gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);

        if (type === 'push') {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(523.25, t);
            osc.frequency.setValueAtTime(659.25, t + 0.14);
            gain.gain.setValueAtTime(0.22, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
            osc.start(t);
            osc.stop(t + 0.45);
        } else if (type === 'complete') {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(440, t);
            osc.frequency.setValueAtTime(554.37, t + 0.1);
            osc.frequency.setValueAtTime(659.25, t + 0.2);
            gain.gain.setValueAtTime(0.16, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.48);
            osc.start(t);
            osc.stop(t + 0.48);
        }
    } catch (e) {}
}

function toggleSound() {
    soundEnabled = !soundEnabled;
    var icon = document.getElementById('soundIcon');
    if (soundEnabled) {
        icon.setAttribute('data-lucide', 'volume-2');
        icon.style.color = '#221E1B';
        showToast('通知音', 'ON');
        playChime('push');
    } else {
        icon.setAttribute('data-lucide', 'volume-x');
        icon.style.color = '#7A7067';
        showToast('通知音', 'OFF');
    }
    lucide.createIcons();
}

// ===================== 画面切替・描画 =====================
function switchMainTab(tab) {
    currentTab = tab;
    var btnActive = document.getElementById('tabBtnActive');
    var btnCompleted = document.getElementById('tabBtnCompleted');
    var viewActive = document.getElementById('viewActive');
    var viewCompleted = document.getElementById('viewCompleted');

    if (tab === 'ACTIVE') {
        btnActive.style.backgroundColor = '#FFFFFF';
        btnActive.style.color = '#221E1B';
        btnActive.style.boxShadow = '0 1px 2px rgba(34, 30, 27, 0.08)';
        btnActive.setAttribute('aria-selected', 'true');

        btnCompleted.style.backgroundColor = 'transparent';
        btnCompleted.style.color = '#524A43';
        btnCompleted.style.boxShadow = 'none';
        btnCompleted.setAttribute('aria-selected', 'false');

        viewActive.classList.remove('hidden');
        viewCompleted.classList.add('hidden');
    } else {
        btnActive.style.backgroundColor = 'transparent';
        btnActive.style.color = '#524A43';
        btnActive.style.boxShadow = 'none';
        btnActive.setAttribute('aria-selected', 'false');

        btnCompleted.style.backgroundColor = '#FFFFFF';
        btnCompleted.style.color = '#221E1B';
        btnCompleted.style.boxShadow = '0 1px 2px rgba(34, 30, 27, 0.08)';
        btnCompleted.setAttribute('aria-selected', 'true');

        viewActive.classList.add('hidden');
        viewCompleted.classList.remove('hidden');
    }
    renderAllViews();
}

function renderAllViews() {
    renderActiveOrders();
    renderCompletedOrders();
    updateBadges();
    lucide.createIcons();
}

function getOrderTags(order) {
    if (!order.tags) return [];
    if (Object.prototype.toString.call(order.tags) === '[object Array]') return order.tags;
    var out = [];
    for (var k in order.tags) if (order.tags.hasOwnProperty(k) && order.tags[k]) out.push(order.tags[k]);
    return out;
}

function renderTagsAndNoteHtml(order) {
    var tags = getOrderTags(order);
    var hasText = !!(order.textNote && String(order.textNote).trim());
    if (tags.length === 0 && !hasText) return '';

    var isUrgent = false;
    var normalTags = [];
    for (var i = 0; i < tags.length; i++) {
        if (tags[i] === 'お急ぎ対応') {
            isUrgent = true;
        } else {
            normalTags.push(escapeHtml(tags[i]));
        }
    }

    var tagsLine = '';
    if (isUrgent || normalTags.length > 0) {
        var urgentBadge = isUrgent
            ? '<span style="background-color: #8A261C; color: #FFFFFF;" class="inline-block text-[11px] font-bold px-1.5 py-0.5 rounded-sm mr-1.5 align-middle">お急ぎ</span>'
            : '';
        var plainItems = normalTags.length > 0
            ? '<span style="color: #221E1B;" class="text-xs font-semibold align-middle">' + normalTags.join('　/　') + '</span>'
            : '';
        tagsLine = '<div class="leading-relaxed">' + urgentBadge + plainItems + '</div>';
    }

    var textHtml = '';
    if (hasText) {
        textHtml = '<div style="color: #524A43;" class="text-xs leading-relaxed break-words ' + (tagsLine ? 'mt-1' : '') + '">' +
            escapeHtml(order.textNote) +
            '</div>';
    }

    return '<div style="border-top: 1px solid #EAE4D8;" class="pt-2.5 mb-3.5">' +
        tagsLine +
        textHtml +
        '</div>';
}

function renderActiveOrders() {
    var grid = document.getElementById('activeGrid');
    var empty = document.getElementById('emptyActive');
    grid.innerHTML = '';

    var actives = orders.filter(function (o) { return o.status === 'ACTIVE'; });
    actives.sort(function (a, b) { return a.createdAt - b.createdAt; });

    if (actives.length === 0) {
        empty.classList.remove('hidden');
        return;
    }
    empty.classList.add('hidden');

    var now = Date.now();
    actives.forEach(function (order) {
        var elapsedMs = Math.max(0, now - order.createdAt);
        var elapsedMins = Math.floor(elapsedMs / 60000);
        var elapsedSecs = Math.floor((elapsedMs % 60000) / 1000);

        var isMale = (order.gender || '男性') === '男性';
        var tags = getOrderTags(order);
        var hasUrgentTag = indexOfStr(tags, 'お急ぎ対応') !== -1;
        var isDanger = (elapsedMins >= 10 || hasUrgentTag);

        var topBarColor = isDanger ? '#8A261C' : (isMale ? '#2B4257' : '#733A40');
        var cardBorder = isDanger ? '#C9908A' : '#D8D0C0';
        var genderBadgeStyle = isMale
            ? 'background-color: #2B4257; color: #FFFFFF;'
            : 'background-color: #733A40; color: #FFFFFF;';
        var genderLabel = isMale ? '男性' : '女性';

        var mvObj = getMoveTypeObj(order.moveType || '相席開始');

        var timerColor = '#524A43';
        if (isDanger) {
            timerColor = '#8A261C';
        } else if (elapsedMins >= 5) {
            timerColor = '#7A4810';
        }

        var fromColor = getTableColorObj(order.fromTable);
        var toColor = getTableColorObj(order.toTable);

        var card = document.createElement('div');
        card.className = 'rounded-md p-4 flex flex-col relative overflow-hidden';
        card.style.backgroundColor = '#FFFFFF';
        card.style.border = '1px solid ' + cardBorder;
        card.style.borderTop = '3px solid ' + topBarColor;

        card.innerHTML =
            '<div style="border-bottom: 1px solid #EAE4D8;" class="flex items-center justify-between pb-2.5 mb-3.5 gap-2">' +
                '<div class="flex items-center gap-2 min-w-0">' +
                    '<span style="' + genderBadgeStyle + '" class="text-[11px] px-2 py-0.5 rounded-sm font-bold flex-none">' +
                        genderLabel +
                    '</span>' +
                    '<span style="color: #221E1B;" class="text-sm font-bold truncate">' +
                        escapeHtml(mvObj.label) +
                    '</span>' +
                '</div>' +
                '<div style="color: ' + timerColor + ';" class="tabular-nums font-mono text-xs font-bold flex-none" data-timer="' + order.createdAt + '">' +
                    '<span>' + pad(elapsedMins) + ':' + pad(elapsedSecs) + '</span>' +
                '</div>' +
            '</div>' +
            '<div class="flex items-center justify-between py-1 mb-3.5">' +
                '<div class="text-center flex-1">' +
                    '<div style="color: #5E554D;" class="text-[11px] font-medium mb-1">移動元</div>' +
                    '<div class="tabular-nums inline-block min-w-[72px] px-4 py-1.5 rounded border font-bold text-2xl tracking-wide ' + fromColor.cls + '">' + escapeHtml(order.fromTable) + '</div>' +
                '</div>' +
                '<div aria-hidden="true" style="color: #7A7067;" class="px-2 pt-4 text-lg select-none">→</div>' +
                '<div class="text-center flex-1">' +
                    '<div style="color: #5E554D;" class="text-[11px] font-medium mb-1">移動先</div>' +
                    '<div class="tabular-nums inline-block min-w-[72px] px-4 py-1.5 rounded border font-bold text-2xl tracking-wide ' + toColor.cls + '">' + escapeHtml(order.toTable) + '</div>' +
                '</div>' +
            '</div>' +
            renderTagsAndNoteHtml(order) +
            '<button type="button" onclick="completeOrder(\'' + escapeJsAttr(order.id) + '\')" style="background-color: #EFECE4; color: #221E1B; border: 1px solid #CFC6B4;" class="tap-primary mt-auto w-full hover:bg-stone-200 rounded font-bold text-sm transition-colors flex items-center justify-center">' +
                '移動完了' +
            '</button>';
        grid.appendChild(card);
    });
}

function renderCompletedOrders() {
    var list = document.getElementById('completedList');
    var empty = document.getElementById('emptyCompleted');
    var search = document.getElementById('completedSearchInput').value.trim().toLowerCase();
    list.innerHTML = '';

    var completed = orders.filter(function (o) { return o.status === 'COMPLETED'; });
    document.getElementById('completedTodayCount').textContent = completed.length;

    if (search) {
        completed = completed.filter(function (o) {
            var tagsStr = getOrderTags(o).join(' ').toLowerCase();
            return String(o.fromTable).toLowerCase().indexOf(search) !== -1 ||
                String(o.toTable).toLowerCase().indexOf(search) !== -1 ||
                (o.gender && o.gender.toLowerCase().indexOf(search) !== -1) ||
                (o.moveType && o.moveType.toLowerCase().indexOf(search) !== -1) ||
                tagsStr.indexOf(search) !== -1 ||
                (o.textNote && o.textNote.toLowerCase().indexOf(search) !== -1);
        });
    }

    if (completed.length === 0) {
        list.classList.add('hidden');
        empty.classList.remove('hidden');
        return;
    }
    list.classList.remove('hidden');
    empty.classList.add('hidden');

    completed.sort(function (a, b) { return (b.completedAt || 0) - (a.completedAt || 0); });

    completed.forEach(function (order) {
        var finishedTime = order.completedAt ? formatHM(order.completedAt) : '--:--';
        var isMale = (order.gender || '男性') === '男性';
        var badgeStyle = isMale
            ? 'background-color: #2B4257; color: #FFFFFF;'
            : 'background-color: #733A40; color: #FFFFFF;';
        var mvObj = getMoveTypeObj(order.moveType || '相席開始');

        var tags = getOrderTags(order);
        var summaryParts = [];
        if (tags.length > 0) summaryParts.push(tags.join(' / '));
        if (order.textNote) summaryParts.push(order.textNote);
        var notePreview = summaryParts.length > 0
            ? '<span style="color: #524A43;" class="text-xs truncate">' + escapeHtml(summaryParts.join(' — ')) + '</span>'
            : '';

        var row = document.createElement('div');
        row.className = 'px-4 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3';
        row.innerHTML =
            '<div class="flex items-center gap-3 flex-1 min-w-0 flex-wrap">' +
                '<span style="color: #524A43;" class="tabular-nums font-mono text-xs font-medium flex-none">' + finishedTime + '</span>' +
                '<span style="' + badgeStyle + '" class="text-[11px] px-1.5 py-0.5 rounded-sm font-bold flex-none">' +
                    escapeHtml(order.gender || '男性') +
                '</span>' +
                '<span style="color: #221E1B;" class="text-xs font-bold flex-none">' +
                    escapeHtml(mvObj.label) +
                '</span>' +
                '<div style="color: #221E1B;" class="tabular-nums flex items-center gap-1.5 flex-none font-bold text-sm tracking-wide">' +
                    '<span>' + escapeHtml(order.fromTable) + '</span>' +
                    '<span aria-hidden="true" style="color: #7A7067;">→</span>' +
                    '<span>' + escapeHtml(order.toTable) + '</span>' +
                '</div>' +
                notePreview +
            '</div>' +
            '<button type="button" onclick="restoreOrder(\'' + escapeJsAttr(order.id) + '\')" aria-label="伝票を移動待ちに戻す" style="background-color: #FFFFFF; color: #221E1B; border: 1px solid #CFC6B4;" class="tap-target px-3.5 hover:bg-stone-100 rounded text-xs font-semibold transition-colors flex items-center justify-center flex-none">' +
                '戻す' +
            '</button>';
        list.appendChild(row);
    });
}

// ===================== 操作 =====================
function completeOrder(id) {
    var order = findBy(orders, function (o) { return o.id === id; });
    if (order) {
        Sync.updateOrder(id, { status: 'COMPLETED', completedAt: Date.now() });
        playChime('complete');
        showToast('移動完了', (order.moveType || '') + ' ' + order.fromTable + ' ➔ ' + order.toTable + ' を完了しました');
    }
}

function restoreOrder(id) {
    var order = findBy(orders, function (o) { return o.id === id; });
    if (order) {
        Sync.updateOrder(id, { status: 'ACTIVE', completedAt: null });
        showToast('伝票を復元', order.fromTable + ' ➔ ' + order.toTable + ' を移動待ちに戻しました');
    }
}

function updateBadges() {
    document.getElementById('activeBadge').textContent = orders.filter(function (o) { return o.status === 'ACTIVE'; }).length;
    document.getElementById('completedBadge').textContent = orders.filter(function (o) { return o.status === 'COMPLETED'; }).length;
}

function updateTimersUI() {
    var timerEls = document.querySelectorAll('[data-timer]');
    var now = Date.now();
    for (var i = 0; i < timerEls.length; i++) {
        var el = timerEls[i];
        var createdAt = parseInt(el.getAttribute('data-timer'), 10);
        var elapsedMs = Math.max(0, now - createdAt);
        var span = el.querySelector('span');
        if (span) span.textContent = pad(Math.floor(elapsedMs / 60000)) + ':' + pad(Math.floor((elapsedMs % 60000) / 1000));
    }
}

// ===================== 卓管理 =====================
function openTableMgmtModal() {
    renderMgmtTablesGrid();
    document.getElementById('tableMgmtModal').classList.remove('hidden');
}

function closeTableMgmtModal() {
    document.getElementById('tableMgmtModal').classList.add('hidden');
}

function handleAddTableFromMgmt() {
    var input = document.getElementById('modalAddTableInput');
    var val = input.value.trim().replace(/^※/, '');
    if (!val) return;

    if (!someBy(registeredTables, function (t) { return t.name === val; })) {
        var next = cloneTables(registeredTables);
        next.push({ name: val, colorId: guessDefaultColorId(val) });
        Sync.saveTables(next);
        showToast('卓追加', '卓「' + val + '」を追加しました');
    } else {
        showToast('お知らせ', '卓「' + val + '」は既に登録されています');
    }
    input.value = '';
}

function resetDefaultTables() {
    Sync.saveTables(cloneTables(DEFAULT_TABLES));
    showToast('初期設定を復元', '長崎店の初期24卓に戻しました');
}

function setTableColor(tblName, colorId) {
    var next = cloneTables(registeredTables);
    var tbl = findBy(next, function (t) { return t.name === tblName; });
    if (tbl) {
        tbl.colorId = colorId;
        Sync.saveTables(next);
    }
}

function removeTable(tblName) {
    var inActiveOrder = someBy(orders, function (o) {
        return o.status === 'ACTIVE' && (o.fromTable === tblName || o.toTable === tblName);
    });
    if (inActiveOrder) {
        showToast('削除不可', '卓 ' + tblName + ' は移動待ちの伝票で使用中のため削除できません');
        return;
    }
    var next = registeredTables.filter(function (t) { return t.name !== tblName; });
    Sync.saveTables(next);
    showToast('卓削除', '卓「' + tblName + '」を削除しました');
}

function renderMgmtTablesGrid() {
    var container = document.getElementById('mgmtTablesGrid');
    container.innerHTML = '';

    if (registeredTables.length === 0) {
        container.innerHTML = '<div style="color: #524A43;" class="text-center py-6 text-xs font-medium">登録されている卓はありません</div>';
        return;
    }

    registeredTables.forEach(function (tbl) {
        var curColor = getTableColorObj(tbl.name);
        var item = document.createElement('div');
        item.className = 'flex items-center justify-between px-3 py-1.5 gap-2';

        var dotsHtml = COLOR_PRESETS.map(function (p) {
            var isCur = (p.id === tbl.colorId);
            return '<button type="button" onclick="setTableColor(\'' + escapeJsAttr(tbl.name) + '\', \'' + p.id + '\')" ' +
                'aria-label="卓 ' + escapeHtml(tbl.name) + ' の色を ' + escapeHtml(p.name) + ' に変更" ' +
                'class="tap-target w-11 h-11 rounded flex items-center justify-center hover:bg-stone-100 transition-colors" title="' + escapeHtml(p.name) + '">' +
                '<span aria-hidden="true" class="w-4 h-4 rounded-full transition-transform ' + (isCur ? 'scale-125 ring-2 ring-stone-800' : 'opacity-60') + '" ' +
                'style="background-color: ' + p.dot + ';"></span>' +
                '</button>';
        }).join('');

        item.innerHTML =
            '<span class="tabular-nums inline-block min-w-[44px] text-center px-2.5 py-1 rounded border text-sm font-bold tracking-wide ' + curColor.cls + '">' + escapeHtml(tbl.name) + '</span>' +
            '<div class="flex items-center gap-1">' +
                '<div class="flex items-center">' + dotsHtml + '</div>' +
                '<button type="button" onclick="removeTable(\'' + escapeJsAttr(tbl.name) + '\')" aria-label="卓 ' + escapeHtml(tbl.name) + ' を削除" style="color: #8A261C;" class="tap-target w-11 h-11 hover:bg-stone-100 rounded transition-colors flex items-center justify-center" title="削除">' +
                    '<i data-lucide="trash-2" class="w-4 h-4"></i>' +
                '</button>' +
            '</div>';
        container.appendChild(item);
    });
    lucide.createIcons();
}

// ===================== オーダー発行モーダル =====================
function selectGender(gender) {
    selectedGender = gender;
    renderGenderButtons();
}

function renderGenderButtons() {
    var btnMale = document.getElementById('genderBtnMale');
    var btnFemale = document.getElementById('genderBtnFemale');

    if (selectedGender === '男性') {
        btnMale.style.backgroundColor = '#2B4257';
        btnMale.style.borderColor = '#2B4257';
        btnMale.style.color = '#FFFFFF';

        btnFemale.style.backgroundColor = '#FFFFFF';
        btnFemale.style.borderColor = '#CFC6B4';
        btnFemale.style.color = '#221E1B';
    } else {
        btnMale.style.backgroundColor = '#FFFFFF';
        btnMale.style.borderColor = '#CFC6B4';
        btnMale.style.color = '#221E1B';

        btnFemale.style.backgroundColor = '#733A40';
        btnFemale.style.borderColor = '#733A40';
        btnFemale.style.color = '#FFFFFF';
    }
}

function selectMoveType(typeId) {
    selectedMoveType = typeId;
    renderMoveTypeButtons();
}

function renderMoveTypeButtons() {
    var container = document.getElementById('moveTypeButtons');
    container.innerHTML = '';

    MOVE_TYPES.forEach(function (m) {
        var active = (selectedMoveType === m.id);
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.setAttribute('aria-pressed', active ? 'true' : 'false');
        btn.onclick = function () { selectMoveType(m.id); };
        btn.className = 'chip-btn px-2.5 rounded border text-xs font-bold transition-colors flex items-center justify-center';
        if (active) {
            btn.style.backgroundColor = '#26201D';
            btn.style.borderColor = '#26201D';
            btn.style.color = '#FAF8F4';
        } else {
            btn.style.backgroundColor = '#FFFFFF';
            btn.style.borderColor = '#CFC6B4';
            btn.style.color = '#221E1B';
        }
        btn.textContent = m.label;
        container.appendChild(btn);
    });
}

function toggleQuickTag(tagId) {
    var idx = indexOfStr(selectedTags, tagId);
    if (idx === -1) {
        selectedTags.push(tagId);
    } else {
        selectedTags.splice(idx, 1);
    }
    renderQuickTagButtons();
}

function renderQuickTagButtons() {
    var container = document.getElementById('quickTagButtons');
    container.innerHTML = '';

    QUICK_TAGS.forEach(function (t) {
        var active = indexOfStr(selectedTags, t.id) !== -1;
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.setAttribute('aria-pressed', active ? 'true' : 'false');
        btn.onclick = function () { toggleQuickTag(t.id); };
        btn.className = 'chip-btn px-3 rounded border text-xs font-semibold transition-colors flex items-center justify-center';

        if (active) {
            if (t.urgent) {
                btn.style.backgroundColor = '#8A261C';
                btn.style.borderColor = '#8A261C';
                btn.style.color = '#FFFFFF';
            } else {
                btn.style.backgroundColor = '#26201D';
                btn.style.borderColor = '#26201D';
                btn.style.color = '#FAF8F4';
            }
        } else {
            btn.style.backgroundColor = '#FFFFFF';
            btn.style.borderColor = t.urgent ? '#D6A39E' : '#CFC6B4';
            btn.style.color = t.urgent ? '#8A261C' : '#221E1B';
        }

        btn.textContent = t.id;
        container.appendChild(btn);
    });
}

function createFloorButton(tblName, isSelected, selClass, onClickFn) {
    var colorObj = getTableColorObj(tblName);
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.setAttribute('aria-pressed', isSelected ? 'true' : 'false');
    btn.onclick = onClickFn;
    btn.className = 'floor-cell tabular-nums rounded border text-sm tracking-wide transition-colors flex items-center justify-center ' +
        colorObj.cls + (isSelected ? ' font-black ' + selClass : ' font-bold');
    btn.textContent = tblName;
    return btn;
}

function renderTableButtons() {
    renderGenderButtons();
    renderMoveTypeButtons();
    renderQuickTagButtons();

    var fromContainer = document.getElementById('fromTableButtons');
    var toContainer = document.getElementById('toTableButtons');
    fromContainer.innerHTML = '';
    toContainer.innerHTML = '';

    var regMap = {};
    registeredTables.forEach(function (t) { regMap[t.name] = t; });
    var placed = {};

    // 1. 6行×5列のフロア配置どおりに並べる (通路・空マスは枠なし空間として抜く)
    for (var r = 0; r < FLOOR_LAYOUT.length; r++) {
        for (var c = 0; c < FLOOR_LAYOUT[r].length; c++) {
            var name = FLOOR_LAYOUT[r][c];
            if (name && regMap[name]) {
                placed[name] = true;
                (function (tblName) {
                    fromContainer.appendChild(createFloorButton(
                        tblName,
                        selectedFromTable === tblName,
                        'selected-from',
                        function () { selectFromTable(tblName); }
                    ));
                    toContainer.appendChild(createFloorButton(
                        tblName,
                        selectedToTable === tblName,
                        'selected-to',
                        function () { selectToTable(tblName); }
                    ));
                })(name);
            } else {
                var emptyFrom = document.createElement('div');
                emptyFrom.className = 'floor-empty';
                emptyFrom.setAttribute('aria-hidden', 'true');
                fromContainer.appendChild(emptyFrom);

                var emptyTo = document.createElement('div');
                emptyTo.className = 'floor-empty';
                emptyTo.setAttribute('aria-hidden', 'true');
                toContainer.appendChild(emptyTo);
            }
        }
    }

    // 2. 後から追加された卓があれば下に続けて表示
    registeredTables.forEach(function (t) {
        if (placed[t.name]) return;
        var tblName = t.name;
        fromContainer.appendChild(createFloorButton(
            tblName,
            selectedFromTable === tblName,
            'selected-from',
            function () { selectFromTable(tblName); }
        ));
        toContainer.appendChild(createFloorButton(
            tblName,
            selectedToTable === tblName,
            'selected-to',
            function () { selectToTable(tblName); }
        ));
    });

    document.getElementById('fromSelectedBadge').textContent = selectedFromTable || '未選択';
    document.getElementById('toSelectedBadge').textContent = selectedToTable || '未選択';
}

function selectFromTable(tbl) { selectedFromTable = tbl; renderTableButtons(); }
function selectToTable(tbl) { selectedToTable = tbl; renderTableButtons(); }

function openOrderModal() {
    selectedTags = [];
    document.getElementById('textNoteInput').value = '';
    renderTableButtons();
    document.getElementById('orderModal').classList.remove('hidden');
}

function closeOrderModal() {
    document.getElementById('orderModal').classList.add('hidden');
}

function submitTransferOrder() {
    if (!selectedFromTable || !selectedToTable) {
        showToast('確認', '移動元と移動先の卓を選択してください');
        return;
    }
    if (selectedFromTable === selectedToTable) {
        showToast('確認', '移動元と移動先に同じ卓が選択されています');
        return;
    }

    var textNote = document.getElementById('textNoteInput').value.trim();
    var tagsCopy = selectedTags.slice(0);

    Sync.addOrder({
        no: genDisplayNo(),
        gender: selectedGender,
        moveType: selectedMoveType,
        fromTable: selectedFromTable,
        toTable: selectedToTable,
        item: '移動',
        createdAt: Date.now(),
        status: 'ACTIVE',
        tags: tagsCopy,
        noteType: 'text',
        textNote: textNote
    });
    closeOrderModal();
    playChime('push');
    showToast('移動指示を送信', '【' + selectedMoveType + '】' + selectedGender + ' ' + selectedFromTable + ' ➔ ' + selectedToTable);
}

// ===================== トースト =====================
var toastTimer = null;
function showToast(title, msg) {
    var toast = document.getElementById('toast');
    document.getElementById('toastTitle').textContent = title;
    document.getElementById('toastMsg').textContent = msg;
    toast.classList.remove('translate-y-20');
    toast.classList.remove('opacity-0');
    toast.classList.add('translate-y-0');
    toast.classList.add('opacity-100');
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
        toast.classList.remove('translate-y-0');
        toast.classList.remove('opacity-100');
        toast.classList.add('translate-y-20');
        toast.classList.add('opacity-0');
    }, 3000);
}

// ===================== 同期状態の表示 =====================
function setSyncStatus(state) {
    var dot = document.getElementById('syncDot');
    var txt = document.getElementById('syncText');
    var map = {
        online:     { c: '#2F5744', d: '#3B5949', t: '同期中' },
        offline:    { c: '#6B420F', d: '#B87B28', t: 'オフライン (再接続待ち)' },
        connecting: { c: '#524942', d: '#7A7067', t: '接続中…' },
        error:      { c: '#8A261C', d: '#A83226', t: '同期エラー' },
        unsupported:{ c: '#8A261C', d: '#A83226', t: '同期非対応' }
    };
    var s = map[state] || map.connecting;
    txt.style.color = s.c;
    dot.style.backgroundColor = s.d;
    txt.textContent = s.t;
}

// ===================== データ受信時の反映 =====================
function applyRemoteOrders(list) {
    orders = list;
    renderAllViews();
}

function applyRemoteTables(tables) {
    registeredTables = cloneTables(tables);
    if (!someBy(registeredTables, function (t) { return t.name === selectedFromTable; })) {
        selectedFromTable = registeredTables[0] ? registeredTables[0].name : '';
    }
    if (!someBy(registeredTables, function (t) { return t.name === selectedToTable; })) {
        selectedToTable = registeredTables[1] ? registeredTables[1].name : (registeredTables[0] ? registeredTables[0].name : '');
    }
    if (!document.getElementById('tableMgmtModal').classList.contains('hidden')) renderMgmtTablesGrid();
    if (!document.getElementById('orderModal').classList.contains('hidden')) renderTableButtons();
    renderAllViews();
}

function notifyRemoteOrder(order) {
    playChime('push');
    var mv = order.moveType ? '【' + order.moveType + '】' : '';
    showToast('新規卓移動オーダー', mv + (order.gender || '') + ' ' + order.fromTable + ' ➔ ' + order.toTable);
}

// =====================================================================
//  Firebase Realtime Database 同期 (/kds/stores/nagasaki)
// =====================================================================
var Sync = (function () {
    var tree = {};
    var es = null;
    var lastEventAt = 0;
    var gotInitial = false;
    var seededTables = false;
    var knownIds = {};
    var localIds = {};
    var queue = [];
    var sending = false;
    var reconnectTimer = null;

    function url(path) { return FIREBASE_DB_URL + DB_ROOT + path + '.json'; }

    function enqueue(method, path, body) {
        queue.push({ method: method, path: path, body: body });
        flush();
    }
    function flush() {
        if (sending || queue.length === 0) return;
        sending = true;
        var op = queue[0];
        var xhr = new XMLHttpRequest();
        xhr.open(op.method, url(op.path), true);
        xhr.onreadystatechange = function () {
            if (xhr.readyState !== 4) return;
            sending = false;
            if (xhr.status >= 200 && xhr.status < 300) {
                queue.shift();
                flush();
            } else if (xhr.status === 401 || xhr.status === 403) {
                queue.shift();
                setSyncStatus('error');
                showToast('同期エラー', 'データベースの権限設定を確認してください');
                flush();
            } else {
                setTimeout(flush, 3000);
            }
        };
        xhr.send(op.body === undefined ? null : JSON.stringify(op.body));
    }

    function setAt(path, data) {
        var parts = path.split('/').filter(function (p) { return p !== ''; });
        if (parts.length === 0) { tree = (data && typeof data === 'object') ? data : {}; return; }
        var node = tree;
        for (var i = 0; i < parts.length - 1; i++) {
            if (!node[parts[i]] || typeof node[parts[i]] !== 'object') {
                if (data === null) return;
                node[parts[i]] = {};
            }
            node = node[parts[i]];
        }
        var last = parts[parts.length - 1];
        if (data === null) delete node[last]; else node[last] = data;
    }

    function toArray(v) {
        var out = [];
        if (!v) return out;
        if (Object.prototype.toString.call(v) === '[object Array]') {
            for (var i = 0; i < v.length; i++) if (v[i]) out.push(v[i]);
        } else {
            var keys = Object.keys(v).sort(function (a, b) { return Number(a) - Number(b); });
            for (var j = 0; j < keys.length; j++) if (v[keys[j]]) out.push(v[keys[j]]);
        }
        return out;
    }

    function publish() {
        var list = [];
        var src = tree.orders || {};
        var fresh = [];
        Object.keys(src).forEach(function (id) {
            var o = src[id];
            if (!o || typeof o !== 'object') return;
            var copy = {};
            for (var k in o) if (o.hasOwnProperty(k)) copy[k] = o[k];
            copy.id = id;
            list.push(copy);
            if (!knownIds[id]) {
                knownIds[id] = true;
                if (gotInitial && !localIds[id]) fresh.push(copy);
            }
        });
        applyRemoteOrders(list);

        fresh.forEach(function (o) {
            if (o.status === 'ACTIVE' && Date.now() - (o.createdAt || 0) < 60000) notifyRemoteOrder(o);
        });

        if (tree.tables) {
            applyRemoteTables(cloneTables(toArray(tree.tables)));
        } else if (gotInitial && !seededTables) {
            seededTables = true;
            api.saveTables(DEFAULT_TABLES);
        }
    }

    function onPut(e) {
        lastEventAt = Date.now();
        var msg = JSON.parse(e.data);
        setAt(msg.path, msg.data);
        if (msg.path === '/') gotInitialOnce();
        setSyncStatus('online');
        publish();
    }
    function onPatch(e) {
        lastEventAt = Date.now();
        var msg = JSON.parse(e.data);
        var base = msg.path === '/' ? '' : msg.path;
        for (var k in msg.data) if (msg.data.hasOwnProperty(k)) setAt(base + '/' + k, msg.data[k]);
        setSyncStatus('online');
        publish();
    }
    function gotInitialOnce() {
        if (!gotInitial) {
            var src = tree.orders || {};
            Object.keys(src).forEach(function (id) { knownIds[id] = true; });
            gotInitial = true;
        }
    }

    function connect() {
        if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null; }
        if (es) { try { es.close(); } catch (e) {} es = null; }
        setSyncStatus('connecting');
        lastEventAt = Date.now();
        es = new EventSource(url(''));
        es.addEventListener('put', onPut, false);
        es.addEventListener('patch', onPatch, false);
        es.addEventListener('keep-alive', function () { lastEventAt = Date.now(); setSyncStatus('online'); }, false);
        es.addEventListener('cancel', function () {
            setSyncStatus('error');
            showToast('同期エラー', 'データベースの読み取り権限を確認してください');
        }, false);
        es.onerror = function () {
            setSyncStatus(navigator.onLine === false ? 'offline' : 'connecting');
            if (es && es.readyState === 2 && !reconnectTimer) {
                reconnectTimer = setTimeout(connect, 5000);
            }
        };
    }

    var api = {
        start: function () {
            if (!window.EventSource || !window.XMLHttpRequest) {
                setSyncStatus('unsupported');
                return;
            }
            connect();
            setInterval(function () {
                if (Date.now() - lastEventAt > 90000) connect();
            }, 15000);
            window.addEventListener('online', function () { connect(); flush(); }, false);
            window.addEventListener('offline', function () { setSyncStatus('offline'); }, false);
            document.addEventListener('visibilitychange', function () {
                if (!document.hidden && Date.now() - lastEventAt > 30000) connect();
            }, false);
        },
        addOrder: function (order) {
            var id = genId();
            var data = {};
            for (var k in order) if (order.hasOwnProperty(k) && order[k] !== null && order[k] !== undefined) data[k] = order[k];
            localIds[id] = true;
            knownIds[id] = true;
            setAt('/orders/' + id, data);
            publish();
            enqueue('PUT', '/orders/' + id, data);
        },
        updateOrder: function (id, patch) {
            for (var k in patch) if (patch.hasOwnProperty(k)) setAt('/orders/' + id + '/' + k, patch[k]);
            publish();
            enqueue('PATCH', '/orders/' + id, patch);
        },
        saveTables: function (tables) {
            var data = cloneTables(tables);
            setAt('/tables', data);
            publish();
            enqueue('PUT', '/tables', data);
        }
    };
    return api;
})();
