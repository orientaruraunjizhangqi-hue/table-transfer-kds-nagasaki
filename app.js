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
var selectedFromTable = 'A1';
var selectedToTable = 'B1';
var activeNoteMode = 'text'; // 'text' | 'canvas'

// Modal Canvas State
var ticketCanvas = document.getElementById('ticketCanvas');
var ticketCtx = ticketCanvas.getContext('2d');
var isDrawing = false;
var modalPenColor = '#2C2623';
var modalPenWidth = 3.5;
var modalTool = 'pen';
var lastPt = { x: 0, y: 0 };

// ===================== ユーティリティ =====================
function findBy(arr, fn) {
    for (var i = 0; i < arr.length; i++) { if (fn(arr[i])) return arr[i]; }
    return null;
}
function someBy(arr, fn) { return !!findBy(arr, fn); }
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
    initModalCanvas();
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
        icon.style.color = '#4A6B5B';
        showToast('サウンド通知', '通知音をONにしました');
        playChime('push');
    } else {
        icon.setAttribute('data-lucide', 'volume-x');
        icon.style.color = '#9E948B';
        showToast('サウンド通知', '通知音をOFFにしました');
    }
    lucide.createIcons();
}

// ===================== 画面切替・描画 =====================
function switchMainTab(tab) {
    currentTab = tab;
    var btnActive = document.getElementById('tabBtnActive');
    var btnCompleted = document.getElementById('tabBtnCompleted');
    var badgeActive = document.getElementById('activeBadge');
    var badgeCompleted = document.getElementById('completedBadge');
    var viewActive = document.getElementById('viewActive');
    var viewCompleted = document.getElementById('viewCompleted');

    if (tab === 'ACTIVE') {
        btnActive.style.backgroundColor = '#3A322D';
        btnActive.style.color = '#FAF8F5';
        badgeActive.style.backgroundColor = '#FAF8F5';
        badgeActive.style.color = '#3A322D';

        btnCompleted.style.backgroundColor = 'transparent';
        btnCompleted.style.color = '#6E655F';
        badgeCompleted.style.backgroundColor = '#DCD4C6';
        badgeCompleted.style.color = '#4A423D';

        viewActive.classList.remove('hidden');
        viewCompleted.classList.add('hidden');
    } else {
        btnActive.style.backgroundColor = 'transparent';
        btnActive.style.color = '#6E655F';
        badgeActive.style.backgroundColor = '#DCD4C6';
        badgeActive.style.color = '#4A423D';

        btnCompleted.style.backgroundColor = '#3A322D';
        btnCompleted.style.color = '#FAF8F5';
        badgeCompleted.style.backgroundColor = '#FAF8F5';
        badgeCompleted.style.color = '#3A322D';

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

function renderNoteHtml(order) {
    if (order.noteType === 'text' && order.textNote) {
        return '<div style="background-color: #FAF8F5; border: 1px solid #E5DEC9;" class="mb-3 rounded-lg p-2.5">' +
            '<div style="color: #8C6D46;" class="text-[10px] font-bold mb-1 flex items-center gap-1">' +
            '<i data-lucide="message-square" class="w-3 h-3"></i> 指示メモ</div>' +
            '<div style="color: #2C2623;" class="text-xs font-medium leading-relaxed break-words">' + escapeHtml(order.textNote) + '</div>' +
            '</div>';
    } else if (order.noteType === 'canvas' && order.canvasData) {
        return '<div style="background-color: #FAF8F5; border: 1px solid #E5DEC9;" class="mb-3 rounded-lg p-2">' +
            '<div style="color: #8C6D46;" class="text-[10px] font-bold mb-1 flex items-center gap-1">' +
            '<i data-lucide="pen-tool" class="w-3 h-3"></i> 手書きメモ</div>' +
            '<img src="' + escapeHtml(order.canvasData) + '" style="background-color: #FFFFFF; border: 1px solid #EBE5D8;" class="w-full h-auto max-h-20 object-contain rounded" alt="Note">' +
            '</div>';
    }
    return '';
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

        // クラシカルで上品なカード配色（白・アイボリー基調＋上端のアクセントライン）
        var cardBg = isMale ? '#FAFBFD' : '#FDFBFA';
        var cardBorder = isMale ? '#C5D1DF' : '#E2C6C8';
        var topBarColor = isMale ? '#344E68' : '#7D4449';
        var badgeStyle = isMale
            ? 'background-color: #344E68; color: #FFFFFF;'
            : 'background-color: #7D4449; color: #FFFFFF;';
        var genderLabel = isMale ? '男性 / MALE' : '女性 / FEMALE';

        var timerStyle = 'background-color: #EFF3F0; color: #365244; border: 1px solid #B8CEC2;';
        var urgencyCls = '';
        if (elapsedMins >= 10) {
            urgencyCls = 'urgency-danger';
            timerStyle = 'background-color: #FBE9E7; color: #9E3328; border: 1px solid #DFA39C;';
        } else if (elapsedMins >= 5) {
            timerStyle = 'background-color: #FAF0E1; color: #8A5A1E; border: 1px solid #DEC196;';
        }

        var fromColor = getTableColorObj(order.fromTable);
        var toColor = getTableColorObj(order.toTable);

        var card = document.createElement('div');
        card.className = 'rounded-xl p-4 flex flex-col shadow-sm relative overflow-hidden transition-all ' + urgencyCls;
        card.style.backgroundColor = cardBg;
        card.style.border = '1px solid ' + cardBorder;
        card.style.borderTop = '4px solid ' + topBarColor;

        card.innerHTML =
            '<div style="border-bottom: 1px solid #EAE3D5;" class="flex items-center justify-between pb-2.5 mb-3">' +
                '<span style="' + badgeStyle + '" class="text-[11px] px-2.5 py-1 rounded font-bold tracking-wider">' +
                    genderLabel +
                '</span>' +
                '<div style="' + timerStyle + '" class="px-2.5 py-0.5 rounded text-xs font-mono font-bold flex items-center space-x-1" data-timer="' + order.createdAt + '">' +
                    '<i data-lucide="clock" class="w-3.5 h-3.5"></i>' +
                    '<span>' + pad(elapsedMins) + ':' + pad(elapsedSecs) + '</span>' +
                '</div>' +
            '</div>' +
            '<div style="background-color: #F5F2EB; border: 1px solid #E2DACB;" class="p-3 rounded-lg flex items-center justify-between mb-3">' +
                '<div class="text-center flex-1">' +
                    '<div style="color: #8C8278;" class="text-[10px] font-bold mb-1 tracking-wider">FROM / 移動元</div>' +
                    '<div class="inline-block px-3.5 py-1 rounded-md border font-black text-lg font-mono ' + fromColor.cls + '">' + escapeHtml(order.fromTable) + '</div>' +
                '</div>' +
                '<div class="flex flex-col items-center mx-2">' +
                    '<i data-lucide="arrow-right" style="color: #8C6D46;" class="w-5 h-5"></i>' +
                '</div>' +
                '<div class="text-center flex-1">' +
                    '<div style="color: #8C8278;" class="text-[10px] font-bold mb-1 tracking-wider">TO / 移動先</div>' +
                    '<div class="inline-block px-3.5 py-1 rounded-md border font-black text-lg font-mono ' + toColor.cls + '">' + escapeHtml(order.toTable) + '</div>' +
                '</div>' +
            '</div>' +
            renderNoteHtml(order) +
            '<button onclick="completeOrder(\'' + escapeJsAttr(order.id) + '\')" style="background-color: #4A6B5B; color: #FFFFFF;" class="mt-auto w-full py-2.5 hover:opacity-90 rounded-lg font-bold text-xs sm:text-sm shadow-sm transition-all flex items-center justify-center gap-1.5">' +
                '<i data-lucide="check-circle" class="w-4 h-4"></i>' +
                '<span>移動完了</span>' +
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
            return String(o.fromTable).toLowerCase().indexOf(search) !== -1 ||
                String(o.toTable).toLowerCase().indexOf(search) !== -1 ||
                (o.gender && o.gender.toLowerCase().indexOf(search) !== -1) ||
                (o.textNote && o.textNote.toLowerCase().indexOf(search) !== -1);
        });
    }

    if (completed.length === 0) {
        empty.classList.remove('hidden');
        return;
    }
    empty.classList.add('hidden');

    completed.sort(function (a, b) { return (b.completedAt || 0) - (a.completedAt || 0); });

    completed.forEach(function (order) {
        var finishedTime = order.completedAt ? formatHM(order.completedAt) : '--:--';
        var isMale = (order.gender || '男性') === '男性';
        var badgeStyle = isMale
            ? 'background-color: #344E68; color: #FFFFFF;'
            : 'background-color: #7D4449; color: #FFFFFF;';
        var fromColor = getTableColorObj(order.fromTable);
        var toColor = getTableColorObj(order.toTable);

        var notePreview = '';
        if (order.noteType === 'text' && order.textNote) {
            notePreview = '<span style="color: #8C6D46;">メモ: ' + escapeHtml(order.textNote) + '</span>';
        } else if (order.noteType === 'canvas' && order.canvasData) {
            notePreview = '<span style="color: #8C6D46;">手書きメモあり</span>';
        }

        var row = document.createElement('div');
        row.className = 'rounded-xl p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm';
        row.style.backgroundColor = '#FDFBF7';
        row.style.border = '1px solid #DCD4C6';
        row.innerHTML =
            '<div class="flex items-center space-x-3 flex-1 min-w-0">' +
                '<span style="' + badgeStyle + '" class="text-[11px] px-2.5 py-1 rounded font-bold flex-none">' +
                    escapeHtml(order.gender || '男性') +
                '</span>' +
                '<div class="flex items-center gap-1.5 flex-none font-mono font-bold text-sm">' +
                    '<span class="px-2.5 py-0.5 rounded border ' + fromColor.cls + '">' + escapeHtml(order.fromTable) + '</span>' +
                    '<i data-lucide="arrow-right" style="color: #8C6D46;" class="w-4 h-4"></i>' +
                    '<span class="px-2.5 py-0.5 rounded border ' + toColor.cls + '">' + escapeHtml(order.toTable) + '</span>' +
                '</div>' +
                '<div class="truncate">' +
                    '<div style="color: #2C2623;" class="text-xs font-bold truncate">卓移動 ' + (notePreview ? '• ' + notePreview : '') + '</div>' +
                    '<div style="color: #8C8278;" class="text-[11px] flex items-center gap-2 mt-0.5">' +
                        '<span>完了時刻: ' + finishedTime + '</span><span>•</span><span>' + escapeHtml(order.no || order.id) + '</span>' +
                    '</div>' +
                '</div>' +
            '</div>' +
            '<button onclick="restoreOrder(\'' + escapeJsAttr(order.id) + '\')" style="background-color: #F5F2EB; color: #5C4630; border: 1px solid #D5CBB8;" class="px-3 py-1.5 hover:bg-stone-200 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 flex-none">' +
                '<i data-lucide="rotate-ccw" class="w-3.5 h-3.5"></i><span>移動待ちに戻す</span>' +
            '</button>';
        list.appendChild(row);
    });

    lucide.createIcons();
}

