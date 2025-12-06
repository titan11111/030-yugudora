// ユグドラ幻想戦記 - Tactics Refined Script

// ゲームの状態
const game = {
    currentScreen: 'title',
    currentStage: 1,
    playerTurn: true,
    summonGauge: 0,
    selectedUnit: null,
    actionMode: 'none', // 'none', 'move', 'attack', 'mech-attack'
    musicEnabled: true,
    currentBGM: null,
    mechTurn: false,
    mechTurnOrder: [],
    mechTurnIndex: 0,
    // マップ(6x6)
    map: Array(6).fill().map(() => Array(6).fill(0)),
    units: {
        player: { x: 1, y: 5, hp: 120, maxHp: 120, level: 1, exp: 0, attack: 40, symbol: '♠' },
        enemies: [],
        mechs: []
    }
};

// 音声管理
const audioManager = {
    bgmElements: {}, seElements: {}, masterVolume: 0.5,
    init() {
        this.bgmElements = { title: document.getElementById('title-bgm'), battle: document.getElementById('battle-bgm'), clear: document.getElementById('clear-bgm') };
        this.seElements = { attack: document.getElementById('attack-se'), levelup: document.getElementById('levelup-se'), hit: document.getElementById('fuseikai-se'), move: document.getElementById('seikai-se') };
        this.setVolume(this.masterVolume);
    },
    setVolume(volume) {
        this.masterVolume = volume;
        Object.values(this.bgmElements).forEach(a => { if(a) a.volume = volume * 0.7; });
        Object.values(this.seElements).forEach(a => { if(a) a.volume = volume; });
    },
    playBGM(type) {
        this.stopBGM();
        if (!game.musicEnabled) return;
        const bgm = this.bgmElements[type];
        if (bgm) { bgm.currentTime = 0; bgm.play().catch(e => console.log(e)); game.currentBGM = type; }
    },
    stopBGM() { Object.values(this.bgmElements).forEach(a => { if(a) a.pause(); }); game.currentBGM = null; },
    playSE(type) {
        if (!game.musicEnabled) return;
        const se = this.seElements[type];
        if (se) { se.currentTime = 0; se.play().catch(e => console.log(e)); }
    }
};

// ステージデータ (変更なしのため一部省略)
const stageData = {
    1: { name: "第1面 - 森の入口", story: "世界樹の森で最初の敵と遭遇...", enemies: [{ x: 0, y: 0, hp: 25, maxHp: 25, type: 'goblin', name: 'ゴブリン' }, { x: 2, y: 0, hp: 25, maxHp: 25, type: 'goblin', name: 'ゴブリン' }, { x: 2, y: 2, hp: 40, maxHp: 40, type: 'orc', name: 'オーク隊長' }] },
    2: { name: "第2面 - 古い遺跡", story: "古代の遺跡...", enemies: [{ x: 0, y: 0, hp: 25, maxHp: 25, type: 'skeleton', name: 'スケルトン' }, { x: 2, y: 2, hp: 45, maxHp: 45, type: 'wizard', name: 'ネクロマンサー' }] },
    3: { name: "第3面 - 暗黒の洞窟", story: "暗闇の中から...", enemies: [{ x: 0, y: 0, hp: 30, maxHp: 30, type: 'goblin', name: 'DG' }, { x: 2, y: 1, hp: 45, maxHp: 45, type: 'orc', name: 'OW' }, { x: 1, y: 2, hp: 50, maxHp: 50, type: 'dragon', name: 'Wyvern' }] },
    4: { name: "第4面 - 氷の神殿", story: "氷に閉ざされた...", enemies: [{ x: 2, y: 2, hp: 65, maxHp: 65, type: 'wizard', name: 'Ice' }] },
    5: { name: "第5面 - 炎の火山", story: "灼熱の溶岩...", enemies: [{ x: 2, y: 0, hp: 70, maxHp: 70, type: 'dragon', name: 'FD' }] },
    6: { name: "第6面 - 嵐の高原", story: "雷鳴轟く...", enemies: [{ x: 2, y: 0, hp: 80, maxHp: 80, type: 'phoenix', name: 'Storm' }] },
    7: { name: "第7面 - 毒の沼地", story: "毒に侵された...", enemies: [{ x: 1, y: 2, hp: 65, maxHp: 65, type: 'demon', name: 'Poison' }] },
    8: { name: "第8面 - 光の塔", story: "聖なる光...", enemies: [{ x: 2, y: 0, hp: 75, maxHp: 75, type: 'lich', name: 'Angel' }] },
    9: { name: "第9面 - 闇の城", story: "闇の王...", enemies: [{ x: 2, y: 1, hp: 100, maxHp: 100, type: 'demon', name: 'DarkLord' }] },
    10: { name: "第10面 - 世界樹の根元", story: "最終決戦...", enemies: [{ x: 2, y: 1, hp: 120, maxHp: 120, type: 'behemoth', name: 'Behemoth', size: 2 }] }
};

