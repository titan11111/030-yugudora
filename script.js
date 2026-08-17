/* ユグドラ幻想戦記 */

class Armory {
  #gold = 0;
  #owned = [{ ...FISTS_INSTANCE }];
  #equippedId = 'fists';
  #album = new Set(['fists']);

  get gold() { return this.#gold; }
  get equippedId() { return this.#equippedId; }
  get album() { return this.#album; }

  snapshot() {
    return {
      gold: this.#gold,
      equippedId: this.#equippedId,
      owned: this.#owned.map((w) => ({
        instanceId: w.instanceId,
        catalogId: w.catalogId,
        uses: w.uses === Infinity ? -1 : w.uses
      })),
      album: [...this.#album]
    };
  }

  restore(data) {
    if (!data || !Object.hasOwn(data, 'gold')) return false;
    this.#gold = Math.max(0, Number(data.gold) || 0);
    const owned = Array.isArray(data.owned) ? data.owned : [];
    this.#owned = owned.map((w) => ({
      instanceId: w.instanceId,
      catalogId: w.catalogId,
      uses: w.uses === -1 || w.catalogId === 'fists' ? Infinity : Number(w.uses) || 0
    }));
    if (!this.#owned.some((w) => w.instanceId === 'fists')) {
      this.#owned.unshift({ ...FISTS_INSTANCE });
    }
    this.#equippedId = data.equippedId || 'fists';
    this.#album = new Set(Array.isArray(data.album) ? data.album : ['fists']);
    if (!this.find(this.#equippedId)) this.#equippedId = 'fists';
    return true;
  }

  reset() {
    this.#gold = 0;
    this.#owned = [{ ...FISTS_INSTANCE }];
    this.#equippedId = 'fists';
    this.#album = new Set(['fists']);
  }

  addGold(amount) {
    this.#gold += Math.max(0, Math.floor(amount));
  }

  spend(amount) {
    if (this.#gold < amount) return false;
    this.#gold -= amount;
    return true;
  }

  list() {
    return this.#owned.toSorted((a, b) => {
      if (a.catalogId === 'fists') return -1;
      if (b.catalogId === 'fists') return 1;
      return (b.uses === Infinity ? 99 : b.uses) - (a.uses === Infinity ? 99 : a.uses);
    });
  }

  find(instanceId) {
    return this.#owned.find((w) => w.instanceId === instanceId);
  }

  equipped() {
    return this.find(this.#equippedId) || this.find('fists');
  }

  catalogOf(instance) {
    return catalogById(instance?.catalogId || 'fists');
  }

  buy(catalogId) {
    const item = catalogById(catalogId);
    if (!item.buyable) return { ok: false, reason: '売れない' };
    if (!this.spend(item.price)) return { ok: false, reason: 'ゴールド不足' };
    const instance = {
      instanceId: crypto.randomUUID(),
      catalogId: item.id,
      uses: item.uses
    };
    this.#owned.push(instance);
    this.#album.add(item.id);
    this.#equippedId = instance.instanceId;
    return { ok: true, instance };
  }

  equip(instanceId) {
    const found = this.find(instanceId);
    if (!found) return false;
    this.#equippedId = found.instanceId;
    return true;
  }

  consumeUse() {
    const weapon = this.equipped();
    if (!weapon || weapon.uses === Infinity) return { broke: false, weapon };
    weapon.uses -= 1;
    if (weapon.uses > 0) return { broke: false, weapon };
    this.#owned = this.#owned.filter((w) => w.instanceId !== weapon.instanceId);
    const leftover = this.#owned.findLast
      ? this.#owned.findLast((w) => w.catalogId === weapon.catalogId)
      : [...this.#owned].reverse().find((w) => w.catalogId === weapon.catalogId);
    this.#equippedId = leftover ? leftover.instanceId : 'fists';
    return { broke: true, weapon, next: this.equipped() };
  }
}

const armory = new Armory();

const game = {
  currentScreen: 'title',
  currentStage: 1,
  playerTurn: true,
  summonGauge: 0,
  actionMode: 'none',
  musicEnabled: true,
  mechTurn: false,
  summonReadyPending: false,
  turnAbort: null,
  shopReturn: 'next-stage',
  albumFrom: 'title',
  hasMoved: false,
  units: {
    player: { x: 1, y: 5, hp: 72, maxHp: 72, level: 1, exp: 0, attack: 8 },
    enemies: [],
    mechs: []
  }
};

function waitMs(ms, signal) {
  const { promise, resolve, reject } = Promise.withResolvers();
  const timer = setTimeout(resolve, ms);
  const onAbort = () => {
    clearTimeout(timer);
    reject(new DOMException('Aborted', 'AbortError'));
  };
  if (signal) {
    if (signal.aborted) {
      onAbort();
    } else {
      signal.addEventListener('abort', onAbort, { once: true });
    }
  }
  return promise.finally(() => {
    if (signal) signal.removeEventListener('abort', onAbort);
  });
}

function newTurnAbort() {
  if (game.turnAbort) game.turnAbort.abort();
  game.turnAbort = new AbortController();
  return game.turnAbort.signal;
}

function bindTap(el, handler) {
  if (!el) return;
  const fire = (e) => {
    e.preventDefault();
    el.classList.add('is-pressed');
    if (navigator.vibrate) navigator.vibrate(15);
    synth.play('tap');
    handler(e);
  };
  const release = () => el.classList.remove('is-pressed');
  el.addEventListener('pointerdown', fire);
  el.addEventListener('pointerup', release);
  el.addEventListener('pointercancel', release);
  el.addEventListener('pointerleave', release);
}

function $(id) { return document.getElementById(id); }

function hideAllScreens() {
  document.querySelectorAll('.screen').forEach((s) => s.classList.add('hidden'));
}

function showScreen(id, name) {
  hideAllScreens();
  $(id).classList.remove('hidden');
  game.currentScreen = name;
  if (name !== 'result') syncBgm();
}

function setGuide(text) {
  const el = $('guide-message');
  if (!el) return;
  el.textContent = text;
}

function playerBaseAtk() {
  return 8 + (game.units.player.level - 1) * 2;
}

function currentWeaponStats() {
  const inst = armory.equipped();
  const cat = armory.catalogOf(inst);
  return {
    inst,
    cat,
    attack: cat.attack + (game.units.player.level - 1) * 2,
    range: cat.range,
    crit: cat.crit,
    style: cat.style,
    lifesteal: cat.lifesteal || 0,
    vsTribe: cat.vsTribe || null
  };
}

function updateHud() {
  const p = game.units.player;
  const w = currentWeaponStats();
  $('player-hp').textContent = String(Math.max(0, Math.floor(p.hp)));
  $('player-max-hp').textContent = String(p.maxHp);
  $('player-level').textContent = String(p.level);
  $('player-gold').textContent = formatGold(armory.gold);
  const uses = w.inst.uses === Infinity ? '∞' : String(w.inst.uses);
  $('equip-name').textContent = `${w.cat.name} 残り${uses}`;
  $('equip-meta').textContent = `${STYLE_LABEL[w.style]} 攻${w.attack} 射程${w.range}`;
  if (game.currentScreen === 'battle') syncBgm();
}

function updateTurnDisplay() {
  $('current-turn').textContent = game.mechTurn ? 'Ally Turn' : (game.playerTurn ? 'Player Turn' : 'Enemy Turn');
  document.querySelectorAll('.crystal').forEach((c, i) => {
    c.classList.toggle('on', i < game.summonGauge);
  });
  const btn = $('summon-btn');
  if (game.summonGauge >= 3) {
    btn.disabled = false;
    btn.textContent = '機兵召喚';
    btn.classList.add('ready');
  } else {
    btn.disabled = true;
    btn.textContent = `魔力 ${game.summonGauge}/3`;
    btn.classList.remove('ready');
  }
  updateHud();
}

function occupies(e, x, y) {
  const s = e.size || 1;
  return x >= e.x && x < e.x + s && y >= e.y && y < e.y + s && e.hp > 0;
}

function getEnemyAt(x, y) {
  return game.units.enemies.find((e) => occupies(e, x, y));
}

function isOccupied(x, y) {
  const p = game.units.player;
  if (p.x === x && p.y === y) return true;
  if (game.units.mechs.some((m) => m.x === x && m.y === y && m.hp > 0)) return true;
  return game.units.enemies.some((e) => occupies(e, x, y));
}

function cloneSvg(type) {
  const key = SVG_ALIAS[type] || 'goblin';
  const src = $(`${key}-svg`);
  if (!src) return document.createTextNode('');
  return src.cloneNode(true);
}

function addHpBar(cell, obj) {
  if (!obj || obj.hp >= obj.maxHp) return;
  const bg = document.createElement('div');
  bg.className = 'hp-bar-bg';
  const fill = document.createElement('div');
  fill.className = 'hp-bar-fill';
  fill.style.width = `${Math.max(0, (obj.hp / obj.maxHp) * 100)}%`;
  bg.appendChild(fill);
  cell.appendChild(bg);
}

function getCellContent(x, y) {
  const p = game.units.player;
  if (p.x === x && p.y === y) return { type: 'player', obj: p };
  for (const m of game.units.mechs) {
    if (m.x === x && m.y === y && m.hp > 0) return { type: 'mech', obj: m };
  }
  for (const e of game.units.enemies) {
    if (!occupies(e, x, y)) continue;
    const origin = e.x === x && e.y === y;
    return {
      type: origin ? e.type : null,
      kind: 'enemy',
      obj: e,
      origin,
      size: e.size || 1
    };
  }
  return { type: null };
}

function createBattleMap() {
  const mapEl = $('battle-map');
  mapEl.replaceChildren();
  mapEl.classList.toggle('map-castle', game.currentStage === 9);
  mapEl.classList.toggle('map-roots', game.currentStage === 10);
  for (let y = 0; y < MAP_SIZE; y++) {
    for (let x = 0; x < MAP_SIZE; x++) {
      const cell = document.createElement('div');
      cell.className = 'map-cell';
      cell.dataset.x = String(x);
      cell.dataset.y = String(y);
      cell.addEventListener('pointerdown', (ev) => {
        ev.preventDefault();
        handleCellClick(x, y);
      });
      const content = getCellContent(x, y);
      if (content.kind === 'enemy' && content.size > 1 && !content.origin) {
        cell.classList.add('enemy', 'boss-footprint');
      } else if (content.type) {
        cell.appendChild(cloneSvg(content.type));
        cell.classList.add(content.type);
        if (content.kind === 'enemy') cell.classList.add('enemy');
        if (content.size > 1 && content.origin) cell.classList.add('boss-origin');
        addHpBar(cell, content.obj);
      }
      mapEl.appendChild(cell);
    }
  }
  if (game.playerTurn && !game.mechTurn) {
    if (!game.hasMoved && game.actionMode === 'move') highlightMovableCells();
    highlightAttackableCells();
  }
}

function cellAt(x, y) {
  return document.querySelector(`.map-cell[data-x="${x}"][data-y="${y}"]`);
}

function highlightMovableCells() {
  const p = game.units.player;
  for (const key of reachableTiles(p.x, p.y, PLAYER_MOVE).keys()) {
    const [x, y] = key.split(',').map(Number);
    cellAt(x, y)?.classList.add('movable');
  }
}

function enemyMinDist(px, py, e) {
  const s = e.size || 1;
  let best = 99;
  for (let y = e.y; y < e.y + s; y++) {
    for (let x = e.x; x < e.x + s; x++) {
      const d = Math.abs(x - px) + Math.abs(y - py);
      if (d < best) best = d;
    }
  }
  return best;
}

function highlightAttackableCells() {
  const p = game.units.player;
  const range = currentWeaponStats().range;
  for (let y = 0; y < MAP_SIZE; y++) {
    for (let x = 0; x < MAP_SIZE; x++) {
      if (Math.abs(x - p.x) + Math.abs(y - p.y) <= range && getEnemyAt(x, y)) {
        cellAt(x, y)?.classList.add('attackable');
      }
    }
  }
}

function hasAttackableEnemy() {
  const p = game.units.player;
  const range = currentWeaponStats().range;
  return game.units.enemies.some((e) => e.hp > 0 && enemyMinDist(p.x, p.y, e) <= range);
}

function inBounds(x, y) {
  return x >= 0 && x < MAP_SIZE && y >= 0 && y < MAP_SIZE;
}

function adjacentCoords(x, y) {
  return [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]];
}

