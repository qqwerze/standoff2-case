/* ==========================================================================
   Standoff 2 — Case Simulator
   Ванильный JavaScript (ES6+), модульная структура.

   РАЗДЕЛЫ:
     1. Утилиты
     2. Данные (редкости, оружие, кейсы, предметы)
     3. Состояние + Сохранение
     4. Рендер UI (баланс, кейсы, инвентарь)
     5. Рулетка (анимация)
     6. Экономика (открытие, продажа, пополнение)
     7. Экипировка
     8. Инициализация
   ========================================================================== */

'use strict';

/* ============================================================
   1. УТИЛИТЫ
   ============================================================ */

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

/** Форматирует число: 10000 -> "10 000" */
const fmt = (n) => Math.round(n).toLocaleString('ru-RU').replace(/,/g, ' ');

/** Случайное число [min, max) */
const rand = (min, max) => Math.random() * (max - min) + min;

/** Случайное целое [min, max] включительно */
const randInt = (min, max) => Math.floor(rand(min, max + 1));

/** Экранирование HTML */
const esc = (str) => String(str).replace(/[&<>"']/g, (m) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[m]));

/** Глубокое копирование (с фолбэком для старых браузеров) */
const deepClone = (obj) => {
    if (typeof structuredClone === 'function') return structuredClone(obj);
    return JSON.parse(JSON.stringify(obj));
};

/** Случайный элемент массива */
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

/** Маленькая задержка */
const delay = (ms) => new Promise((res) => setTimeout(res, ms));

/* ============================================================
   2. ДАННЫЕ
   ============================================================ */

/**
 * РЕДКОСТИ — реалистичные шансы Standoff 2.
 * chance: вероятность выпадения предмета данной редкости из кейса (%).
 */
const RARITIES = {
    common:     { key: 'common',     name: 'Обычный',      color: '#8a93a5', chance: 50.0 },
    uncommon:   { key: 'uncommon',   name: 'Необычный',    color: '#4db8ff', chance: 25.0 },
    rare:       { key: 'rare',       name: 'Редкий',       color: '#4a6bff', chance: 15.0 },
    epic:       { key: 'epic',       name: 'Эпический',    color: '#b44aff', chance: 7.0 },
    legendary:  { key: 'legendary',  name: 'Легендарный',  color: '#ff4a4a', chance: 2.5 },
    arcane:     { key: 'arcane',     name: 'Таинственный', color: '#ffcb12', chance: 0.5 },
};

/**
 * ОРУЖИЕ — база данных прототипов.
 * icon: тип силуэта для плейсхолдера (позже можно заменить на картинку через item.image).
 */
const WEAPONS = {
    'AKR-12':        { type: 'rifle',   display: 'AKR-12' },
    'M4':            { type: 'rifle',   display: 'M4' },
    'AWM':           { type: 'sniper',  display: 'AWM' },
    'Scout':         { type: 'sniper',  display: 'Scout' },
    'Deagle':        { type: 'pistol',  display: 'Deagle' },
    'Knife':         { type: 'knife',   display: 'Нож' },
    'Karambit':      { type: 'knife',   display: 'Карамбит' },
    'MP7':           { type: 'smg',     display: 'MP7' },
    'UMP':           { type: 'smg',     display: 'UMP' },
    'Vector':        { type: 'smg',     display: 'Vector' },
    'FAL':           { type: 'rifle',   display: 'FAL' },
    'Burst':         { type: 'smg',     display: 'Burst' },
    'Skorpion':      { type: 'smg',     display: 'Skorpion' },
};

/**
 * КЕЙСЫ. price в золоте. items — доступные скины.
 * Каждый предмет: { weapon, name, rarity, value }.
 * Примечание: для добавления своей картинки скина задайте полю item.image
 * путь вида "images/skins/akt12_carbon.png" — и она будет отрисована вместо плейсхолдера.
 */
const CASES = [
    {
        id: 'rival',
        name: 'Rival',
        price: 120,
        accent: '#ff9f00',
        description: 'Классический кейс с оружием соперников',
        items: [
            { weapon: 'AKR-12', name: 'AKR-12 Carbon',      rarity: 'common',    value: 30 },
            { weapon: 'M4',     name: 'M4 Frostline',       rarity: 'common',    value: 45 },
            { weapon: 'Deagle', name: 'Deagle Toxic',       rarity: 'uncommon',  value: 80 },
            { weapon: 'AKR-12', name: 'AKR-12 Neon Rider',  rarity: 'uncommon',  value: 95 },
            { weapon: 'M4',     name: 'M4 Mirage',          rarity: 'rare',      value: 220 },
            { weapon: 'MP7',    name: 'MP7 Vortex',         rarity: 'rare',      value: 260 },
            { weapon: 'Deagle', name: 'Deagle Deadshot',    rarity: 'epic',      value: 650 },
            { weapon: 'AKR-12', name: 'AKR-12 Blood Moon',  rarity: 'epic',      value: 700 },
            { weapon: 'M4',     name: 'M4 Royal Guard',     rarity: 'legendary', value: 1800 },
            { weapon: 'Knife',  name: 'Нож «Berkshire»',    rarity: 'legendary', value: 2200 },
            { weapon: 'Karambit','Карамбит «Gold Rush»',    rarity: 'arcane',    value: 9000 },
        ],
    },
    {
        id: 'origin',
        name: 'Origin',
        price: 100,
        accent: '#04e4f4',
        description: 'Кейс начальных времён с снайперками',
        items: [
            { weapon: 'Scout',  name: 'Scout Sandstorm',    rarity: 'common',    value: 35 },
            { weapon: 'UMP',    name: 'UMP Urban',          rarity: 'common',    value: 40 },
            { weapon: 'Skorpion','Skorpion Rust',           rarity: 'uncommon',  value: 75 },
            { weapon: 'Vector', name: 'Vector Cyber',       rarity: 'uncommon',  value: 90 },
            { weapon: 'Scout',  name: 'Scout Night Owl',    rarity: 'rare',      value: 240 },
            { weapon: 'Burst',  name: 'Burst Ion',          rarity: 'rare',      value: 250 },
            { weapon: 'AWM',    name: 'AWM Imperial',       rarity: 'epic',      value: 680 },
            { weapon: 'UMP',    name: 'UMP Genesis',        rarity: 'epic',      value: 720 },
            { weapon: 'AWM',    name: 'AWM Dusk Fury',      rarity: 'legendary', value: 1900 },
            { weapon: 'FAL',    name: 'FAL Platinum',       rarity: 'legendary', value: 2100 },
            { weapon: 'Knife',  name: 'Нож «Obsidian»',     rarity: 'arcane',    value: 8500 },
        ],
    },
    {
        id: 'sharp',
        name: 'Sharp',
        price: 150,
        accent: '#6e06aa',
        description: 'Острые скины для самого брутального оружия',
        items: [
            { weapon: 'Burst',  name: 'Burst Desert',       rarity: 'common',    value: 40 },
            { weapon: 'Vector', name: 'Vector Marsh',       rarity: 'common',    value: 50 },
            { weapon: 'FAL',    name: 'FAL Sand',           rarity: 'uncommon',  value: 85 },
            { weapon: 'MP7',    name: 'MP7 Cyan Strike',    rarity: 'uncommon',  value: 100 },
            { weapon: 'Karambit','Карамбит «North»',        rarity: 'rare',      value: 300 },
            { weapon: 'Vector', name: 'Vector Hyper',       rarity: 'rare',      value: 280 },
            { weapon: 'FAL',    name: 'FAL Molten',         rarity: 'epic',      value: 750 },
            { weapon: 'Karambit','Карамбит «Venom»',        rarity: 'epic',      value: 800 },
            { weapon: 'M4',     name: 'M4 Frostbite',       rarity: 'legendary', value: 2000 },
            { weapon: 'AWM',    name: 'AWM Crimson Web',    rarity: 'legendary', value: 2400 },
            { weapon: 'Karambit','Карамбит «Phoenix»',      rarity: 'arcane',    value: 10000 },
        ],
    },
];

/**
 * СИЛУЭТЫ ОРУЖИЯ — векторные плейсхолдеры.
 * Отрисовываются как inline SVG, если у предмета нет item.image.
 */
function weaponIconSVG(type) {
    const paths = {
        rifle:  '<path d="M3 14h6l4-3h7v3h-2v4H5v-4H3z"/><path d="M20 11h3v2.5h-3z" opacity=".7"/>',
        sniper: '<path d="M2 13h8l3-2h8v3h-2v5H4v-5H2z"/><rect x="12" y="9" width="4" height="2.2" opacity=".8"/>',
        pistol: '<path d="M5 15h3l2-3h8v3h1v3h-4v-3h-2v3H5v-3z"/><rect x="13" y="10" width="5" height="1.6"/>',
        smg:    '<path d="M3 15h6l2-4h7v3h3v4h-4v-2H9l-2 3H3z"/><rect x="18" y="11" width="4" height="2"/>',
        knife:  '<path d="M12 2l7 8-8 1-3-3 4-6z"/><path d="M6 12l-2 9 6-3" opacity=".85"/>',
    };
    return `<svg viewBox="0 0 24 24" width="100%" height="100%" fill="rgba(255,255,255,.92)">${paths[type] || paths.rifle}</svg>`;
}

/* ============================================================
   3. СОСТОЯНИЕ + СОХРАНЕНИЕ
   ============================================================ */

const DEFAULT_STATE = {
    gold: 10000,
    silver: 0,
    username: '',
    inventory: [],               // экземпляры предметов: { uid, weapon, name, rarity, value, case, acquiredAt }
    equipped: {},                // { 'AKR-12': uid, ... } — один скин на тип оружия
    stats: { opened: 0, spent: 0, best: null },
};

const SAVE_KEY = 'so2_case_sim_save_v1';
let state = loadState();

function loadState() {
    try {
        const raw = localStorage.getItem(SAVE_KEY);
        if (!raw) return deepClone(DEFAULT_STATE);
        const parsed = JSON.parse(raw);
        return { ...deepClone(DEFAULT_STATE), ...parsed };
    } catch {
        return deepClone(DEFAULT_STATE);
    }
}

function saveState() {
    try {
        localStorage.setItem(SAVE_KEY, JSON.stringify(state));
    } catch { /* localStorage недоступен — игра всё равно работает */ }
}

let uidCounter = 0;
const nextUid = () => `s${Date.now().toString(36)}${(uidCounter++).toString(36)}`;

/* ============================================================
   4. РЕНДЕР UI
   ============================================================ */

/** Справочник предмета по uid (для быстрых операций) */
const itemById = (uid) => state.inventory.find((it) => it.uid === uid);

function getCase(id) {
    return CASES.find((c) => c.id === id);
}

function rarityOf(r) {
    return RARITIES[r] || RARITIES.common;
}

/* ---- Баланс ---- */
function renderBalance() {
    $('#goldAmount').textContent = fmt(state.gold);
    $('#silverAmount').textContent = fmt(state.silver);
}

/* ---- Кейсы (главная) ---- */
function renderCases() {
    const grid = $('#casesGrid');
    grid.innerHTML = CASES.map((c) => `
        <div class="case-card" data-case="${c.id}">
            <div class="case-image">
                <div class="case-box-art"></div>
            </div>
            <h3>${esc(c.name)}</h3>
            <span class="case-price"><span class="price-coin">★</span> ${c.price}</span>
        </div>`).join('');

    $$('.case-card', grid).forEach((card) => {
        card.addEventListener('click', () => openCaseView(card.dataset.case));
    });
}

/* ---- Просмотр кейса ---- */
function openCaseView(caseId) {
    const c = getCase(caseId);
    if (!c) return;

    $('#casePreviewLarge').innerHTML = '<div class="case-box-art"></div>';
    $('#caseViewName').textContent = c.name;
    $('#caseViewPrice').textContent = fmt(c.price);
    $('#openCasePrice').textContent = fmt(c.price);

    $('#caseItemsPreview').innerHTML = c.items.map((it) => {
        const r = rarityOf(it.rarity);
        const img = it.image
            ? `<img class="preview-img" src="${it.image}" alt="${esc(it.name)}">`
            : `<div class="preview-img rarity-${it.rarity}">${weaponIconSVG(WEAPONS[it.weapon].type)}</div>`;
        return `
            <div class="preview-item rarity-${it.rarity}" style="border-color:${r.color}">
                ${img}
                <span>${esc(it.name)}</span>
            </div>`;
    }).join('');

    updateOpenBtn(caseId);
    $('#caseViewOverlay').classList.add('active');
    $('body').classList.add('lock-scroll');
    $('#closeCaseView').onclick = closeCaseView;
    $('#openCaseBtn').dataset.case = caseId;

    // Щелчок по фону закрывает
    $('#caseViewOverlay').onclick = (e) => { if (e.target === $('#caseViewOverlay')) closeCaseView(); };
}

function closeCaseView() {
    $('#caseViewOverlay').classList.remove('active');
    $('body').classList.remove('lock-scroll');
}

function updateOpenBtn(caseId) {
    const c = getCase(caseId);
    const btn = $('#openCaseBtn');
    const enough = state.gold >= c.price;
    btn.classList.toggle('disabled', !enough);
    btn.querySelector('.btn-text').textContent = enough ? 'Открыть кейс' : 'Недостаточно золота';
}

function openCaseClick() {
    const caseId = $('#openCaseBtn').dataset.case;
    const c = getCase(caseId);
    if (!c || state.gold < c.price) return;
    startRoulette(c);
}

/* ---- Инвентарь ---- */
let activeRarityFilter = 'all';

function renderInventory() {
    const grid = $('#inventoryGrid');
    const empty = $('#emptyInventory');
    const items = state.inventory;

    $('#inventoryCount').textContent = `Предметов: ${items.length}`;
    const totalValue = items.reduce((s, it) => s + it.value, 0);
    $('#inventoryValue').textContent = `Стоимость: ${fmt(totalValue)} ★`;

    // Показать/скрыть заглушку
    if (items.length === 0) {
        empty.classList.remove('hidden');
        grid.innerHTML = '';
        return;
    }
    empty.classList.add('hidden');

    // Отфильтрованные предметы
    let visible = items;
    if (activeRarityFilter !== 'all') {
        visible = items.filter((it) => it.rarity === activeRarityFilter);
    }

    if (visible.length === 0) {
        grid.innerHTML = `<div class="empty-inventory" style="grid-column:1/-1">
            <p>Нет предметов этой редкости</p></div>`;
        return;
    }

    // Группировка по редкости (при фильтре "Все")
    const groups = [...new Set(visible.map((it) => it.rarity))];
    const rarityOrder = Object.keys(RARITIES);
    groups.sort((a, b) => rarityOrder.indexOf(a) - rarityOrder.indexOf(b));

    grid.innerHTML = groups.map((rarity) => {
        const r = rarityOf(rarity);
        const groupItems = visible.filter((it) => it.rarity === rarity);
        const cards = groupItems.map((it) => {
            const isEquipped = state.equipped[it.weapon] === it.uid;
            const img = it.image
                ? `<img class="inv-img" src="${it.image}" alt="${esc(it.name)}">`
                : `<div class="inv-img rarity-${it.rarity}">${weaponIconSVG(WEAPONS[it.weapon].type)}</div>`;
            return `
                <div class="inv-item rarity-${it.rarity} ${isEquipped ? 'equipped' : ''}" data-uid="${it.uid}"
                     style="border-color:${r.color}">
                    ${img}
                    <div class="inv-name">${esc(it.name)}</div>
                    <span class="inv-rarity">${r.name}</span>
                    <span class="inv-value"><span class="price-coin">★</span> ${fmt(it.value)}</span>
                </div>`;
        }).join('');

        if (activeRarityFilter === 'all') {
            return `
                <div class="inventory-group">
                    <div class="inventory-group-header" style="color:${r.color}">${r.name}</div>
                    <div class="inventory-subgrid">${cards}</div>
                </div>`;
        }
        return cards;
    }).join('');

    // Клик по предмету -> модалка с действиями
    $$('.inv-item', grid).forEach((el) => {
        el.addEventListener('click', () => openSellModal(itemById(el.dataset.uid)));
    });
}

/* ============================================================
   5. РУЛЕТКА
   ============================================================ */

let spinning = false;

/** Подбор победителя с учётом весов редкостей */
function rollWinner(caseObj) {
    // 1. Выбираем редкость по весам
    const arr = Object.values(RARITIES);
    const totalChance = arr.reduce((s, r) => s + r.chance, 0);
    let roll = Math.random() * totalChance;
    let rarityKey = arr[0].key;
    for (const r of arr) {
        if (roll < r.chance) { rarityKey = r.key; break; }
        roll -= r.chance;
    }

    // 2. Ищем предметы этой редкости в кейсе
    const pool = caseObj.items.filter((it) => it.rarity === rarityKey);
    return pick(pool.length ? pool : caseObj.items);
}

/** Собираем ленту: рандомные предметы + победитель гарантированно на своём слотовом индексе */
function buildStrip(caseObj, winner, leadCount = 46, tailCount = 24) {
    const strip = [];
    for (let i = 0; i < leadCount; i++) strip.push(rollWinner(caseObj));
    strip.push(winner);                     // индекс leadCount -> победитель
    for (let i = 0; i < tailCount; i++) strip.push(rollWinner(caseObj));
    return { strip, winnerIndex: leadCount };
}

function renderStripContent(items) {
    const el = $('#rouletteStrip');
    el.innerHTML = items.map((it) => {
        const r = rarityOf(it.rarity);
        const img = it.image
            ? `<img class="ro-img" src="${it.image}" alt="${esc(it.name)}">`
            : `<div class="ro-img rarity-${it.rarity}">${weaponIconSVG(WEAPONS[it.weapon].type)}</div>`;
        return `
            <div class="roulette-item rarity-${it.rarity}" style="border-color:${r.color}">
                ${img}
                <span class="ro-name">${esc(it.name)}</span>
            </div>`;
    }).join('');
    return el;
}

/**
 * Запуск рулетки.
 * Механика: лента позиционируется абсолютным transform;
 * переход с ease-out длительностью ~4.5с даёт плавное замедление
 * до точной остановки на победителе (указатель по центру контейнера).
 */
async function startRoulette(caseObj) {
    if (spinning) return;
    spinning = true;

    // Списываем золото
    state.gold -= caseObj.price;
    state.stats.opened += 1;
    state.stats.spent += caseObj.price;
    saveState();
    renderBalance();

    // Определяем победителя до запуска анимации
    const winner = rollWinner(caseObj);
    closeCaseView();
    const { strip, winnerIndex } = buildStrip(caseObj, winner);

    const overlay = $('#rouletteOverlay');
    const container = $('.roulette-container');
    const stripEl = renderStripContent(strip);
    $('#rouletteCaseName').textContent = `Открытие: ${caseObj.name}`;

    overlay.classList.add('active');
    await delay(50); // даём DOM отрисоваться

    // Измеряем реальные размеры в пикселях
    const itemW = stripEl.firstElementChild.offsetWidth;
    const containerW = container.offsetWidth;
    const gap = parseFloat(getComputedStyle(stripEl).gap) || 8;
    const pitch = itemW + gap;

    // Финальная позиция: победитель ровно под указателем (центр)
    const finalX = winnerIndex * pitch + pitch / 2 - containerW / 2;

    // Начальное положение без перехода
    stripEl.style.transition = 'none';
    stripEl.style.transform = 'translateX(0px)';
    void stripEl.offsetWidth; // применяем стартовое положение

    // Форсируем перерисовку, затем запускаем плавное торможение
    stripEl.style.transition = `transform 4.5s cubic-bezier(0.12, 0.75, 0.15, 1)`;
    void stripEl.offsetWidth;
    stripEl.style.transform = `translateX(${-finalX}px)`;

    // Ждём окончания анимации (с запасом)
    await new Promise((res) => {
        const done = () => { cleanup(); res(); };
        const cleanup = () => {
            stripEl.removeEventListener('transitionend', done);
            clearTimeout(failSafe);
        };
        const failSafe = setTimeout(done, 5200);
        stripEl.addEventListener('transitionend', done);
    });

    overlay.classList.remove('active');
    await delay(250);
    spinning = false;
    showResult(winner);
}

/* ============================================================
   6. ЭКОНОМИКА
   ============================================================ */

/* ---- Результат: "Вы получили!" ---- */
function showResult(item) {
    const r = rarityOf(item.rarity);
    $('#resultItemImage').className = `result-item-image rarity-${item.rarity}`;
    $('#resultItemImage').style.borderColor = r.color;
    $('#resultItemImage').innerHTML = item.image
        ? `<img src="${item.image}" alt="${esc(item.name)}" style="width:100%;height:100%;border-radius:16px">`
        : weaponIconSVG(WEAPONS[item.weapon].type);
    $('#resultItemName').textContent = item.name;
    $('#resultItemRarity').textContent = r.name;
    $('#resultItemRarity').style.background = r.color;

    $('#sellPrice').textContent = fmt(item.value);

    $('#resultOverlay').classList.add('active');

    $('#collectBtn').onclick = () => {
        collectItem(item);
        $('#resultOverlay').classList.remove('active');
    };
    $('#sellBtn').onclick = () => {
        sellItem(item);
        $('#resultOverlay').classList.remove('active');
    };
}

/** Забрать предмет в инвентарь */
function collectItem(item, caseId) {
    state.inventory.push({
        uid: nextUid(),
        weapon: item.weapon,
        name: item.name,
        rarity: item.rarity,
        value: item.value,
        case: caseId || 'unknown',
        acquiredAt: Date.now(),
    });
    saveState();
    renderBalance();
    renderInventory();
}

/** Продать предмет за золото (цена = значение скина) */
function sellItem(item) {
    state.gold += item.value;
    const idx = state.inventory.findIndex((it) => it.uid === item.uid);
    if (idx !== -1) state.inventory.splice(idx, 1);
    // Если предмет был надет — снять
    if (state.equipped[item.weapon] === item.uid) delete state.equipped[item.weapon];
    saveState();
    renderBalance();
    renderInventory();
}

/* ---- Продажа из инвентаря ---- */
function openSellModal(item) {
    if (!item) return;
    const r = rarityOf(item.rarity);
    const isEquipped = state.equipped[item.weapon] === item.uid;

    $('#sellItemPreview').className = `sell-item-preview rarity-${item.rarity}`;
    $('#sellItemPreview').style.borderColor = r.color;
    $('#sellItemPreview').innerHTML = item.image
        ? `<img src="${item.image}" alt="${esc(item.name)}" style="width:100%;height:100%;border-radius:12px">`
        : weaponIconSVG(WEAPONS[item.weapon].type);
    $('#sellItemName').textContent = `${item.name}`;
    $('#sellConfirmPrice').textContent = fmt(item.value);
    $('#equipBtn').textContent = isEquipped ? 'Снять' : 'Надеть';
    $('#equipBtn').className = `result-btn equip-btn ${isEquipped ? 'equipped' : ''}`;

    $('#sellOverlay').classList.add('active');

    // Экипировка (визуальный переключатель)
    $('#equipBtn').onclick = () => toggleEquip(item);

    $('#confirmSellBtn').onclick = () => {
        sellItem(item);
        closeSellModal();
    };
    $('#cancelSellBtn').onclick = closeSellModal;
    $('#sellOverlay').onclick = (e) => { if (e.target === $('#sellOverlay')) closeSellModal(); };
}

function closeSellModal() {
    $('#sellOverlay').classList.remove('active');
}

/* ============================================================
   7. ЭКИПИРОВКА
   ============================================================ */

/** Переключить инвентарный предмет (надеть/снять). Одна штука на тип оружия. */
function toggleEquip(item) {
    if (state.equipped[item.weapon] === item.uid) {
        delete state.equipped[item.weapon];
    } else {
        state.equipped[item.weapon] = item.uid;
    }
    saveState();
    renderInventory();
    const isEquipped = state.equipped[item.weapon] === item.uid;
    $('#equipBtn').textContent = isEquipped ? 'Снять' : 'Надеть';
    $('#equipBtn').className = `result-btn equip-btn ${isEquipped ? 'equipped' : ''}`;
}

/* ============================================================
   8. НАВИГАЦИЯ, ФИЛЬТРЫ, ПОПОЛНЕНИЕ
   ============================================================ */

function switchTab(tab) {
    $$('.tab-panel').forEach((p) => p.classList.toggle('active', p.id === `${tab}Panel`));
    $$('.nav-btn').forEach((b) => b.classList.toggle('active', b.dataset.tab === tab));
    if (tab === 'inventory') renderInventory();
}

function openGoldModal(currency) {
    $('#goldAddOverlay').classList.add('active');
    // Меняем заголовок в зависимости от валюты
    $('.gold-add-modal h2').textContent = currency === 'silver' ? 'Пополнение серебра' : 'Пополнение баланса';
    $('#goldAddOverlay').dataset.currency = currency;
}

function closeGoldModal() {
    $('#goldAddOverlay').classList.remove('active');
}

function bindEvents() {
    // Переключение вкладок
    $$('.nav-btn').forEach((btn) => {
        btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });

    // Кейсы: клик "Открыть"
    $('#openCaseBtn').addEventListener('click', openCaseClick);

    // Фильтры инвентаря
    $$('.filter-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
            activeRarityFilter = btn.dataset.rarity;
            $$('.filter-btn').forEach((b) => b.classList.toggle('active', b === btn));
            renderInventory();
        });
    });

    // Пополнение валюты
    $('#addGoldBtn').addEventListener('click', () => openGoldModal('gold'));
    $('#addSilverBtn').addEventListener('click', () => openGoldModal('silver'));
    $('#closeGoldAdd').addEventListener('click', closeGoldModal);
    $('#goldAddOverlay').addEventListener('click', (e) => {
        if (e.target === $('#goldAddOverlay')) closeGoldModal();
    });

    // Пакеты валюты
    $$('.gold-option').forEach((opt) => {
        opt.addEventListener('click', () => {
            const amount = parseInt(opt.dataset.amount, 10);
            const currency = $('#goldAddOverlay').dataset.currency;
            if (currency === 'silver') {
                state.silver += amount;
            } else {
                state.gold += amount;
            }
            saveState();
            renderBalance();
            closeGoldModal();
        });
    });
}