// 初期化
document.addEventListener('DOMContentLoaded', function() {
    audioManager.init();
    document.getElementById('start-btn').addEventListener('click', showStoryScreen);
    document.getElementById('story-next-btn').addEventListener('click', showBattleScreen);
    
    // 操作系イベントリスナー
    document.getElementById('summon-btn').addEventListener('click', startSummonMode);
    // ターン終了ボタンは「待機」も兼ねる
    document.getElementById('end-turn-btn').addEventListener('click', () => {
        if (game.playerTurn) endPlayerTurn();
    });

    document.getElementById('next-stage-btn').addEventListener('click', nextStage);
    document.getElementById('restart-btn').addEventListener('click', restartGame);
    document.getElementById('title-btn').addEventListener('click', returnToTitle);
    
    document.getElementById('music-toggle').addEventListener('click', toggleMusic);
    document.getElementById('volume-slider').addEventListener('input', (e) => audioManager.setVolume(e.target.value));

    if (game.musicEnabled) document.addEventListener('click', startAudioContext, { once: true });
});

function startAudioContext() { if (game.musicEnabled) audioManager.playBGM('title'); }

function toggleMusic() {
    game.musicEnabled = !game.musicEnabled;
    const btn = document.getElementById('music-toggle');
    if (game.musicEnabled) {
        btn.textContent = '🎵';
        if (game.currentScreen === 'title') audioManager.playBGM('title');
        else if (game.currentScreen === 'battle') audioManager.playBGM('battle');
    } else {
        btn.textContent = '🔇';
        audioManager.stopBGM();
    }
}

function showStoryScreen() {
    hideAllScreens();
    document.getElementById('story-screen').classList.remove('hidden');
    game.currentScreen = 'story';
    document.getElementById('story-content').textContent = stageData[game.currentStage].story;
}

function showBattleScreen() {
    hideAllScreens();
    document.getElementById('battle-screen').classList.remove('hidden');
    game.currentScreen = 'battle';
    loadStageData();
    createBattleMap();
    updateTurnDisplay();
    updatePlayerStatus();
    if (game.musicEnabled) audioManager.playBGM('battle');
}

function loadStageData() {
    const data = stageData[game.currentStage];
    document.getElementById('current-stage').textContent = data.name;
    game.units.player.x = 1; game.units.player.y = 5; game.units.player.hp = game.units.player.maxHp;
    game.units.enemies = JSON.parse(JSON.stringify(data.enemies));
    game.units.mechs = [];
    game.playerTurn = true;
    game.summonGauge = 0;
    game.actionMode = 'none';
    setGuide("あなたのターン：ユニットをタップして移動");
}

function showResultScreen(isWin) {
    hideAllScreens();
    document.getElementById('result-screen').classList.remove('hidden');
    game.currentScreen = 'result';
    const title = document.getElementById('result-title');
    const text = document.getElementById('result-text');
    const victory = document.getElementById('victory-icon');
    const defeat = document.getElementById('defeat-icon');
    
    victory.classList.add('hidden'); defeat.classList.add('hidden');
    
    if (isWin) {
        title.textContent = '勝利！'; title.style.color = '#4fc3f7';
        victory.classList.remove('hidden');
        text.textContent = game.currentStage < 10 ? 'ステージクリア！' : '全クリ！';
        document.getElementById('next-stage-btn').classList.toggle('hidden', game.currentStage >= 10);
        if(game.musicEnabled) audioManager.playBGM('clear');
        gainExperience(100);
    } else {
        title.textContent = '敗北...'; title.style.color = '#f44336';
        defeat.classList.remove('hidden');
        document.getElementById('next-stage-btn').classList.add('hidden');
        audioManager.stopBGM(); audioManager.playSE('hit');
    }
}