// ===================== 操作 =====================
function completeOrder(id) {
    var order = findBy(orders, function (o) { return o.id === id; });
    if (order) {
        Sync.updateOrder(id, { status: 'COMPLETED', completedAt: Date.now() });
        playChime('complete');
        showToast('移動完了', (order.gender || '') + ' ' + order.fromTable + ' ➔ ' + order.toTable + ' の移動を完了しました');
    }
}

function restoreOrder(id) {
    var order = findBy(orders, function (o) { return o.id === id; });
    if (order) {
        Sync.updateOrder(id, { status: 'ACTIVE', completedAt: null });
        showToast('伝票を復元', (order.gender || '') + ' ' + order.fromTable + ' ➔ ' + order.toTable + ' を移動待ちに戻しました');
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
        container.innerHTML = '<div style="color: #9E948B;" class="text-center py-4 text-xs">登録されている卓はありません</div>';
        return;
    }

    registeredTables.forEach(function (tbl) {
        var curColor = getTableColorObj(tbl.name);
        var item = document.createElement('div');
        item.style.backgroundColor = '#FFFFFF';
        item.style.border = '1px solid #E2DACB';
        item.className = 'flex items-center justify-between p-2 rounded-lg gap-2';

        var dotsHtml = COLOR_PRESETS.map(function (p) {
            return '<button type="button" onclick="setTableColor(\'' + escapeJsAttr(tbl.name) + '\', \'' + p.id + '\')" ' +
                'class="w-5 h-5 rounded-full transition-transform ' + (p.id === tbl.colorId ? 'scale-125 ring-2 ring-stone-700' : 'opacity-60') + '" ' +
                'style="background-color: ' + p.dot + '; margin: 0 2px;" title="' + p.name + '"></button>';
        }).join('');

        item.innerHTML =
            '<span class="inline-block px-2.5 py-0.5 rounded border text-xs font-mono font-bold ' + curColor.cls + '">' + escapeHtml(tbl.name) + '</span>' +
            '<div class="flex items-center gap-2">' +
                '<div class="flex items-center px-1.5 py-1 rounded" style="background-color: #F5F2EB; border: 1px solid #E2DACB;">' + dotsHtml + '</div>' +
                '<button onclick="removeTable(\'' + escapeJsAttr(tbl.name) + '\')" style="color: #9E3B33;" class="p-1 hover:bg-stone-100 rounded transition-colors" title="削除">' +
                    '<i data-lucide="trash-2" class="w-4 h-4"></i>' +
                '</button>' +
            '</div>';
        container.appendChild(item);
    });
    lucide.createIcons();
}