/* ============================================================
   9. ЧАТ (Firebase Realtime Database) + УСТАНОВКА PWA
   ============================================================ */

/** Проверяем, чтоfirebase-конфиг реально заполнен */
const FIREBASE_READY = (
    typeof firebase !== 'undefined' &&
    window.FIREBASE_CONFIG &&
    !String(window.FIREBASE_CONFIG.apiKey).includes('ВСТАВЬТЕ')
);

const CHAT_USERNAME_KEY = 'so2_chat_username';
let chatDbRef = null;
let chatConnected = false;
let unreadCount = 0;
let chatOpened = false;

function chatUsername() {
    return (state.username || localStorage.getItem(CHAT_USERNAME_KEY) || 'Player').trim() || 'Player';
}

function setChatUsername(name) {
    const clean = String(name).trim().slice(0, 20) || 'Player';
    state.username = clean;
    localStorage.setItem(CHAT_USERNAME_KEY, clean);
    saveState();
}

function chatTime(ts) {
    const d = new Date(ts || Date.now());
    const h = String(d.getHours()).padStart(2, '0');
    const m = String(d.getMinutes()).padStart(2, '0');
    return `${h}:${m}`;
}

function scrollChatDown() {
    const box = $('#chatMessages');
    box.scrollTop = box.scrollHeight;
}