function reachableTiles(fromX, fromY, moveRange) {
  const seen = new Map();
  const q = [{ x: fromX, y: fromY, d: 0 }];
  seen.set(`${fromX},${fromY}`, 0);
  while (q.length) {
    const cur = q.shift();
    if (cur.d >= moveRange) continue;
    for (const [nx, ny] of adjacentCoords(cur.x, cur.y)) {
      if (!inBounds(nx, ny) || isOccupied(nx, ny)) continue;
      const key = `${nx},${ny}`;
      if (seen.has(key)) continue;
      seen.set(key, cur.d + 1);
      q.push({ x: nx, y: ny, d: cur.d + 1 });
    }
  }
  seen.delete(`${fromX},${fromY}`);
  return seen;
}

function findApproachTile(enemy, moveRange, attackRange) {
  const p = game.units.player;
  if (enemyMinDist(p.x, p.y, enemy) <= attackRange) {
    return { x: p.x, y: p.y, d: 0 };
  }
  const reach = reachableTiles(p.x, p.y, moveRange);
  const tiles = [...reach.entries()].map(([key, d]) => {
    const [x, y] = key.split(',').map(Number);
    return { x, y, d, score: enemyMinDist(x, y, enemy) };
  });
  if (!tiles.length) return { x: p.x, y: p.y, d: 0 };
  const inRange = tiles.filter((t) => t.score <= attackRange);
  const pool = inRange.length ? inRange : tiles;
  pool.sort((a, b) => (a.score - b.score) || (a.d - b.d));
  return pool[0];
}

