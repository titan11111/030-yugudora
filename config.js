/* ユグドラ幻想戦記 — 武器・敵・相性。ポリフィル含む */

(function polyfillModernJs() {
  if (typeof Promise.withResolvers !== 'function') {
    Promise.withResolvers = function withResolvers() {
      let resolve;
      let reject;
      const promise = new Promise((res, rej) => {
        resolve = res;
        reject = rej;
      });
      return { promise, resolve, reject };
    };
  }

  if (typeof Object.groupBy !== 'function') {
    Object.groupBy = function groupBy(items, callback) {
      const out = Object.create(null);
      let index = 0;
      for (const item of items) {
        const key = callback(item, index++);
        if (!Object.hasOwn(out, key)) out[key] = [];
        out[key].push(item);
      }
      return out;
    };
  }

  if (typeof Array.prototype.toSorted !== 'function') {
    Array.prototype.toSorted = function toSorted(compare) {
      return this.slice().sort(compare);
    };
  }

  if (typeof Set.prototype.intersection !== 'function') {
    Set.prototype.intersection = function intersection(other) {
      const out = new Set();
      for (const value of this) {
        if (other.has(value)) out.add(value);
      }
      return out;
    };
  }

  if (!globalThis.crypto) globalThis.crypto = {};
  if (typeof crypto.randomUUID !== 'function') {
    crypto.randomUUID = function randomUUID() {
      const bytes = new Uint8Array(16);
      if (crypto.getRandomValues) crypto.getRandomValues(bytes);
      else for (let i = 0; i < 16; i++) bytes[i] = Math.floor(Math.random() * 256);
      bytes[6] = (bytes[6] & 0x0f) | 0x40;
      bytes[8] = (bytes[8] & 0x3f) | 0x80;
      const hex = [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
      return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
    };
  }
})();

const SAVE_KEY = 'yugudora-hobby-v1';
const MAP_SIZE = 6;
const PLAYER_MOVE = 2;
const GOLD_FORMAT = new Intl.NumberFormat('ja-JP');

const STYLE_LABEL = {
  slash: '斬',
  pierce: '突',
  blunt: '打',
  magic: '魔'
};

const TRIBE_LABEL = {
  beast: '獣',
  undead: '不死',
  dragon: '竜',
  magic: '魔'
};

const ADVANTAGE = {
  slash: new Set(['beast']),
  pierce: new Set(['dragon']),
  blunt: new Set(['undead']),
  magic: new Set(['magic', 'dragon'])
};

const DISADVANTAGE = {
  slash: new Set(['dragon']),
  pierce: new Set(['undead']),
  blunt: new Set(['magic']),
  magic: new Set(['beast'])
};

const SVG_ALIAS = {
  player: 'player',
  mech: 'mech',
  goblin: 'goblin',
  orc: 'orc',
  skeleton: 'skeleton',
  wizard: 'skeleton',
  dragon: 'behemoth',
  phoenix: 'behemoth',
  demon: 'orc',
  lich: 'skeleton',
  behemoth: 'behemoth',
  darkknight: 'darkknight',
  darklord: 'darklord',
  rootguard: 'rootguard',
  rootwarden: 'rootwarden',
  yggbehemoth: 'yggbehemoth'
};

const WEAPON_CATALOG = [
  {
    id: 'fists',
    name: '素手',
    price: 0,
    uses: Infinity,
    attack: 8,
    range: 1,
    crit: 0.08,
    style: 'blunt',
    buyable: false,
    unlock: 1,
    lifesteal: 0,
    note: '回数無限。弱いが困らない。'
  },
  {
    id: 'short-sword',
    name: 'ショートソード',
    price: 36,
    uses: 14,
    attack: 13,
    range: 1,
    crit: 0.14,
    style: 'slash',
    buyable: true,
    unlock: 1,
    lifesteal: 0,
    note: '標準。獣に少し強い。'
  },
  {
    id: 'spear',
    name: 'スピア',
    price: 48,
    uses: 12,
    attack: 11,
    range: 2,
    crit: 0.10,
    style: 'pierce',
    buyable: true,
    unlock: 1,
    lifesteal: 0,
    note: '射程2。火力は控えめ。'
  },
  {
    id: 'mace',
    name: 'メイス',
    price: 44,
    uses: 10,
    attack: 15,
    range: 1,
    crit: 0.08,
    style: 'blunt',
    buyable: true,
    unlock: 1,
    vsTribe: { undead: 1.3 },
    lifesteal: 0,
    note: '不死に効く。回数は少なめ。'
  },
  {
    id: 'whip',
    name: 'ウィップ',
    price: 58,
    uses: 11,
    attack: 10,
    range: 2,
    crit: 0.12,
    style: 'slash',
    buyable: true,
    unlock: 2,
    lifesteal: 0,
    note: '斬の射程2。火力は控えめ。'
  },
  {
    id: 'rapier',
    name: 'レイピア',
    price: 70,
    uses: 16,
    attack: 12,
    range: 1,
    crit: 0.28,
    style: 'pierce',
    buyable: true,
    unlock: 3,
    lifesteal: 0,
    note: '会心が出やすい。'
  },
  {
    id: 'iron-knuckle',
    name: '鉄拳',
    price: 62,
    uses: 15,
    attack: 13,
    range: 1,
    crit: 0.10,
    style: 'blunt',
    buyable: true,
    unlock: 3,
    lifesteal: 0.06,
    note: '打で少し吸う。回数は多め。'
  },
  {
    id: 'hunter-bow',
    name: '狩人の弓',
    price: 74,
    uses: 13,
    attack: 12,
    range: 2,
    crit: 0.16,
    style: 'pierce',
    buyable: true,
    unlock: 3,
    vsTribe: { dragon: 1.2 },
    lifesteal: 0,
    note: '射程2。竜に少し通る。'
  },
  {
    id: 'battle-axe',
    name: 'バトルアックス',
    price: 82,
    uses: 7,
    attack: 19,
    range: 1,
    crit: 0.12,
    style: 'slash',
    buyable: true,
    unlock: 4,
    lifesteal: 0,
    note: '重い一撃。すぐ欠ける。'
  },
  {
    id: 'chain-mace',
    name: 'チェーンメイス',
    price: 86,
    uses: 10,
    attack: 12,
    range: 2,
    crit: 0.08,
    style: 'blunt',
    buyable: true,
    unlock: 4,
    lifesteal: 0,
    note: '打の射程2。隣接しなくてよい。'
  },
  {
    id: 'staff',
    name: '魔杖',
    price: 96,
    uses: 9,
    attack: 14,
    range: 2,
    crit: 0.10,
    style: 'magic',
    buyable: true,
    unlock: 5,
    vsTribe: { dragon: 1.25, magic: 1.25, beast: 0.85 },
    lifesteal: 0,
    note: '竜と魔に効く。獣には弱い。'
  },
  {
    id: 'assassin-blade',
    name: '暗剣',
    price: 90,
    uses: 10,
    attack: 15,
    range: 1,
    crit: 0.24,
    style: 'slash',
    buyable: true,
    unlock: 5,
    lifesteal: 0,
    note: '会心待ちの斬。斧より持つ。'
  },
  {
    id: 'warhammer',
    name: 'ウォーハンマー',
    price: 110,
    uses: 8,
    attack: 18,
    range: 1,
    crit: 0.09,
    style: 'blunt',
    buyable: true,
    unlock: 6,
    vsTribe: { undead: 1.35 },
    lifesteal: 0,
    note: '不死特化。光の塔の前に。'
  },
  {
    id: 'runestaff',
    name: 'ルーン杖',
    price: 118,
    uses: 7,
    attack: 16,
    range: 2,
    crit: 0.12,
    style: 'magic',
    buyable: true,
    unlock: 6,
    vsTribe: { magic: 1.28, dragon: 1.15, beast: 0.8 },
    lifesteal: 0,
    note: '魔杖より鋭い。獣には通らない。'
  },
  {
    id: 'shadow-edge',
    name: '影刃',
    price: 128,
    uses: 8,
    attack: 17,
    range: 1,
    crit: 0.20,
    style: 'slash',
    buyable: true,
    unlock: 7,
    vsTribe: { magic: 1.22 },
    lifesteal: 0,
    note: '魔に通る斬。闇の城向き。'
  },
  {
    id: 'ygg-sword',
    name: '世界樹の剣',
    price: 180,
    uses: 6,
    attack: 21,
    range: 1,
    crit: 0.18,
    style: 'slash',
    buyable: true,
    unlock: 8,
    lifesteal: 0.12,
    note: '強いが6回で折れる。吸収あり。'
  },
  {
    id: 'ygg-bow',
    name: '世界樹の弓',
    price: 165,
    uses: 7,
    attack: 17,
    range: 2,
    crit: 0.14,
    style: 'pierce',
    buyable: true,
    unlock: 8,
    vsTribe: { dragon: 1.22 },
    lifesteal: 0.06,
    note: '最終面の竜向け。剣より届く。'
  }
];

const FISTS_INSTANCE = Object.freeze({
  instanceId: 'fists',
  catalogId: 'fists',
  uses: Infinity
});

function enemy(x, y, hp, type, name, extras = {}) {
  return {
    x,
    y,
    hp,
    maxHp: hp,
    atk: extras.atk ?? 8,
    type,
    name,
    tribe: extras.tribe ?? 'beast',
    gold: extras.gold ?? 10,
    size: extras.size ?? 1
  };
}

const STAGE_DATA = {
  1: {
    name: '第1面 - 森の入口',
    story: '世界樹の森で最初の敵と遭遇した。素手では厳しい。ゴールドを貯めて武器を買おう。',
    enemies: [
      enemy(2, 3, 26, 'goblin', 'ゴブリン', { atk: 7, gold: 10, tribe: 'beast' }),
      enemy(4, 4, 26, 'goblin', 'ゴブリン', { atk: 7, gold: 10, tribe: 'beast' }),
      enemy(3, 1, 40, 'orc', 'オーク隊長', { atk: 10, gold: 22, tribe: 'beast' })
    ]
  },
  2: {
    name: '第2面 - 古い遺跡',
    story: '骨が動く。打撃武器があれば話は早い。',
    enemies: [
      enemy(1, 3, 28, 'skeleton', 'スケルトン', { atk: 8, gold: 14, tribe: 'undead' }),
      enemy(4, 3, 28, 'skeleton', 'スケルトン', { atk: 8, gold: 14, tribe: 'undead' }),
      enemy(3, 1, 44, 'wizard', 'ネクロマンサー', { atk: 11, gold: 28, tribe: 'magic' })
    ]
  },
  3: {
    name: '第3面 - 暗黒の洞窟',
    story: '獣と竜が混ざる。射程のある槍が生きる。',
    enemies: [
      enemy(2, 4, 32, 'goblin', '洞窟ゴブリン', { atk: 9, gold: 12, tribe: 'beast' }),
      enemy(4, 3, 46, 'orc', 'オーク戦士', { atk: 12, gold: 24, tribe: 'beast' }),
      enemy(1, 1, 52, 'dragon', 'ワイバーン', { atk: 13, gold: 36, tribe: 'dragon' })
    ]
  },
  4: {
    name: '第4面 - 氷の神殿',
    story: '氷の術者と護衛。会心の剣か、堅実な槍か。',
    enemies: [
      enemy(0, 4, 34, 'skeleton', '氷の衛兵', { atk: 10, gold: 16, tribe: 'undead' }),
      enemy(4, 4, 34, 'skeleton', '氷の衛兵', { atk: 10, gold: 16, tribe: 'undead' }),
      enemy(2, 2, 58, 'wizard', '氷の術者', { atk: 14, gold: 34, tribe: 'magic' })
    ]
  },
  5: {
    name: '第5面 - 炎の火山',
    story: '竜には魔が通る。回数を惜しんではいけない時もある。',
    enemies: [
      enemy(2, 4, 38, 'goblin', '火ゴブリン', { atk: 11, gold: 14, tribe: 'beast' }),
      enemy(0, 3, 38, 'orc', '火のオーク', { atk: 12, gold: 20, tribe: 'beast' }),
      enemy(3, 1, 66, 'dragon', 'フレイムドレイク', { atk: 15, gold: 48, tribe: 'dragon' })
    ]
  },
  6: {
    name: '第6面 - 嵐の高原',
    story: '空を裂く翼。突と魔が噛み合う。',
    enemies: [
      enemy(2, 3, 48, 'phoenix', 'ストームバード', { atk: 14, gold: 30, tribe: 'dragon' }),
      enemy(4, 3, 48, 'phoenix', 'ストームバード', { atk: 14, gold: 30, tribe: 'dragon' }),
      enemy(2, 0, 70, 'wizard', '雷鳴の術者', { atk: 16, gold: 40, tribe: 'magic' })
    ]
  },
  7: {
    name: '第7面 - 毒の沼地',
    story: '魔は獣に通りにくい。武器を付け替えて生き抜け。',
    enemies: [
      enemy(2, 4, 44, 'orc', '沼オーク', { atk: 14, gold: 24, tribe: 'beast' }),
      enemy(4, 3, 50, 'demon', '沼の使い', { atk: 15, gold: 28, tribe: 'magic' }),
      enemy(1, 1, 62, 'demon', 'ポイズンロード', { atk: 17, gold: 44, tribe: 'magic' })
    ]
  },
  8: {
    name: '第8面 - 光の塔',
    story: '不死と聖なる偽り。打撃が光る。',
    enemies: [
      enemy(0, 4, 46, 'lich', '偽りの使徒', { atk: 15, gold: 26, tribe: 'undead' }),
      enemy(4, 3, 46, 'lich', '偽りの使徒', { atk: 15, gold: 26, tribe: 'undead' }),
      enemy(2, 1, 78, 'lich', '光の亡者', { atk: 18, gold: 52, tribe: 'undead' })
    ]
  },
  9: {
    name: '第9面 - 闇の城',
    story: '闇の王は魔。世界樹の剣を温存したか。手加減はしない。',
    enemies: [
      enemy(2, 3, 128, 'darkknight', '闇騎士', { atk: 24, gold: 40, tribe: 'magic' }),
      enemy(4, 4, 128, 'darkknight', '闇騎士', { atk: 24, gold: 40, tribe: 'magic' }),
      enemy(2, 0, 188, 'darklord', 'ダークロード', { atk: 30, gold: 88, tribe: 'magic' })
    ]
  },
  10: {
    name: '第10面 - 世界樹の根元',
    story: '最終決戦。根を喰らう巨影が待つ。残った回数で世界樹を守れ。',
    enemies: [
      enemy(0, 4, 145, 'rootguard', '根の番兵', { atk: 26, gold: 40, tribe: 'beast' }),
      enemy(4, 4, 145, 'rootwarden', '根の番人', { atk: 26, gold: 40, tribe: 'undead' }),
      enemy(2, 1, 280, 'yggbehemoth', 'ベヒーモス', { atk: 36, gold: 130, tribe: 'dragon', size: 2 })
    ]
  }
};

function catalogById(id) {
  return WEAPON_CATALOG.find((w) => w.id === id) || WEAPON_CATALOG[0];
}

function affinityMultiplier(style, tribe, vsTribe) {
  if (vsTribe && Object.hasOwn(vsTribe, tribe)) return vsTribe[tribe];
  const weak = ADVANTAGE[style] || new Set();
  const resist = DISADVANTAGE[style] || new Set();
  const hit = new Set([tribe]).intersection(weak);
  if (hit.size > 0) return 1.22;
  const miss = new Set([tribe]).intersection(resist);
  if (miss.size > 0) return 0.86;
  return 1;
}

function formatGold(amount) {
  return `${GOLD_FORMAT.format(Math.max(0, Math.floor(amount)))} G`;
}

function shopGroups(stage) {
  const stock = WEAPON_CATALOG.filter((w) => w.buyable && stage >= w.unlock);
  const sorted = stock.toSorted((a, b) => a.price - b.price);
  return Object.groupBy(sorted, (w) => w.style);
}