/** Добавление одного сообщения в DOM (по ключу RTDB, чтобы не дублировать) */
function addChatMessage(key, data) {
    const box = $('#chatMessages');
    if (box.querySelector(`[data-key="${key}"]`)) return;
    const mine = data.u === chatUsername();
    const msg = document.createElement('div');
    msg.className = `chat-msg ${mine ? 'own' : ''}`;
    msg.dataset.key = key;
    msg.innerHTML = `
        <div class="chat-author">
            <span>${esc(data.u || 'Player')}</span>
            <span class="chat-time">${chatTime(data.ts)}</span>
        </div>
        <div class="chat-text">${esc(data.t || '')}</div>`;
    box.appendChild(msg);

    // Счёт непрочитанных, если чат свёрнут
    if (!mine && !chatOpened) {
        unreadCount += 1;
        const badge = $('#chatBadge');
        badge.hidden = false;
        badge.textContent = unreadCount;
    }
    scrollChatDown();
}

function addSystemMessage(text) {
    const box = $('#chatMessages');
    const msg = document.createElement('div');
    msg.className = 'chat-msg system';
    msg.textContent = text;
    box.appendChild(msg);
    scrollChatDown();
}

/** Инициализация чата */
function initChat() {
    $('#chatStatus').textContent = '';
    if (!FIREBASE_READY) {
        addSystemMessage('Чат недоступен: добавьте ключи Firebase (см. firebase-config.js)');
        $('#chatStatus').textContent = 'Офлайн';
        return;
    }
    try {
        firebase.initializeApp(window.FIREBASE_CONFIG);
        chatDbRef = firebase.database().ref('chat');
        // limitToLast по порядку push-ключей (они монотонны по времени) — без индексов в правилах
        chatDbRef.limitToLast(80).on('child_added', (snap) => {
            addChatMessage(snap.key, snap.val() || {});
        });
        chatConnected = true;
        $('#chatStatus').textContent = 'Онлайн';
        addSystemMessage('Вы в чате. Отправь первое сообщение!');
    } catch (err) {
        $('#chatStatus').textContent = 'Ошибка чата';
        addSystemMessage(`Ошибка чата: ${err.message}`);
    }
}