function beginPlayerTurn() {
  game.playerTurn = true;
  game.hasMoved = false;
  game.actionMode = 'none';
  updateTurnDisplay();
  createBattleMap();
  if (game.summonReadyPending || game.summonGauge >= 3) {
    game.summonReadyPending = false;
    setGuide('召喚準備完了。機兵召喚を押して残敵へ投入');
    synth.play('levelup');
    if (navigator.vibrate) navigator.vibrate([40, 30, 80]);
  } else {
    setGuide('手前の敵をタップすると近づいて攻撃。3体まとめては殴れません');
  }
}

function approachThenMaybeAttack(enemy, tapX, tapY) {
  const p = game.units.player;
  const range = currentWeaponStats().range;
  if (enemyMinDist(p.x, p.y, enemy) <= range) {
    resolvePlayerAttack(enemy, tapX, tapY);
    return;
  }
  if (game.hasMoved) {
    setGuide('このターンは移動済みです。届く敵を叩くか、待機');
    return;
  }
  const dest = findApproachTile(enemy, PLAYER_MOVE, range);
  const moved = dest.x !== p.x || dest.y !== p.y;
  if (moved) {
    p.x = dest.x;
    p.y = dest.y;
    game.hasMoved = true;
    synth.play('move');
  }
  if (enemyMinDist(p.x, p.y, enemy) <= range) {
    resolvePlayerAttack(enemy, tapX, tapY);
    return;
  }
  game.actionMode = moved ? 'attack' : 'move';
  createBattleMap();
  setGuide(moved
    ? 'まだ届きません。手前の敵を叩くか、待機'
    : '3体に塞がれています。青いマスで回り込み');
}