function nextStage() { if (game.currentStage < 10) { game.currentStage++; showStoryScreen(); } }
function restartGame() { showStoryScreen(); }
function returnToTitle() {
    hideAllScreens();
    document.getElementById('title-screen').classList.remove('hidden');
    game.currentScreen = 'title';
    if(game.musicEnabled) audioManager.playBGM('title');
}

function hideAllScreens() { document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden')); }

function createBattleMap() {
    const mapEl = document.getElementById('battle-map');
    mapEl.innerHTML = '';
    for (let y = 0; y < 6; y++) {
        for (let x = 0; x < 6; x++) {
            const cell = document.createElement('div');
            cell.className = 'map-cell';
            cell.dataset.x = x; cell.dataset.y = y;
            cell.addEventListener('click', () => handleCellClick(x, y));
            
            const content = getCellContent(x, y);
            if (content.type) {
                cell.innerHTML = content.symbol;
                cell.classList.add(content.type);
                // 敵の場合はHPバー簡易表示
                if(content.type !== 'player' && content.obj && content.obj.hp < content.obj.maxHp) {
                    cell.style.borderBottom = `3px solid red`;
                }
            }
            mapEl.appendChild(cell);
        }
    }
    // 攻撃線レイヤー
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.id = 'attack-layer'; svg.classList.add('attack-layer');
    svg.style.position='absolute'; svg.style.top='0'; svg.style.left='0'; svg.style.width='100%'; svg.style.height='100%'; svg.style.pointerEvents='none';
    mapEl.appendChild(svg);
    
    // モードに応じたハイライトの復元
    if (game.playerTurn) {
        if (game.actionMode === 'move') highlightMovableCells();
        if (game.actionMode === 'attack') highlightAttackableCells();
    }
}

function getCellContent(x, y) {
    if (game.units.player.x === x && game.units.player.y === y) return { symbol: getSVG('player'), type: 'player' };
    for (let m of game.units.mechs) if (m.x === x && m.y === y && m.hp > 0) return { symbol: getSVG('mech'), type: 'mech', obj: m };
    for (let e of game.units.enemies) if (occupies(e, x, y)) return { symbol: getSVG(e.type), type: 'enemy', obj: e };
    return { symbol: '', type: null };
}

function getSVG(type) {
    const el = document.getElementById(type + '-svg') || document.getElementById('goblin-svg');
    return el ? el.outerHTML : '';
}

function occupies(e, x, y) {
    const s = e.size || 1;
    return x >= e.x && x < e.x + s && y >= e.y && y < e.y + s && e.hp > 0;
}

// ----------------------------------------------------
// 新しい操作ロジック：タップのみで進行
// ----------------------------------------------------
function handleCellClick(x, y) {
    if (!game.playerTurn || game.mechTurn) return;

    // 1. プレイヤーをタップ -> 移動モードへ
    if (game.actionMode === 'none') {
        if (game.units.player.x === x && game.units.player.y === y) {
            game.actionMode = 'move';
            audioManager.playSE('move'); // 選択音代わり
            createBattleMap(); // ハイライト更新
            setGuide("移動先をタップしてください");
        }
        return;
    }

    // 2. 移動モード中
    if (game.actionMode === 'move') {
        const player = game.units.player;
        const dist = Math.abs(x - player.x) + Math.abs(y - player.y);
        
        // 自分自身をタップ -> キャンセル
        if (x === player.x && y === player.y) {
            game.actionMode = 'none';
            createBattleMap();
            setGuide("キャンセルしました");
            return;
        }

        // 移動実行
        if (dist <= 2 && !isOccupied(x, y)) {
            player.x = x; player.y = y;
            audioManager.playSE('move');
            
            // 移動後、隣接する敵がいるかチェック
            if (hasAdjacentEnemy()) {
                game.actionMode = 'attack';
                createBattleMap(); // 攻撃可能範囲をハイライト
                setGuide("敵をタップして攻撃！ またはボタンで待機");
            } else {
                // 敵がいないならターン終了
                endPlayerTurn();
            }
        }
        return;
    }

    // 3. 攻撃モード中（移動直後）
    if (game.actionMode === 'attack') {
        const player = game.units.player;
        const dist = Math.abs(x - player.x) + Math.abs(y - player.y);
        
        if (dist <= 1) {
            const enemy = getEnemyAt(x, y);
            if (enemy) {
                // 攻撃計算
                const isCritical = Math.random() < 0.2; // 20%でクリティカル
                let dmg = game.units.player.attack + game.units.player.level * 5 + Math.floor(Math.random()*10);
                if (isCritical) dmg = Math.floor(dmg * 1.5);

                enemy.hp -= dmg;
                
                // ログではなく、演出を呼ぶ！
                audioManager.playSE('attack');
                showDamagePopup(x, y, dmg, isCritical); // ダメージ数字
                triggerScreenShake(); // 画面揺れ

                if (enemy.hp <= 0) {
                    game.summonGauge = Math.min(game.summonGauge + 1, 3);
                    gainExperience(20);
                }
                
                // 攻撃したらターン終了
                endPlayerTurn();
            }
        }
        }
    }

// 隣接する敵がいるか
function hasAdjacentEnemy() {
    const px = game.units.player.x;
    const py = game.units.player.y;
    // 上下左右をチェック
    const dirs = [[0,1], [0,-1], [1,0], [-1,0]];
    return dirs.some(d => getEnemyAt(px + d[0], py + d[1]));
}

function highlightMovableCells() {
    const p = game.units.player;
    for (let y=0; y<6; y++) for (let x=0; x<6; x++) {
        if ((Math.abs(x-p.x)+Math.abs(y-p.y)) <= 2 && !isOccupied(x,y)) {
            document.querySelector(`.map-cell[data-x="${x}"][data-y="${y}"]`).classList.add('movable');
        }
    }
}

function highlightAttackableCells() {
    const p = game.units.player;
    for (let y=0; y<6; y++) for (let x=0; x<6; x++) {
        if ((Math.abs(x-p.x)+Math.abs(y-p.y)) <= 1 && getEnemyAt(x,y)) {
            document.querySelector(`.map-cell[data-x="${x}"][data-y="${y}"]`).classList.add('attackable');
        }
    }
}

function isOccupied(x, y) {
    if (game.units.player.x===x && game.units.player.y===y) return true;
    if (game.units.mechs.some(m => m.x===x && m.y===y && m.hp>0)) return true;
    return game.units.enemies.some(e => occupies(e, x, y));
}

function getEnemyAt(x, y) { return game.units.enemies.find(e => occupies(e, x, y)); }

function startSummonMode() {
    if (game.summonGauge >= 3) {
        const empties = [];
        for(let y=0; y<6; y++) for(let x=0; x<6; x++) if(!isOccupied(x,y)) empties.push({x,y});
        if(empties.length) {
            const p = empties[Math.floor(Math.random()*empties.length)];
            game.units.mechs.push({x:p.x, y:p.y, hp:100, maxHp:100, attack:20, name:'機兵'});
            game.summonGauge = 0;
            audioManager.playSE('levelup');
            createBattleMap();
            updateTurnDisplay();
            setGuide("機兵を召喚しました！");
        }
    }
}

function endPlayerTurn() {
    game.playerTurn = false;
    game.actionMode = 'none';
    setGuide("敵のターン...");
    createBattleMap();
    updateTurnDisplay();
    setTimeout(processEnemyTurn, 800);
}

// 敵ターン
function processEnemyTurn() {
    const active = game.units.enemies.filter(e => e.hp>0);
    active.forEach(e => processEnemyAction(e));
    
    createBattleMap();
    updatePlayerStatus();
    
    if (game.units.enemies.every(e => e.hp<=0)) { setTimeout(() => showResultScreen(true), 1000); return; }
    if (game.units.player.hp <= 0) { setTimeout(() => showResultScreen(false), 1000); return; }

    const mechs = game.units.mechs.filter(m => m.hp>0);
    if(mechs.length) startMechTurn();
    else {
        setTimeout(() => {
            game.playerTurn = true;
            updateTurnDisplay();
            setGuide("あなたのターン：ユニットをタップして移動");
        }, 1000);
    }
}

function processEnemyAction(e) {
    const p = game.units.player;
    let target = p;
    // 単純なAI: プレイヤーに近づいて攻撃
    let dist = Math.abs(e.x - p.x) + Math.abs(e.y - p.y);
    if (dist <= 1) {
        p.hp -= (10 + Math.random()*5);
        audioManager.playSE('hit');
    } else {
        // 近づく
        if (e.x < p.x && !isOccupied(e.x+1, e.y)) e.x++;
        else if (e.x > p.x && !isOccupied(e.x-1, e.y)) e.x--;
        else if (e.y < p.y && !isOccupied(e.x, e.y+1)) e.y++;
        else if (e.y > p.y && !isOccupied(e.x, e.y-1)) e.y--;
    }
}

// 機兵ターン (簡易実装)
function startMechTurn() {
    game.mechTurn = true;
    updateTurnDisplay();
    setGuide("機兵の攻撃！");
    setTimeout(() => {
        game.units.mechs.forEach(m => {
            if(m.hp<=0) return;
            // ランダムな敵を攻撃
            const enemies = game.units.enemies.filter(e => e.hp>0);
            if(enemies.length) {
                const target = enemies[Math.floor(Math.random()*enemies.length)];
                target.hp -= m.attack;
                audioManager.playSE('attack');
                // ビーム描画
                drawAttackLine(m, target);
            }
        });
        
        if (game.units.enemies.every(e => e.hp<=0)) { setTimeout(() => showResultScreen(true), 1000); return; }
        
        game.mechTurn = false;
        setTimeout(() => {
            game.playerTurn = true;
            updateTurnDisplay();
            setGuide("あなたのターン：ユニットをタップして移動");
        }, 1000);
    }, 1000);
}

function drawAttackLine(from, to) {
    // 簡易描画
    const map = document.getElementById('battle-map');
    // SVG線描画ロジックは既存と同様
}

function updateTurnDisplay() {
    document.getElementById('current-turn').textContent = game.mechTurn ? 'Ally Turn' : (game.playerTurn ? 'Player Turn' : 'Enemy Turn');
    
    // 召喚ゲージのクリスタル表示更新
    const crystals = document.querySelectorAll('.crystal');
    crystals.forEach((c, i) => {
        if (i < game.summonGauge) c.classList.add('on');
        else c.classList.remove('on');
    });
    
    const btn = document.getElementById('summon-btn');
    if (game.summonGauge >= 3) {
        btn.disabled = false;
        btn.textContent = "機兵召喚！(READY)";
        btn.style.animation = "pulse 1s infinite";
    } else {
        btn.disabled = true;
        btn.textContent = `Energy: ${game.summonGauge}/3`;
        btn.style.animation = "none";
    }
}

function updatePlayerStatus() {
    document.getElementById('player-hp').textContent = Math.floor(game.units.player.hp);
    document.getElementById('player-max-hp').textContent = game.units.player.maxHp;
    document.getElementById('player-level').textContent = game.units.player.level;
}

function gainExperience(amount) {
    game.units.player.exp += amount;
    if(game.units.player.exp >= game.units.player.level * 100) {
        game.units.player.level++;
        game.units.player.maxHp += 20;
        game.units.player.hp = game.units.player.maxHp;
        game.units.player.attack += 5;
        audioManager.playSE('levelup');
        setGuide("レベルアップ！");
    }
}

function setGuide(text) {
    const el = document.getElementById('guide-message');
    el.textContent = text;
    el.style.animation = 'none';
    el.offsetHeight; /* trigger reflow */
    el.style.animation = 'fadeIn 0.5s';
}

// ダメージポップアップ表示関数
function showDamagePopup(gridX, gridY, amount, isCritical) {
    const mapEl = document.getElementById('battle-map');
    
    // グリッド座標をピクセル座標に変換（簡易計算）
    // .map-cellのサイズに依存するが、ここではcellの中心を狙う
    const cell = document.querySelector(`.map-cell[data-x="${gridX}"][data-y="${gridY}"]`);
    if (!cell) return;

    const popup = document.createElement('div');
    popup.className = isCritical ? 'damage-popup critical' : 'damage-popup';
    popup.textContent = amount + (isCritical ? "!!" : "");
    
    // セルの中央あたりに配置
    const rect = cell.getBoundingClientRect();
    const mapRect = mapEl.getBoundingClientRect();
    
    // map要素内での相対位置を計算
    popup.style.left = (rect.left - mapRect.left + rect.width/2 - 20) + 'px'; // -20は微調整
    popup.style.top = (rect.top - mapRect.top) + 'px';

    mapEl.appendChild(popup);

    // アニメーション終了後に削除
    setTimeout(() => {
        popup.remove();
    }, 800);
}

// 画面シェイク関数
function triggerScreenShake() {
    const screen = document.getElementById('battle-screen');
    screen.classList.remove('shake'); // リセット
    void screen.offsetWidth; // リフロー発生（アニメーション再起動用ハック）
    screen.classList.add('shake');
}