function bindChat() {
    $('#chatFab').addEventListener('click', () => {
        chatOpened = true;
        $('#chatBadge').hidden = true;
        unreadCount = 0;
        // Первый вход — спрашиваем ник
        if (!chatUsername() || chatUsername() === 'Player' && !localStorage.getItem(CHAT_USERNAME_KEY)) {
            let name = prompt('Как тебя зовут в чате?', 'Player');
            if (name != null) setChatUsername(name);
        }
        $('#chatOverlay').classList.add('active');
        refreshAvatar();
        scrollChatDown();
    });
    $('#closeChat').addEventListener('click', () => {
        chatOpened = false;
        $('#chatOverlay').classList.remove('active');
    });
    $('#chatOverlay').addEventListener('click', (e) => {
        if (e.target === $('#chatOverlay')) {
            chatOpened = false;
            $('#chatOverlay').classList.remove('active');
        }
    });
    $('#chatSend').addEventListener('click', sendChatMessage);
    $('#chatInput').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') sendChatMessage();
    });
}

function sendChatMessage() {
    if (!chatConnected) return;
    const input = $('#chatInput');
    const text = input.value.trim();
    if (!text) return;
    chatDbRef.push({ u: chatUsername(), t: text.slice(0, 200), ts: Date.now() });
    input.value = '';
}