function startAttackPick() {
  if (!game.playerTurn || game.mechTurn) return;
  game.actionMode = 'move';
  createBattleMap();
  if (hasAttackableEnemy()) setGuide('赤い敵をタップして攻撃');
  else setGuide('今は届きません。青いマスで近づいてください');
}

function showDamagePopup(gridX, gridY, amount, extraClass) {
  const mapEl = $('battle-map');
  const cell = cellAt(gridX, gridY);
  if (!cell) return;
  const popup = document.createElement('div');
  popup.className = extraClass ? `damage-popup ${extraClass}` : 'damage-popup';
  popup.textContent = String(amount);
  const rect = cell.getBoundingClientRect();
  const mapRect = mapEl.getBoundingClientRect();
  popup.style.left = `${rect.left - mapRect.left + rect.width / 2 - 20}px`;
  popup.style.top = `${rect.top - mapRect.top}px`;
  mapEl.appendChild(popup);
  setTimeout(() => popup.remove(), 800);
}

function triggerScreenShake() {
  const screen = $('battle-screen');
  screen.classList.remove('shake');
  void screen.offsetWidth;
  screen.classList.add('shake');
}

function calcDamage(enemy) {
  const w = currentWeaponStats();
  const roll = Math.floor(Math.random() * 5);
  const crit = Math.random() < w.crit;
  const aff = affinityMultiplier(w.style, enemy.tribe, w.vsTribe);
  let dmg = Math.floor((w.attack + roll) * aff);
  if (crit) dmg = Math.floor(dmg * 1.45);
  return { dmg: Math.max(1, dmg), crit, aff };
}

function gainExperience(amount) {
  const p = game.units.player;
  p.exp += amount;
  if (p.exp >= p.level * 100) {
    p.level += 1;
    p.maxHp += 12;
    p.hp = p.maxHp;
    synth.play('levelup');
    setGuide('レベルアップ');
  }
}