// ===================== オーダー発行モーダル (6×5 フロア配置) =====================
function selectGender(gender) {
    selectedGender = gender;
    renderGenderButtons();
}

function renderGenderButtons() {
    var btnMale = document.getElementById('genderBtnMale');
    var btnFemale = document.getElementById('genderBtnFemale');

    if (selectedGender === '男性') {
        btnMale.style.backgroundColor = '#344E68';
        btnMale.style.borderColor = '#344E68';
        btnMale.style.color = '#FFFFFF';
        btnMale.querySelector('span').style.backgroundColor = '#FFFFFF';

        btnFemale.style.backgroundColor = '#FFFFFF';
        btnFemale.style.borderColor = '#DCD4C6';
        btnFemale.style.color = '#6E655F';
        btnFemale.querySelector('span').style.backgroundColor = '#7D4449';
    } else {
        btnMale.style.backgroundColor = '#FFFFFF';
        btnMale.style.borderColor = '#DCD4C6';
        btnMale.style.color = '#6E655F';
        btnMale.querySelector('span').style.backgroundColor = '#344E68';

        btnFemale.style.backgroundColor = '#7D4449';
        btnFemale.style.borderColor = '#7D4449';
        btnFemale.style.color = '#FFFFFF';
        btnFemale.querySelector('span').style.backgroundColor = '#FFFFFF';
    }
}