/** Рендер ника в шапке */
function refreshAvatar() {
    const nameEl = $('.player-name');
    if (nameEl) nameEl.textContent = chatUsername();
}

/** Установка приложения (PWA) */
function bindInstall() {
    let deferredInstallPrompt = null;

    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredInstallPrompt = e;
        $('#installBanner').classList.add('show');
    });

    window.addEventListener('appinstalled', () => {
        deferredInstallPrompt = null;
        $('#installBanner').classList.remove('show');
    });

    $('#installBtn').addEventListener('click', async () => {
        if (!deferredInstallPrompt) {
            // iOS: подсказка "на экран Домой"
            const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
            if (isIOS) {
                alert('Нажми «Поделиться» в Safari, затем «На экран „Домой"», чтобы установить игру.');
            }
            return;
        }
        deferredInstallPrompt.prompt();
        await deferredInstallPrompt.userChoice;
        deferredInstallPrompt = null;
        $('#installBanner').classList.remove('show');
    });

    $('#installClose').addEventListener('click', () => {
        $('#installBanner').classList.remove('show');
    });
}

/* ============================================================
   ИНИЦИАЛИЗАЦИЯ
   ============================================================ */

function init() {
    renderBalance();
    renderCases();
    renderInventory();
    bindEvents();
    refreshAvatar();
    bindChat();
    bindInstall();
    initChat();
    // Смена ника кликом по аватару
    $('#avatarBtn') && $('#avatarBtn').addEventListener('click', () => {
        const name = prompt('Введи новый ник:', chatUsername());
        if (name != null && name.trim()) {
            setChatUsername(name);
            refreshAvatar();
        }
    });
}

document.addEventListener('DOMContentLoaded', init);