function persist() {
  const payload = {
    ...armory.snapshot(),
    stage: game.currentStage,
    level: game.units.player.level,
    exp: game.units.player.exp,
    maxHp: game.units.player.maxHp,
    musicEnabled: game.musicEnabled
  };
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(payload));
  } catch {
    /* quota */
  }
}

function loadSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!Object.hasOwn(data, 'gold') || !Object.hasOwn(data, 'stage')) return null;
    return data;
  } catch {
    return null;
  }
}

function applySave(data) {
  armory.restore(data);
  game.currentStage = Math.min(10, Math.max(1, Number(data.stage) || 1));
  game.units.player.level = Math.max(1, Number(data.level) || 1);
  game.units.player.exp = Math.max(0, Number(data.exp) || 0);
  game.units.player.maxHp = Math.max(72, Number(data.maxHp) || 72);
  game.units.player.hp = game.units.player.maxHp;
  if (Object.hasOwn(data, 'musicEnabled')) {
    game.musicEnabled = Boolean(data.musicEnabled);
    synth.setMuted(!game.musicEnabled);
  }
}

function resetRun() {
  armory.reset();
  game.currentStage = 1;
  game.units.player = { x: 1, y: 5, hp: 72, maxHp: 72, level: 1, exp: 0, attack: 8 };
  persist();
}

function loadStageData() {
  const data = STAGE_DATA[game.currentStage];
  $('current-stage').textContent = data.name;
  game.units.player.x = 1;
  game.units.player.y = 5;
  game.units.player.hp = game.units.player.maxHp;
  game.units.enemies = structuredClone(data.enemies);
  game.units.mechs = [];
  game.playerTurn = true;
  game.mechTurn = false;
  game.summonGauge = 0;
  game.summonReadyPending = false;
  game.actionMode = 'none';
  game.hasMoved = false;
  setGuide('手前の敵をタップすると近づいて攻撃');
}

function showStoryScreen() {
  newTurnAbort();
  showScreen('story-screen', 'story');
  $('story-content').textContent = STAGE_DATA[game.currentStage].story;
}

function showBattleScreen() {
  newTurnAbort();
  showScreen('battle-screen', 'battle');
  loadStageData();
  createBattleMap();
  updateTurnDisplay();
}

function showTitle() {
  newTurnAbort();
  showScreen('title-screen', 'title');
  const save = loadSave();
  $('continue-btn').classList.toggle('hidden', !save);
  updateMuteButton();
}

function showResultScreen(isWin) {
  newTurnAbort();
  showScreen('result-screen', 'result');
  const title = $('result-title');
  const text = $('result-text');
  $('victory-icon').classList.toggle('hidden', !isWin);
  $('defeat-icon').classList.toggle('hidden', isWin);
  if (isWin) {
    title.textContent = '勝利';
    title.style.color = '#4fc3f7';
    text.textContent = game.currentStage < 10
      ? `所持金 ${formatGold(armory.gold)}。武器屋で次の装備を整えられる。`
      : `全クリ。所持金 ${formatGold(armory.gold)}。武器図鑑 ${armory.album.size}/${WEAPON_CATALOG.length}`;
    game.shopReturn = game.currentStage >= 10 ? 'title' : 'next-stage';
    $('next-stage-btn').classList.toggle('hidden', game.currentStage >= 10);
    $('shop-btn').classList.remove('hidden');
    synth.play('win');
    gainExperience(80);
    persist();
    synth.resultLose = false;
    syncBgm();
  } else {
    title.textContent = '敗北';
    title.style.color = '#f44336';
    text.textContent = 'ゴールドと武器は残っている。装備を見直して再挑戦できる。';
    game.shopReturn = 'retry';
    $('next-stage-btn').classList.add('hidden');
    $('shop-btn').classList.remove('hidden');
    synth.play('hit');
    persist();
    synth.resultLose = true;
    syncBgm();
  }
}