function createFloorButton(tblName, isSelected, selClass, onClickFn) {
    var colorObj = getTableColorObj(tblName);
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.onclick = onClickFn;
    btn.className = 'floor-cell h-9 rounded-lg border font-mono text-xs transition-all ' +
        colorObj.cls + (isSelected ? ' font-black ' + selClass : ' font-bold opacity-85 hover:opacity-100');
    btn.textContent = tblName;
    return btn;
}

function renderTableButtons() {
    renderGenderButtons();
    var fromContainer = document.getElementById('fromTableButtons');
    var toContainer = document.getElementById('toTableButtons');
    fromContainer.innerHTML = '';
    toContainer.innerHTML = '';

    // 登録済みの卓マップ
    var regMap = {};
    registeredTables.forEach(function (t) { regMap[t.name] = t; });
    var placed = {};

    // 1. 6行×5列のフロア配置どおりに並べる
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
                emptyFrom.textContent = '—';
                fromContainer.appendChild(emptyFrom);

                var emptyTo = document.createElement('div');
                emptyTo.className = 'floor-empty';
                emptyTo.textContent = '—';
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

function switchNoteMode(mode) {
    activeNoteMode = mode;
    var btnText = document.getElementById('noteTabBtnText');
    var btnCanvas = document.getElementById('noteTabBtnCanvas');
    var secText = document.getElementById('noteModeText');
    var secCanvas = document.getElementById('noteModeCanvas');

    if (mode === 'text') {
        btnText.style.backgroundColor = '#3A322D';
        btnText.style.color = '#FAF8F5';
        btnCanvas.style.backgroundColor = 'transparent';
        btnCanvas.style.color = '#6E655F';
        secText.classList.remove('hidden');
        secCanvas.classList.add('hidden');
    } else {
        btnText.style.backgroundColor = 'transparent';
        btnText.style.color = '#6E655F';
        btnCanvas.style.backgroundColor = '#3A322D';
        btnCanvas.style.color = '#FAF8F5';
        secText.classList.add('hidden');
        secCanvas.classList.remove('hidden');
        setTimeout(resizeModalCanvas, 50);
    }
}

function openOrderModal() {
    renderTableButtons();
    clearModalCanvas();
    document.getElementById('textNoteInput').value = '';
    switchNoteMode('text');
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

    var canvasData = null;
    var textNote = '';
    if (activeNoteMode === 'text') {
        textNote = document.getElementById('textNoteInput').value.trim();
    } else if (activeNoteMode === 'canvas' && hasCanvasContent(ticketCanvas)) {
        canvasData = ticketCanvas.toDataURL();
    }

    Sync.addOrder({
        no: genDisplayNo(),
        gender: selectedGender,
        fromTable: selectedFromTable,
        toTable: selectedToTable,
        item: '移動',
        createdAt: Date.now(),
        status: 'ACTIVE',
        noteType: activeNoteMode,
        canvasData: canvasData,
        textNote: textNote
    });
    closeOrderModal();
    playChime('push');
    showToast('移動指示を送信', selectedGender + '  ' + selectedFromTable + ' ➔ ' + selectedToTable);
}

// ===================== 手書きキャンバス =====================
function initModalCanvas() {
    if (window.PointerEvent) {
        ticketCanvas.addEventListener('pointerdown', startModalDraw, false);
        ticketCanvas.addEventListener('pointermove', modalDraw, false);
        ticketCanvas.addEventListener('pointerup', stopModalDraw, false);
        ticketCanvas.addEventListener('pointercancel', stopModalDraw, false);
    } else {
        ticketCanvas.addEventListener('touchstart', startModalDraw, false);
        ticketCanvas.addEventListener('touchmove', modalDraw, false);
        ticketCanvas.addEventListener('touchend', stopModalDraw, false);
        ticketCanvas.addEventListener('touchcancel', stopModalDraw, false);
        ticketCanvas.addEventListener('mousedown', startModalDraw, false);
        ticketCanvas.addEventListener('mousemove', modalDraw, false);
        window.addEventListener('mouseup', stopModalDraw, false);
    }
}

function resizeModalCanvas() {
    var rect = ticketCanvas.parentElement.getBoundingClientRect();
    ticketCanvas.width = rect.width || 300;
    ticketCanvas.height = rect.height || 100;
    ticketCtx.lineCap = 'round';
    ticketCtx.lineJoin = 'round';
}

function getModalPt(e) {
    var rect = ticketCanvas.getBoundingClientRect();
    var src = (e.touches && e.touches.length) ? e.touches[0] : e;
    return { x: src.clientX - rect.left, y: src.clientY - rect.top };
}

function startModalDraw(e) {
    if (e.type === 'touchstart') e.preventDefault();
    isDrawing = true;
    lastPt = getModalPt(e);
}

function modalDraw(e) {
    if (!isDrawing) return;
    e.preventDefault();
    var currentPt = getModalPt(e);
    ticketCtx.beginPath();
    if (modalTool === 'eraser') {
        ticketCtx.globalCompositeOperation = 'destination-out';
        ticketCtx.lineWidth = modalPenWidth * 4;
    } else {
        ticketCtx.globalCompositeOperation = 'source-over';
        ticketCtx.strokeStyle = modalPenColor;
        ticketCtx.lineWidth = modalPenWidth;
    }
    ticketCtx.moveTo(lastPt.x, lastPt.y);
    ticketCtx.lineTo(currentPt.x, currentPt.y);
    ticketCtx.stroke();
    lastPt = currentPt;
}

function stopModalDraw() { isDrawing = false; }

function setModalPenColor(color) {
    modalPenColor = color;
    setModalTool('pen');
    var btns = document.querySelectorAll('.modal-color-btn');
    for (var i = 0; i < btns.length; i++) {
        var btn = btns[i];
        var cls = ['ring-2', 'ring-stone-500', 'ring-offset-1'];
        for (var j = 0; j < cls.length; j++) {
            if (btn.getAttribute('data-color') === color) btn.classList.add(cls[j]);
            else btn.classList.remove(cls[j]);
        }
    }
}

function setModalTool(tool) {
    modalTool = tool;
    var eraserBtn = document.getElementById('modalEraserBtn');
    eraserBtn.style.backgroundColor = tool === 'eraser' ? '#DCD4C6' : 'transparent';
}

function clearModalCanvas() {
    ticketCtx.clearRect(0, 0, ticketCanvas.width, ticketCanvas.height);
}

function hasCanvasContent(canvas) {
    var data = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
    for (var i = 3; i < data.length; i += 4) { if (data[i] !== 0) return true; }
    return false;
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
        online:     { c: '#4A6B5B', d: '#4A6B5B', t: '同期中' },
        offline:    { c: '#8A5A1E', d: '#C48B37', t: 'オフライン (再接続待ち)' },
        connecting: { c: '#6E655F', d: '#9E948B', t: '接続中…' },
        error:      { c: '#9E3328', d: '#B84237', t: '同期エラー' },
        unsupported:{ c: '#9E3328', d: '#B84237', t: '同期非対応' }
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
    showToast('新規卓移動オーダー', (order.gender || '') + '  ' + order.fromTable + ' ➔ ' + order.toTable);
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