function renderShop() {
  $('shop-gold').textContent = formatGold(armory.gold);
  const list = $('shop-list');
  list.replaceChildren();
  const groups = shopGroups(game.currentStage);
  for (const style of ['slash', 'pierce', 'blunt', 'magic']) {
    const items = groups[style];
    if (!items || !items.length) continue;
    const head = document.createElement('h3');
    head.className = 'shop-group';
    head.textContent = STYLE_LABEL[style];
    list.appendChild(head);
    for (const item of items) {
      const row = document.createElement('button');
      row.type = 'button';
      row.className = 'shop-item game-btn';
      const title = document.createElement('div');
      title.className = 'shop-item-name';
      title.textContent = `${item.name}  ${formatGold(item.price)}`;
      const meta = document.createElement('div');
      meta.className = 'shop-item-meta';
      meta.textContent = `攻${item.attack} 射程${item.range} 回数${item.uses} 会心${Math.round(item.crit * 100)}%  ${item.note}`;
      row.appendChild(title);
      row.appendChild(meta);
      if (armory.gold < item.price) row.disabled = true;
      bindTap(row, () => {
        const result = armory.buy(item.id);
        if (!result.ok) {
          setShopHint(result.reason);
          return;
        }
        synth.play('buy');
        persist();
        setShopHint(`${item.name}を買って装備した`);
        renderShop();
        renderOwned();
      });
      list.appendChild(row);
    }
  }
  renderOwned();
}

function renderOwned() {
  const box = $('owned-list');
  box.replaceChildren();
  for (const inst of armory.list()) {
    const cat = catalogById(inst.catalogId);
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'owned-item game-btn';
    if (inst.instanceId === armory.equippedId) btn.classList.add('equipped');
    const uses = inst.uses === Infinity ? '∞' : String(inst.uses);
    btn.textContent = `${cat.name} 残り${uses}`;
    bindTap(btn, () => {
      armory.equip(inst.instanceId);
      persist();
      renderOwned();
      updateHud();
    });
    box.appendChild(btn);
  }
}

function setShopHint(text) {
  $('shop-hint').textContent = text;
}

function showShop() {
  newTurnAbort();
  showScreen('shop-screen', 'shop');
  setShopHint('回数の多い武器と、今の敵に効く武器を見比べてください');
  const next = $('shop-next-btn');
  if (game.shopReturn === 'retry') next.textContent = '再戦する';
  else if (game.shopReturn === 'title') next.textContent = 'タイトルへ';
  else next.textContent = '次のステージへ';
  renderShop();
}

function renderAlbum() {
  const box = $('album-list');
  box.replaceChildren();
  for (const item of WEAPON_CATALOG) {
    const known = armory.album.has(item.id);
    const card = document.createElement('div');
    card.className = known ? 'album-card on' : 'album-card';
    const name = document.createElement('div');
    name.textContent = known ? item.name : '？？？';
    const note = document.createElement('div');
    note.className = 'album-note';
    note.textContent = known ? item.note : '未入手';
    card.appendChild(name);
    card.appendChild(note);
    box.appendChild(card);
  }
  $('album-count').textContent = `${armory.album.size} / ${WEAPON_CATALOG.length}`;
}

function showAlbum() {
  game.albumFrom = game.currentScreen === 'shop' ? 'shop' : 'title';
  showScreen('album-screen', 'album');
  renderAlbum();
}

function showEquipSheet() {
  const sheet = $('equip-sheet');
  const list = $('equip-sheet-list');
  list.replaceChildren();
  for (const inst of armory.list()) {
    const cat = catalogById(inst.catalogId);
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'owned-item game-btn';
    if (inst.instanceId === armory.equippedId) btn.classList.add('equipped');
    const uses = inst.uses === Infinity ? '∞' : String(inst.uses);
    btn.textContent = `${cat.name} 残り${uses} 射程${cat.range}`;
    bindTap(btn, () => {
      armory.equip(inst.instanceId);
      persist();
      sheet.classList.add('hidden');
      updateHud();
      if (game.actionMode === 'attack') createBattleMap();
      setGuide(`${cat.name}を構えた`);
    });
    list.appendChild(btn);
  }
  sheet.classList.remove('hidden');
}

function handleCellClick(x, y) {
  if (!game.playerTurn || game.mechTurn) return;
  const p = game.units.player;
  const enemy = getEnemyAt(x, y);

  if (enemy) {
    approachThenMaybeAttack(enemy, x, y);
    return;
  }

  if (game.actionMode === 'none') {
    if (p.x === x && p.y === y) {
      game.actionMode = 'move';
      synth.play('move');
      createBattleMap();
      setGuide(game.hasMoved
        ? '移動済みです。赤い敵をタップするか、待機'
        : '青いマスで移動。敵をタップすると近づいて攻撃');
    }
    return;
  }

  if (x === p.x && y === p.y) {
    game.actionMode = 'none';
    createBattleMap();
    setGuide('キャンセル');
    return;
  }

  if (game.actionMode === 'move' && !game.hasMoved) {
    const reach = reachableTiles(p.x, p.y, PLAYER_MOVE);
    if (reach.has(`${x},${y}`)) {
      p.x = x;
      p.y = y;
      game.hasMoved = true;
      synth.play('move');
      game.actionMode = 'attack';
      createBattleMap();
      setGuide(hasAttackableEnemy()
        ? '赤い敵をタップして攻撃。終わるときは待機'
        : '届く敵がいません。待機でターン終了');
    }
  }
}

function resolvePlayerAttack(enemy, x, y) {
  const { dmg, crit, aff } = calcDamage(enemy);
  enemy.hp -= dmg;
  synth.play('attack');
  showDamagePopup(x, y, crit ? `${dmg}!!` : dmg, crit ? 'critical' : (aff > 1 ? 'adv' : ''));
  triggerScreenShake();

  const steal = currentWeaponStats().lifesteal;
  if (steal > 0) {
    const heal = Math.max(1, Math.floor(dmg * steal));
    const p = game.units.player;
    p.hp = Math.min(p.maxHp, p.hp + heal);
  }

  const used = armory.consumeUse();
  if (used.broke) {
    synth.play('break');
    const name = catalogById(used.weapon.catalogId).name;
    const next = armory.catalogOf(used.next).name;
    setGuide(`${name}が折れた。${next}に持ち替えた`);
  }

  if (enemy.hp <= 0) {
    const wasReady = game.summonGauge >= 3;
    game.summonGauge = Math.min(game.summonGauge + 1, 3);
    if (!wasReady && game.summonGauge >= 3) game.summonReadyPending = true;
    armory.addGold(enemy.gold);
    gainExperience(20);
    synth.play('gold');
    showDamagePopup(x, y, `+${enemy.gold}G`, 'gold');
  }

  persist();
  updateHud();
  endPlayerTurn();
}

async function endPlayerTurn() {
  game.playerTurn = false;
  game.actionMode = 'none';
  setGuide('敵のターン');
  createBattleMap();
  updateTurnDisplay();
  const signal = newTurnAbort();
  try {
    await waitMs(700, signal);
    await processEnemyTurn(signal);
  } catch (err) {
    if (err && err.name === 'AbortError') return;
  }
}

function processEnemyAction(e) {
  const p = game.units.player;
  const dist = Math.abs(e.x - p.x) + Math.abs(e.y - p.y);
  if (dist <= 1) {
    const dmg = e.atk + Math.floor(Math.random() * 3);
    p.hp -= dmg;
    synth.play('hit');
    showDamagePopup(p.x, p.y, dmg);
  } else if (e.x < p.x && !isOccupied(e.x + 1, e.y)) e.x += 1;
  else if (e.x > p.x && !isOccupied(e.x - 1, e.y)) e.x -= 1;
  else if (e.y < p.y && !isOccupied(e.x, e.y + 1)) e.y += 1;
  else if (e.y > p.y && !isOccupied(e.x, e.y - 1)) e.y -= 1;
}

async function processEnemyTurn(signal) {
  const active = game.units.enemies.filter((e) => e.hp > 0);
  active.forEach((e) => processEnemyAction(e));
  createBattleMap();
  updatePlayerStatusSafe();

  if (game.units.enemies.every((e) => e.hp <= 0)) {
    await waitMs(700, signal);
    showResultScreen(true);
    return;
  }
  if (game.units.player.hp <= 0) {
    await waitMs(700, signal);
    showResultScreen(false);
    return;
  }

  const mechs = game.units.mechs.filter((m) => m.hp > 0);
  if (mechs.length) {
    await startMechTurn(signal);
    return;
  }
  await waitMs(500, signal);
  beginPlayerTurn();
}

function updatePlayerStatusSafe() {
  updateHud();
}

async function startMechTurn(signal) {
  game.mechTurn = true;
  updateTurnDisplay();
  setGuide('機兵の攻撃');
  await waitMs(600, signal);
  for (const m of game.units.mechs) {
    if (m.hp <= 0) continue;
    const enemies = game.units.enemies.filter((e) => e.hp > 0);
    if (!enemies.length) break;
    const target = enemies[Math.floor(Math.random() * enemies.length)];
    target.hp -= m.attack;
    synth.play('attack');
    showDamagePopup(target.x, target.y, m.attack);
    if (target.hp <= 0) {
      armory.addGold(target.gold);
      showDamagePopup(target.x, target.y, `+${target.gold}G`, 'gold');
    }
  }
  createBattleMap();
  if (game.units.enemies.every((e) => e.hp <= 0)) {
    await waitMs(700, signal);
    showResultScreen(true);
    return;
  }
  game.mechTurn = false;
  await waitMs(500, signal);
  beginPlayerTurn();
}

function startSummon() {
  if (game.summonGauge < 3 || !game.playerTurn) return;
  const empties = [];
  for (let y = 0; y < MAP_SIZE; y++) {
    for (let x = 0; x < MAP_SIZE; x++) {
      if (!isOccupied(x, y)) empties.push({ x, y });
    }
  }
  if (!empties.length) return;
  const p = empties[Math.floor(Math.random() * empties.length)];
  game.units.mechs.push({ x: p.x, y: p.y, hp: 80, maxHp: 80, attack: 14, name: '機兵' });
  game.summonGauge = 0;
  game.summonReadyPending = false;
  synth.play('levelup');
  createBattleMap();
  updateTurnDisplay();
  setGuide('機兵を召喚した');
}

function updateMuteButton() {
  const btn = $('music-toggle');
  if (btn) btn.textContent = game.musicEnabled ? '♪' : '×';
}

function toggleMusic() {
  game.musicEnabled = !game.musicEnabled;
  synth.setMuted(!game.musicEnabled);
  updateMuteButton();
  persist();
  if (game.musicEnabled) syncBgm();
}

function installIosGuards() {
  let lastTouchEnd = 0;
  document.addEventListener('touchend', (e) => {
    const now = Date.now();
    if (now - lastTouchEnd <= 300) e.preventDefault();
    lastTouchEnd = now;
  }, { passive: false });
  document.addEventListener('dblclick', (e) => e.preventDefault());
  document.addEventListener('contextmenu', (e) => e.preventDefault());
  document.addEventListener('selectstart', (e) => e.preventDefault());
  document.addEventListener('dragstart', (e) => e.preventDefault());
  document.addEventListener('touchmove', (e) => {
    if (e.target.closest('[data-scrollable]')) return;
    e.preventDefault();
  }, { passive: false });
}

function unlockAll() {
  synth.init();
  synth.unlock();
  synth.setMuted(!game.musicEnabled);
  syncBgm();
}

document.addEventListener('DOMContentLoaded', () => {
  installIosGuards();
  const saved = loadSave();
  if (saved) applySave(saved);
  synth.setMuted(!game.musicEnabled);
  updateMuteButton();
  $('continue-btn').classList.toggle('hidden', !saved);

  bindTap($('start-btn'), () => {
    unlockAll();
    resetRun();
    showStoryScreen();
  });
  bindTap($('continue-btn'), () => {
    unlockAll();
    const data = loadSave();
    if (data) applySave(data);
    showStoryScreen();
  });
  bindTap($('story-next-btn'), () => {
    unlockAll();
    showBattleScreen();
  });
  bindTap($('summon-btn'), startSummon);
  bindTap($('end-turn-btn'), () => {
    if (game.playerTurn) endPlayerTurn();
  });
  bindTap($('equip-btn'), showEquipSheet);
  bindTap($('attack-btn'), startAttackPick);
  bindTap($('equip-sheet-close'), () => $('equip-sheet').classList.add('hidden'));
  bindTap($('next-stage-btn'), showShop);
  bindTap($('shop-btn'), showShop);
  bindTap($('shop-next-btn'), () => {
    if (game.shopReturn === 'retry') {
      showBattleScreen();
      return;
    }
    if (game.shopReturn === 'title') {
      showTitle();
      return;
    }
    if (game.currentStage < 10) game.currentStage += 1;
    persist();
    showStoryScreen();
  });
  bindTap($('restart-btn'), () => {
    game.units.player.hp = game.units.player.maxHp;
    persist();
    showStoryScreen();
  });
  bindTap($('title-btn'), showTitle);
  bindTap($('shop-title-btn'), showTitle);
  bindTap($('album-open-btn'), showAlbum);
  bindTap($('shop-album-btn'), showAlbum);
  bindTap($('album-back-btn'), () => {
    if (game.albumFrom === 'shop') showShop();
    else showTitle();
  });
  bindTap($('music-toggle'), toggleMusic);

  document.addEventListener('pointerdown', unlockAll, { once: true });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) synth.suspend();
    else synth.resumeBgm();
  });
  window.addEventListener('pageshow', () => synth.resumeBgm());

});
