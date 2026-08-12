"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const MAP_WIDTH = 4498;
const MAP_HEIGHT = 2901;
const MIN_SCALE_FACTOR = 1;
const MAX_SCALE = 4;
const MAP_EDGE_DRAG_ALLOWANCE = 180;
const MAP_DRAG_RIGHT_ALLOWANCE = 220;
const COMPLETION_STORAGE_KEY = "hk-map-client-completed-markers-v1";
const COMPLETABLE_PRIMARY_CATEGORIES = new Set(["装备", "收集物", "Boss"]);
const HIGHLIGHT_LEADING_ICONS: Record<string, { src: string; alt: string }> = {
  "收藏家(The Collector)": {
    src: "/icons/收集物/收藏家的地图.webp",
    alt: "收藏家的地图",
  },
  "布蕾塔(Bretta)": { src: "/icons/收集物/面具碎片.png", alt: "面具碎片" },
  "骨钉大师席奥(Nailmaster Sheo)": {
    src: "/icons/剑技/强力劈砍（Great Slash）.png",
    alt: "强力劈砍",
  },
  "骨钉大师奥罗(Nailmaster Oro)": {
    src: "/icons/剑技/冲刺劈砍（Dash Slash）.png",
    alt: "冲刺劈砍",
  },
  "骨钉大师马托(Nailmaster Mato)": {
    src: "/icons/剑技/旋风劈砍（Cyclone Slash）.png",
    alt: "旋风劈砍",
  },
};

const HIGHLIGHT_ITEM_NOTES: Record<
  string,
  { src: string; alt: string; paragraphs: string[] }
> = {
  "明子(Nymm)": {
    src: "/icons/护符+护符槽图标/无忧旋律（Carefree Melody）.png",
    alt: "无忧旋律",
    paragraphs: [
      "无忧旋律会取代护符格林之子，出现在护符页面的对应位置。佩戴后有概率抵挡小骑士受到的伤害。",
      "这枚护符看上去与布鲁姆很相似。",
    ],
  },
  "乌恩(Unn)": {
    src: "/icons/护符+护符槽图标/乌恩之形（Shape of Unn）.png",
    alt: "乌恩之形",
    paragraphs: ["装备该护符可以让小骑士在凝聚灵魂时移动。"],
  },
};

const normalizeItemName = (name: string) =>
  name.replace(/[（(].*$/, "").trim();

function getPopupEmbeddedItemIcons(markerName: string) {
  const icons: { src: string; alt: string }[] = [];
  const leadingIcon = HIGHLIGHT_LEADING_ICONS[markerName];
  if (leadingIcon) icons.push(leadingIcon);
  const itemNote = HIGHLIGHT_ITEM_NOTES[markerName];
  if (itemNote) icons.push(itemNote);
  return icons;
}

const MAP_REGION_LABELS = [
  { name: "安息之地", x: 86.66536591142382, y: 26.28359439785804, width: 247.6860497137325 },
  { name: "苍绿之径", x: 15.442728928441607, y: 29.999799651132363, width: 157.2709899208236 },
  { name: "德特茅斯", x: 45.86295753786005, y: 15.908776357191984, width: 158.39636654279715 },
  { name: "蜂巢", x: 89.34002094557405, y: 71.09607673624343, width: 60.917022117874055 },
  { name: "古老盆地", x: 55.86707220139323, y: 76.60296542521503, width: 97.69645765128404 },
  { name: "呼啸悬崖", x: 22.751733160325944, y: 12.10722981616994, width: 100.14645157282047 },
  { name: "皇家水道", x: 52.89712764142594, y: 69.83233971688021, width: 217.33382777905348 },
  { name: "泪水之城", x: 71.25786517349891, y: 42.259359842494376, width: 177.98783007084415 },
  { name: "深邃巢穴", x: 20.407970695365368, y: 72.92179718721492, width: 141.8238910919086 },
  { name: "深渊", x: 63.876684486883576, y: 91.69862967588894, width: 95.70426998388045 },
  { name: "水晶山峰", x: 68.43885457493207, y: 11.16350650630222, width: 123.72186940153742 },
  { name: "王国边缘", x: 92.11757378460435, y: 52.104302444856145, width: 120.48014411096324 },
  { name: "王后花园", x: 22.675562289718666, y: 54.39136519352509, width: 213.97067892899906 },
  { name: "雾之峡谷", x: 36.86417418397123, y: 46.09668784721114, width: 158.4420779380419 },
  { name: "遗忘十字路", x: 53.41074811445003, y: 36.9669280354921, width: 151.15727882005683 },
  { name: "真菌荒地", x: 47.57314590450625, y: 52.47152762578902, width: 160.49061167533208 },
] as const;

const MAP_REGION_CHINESE_LABELS = [
  {
    name: "安息之地",
    x: 85.3521074513571,
    y: 24.918570700106073,
    size: 34,
    edgeGlow: "#D6BD91",
    fogGlow: "#8B765B",
  },
  {
    name: "苍绿之径",
    x: 14.657857433838586,
    y: 28.700882799683423,
    size: 34,
    edgeGlow: "#66B681",
    fogGlow: "#276B58",
  },
  {
    name: "德特茅斯",
    x: 44.764874101008175,
    y: 14.641692149478349,
    size: 34,
    edgeGlow: "#7898B8",
    fogGlow: "#334A63",
  },
  {
    name: "蜂巢",
    x: 88.92130311225681,
    y: 69.96475246672968,
    size: 34,
    edgeGlow: "#E4A33C",
    fogGlow: "#8A561C",
  },
  {
    name: "古老盆地",
    x: 54.501434055540166,
    y: 75.27703560711458,
    size: 34,
    edgeGlow: "#75859A",
    fogGlow: "#3F4B5D",
  },
  {
    name: "呼啸悬崖",
    x: 21.86620939002313,
    y: 10.685347940510908,
    size: 34,
    edgeGlow: "#7895AD",
    fogGlow: "#40586C",
  },
  {
    name: "皇家水道",
    x: 51.924619445932215,
    y: 68.63790306347927,
    size: 34,
    edgeGlow: "#55A6AD",
    fogGlow: "#27666B",
  },
  {
    name: "泪水之城",
    x: 70.41739922113157,
    y: 41.028155438152716,
    size: 34,
    edgeGlow: "#68AEE8",
    fogGlow: "#245B9D",
  },
  {
    name: "深邃巢穴",
    x: 19.699381709768293,
    y: 71.67632630023877,
    size: 34,
    edgeGlow: "#665584",
    fogGlow: "#30283F",
  },
  {
    name: "深渊",
    x: 63.41528231112999,
    y: 90.27449595758127,
    size: 34,
    edgeGlow: "#858D9A",
    fogGlow: "#252A32",
  },
  {
    name: "水晶山峰",
    x: 67.46435587217904,
    y: 9.836156194766428,
    size: 34,
    edgeGlow: "#B67AD2",
    fogGlow: "#713F91",
  },
  {
    name: "王国边缘",
    x: 91.18699259512933,
    y: 50.60566328770141,
    size: 34,
    edgeGlow: "#AE8553",
    fogGlow: "#5D4632",
  },
  {
    name: "王后花园",
    x: 21.816950057743252,
    y: 53.075262730100256,
    size: 34,
    edgeGlow: "#69AE8A",
    fogGlow: "#326E58",
  },
  {
    name: "雾之峡谷",
    x: 36.33625772817655,
    y: 44.87088415244825,
    size: 34,
    edgeGlow: "#E49AD8",
    fogGlow: "#9B4F91",
  },
  {
    name: "遗忘十字路",
    x: 52.33168507928329,
    y: 35.58736031600548,
    size: 34,
    edgeGlow: "#8295A8",
    fogGlow: "#46596B",
  },
  {
    name: "真菌荒地",
    x: 46.70067940403373,
    y: 51.28202778920774,
    size: 34,
    edgeGlow: "#C8A65A",
    fogGlow: "#75652E",
  },
] as const;

const getRgbChannels = (hexColor: string) => {
  const value = Number.parseInt(hexColor.slice(1), 16);
  return `${(value >> 16) & 255} ${(value >> 8) & 255} ${value & 255}`;
};

type RegionLabelLayout = { x: number; y: number; size: number };
type RegionLabelLayouts = Record<string, RegionLabelLayout>;

const INITIAL_REGION_LABEL_LAYOUTS: RegionLabelLayouts = Object.fromEntries([
  ...MAP_REGION_LABELS.map((region) => [
    `image:${region.name}`,
    { x: region.x, y: region.y, size: region.width },
  ]),
  ...MAP_REGION_CHINESE_LABELS.map((region) => [
    `text:${region.name}`,
    { x: region.x, y: region.y, size: region.size },
  ]),
]);

const FILTER_CATEGORY_ICON_OVERRIDES: Record<
  string,
  { iconFile?: string; iconScale?: number }
> = {
  "NPC\u0000任务型": { iconFile: "/filter-icons/npc-quest.webp" },
  "NPC\u0000商人": { iconFile: "/filter-icons/npc-merchant.png" },
  "NPC\u0000奖励型": { iconFile: "/filter-icons/npc-reward.webp" },
  "地点\u0000地图": {
    iconFile: "/filter-icons/location-map.png",
  },
  "技能\u0000护符": {
    iconFile: "/icons/护符+护符槽图标/快速聚集（Quick Focus）.png",
  },
  "技能\u0000位移能力": {
    iconFile: "/icons/技能/帝王之翼（Monarch Wings）.png",
  },
  "技能\u0000骨钉技艺": {
    iconFile: "/icons/剑技/强力劈砍（Great Slash）.png",
  },
  "技能\u0000梦之钉能力": {
    iconFile: "/icons/商店商品/梦之门.webp",
  },
  "收集物\u0000低语之根": { iconFile: "/filter-icons/collectible-whispering-root.png" },
  "收集物\u0000道具": { iconFile: "/icons/收集物/光蝇灯笼.webp" },
  "Boss\u0000非主线Boss": { iconFile: "/filter-icons/boss-optional.png" },
  "Boss\u0000主线Boss": { iconFile: "/filter-icons/boss-main.webp" },
  "Boss\u0000战士之梦Boss": { iconFile: "/filter-icons/boss-warrior-dream.png" },
};

type ViewTransform = {
  x: number;
  y: number;
  scale: number;
};

type DragState = {
  pointerId: number;
  startX: number;
  startY: number;
  originX: number;
  originY: number;
};

type RegionLabelInteraction = {
  pointerId: number;
  labelId: string;
  mode: "move" | "resize";
  startClientX: number;
  startClientY: number;
  startLayout: RegionLabelLayout;
  directionX: -1 | 0 | 1;
  directionY: -1 | 0 | 1;
};

type Marker = {
  id: string;
  name: string;
  iconId: string;
  iconFile: string;
  category: string;
  description?: string;
  x: number;
  y: number;
  size: number;
  highlight?: {
    text: string;
    iconFiles: string[];
  };
};

type ProjectData = {
  markers: Marker[];
};

type IconClassification = {
  iconId: string;
  name: string;
  location: string;
  primary: string;
  secondary: string;
};

type PopupRelation = {
  itemName: string;
  ownerIconId: string;
};

type ClassificationData = {
  entries: IconClassification[];
  relations: PopupRelation[];
};

type CategoryFilter = {
  secondaries?: string[];
};

type MerchantOffer = {
  name: string;
  price?: number;
  geoReward?: string;
  rewardIconFile?: string;
  rewardIconLabel?: string;
  requiredItem?: {
    iconFile: string;
    label: string;
  };
  materialCost?: {
    amount: number;
    iconFile: string;
    label: string;
  };
  requirement?: number;
  iconFile?: string;
  secondaryIconFile?: string;
  iconScale?: number;
  iconRotation?: number;
  detail?: string;
};

type MerchantOfferSection = {
  title: string;
  description?: string;
  iconFile?: string;
  unlockPrice?: number;
  hideHeader?: boolean;
  hideCount?: boolean;
  requirementIconFile?: string;
  requirementUnitLabel?: string;
  offers: MerchantOffer[];
};

const SLY_ICON_ID =
  "5Zyw5qCHK25wYy_mlq_ojrHvvIhTbHnvvIkud2VicA";
const ISELDA_ICON_ID =
  "5Zyw5qCHK25wYy_kvIrloZ7lsJTovr7vvIhJc2VsZGHvvIkud2VicA";
const GRUBFATHER_ICON_ID =
  "5Zyw5qCHK25wYy_omavniLfniLfvvIhHcnViZmF0aGVy77yJLndlYnA";
const SEER_ICON_ID =
  "5Zyw5qCHK25wYy_lhYjnn6XvvIhTZWVy77yJLndlYnA";
const SALUBRA_ICON_ID =
  "5Zyw5qCHK25wYy_miqTnrKbniLHlpb3ogIXokKjpsoHlt7TvvIhDaGFybSBMb3ZlciBTYWx1YnJh77yJLnBuZw";
const DIVINE_ICON_ID =
  "5Zyw5qCHK25wYy_ov6rkuIfvvIhEaXZpbmXvvIkud2VicA";
const LEG_EATER_ICON_ID =
  "5Zyw5qCHK25wYy_po5_ohb_ogIXvvIhMZWcgRWF0ZXLvvIkud2VicA";
const NAILSMITH_ICON_ID =
  "5Zyw5qCHK25wYy_pqqjpkonljKDvvIhOYWlsc21pdGjvvIkud2VicA";
const TROUPE_MASTER_GRIMM_ICON_ID =
  "Qk9TUy_liaflm6Llm6Lplb_moLzmnpfvvIhUcm91cGUgTWFzdGVyIEdyaW1t77yJLnBuZw";
const LITTLE_FOOL_ICON_ID =
  "5Zyw5qCHK25wYy_lsI_mhJrkurrvvIhMaXR0bGUgRm9vbO-8iS53ZWJw";
const GRUB_ICON_FILE = "/icons/收集物/Grub.webp";
const ESSENCE_ICON_FILE = "/icons/商店商品/梦之精华.png";
const OFFER_TAB_LABELS: Record<string, string> = {
  [GRUBFATHER_ICON_ID]: "收集幼虫奖励",
  [SEER_ICON_ID]: "收集精华奖励",
  [NAILSMITH_ICON_ID]: "骨钉升级",
  [TROUPE_MASTER_GRIMM_ICON_ID]: "集火奖励",
  [LITTLE_FOOL_ICON_ID]: "试炼信息",
};

const MERCHANT_OFFERS: Record<string, MerchantOfferSection[]> = {
  [TROUPE_MASTER_GRIMM_ICON_ID]: [
    {
      title: "格林之子",
      hideHeader: true,
      offers: [
        {
          name: "第一阶段",
          detail: "初始。",
          iconFile: "/icons/护符+护符槽图标/格林之子（Grimmchild）1.png",
          secondaryIconFile: "/icons/护符+护符槽图标/格林之子形态1.webp",
        },
        {
          name: "第二阶段",
          detail: "收集三团格林亲族新手守卫的火焰，返回格林处。",
          iconFile: "/icons/护符+护符槽图标/格林之子（Grimmchild）2.png",
          secondaryIconFile: "/icons/护符+护符槽图标/格林之子形态2.webp",
        },
        {
          name: "第三阶段",
          detail: "收集三团格林亲族大师守卫的火焰，击败格林团长。",
          iconFile: "/icons/护符+护符槽图标/格林之子（Grimmchild）3.png",
          secondaryIconFile: "/icons/护符+护符槽图标/格林之子形态3.webp",
        },
        {
          name: "护符槽",
          detail: "第二次集齐火焰，击败剧团团长格林后获得。",
          iconFile: "/icons/收集物/护符槽图标.png",
        },
        {
          name: "第四阶段",
          detail: "收集三团格林亲族梦魇守卫的火焰，击败梦魇之王格林。",
          iconFile: "/icons/护符+护符槽图标/格林之子（Grimmchild）4.png",
          secondaryIconFile: "/icons/护符+护符槽图标/格林之子形态4.webp",
        },
      ],
    },
  ],
  [LITTLE_FOOL_ICON_ID]: [
    {
      title: "勇士的试炼",
      description: "第一个试炼，节奏相对缓慢，敌人较容易应对。",
      iconFile: "/icons/商店商品/勇士的试炼.png",
      unlockPrice: 100,
      hideCount: true,
      offers: [
        {
          name: "首次完成",
          geoReward: "1000–1024",
          rewardIconFile: "/icons/收集物/护符槽图标.png",
          rewardIconLabel: "护符槽",
        },
        {
          name: "再次完成",
          geoReward: "1000–1024",
        },
      ],
    },
    {
      title: "征服者的试炼",
      description: "第二个试炼，包含无法治疗的持续爬墙空中战斗。",
      iconFile: "/icons/商店商品/征服者的试炼.png",
      unlockPrice: 450,
      hideCount: true,
      offers: [
        {
          name: "首次完成",
          geoReward: "2000–2020",
          rewardIconFile: "/icons/收集物/苍白矿石.png",
          rewardIconLabel: "苍白矿石",
        },
        {
          name: "再次完成",
          geoReward: "2000–2020",
        },
      ],
    },
    {
      title: "愚人的试炼",
      description: "最后一个试炼，敌人更强，进攻节奏也更快。",
      iconFile: "/icons/商店商品/愚人的试炼.png",
      unlockPrice: 800,
      hideCount: true,
      offers: [
        {
          name: "首次完成",
          geoReward: "3000–3020",
        },
        {
          name: "再次完成",
          geoReward: "3000–3020",
        },
      ],
    },
  ],
  [SLY_ICON_ID]: [
    {
      title: "初始出售",
      offers: [
        {
          name: "面具碎片",
          detail: "第一块",
          price: 150,
          iconFile: "/icons/收集物/面具碎片.png",
        },
        {
          name: "面具碎片",
          detail: "第二块",
          price: 500,
          iconFile: "/icons/收集物/面具碎片.png",
        },
        {
          name: "容器碎片",
          price: 550,
          iconFile: "/icons/收集物/灵魂碎片.png",
        },
        {
          name: "蜂群集结",
          price: 300,
          iconFile: "/icons/护符+护符槽图标/蜂群集结（Gathering Swarm）.png",
          detail: "吉欧掉落后，产生小飞虫收集吉欧，飞向小骑士。",
        },
        {
          name: "坚硬外壳",
          price: 200,
          iconFile: "/icons/护符+护符槽图标/坚硬外壳（Stalwart Shell）.png",
        },
        {
          name: "光蝇灯笼",
          price: 1800,
          iconFile: "/icons/收集物/光蝇灯笼.webp",
          detail: "照亮漆黑区域；解锁与梦境Boss无眼的战斗。",
        },
        {
          name: "腐臭蛋",
          price: 60,
          iconFile: "/icons/收集物/腐臭蛋.png",
        },
        {
          name: "简单钥匙",
          price: 950,
          iconFile: "/icons/收集物/简单钥匙.png",
        },
      ],
    },
    {
      title: "交还店主的钥匙后出售",
      offers: [
        {
          name: "面具碎片",
          detail: "第三块",
          price: 800,
          iconFile: "/icons/收集物/面具碎片.png",
        },
        {
          name: "面具碎片",
          detail: "第四块",
          price: 1500,
          iconFile: "/icons/收集物/面具碎片.png",
        },
        {
          name: "容器碎片",
          price: 900,
          iconFile: "/icons/收集物/灵魂碎片.png",
        },
        {
          name: "典雅的钥匙",
          price: 800,
          iconFile: "/icons/收集物/典雅的钥匙.webp",
          detail: "用于打开位于泪水之城灵魂圣所内的一扇上锁的门。",
        },
        {
          name: "沉重之击",
          price: 350,
          iconFile: "/icons/护符+护符槽图标/沉重之击（Heavy Blow）.png",
          detail: "增加骨钉攻击和剑技的击退效果，还能使Boss硬直所需的受击次数减少1。",
        },
        {
          name: "飞毛腿",
          price: 400,
          iconFile: "/icons/护符+护符槽图标/飞毛腿（Sprintmaster）.png",
          detail: "使小骑士平时在地上的移动速度增加约20%。",
        },
      ],
    },
    {
      title: "学会全部骨钉技艺后赠送",
      offers: [
        {
          name: "骨钉大师的荣耀",
          iconFile: "/icons/护符+护符槽图标/骨钉大师的荣耀（Nailmaster's Glory）.png",
          detail: "使骨钉技艺的蓄力时间减少约44%，由1.35秒降至0.75秒。",
        },
      ],
    },
  ],
  [ISELDA_ICON_ID]: [
    {
      title: "出售商品",
      hideHeader: true,
      offers: [
        {
          name: "任性的指南针",
          price: 220,
          iconFile: "/icons/护符+护符槽图标/任性的指南针（Wayward Compass）.png",
          iconScale: 0.86,
          detail: "在地图上显示小骑士的当前位置。",
        },
        {
          name: "羽毛笔",
          price: 120,
          iconFile: "/icons/商店商品/羽毛笔.webp",
        },
        {
          name: "长椅图标",
          price: 100,
          iconFile: "/icons/地标+npc/长椅图标.png",
        },
        {
          name: "生命血茧图标",
          price: 100,
          iconFile: "/icons/地标+npc/生命血茧图标.png",
        },
        {
          name: "商人图标",
          price: 100,
          iconFile: "/icons/商店商品/商贩图针.png",
        },
        {
          name: "温泉图标",
          price: 100,
          iconFile: "/icons/地标+npc/温泉图标.png",
        },
        {
          name: "低语之根图标",
          price: 150,
          iconFile: "/icons/收集物/梦之树图标.png",
        },
        {
          name: "战士陵墓图标",
          price: 180,
          iconFile: "/icons/商店商品/战士之墓图针.png",
        },
        {
          name: "鹿角虫道图标",
          price: 100,
          iconFile: "/icons/地标+npc/鹿角虫车站图标.png",
        },
        {
          name: "电车图标",
          price: 100,
          iconFile: "/icons/地标+npc/电车图标.png",
        },
        {
          name: "圣甲虫标记",
          price: 100,
          iconFile: "/icons/商店商品/圣甲虫标记.webp",
        },
        {
          name: "贝壳标记",
          price: 100,
          iconFile: "/icons/商店商品/贝壳标记.webp",
        },
        {
          name: "闪亮标记",
          price: 210,
          iconFile: "/icons/商店商品/SHINING标记.webp",
        },
        {
          name: "铜币标记",
          price: 100,
          iconFile: "/icons/商店商品/TOKEN标记.webp",
        },
      ],
    },
  ],
  [GRUBFATHER_ICON_ID]: [
    {
      title: "收集幼虫奖励",
      hideHeader: true,
      requirementIconFile: GRUB_ICON_FILE,
      requirementUnitLabel: "幼虫",
      offers: [
        {
          name: "面具碎片",
          requirement: 5,
          iconFile: "/icons/收集物/面具碎片.png",
        },
        {
          name: "幼虫之歌",
          requirement: 10,
          iconFile: "/icons/护符+护符槽图标/幼虫之歌（Grubsong）.png",
          detail: "使小骑士每次受伤能获得15灵魂。",
        },
        {
          name: "腐臭蛋",
          requirement: 16,
          iconFile: "/icons/收集物/腐臭蛋.png",
        },
        {
          name: "圣巢印章",
          requirement: 23,
          iconFile: "/icons/收集物/圣巢印章.png",
        },
        {
          name: "苍白矿石",
          requirement: 31,
          iconFile: "/icons/收集物/苍白矿石.png",
        },
        {
          name: "国王神像",
          requirement: 38,
          iconFile: "/icons/收集物/国王神像.png",
        },
        {
          name: "蜕变挽歌",
          requirement: 46,
          iconFile: "/icons/护符+护符槽图标/蜕变挽歌（Grubberfly's Elegy）.png",
          detail: "面具血量为满格时，使用骨钉普通攻击会发射剑气，伤害为骨钉每击伤害的一半。",
        },
      ],
    },
  ],
  [SEER_ICON_ID]: [
    {
      title: "收集精华奖励",
      hideHeader: true,
      requirementIconFile: ESSENCE_ICON_FILE,
      requirementUnitLabel: "精华",
      offers: [
        {
          name: "圣巢印章",
          requirement: 100,
          iconFile: "/icons/收集物/圣巢印章.png",
        },
        {
          name: "解锁灵魂沼地",
          requirement: 200,
          iconFile: "/icons/商店商品/灵魂沼地.png",
        },
        {
          name: "苍白矿石",
          requirement: 300,
          iconFile: "/icons/收集物/苍白矿石.png",
        },
        {
          name: "舞梦者",
          requirement: 500,
          iconFile: "/icons/护符+护符槽图标/舞梦者（Dream Wielder）.png",
        },
        {
          name: "容器碎片",
          requirement: 700,
          iconFile: "/icons/收集物/灵魂碎片.png",
        },
        {
          name: "梦之门",
          requirement: 900,
          iconFile: "/icons/商店商品/梦之门.webp",
        },
        {
          name: "神秘蛋",
          requirement: 1200,
          iconFile: "/icons/收集物/神秘蛋.webp",
        },
        {
          name: "面具碎片",
          requirement: 1500,
          iconFile: "/icons/收集物/面具碎片.png",
        },
        {
          name: "觉醒的梦之钉",
          requirement: 1800,
          iconFile: "/icons/商店商品/觉醒的梦之钉.png",
        },
        {
          name: "成就：升天",
          requirement: 2400,
          iconFile: "/icons/商店商品/成就-升天.png",
        },
      ],
    },
  ],
  [SALUBRA_ICON_ID]: [
    {
      title: "出售商品",
      hideHeader: true,
      offers: [
        {
          name: "生命血之心",
          price: 250,
          iconFile: "/icons/护符+护符槽图标/生命血之心（Lifeblood Heart）.png",
        },
        {
          name: "修长之钉",
          price: 300,
          iconFile: "/icons/护符+护符槽图标/修长之钉（Longnail）.png",
        },
        {
          name: "稳定之体",
          price: 120,
          iconFile: "/icons/护符+护符槽图标/稳定之体（Steady Body）.png",
          detail: "使小骑士一般攻击时不会因反作用力后退。",
        },
        {
          name: "萨满之石",
          price: 220,
          iconFile: "/icons/护符+护符槽图标/萨满之石（Shaman Stone）.png",
        },
        {
          name: "快速聚集",
          price: 800,
          iconFile: "/icons/护符+护符槽图标/快速聚集（Quick Focus）.png",
        },
        {
          name: "护符槽",
          detail: "拥有5个护符",
          price: 120,
          iconFile: "/icons/收集物/护符槽图标.png",
        },
        {
          name: "护符槽",
          detail: "拥有10个护符",
          price: 500,
          iconFile: "/icons/收集物/护符槽图标.png",
        },
        {
          name: "护符槽",
          detail: "拥有18个护符",
          price: 900,
          iconFile: "/icons/收集物/护符槽图标.png",
        },
        {
          name: "护符槽",
          detail: "拥有25个护符",
          price: 1400,
          iconFile: "/icons/收集物/护符槽图标.png",
        },
        {
          name: "萨鲁巴的祝福",
          detail: "获得所有护符",
          price: 800,
          iconFile: "/icons/商店商品/萨鲁巴的祝福.webp",
        },
      ],
    },
  ],
  [DIVINE_ICON_ID]: [
    {
      title: "出售商品",
      hideHeader: true,
      offers: [
        {
          name: "坚固力量",
          detail: "将骨钉伤害乘以150%。",
          price: 15000,
          requiredItem: {
            iconFile: "/icons/护符+护符槽图标/易碎力量（Fragile Strength）.png",
            label: "易碎力量",
          },
          iconFile: "/icons/护符+护符槽图标/坚固力量（Unbreakable Strength）.png",
        },
        {
          name: "坚固心脏",
          detail: "增加小骑士两格面具的血量。",
          price: 12000,
          requiredItem: {
            iconFile: "/icons/护符+护符槽图标/易碎心脏（Fragile Heart）.png",
            label: "易碎心脏",
          },
          iconFile: "/icons/护符+护符槽图标/坚固心脏（Unbreakable Heart）.png",
        },
        {
          name: "坚固贪婪",
          detail: "提升敌人掉落的吉欧数量。",
          price: 9000,
          requiredItem: {
            iconFile: "/icons/护符+护符槽图标/易碎贪婪（Fragile Greed）.png",
            label: "易碎贪婪",
          },
          iconFile: "/icons/护符+护符槽图标/坚固贪婪（Unbreakable Greed）.png",
        },
      ],
    },
  ],
  [LEG_EATER_ICON_ID]: [
    {
      title: "出售商品",
      hideHeader: true,
      offers: [
        {
          name: "易碎力量",
          detail: "将骨钉伤害乘以150%，死亡后损坏。",
          price: 600,
          iconFile: "/icons/护符+护符槽图标/易碎力量（Fragile Strength）.png",
        },
        {
          name: "易碎心脏",
          detail: "增加小骑士两格面具的血量，死亡后损坏。",
          price: 350,
          iconFile: "/icons/护符+护符槽图标/易碎心脏（Fragile Heart）.png",
        },
        {
          name: "易碎贪婪",
          detail: "提升敌人掉落的吉欧数量，死亡后损坏。",
          price: 250,
          iconFile: "/icons/护符+护符槽图标/易碎贪婪（Fragile Greed）.png",
        },
      ],
    },
  ],
  [NAILSMITH_ICON_ID]: [
    {
      title: "骨钉升级",
      hideHeader: true,
      offers: [
        {
          name: "锋利的骨钉",
          price: 250,
          iconFile: "/icons/商店商品/锋利的骨钉.webp",
          iconScale: 1.18,
          iconRotation: 90,
        },
        {
          name: "开槽的骨钉",
          price: 800,
          materialCost: {
            amount: 1,
            iconFile: "/icons/收集物/苍白矿石.png",
            label: "苍白矿石",
          },
          iconFile: "/icons/商店商品/开槽的骨钉.webp",
          iconScale: 1.18,
          iconRotation: 90,
        },
        {
          name: "带螺纹的骨钉",
          price: 2000,
          materialCost: {
            amount: 2,
            iconFile: "/icons/收集物/苍白矿石.png",
            label: "苍白矿石",
          },
          iconFile: "/icons/商店商品/带螺纹的骨钉.webp",
          iconScale: 1.18,
          iconRotation: 90,
        },
        {
          name: "纯粹骨钉",
          price: 4000,
          materialCost: {
            amount: 3,
            iconFile: "/icons/收集物/苍白矿石.png",
            label: "苍白矿石",
          },
          iconFile: "/icons/商店商品/纯粹骨钉.webp",
          iconScale: 1.18,
          iconRotation: 90,
        },
      ],
    },
  ],
};

function getMarkerGlow(marker: Marker) {
  if (
    marker.iconId === "5Zyw5qCHK25wYy_plb_mpIXlm77moIcucG5n" ||
    marker.iconId === "5pS26ZuG54mpL-aipuS5i-agkeWbvuaghy5wbmc" ||
    marker.iconId === "5Zyw5qCHK25wYy9waW5fdHJhbV9sb2NhdGlvbiAjNjM4Mi5wbmc"
  ) {
    return undefined;
  }

  if (
    marker.iconId === "5pS26ZuG54mpL-mdouWFt-eijueJhy5wbmc" ||
    marker.iconId === "5pS26ZuG54mpL-eBtemtgueijueJhy5wbmc" ||
    marker.iconId === "5pS26ZuG54mpL-iLjeeZveefv-efsy5wbmc" ||
    marker.iconId === "5pS26ZuG54mpL-WbveeOi-S5i-mtgi3lt6YucG5n" ||
    marker.iconId === "5pS26ZuG54mpL-WbveeOi-S5i-mtgi3lj7MucG5n"
  ) {
    return "drop-shadow(0 0 2px rgba(255, 255, 255, 0.96)) drop-shadow(0 0 6px rgba(214, 230, 255, 0.74))";
  }

  if (
    marker.iconId === "asset_6Ieq5a6a5LmJL-elnuenmOibiy53ZWJw"
  ) {
    return "drop-shadow(0 0 2px rgba(0, 0, 0, 1)) drop-shadow(0 0 6px rgba(8, 4, 14, 0.88))";
  }

  if (
    marker.iconId ===
    "asset_6Ieq5a6a5LmJL-iZmuepuuS5i-W_g--8iFZvaWQgSGVhcnTvvIkucG5n"
  ) {
    return "drop-shadow(0 0 2px rgba(72, 200, 255, 0.92)) drop-shadow(0 0 6px rgba(28, 105, 235, 0.7))";
  }

  if (
    marker.iconId === "asset_6Ieq5a6a5LmJL-S5jOaBqe-8iFVubu-8iS53ZWJw" ||
    marker.iconId === "icon_1785996896672_ezsbsi" ||
    marker.iconId === TROUPE_MASTER_GRIMM_ICON_ID
  ) {
    return "drop-shadow(0 0 2px rgba(255, 224, 72, 0.92)) drop-shadow(0 0 6px rgba(236, 166, 18, 0.7))";
  }

  if (marker.category === "BOSS") {
    return "drop-shadow(0 0 2px rgba(255, 42, 52, 0.9)) drop-shadow(0 0 6px rgba(230, 8, 28, 0.65))";
  }

  if (marker.category === "技能" || marker.category === "剑技") {
    return "drop-shadow(0 0 2px rgba(192, 92, 255, 0.92)) drop-shadow(0 0 6px rgba(125, 42, 230, 0.7))";
  }

  if (marker.category === "地标+npc") {
    return "drop-shadow(0 0 2px rgba(255, 224, 72, 0.92)) drop-shadow(0 0 6px rgba(236, 166, 18, 0.7))";
  }

  if (marker.category === "护符+护符槽图标") {
    return "drop-shadow(0 0 2px rgba(72, 200, 255, 0.92)) drop-shadow(0 0 6px rgba(28, 105, 235, 0.7))";
  }

  return undefined;
}

export default function MapViewer() {
  const viewportRef = useRef<HTMLDivElement>(null);
  const transformRef = useRef<ViewTransform>({ x: 0, y: 0, scale: 1 });
  const minimumScaleRef = useRef(1);
  const dragRef = useRef<DragState | null>(null);
  const regionLabelInteractionRef = useRef<RegionLabelInteraction | null>(null);
  const [transform, setTransform] = useState<ViewTransform>(transformRef.current);
  const [dragging, setDragging] = useState(false);
  const [markers, setMarkers] = useState<Marker[]>([]);
  const [classification, setClassification] = useState<ClassificationData>({
    entries: [],
    relations: [],
  });
  const [filterCollapsed, setFilterCollapsed] = useState(true);
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter | null>(null);
  const [selectedMarker, setSelectedMarker] = useState<Marker | null>(null);
  const [popupTab, setPopupTab] = useState<"description" | "offers">("description");
  const [completedMarkerIds, setCompletedMarkerIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [regionLabelLayouts, setRegionLabelLayouts] =
    useState<RegionLabelLayouts>(INITIAL_REGION_LABEL_LAYOUTS);
  const [selectedRegionLabelId, setSelectedRegionLabelId] = useState<string | null>(
    null,
  );

  const constrainTransform = useCallback((next: ViewTransform) => {
    const viewport = viewportRef.current;
    if (!viewport) return next;

    const scaledWidth = MAP_WIDTH * next.scale;
    const scaledHeight = MAP_HEIGHT * next.scale;
    const horizontalRestingX =
      scaledWidth <= viewport.clientWidth
        ? (viewport.clientWidth - scaledWidth) / 2
        : 0;
    const horizontalMinX =
      scaledWidth <= viewport.clientWidth
        ? horizontalRestingX - MAP_EDGE_DRAG_ALLOWANCE
        : viewport.clientWidth - scaledWidth - MAP_EDGE_DRAG_ALLOWANCE;
    const horizontalMaxX = horizontalRestingX + MAP_DRAG_RIGHT_ALLOWANCE;
    const x = Math.min(horizontalMaxX, Math.max(horizontalMinX, next.x));
    const verticalRestingY =
      scaledHeight <= viewport.clientHeight
        ? (viewport.clientHeight - scaledHeight) / 2
        : 0;
    const verticalMinY =
      scaledHeight <= viewport.clientHeight
        ? verticalRestingY - MAP_EDGE_DRAG_ALLOWANCE
        : viewport.clientHeight - scaledHeight - MAP_EDGE_DRAG_ALLOWANCE;
    const verticalMaxY = verticalRestingY + MAP_EDGE_DRAG_ALLOWANCE;
    const y = Math.min(verticalMaxY, Math.max(verticalMinY, next.y));

    return { ...next, x, y };
  }, []);

  const updateTransform = useCallback(
    (next: ViewTransform) => {
      const constrained = constrainTransform(next);
      transformRef.current = constrained;
      setTransform(constrained);
    },
    [constrainTransform],
  );

  const fitMap = useCallback(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const scale = Math.min(
      viewport.clientWidth / MAP_WIDTH,
      viewport.clientHeight / MAP_HEIGHT,
    );
    minimumScaleRef.current = scale * MIN_SCALE_FACTOR;
    updateTransform({
      x: (viewport.clientWidth - MAP_WIDTH * scale) / 2,
      y: (viewport.clientHeight - MAP_HEIGHT * scale) / 2,
      scale,
    });
  }, [updateTransform]);

  useEffect(() => {
    fitMap();
    const viewport = viewportRef.current;
    if (!viewport) return;

    const observer = new ResizeObserver(fitMap);
    observer.observe(viewport);
    return () => observer.disconnect();
  }, [fitMap]);

  useEffect(() => {
    const controller = new AbortController();

    Promise.all([
      fetch("/project.json", { signal: controller.signal }).then((response) => {
        if (!response.ok) throw new Error("无法读取地图点位数据");
        return response.json() as Promise<ProjectData>;
      }),
      fetch("/icon-classification.json", { signal: controller.signal }).then(
        (response) => {
          if (!response.ok) throw new Error("无法读取图标分类数据");
          return response.json() as Promise<ClassificationData>;
        },
      ),
    ])
      .then(([project, classificationData]) => {
        setMarkers(project.markers ?? []);
        setClassification({
          entries: classificationData.entries ?? [],
          relations: classificationData.relations ?? [],
        });
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        console.error(error);
      });

    return () => controller.abort();
  }, []);

  const updateRegionLabelLayout = (
    labelId: string,
    layout: RegionLabelLayout,
  ) => {
    setRegionLabelLayouts((current) => {
      return { ...current, [labelId]: layout };
    });
  };

  const startRegionLabelInteraction = (
    event: React.PointerEvent<HTMLElement>,
    labelId: string,
    mode: "move" | "resize",
    directionX: -1 | 0 | 1 = 0,
    directionY: -1 | 0 | 1 = 0,
  ) => {
    if (event.button !== 0) return;
    const layout = regionLabelLayouts[labelId];
    if (!layout) return;
    event.preventDefault();
    event.stopPropagation();
    regionLabelInteractionRef.current = {
      pointerId: event.pointerId,
      labelId,
      mode,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startLayout: layout,
      directionX,
      directionY,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    setSelectedRegionLabelId(labelId);
  };

  const moveRegionLabelInteraction = (event: React.PointerEvent<HTMLElement>) => {
    const interaction = regionLabelInteractionRef.current;
    if (!interaction || interaction.pointerId !== event.pointerId) return;
    event.preventDefault();
    event.stopPropagation();
    const deltaX =
      (event.clientX - interaction.startClientX) / transformRef.current.scale;
    const deltaY =
      (event.clientY - interaction.startClientY) / transformRef.current.scale;

    if (interaction.mode === "move") {
      updateRegionLabelLayout(interaction.labelId, {
        ...interaction.startLayout,
        x: Math.min(
          100,
          Math.max(0, interaction.startLayout.x + (deltaX / MAP_WIDTH) * 100),
        ),
        y: Math.min(
          100,
          Math.max(0, interaction.startLayout.y + (deltaY / MAP_HEIGHT) * 100),
        ),
      });
      return;
    }

    const sizeDelta =
      (deltaX * interaction.directionX + deltaY * interaction.directionY) / 2;
    const isText = interaction.labelId.startsWith("text:");
    updateRegionLabelLayout(interaction.labelId, {
      ...interaction.startLayout,
      size: Math.min(
        isText ? 80 : 800,
        Math.max(isText ? 16 : 60, interaction.startLayout.size + sizeDelta),
      ),
    });
  };

  const stopRegionLabelInteraction = (event: React.PointerEvent<HTMLElement>) => {
    const interaction = regionLabelInteractionRef.current;
    if (!interaction || interaction.pointerId !== event.pointerId) return;
    event.preventDefault();
    event.stopPropagation();
    regionLabelInteractionRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  useEffect(() => {
    try {
      const saved = JSON.parse(
        localStorage.getItem(COMPLETION_STORAGE_KEY) ?? "[]",
      );
      if (Array.isArray(saved)) {
        setCompletedMarkerIds(
          new Set(saved.filter((id): id is string => typeof id === "string")),
        );
      }
    } catch (error) {
      console.error("无法读取已完成点位", error);
    }
  }, []);

  const toggleMarkerCompleted = (markerId: string) => {
    setCompletedMarkerIds((current) => {
      const next = new Set(current);
      if (next.has(markerId)) {
        next.delete(markerId);
      } else {
        next.add(markerId);
      }

      try {
        localStorage.setItem(COMPLETION_STORAGE_KEY, JSON.stringify([...next]));
      } catch (error) {
        console.error("无法保存已完成点位", error);
      }
      return next;
    });
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;

    setSelectedRegionLabelId(null);

    const current = transformRef.current;
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: current.x,
      originY: current.y,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragging(true);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    updateTransform({
      ...transformRef.current,
      x: drag.originX + event.clientX - drag.startX,
      y: drag.originY + event.clientY - drag.startY,
    });
  };

  const stopDragging = (event: React.PointerEvent<HTMLDivElement>) => {
    if (dragRef.current?.pointerId !== event.pointerId) return;
    dragRef.current = null;
    setDragging(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const handleWheel = (event: React.WheelEvent<HTMLDivElement>) => {
    event.preventDefault();
    const viewport = viewportRef.current;
    if (!viewport) return;

    const bounds = viewport.getBoundingClientRect();
    const pointerX = event.clientX - bounds.left;
    const pointerY = event.clientY - bounds.top;
    const current = transformRef.current;
    const zoomFactor = Math.exp(-event.deltaY * 0.0015);
    const nextScale = Math.min(
      MAX_SCALE,
      Math.max(minimumScaleRef.current, current.scale * zoomFactor),
    );
    const mapX = (pointerX - current.x) / current.scale;
    const mapY = (pointerY - current.y) / current.scale;

    updateTransform({
      scale: nextScale,
      x: pointerX - mapX * nextScale,
      y: pointerY - mapY * nextScale,
    });
  };

  const getPopupPosition = (marker: Marker) => {
    const viewportWidth = viewportRef.current?.clientWidth ?? 0;
    const markerX = transform.x + (marker.x / 100) * MAP_WIDTH * transform.scale;
    const markerY = transform.y + (marker.y / 100) * MAP_HEIGHT * transform.scale;
    const popupHalfWidth = Math.min(190, Math.max(0, (viewportWidth - 24) / 2));
    const left = Math.min(
      Math.max(markerX, popupHalfWidth + 12),
      Math.max(popupHalfWidth + 12, viewportWidth - popupHalfWidth - 12),
    );
    const showBelow = markerY < 157;
    const markerRadius = (marker.size * transform.scale) / 2;

    return {
      left,
      top: showBelow ? markerY + markerRadius + 14 : markerY - markerRadius - 14,
      showBelow,
    };
  };

  const popupPosition = selectedMarker ? getPopupPosition(selectedMarker) : null;
  const selectedMerchantSections = selectedMarker
    ? (MERCHANT_OFFERS[selectedMarker.iconId] ?? [])
    : [];
  const selectedDescriptionParagraphs = selectedMarker?.description?.trim()
    ? selectedMarker.description
        .split(/\r?\n/)
        .map((paragraph) => paragraph.trim())
        .filter(Boolean)
    : [];
  const selectedPopupHighlight = selectedMarker?.highlight;
  const selectedHighlightLeadingIcon = selectedMarker
    ? HIGHLIGHT_LEADING_ICONS[selectedMarker.name]
    : undefined;
  const selectedClassification = selectedMarker
    ? (classification.entries.find(
        (entry) =>
          entry.iconId === selectedMarker.iconId &&
          entry.name === selectedMarker.name &&
          entry.primary,
      ) ??
      classification.entries.find(
        (entry) => entry.iconId === selectedMarker.iconId && entry.primary,
      ))
    : undefined;
  const getPopupItemGlowClass = (itemName = "", iconFile = "") => {
    const decodedIconFile = decodeURIComponent(iconFile);
    const iconBaseName =
      decodedIconFile.split("/").pop()?.replace(/\.[^.]+$/, "") ?? "";
    const normalizedCandidates = new Set([
      normalizeItemName(itemName),
      normalizeItemName(iconBaseName),
    ]);
    if (
      normalizedCandidates.has("面具碎片") ||
      normalizedCandidates.has("容器碎片") ||
      normalizedCandidates.has("灵魂碎片")
    ) {
      return " is-white-glow";
    }
    const isCharm = classification.entries.some(
      (entry) =>
        entry.primary === "技能" &&
        entry.secondary === "护符" &&
        normalizedCandidates.has(normalizeItemName(entry.name)),
    );
    const isCharmIconFile =
      decodedIconFile.includes("/护符+护符槽图标/") &&
      !iconBaseName.includes("护符槽");
    if (isCharm || isCharmIconFile) return " is-blue-glow";
    const isNailArt = classification.entries.some(
      (entry) =>
        entry.primary === "技能" &&
        entry.secondary === "骨钉技艺" &&
        normalizedCandidates.has(normalizeItemName(entry.name)),
    );
    if (isNailArt || decodedIconFile.includes("/剑技/")) {
      return " is-purple-glow";
    }
    return "";
  };
  const selectedCategoryLabel = selectedMarker
    ? selectedClassification?.primary === "Boss" && selectedClassification.secondary
      ? selectedClassification.secondary
      : (selectedClassification?.primary ?? selectedMarker.category)
    : "";
  const selectedMarkerSupportsCompletion = Boolean(
    selectedClassification?.primary &&
      COMPLETABLE_PRIMARY_CATEGORIES.has(selectedClassification.primary),
  );
  const selectedSecondaryCompletionGroup =
    selectedClassification?.primary && selectedClassification.secondary
      ? markers.filter((marker) => {
          const markerClassification =
            classification.entries.find(
              (entry) =>
                entry.iconId === marker.iconId &&
                entry.name === marker.name &&
                entry.primary,
            ) ??
            classification.entries.find(
              (entry) => entry.iconId === marker.iconId && entry.primary,
            );

          return (
            markerClassification?.primary === selectedClassification.primary &&
            markerClassification.secondary === selectedClassification.secondary
          );
        })
      : [];
  const selectedSecondaryCompletedCount =
    selectedSecondaryCompletionGroup.filter((marker) =>
      completedMarkerIds.has(marker.id),
    ).length;

  const categoryGroups = useMemo(() => {
    const groups = new Map<
      string,
      Map<
        string,
        { name: string; count: number; iconFile?: string; iconScale?: number }
      >
    >();
    const popupOccurrenceCounts = new Map<string, number>();
    for (const sections of Object.values(MERCHANT_OFFERS)) {
      for (const section of sections) {
        for (const offer of section.offers) {
          const offerName = normalizeItemName(offer.name);
          popupOccurrenceCounts.set(
            offerName,
            (popupOccurrenceCounts.get(offerName) ?? 0) + 1,
          );
          if (offer.rewardIconLabel && offer.rewardIconLabel !== offer.name) {
            const rewardName = normalizeItemName(offer.rewardIconLabel);
            popupOccurrenceCounts.set(
              rewardName,
              (popupOccurrenceCounts.get(rewardName) ?? 0) + 1,
            );
          }
        }
      }
    }
    for (const marker of markers) {
      for (const icon of getPopupEmbeddedItemIcons(marker.name)) {
        const itemName = normalizeItemName(icon.alt);
        popupOccurrenceCounts.set(
          itemName,
          (popupOccurrenceCounts.get(itemName) ?? 0) + 1,
        );
      }
    }
    for (const entry of classification.entries) {
      if (!entry.primary) continue;
      if (!groups.has(entry.primary)) groups.set(entry.primary, new Map());
      if (!entry.secondary) continue;
      const secondary = groups.get(entry.primary)!;
      const current = secondary.get(entry.secondary);
      const matchingMarkers = markers.filter(
        (item) => item.iconId === entry.iconId && item.name === entry.name,
      );
      const marker = matchingMarkers[0];
      const popupIconFile = entry.iconId.startsWith("popup:")
        ? `/${entry.iconId.slice("popup:".length)}`
        : undefined;
      const popupCount = popupOccurrenceCounts.get(normalizeItemName(entry.name)) ?? 0;
      const countedOccurrences =
        (entry.location.includes("地图") ? matchingMarkers.length : 0) +
        (entry.location.includes("弹窗") ? popupCount : 0);
      const entryCount = countedOccurrences > 0 ? countedOccurrences : 1;
      const iconOverride =
        FILTER_CATEGORY_ICON_OVERRIDES[`${entry.primary}\u0000${entry.secondary}`];
      secondary.set(entry.secondary, {
        name: entry.secondary,
        count: (current?.count ?? 0) + entryCount,
        iconFile:
          iconOverride?.iconFile ??
          current?.iconFile ??
          (marker
            ? decodeURIComponent(marker.iconFile).replace(/^\.\//, "/")
            : popupIconFile),
        iconScale: iconOverride?.iconScale ?? current?.iconScale,
      });
    }
    return [...groups.entries()].map(([primary, secondaryMap]) => ({
      primary,
      secondary: [...secondaryMap.values()].sort(
        (left, right) => right.count - left.count,
      ),
    }));
  }, [classification.entries, markers]);

  const allSecondaryCategoryKeys = useMemo(
    () =>
      categoryGroups.flatMap((group) =>
        group.secondary.map((secondary) => `${group.primary}\u0000${secondary.name}`),
      ),
    [categoryGroups],
  );
  const allSecondaryCategoriesSelected =
    allSecondaryCategoryKeys.length > 0 &&
    allSecondaryCategoryKeys.every((key) =>
      categoryFilter?.secondaries?.includes(key),
    );

  const normalizedSearch = searchQuery.trim().toLocaleLowerCase("zh-CN");
  const visibleMarkers = useMemo(() => {
    if (!categoryFilter && !normalizedSearch) return markers;

    const categoryMatchedEntries = classification.entries.filter((entry) => {
      const selectedSecondaries = categoryFilter?.secondaries ?? [];
      return !categoryFilter ||
        selectedSecondaries.includes(`${entry.primary}\u0000${entry.secondary}`);
    });
    const categoryMatchedKeys = new Set(
      categoryMatchedEntries.map((entry) => `${entry.iconId}\u0000${entry.name}`),
    );
    const categoryMatchedNames = new Set(
      categoryMatchedEntries.map((entry) => normalizeItemName(entry.name)),
    );
    const categoryRelatedOwnerIds = new Set(
      classification.relations
        .filter((relation) =>
          categoryMatchedNames.has(normalizeItemName(relation.itemName)),
        )
        .map((relation) => relation.ownerIconId),
    );

    return markers.filter((marker) => {
      const categoryMatches = !categoryFilter ||
        categoryMatchedKeys.has(`${marker.iconId}\u0000${marker.name}`) ||
        categoryRelatedOwnerIds.has(marker.iconId) ||
        getPopupEmbeddedItemIcons(marker.name).some((icon) =>
          categoryMatchedNames.has(normalizeItemName(icon.alt)),
        );
      if (!categoryMatches) return false;
      if (!normalizedSearch) return true;

      const markerText = `${marker.name}\n${marker.description ?? ""}\n${marker.highlight?.text ?? ""}`
        .toLocaleLowerCase("zh-CN");
      if (markerText.includes(normalizedSearch)) return true;

      const popupMatches = (MERCHANT_OFFERS[marker.iconId] ?? []).some(
        (section) => {
          const sectionText = `${section.title}\n${section.description ?? ""}`
            .toLocaleLowerCase("zh-CN");
          if (sectionText.includes(normalizedSearch)) return true;
          return section.offers.some((offer) =>
            [
              offer.name,
              offer.detail,
              offer.rewardIconLabel,
              offer.requiredItem?.label,
              offer.materialCost?.label,
            ]
              .filter(Boolean)
              .some((text) =>
                text!.toLocaleLowerCase("zh-CN").includes(normalizedSearch),
              ),
          );
        },
      );
      if (popupMatches) return true;

      return classification.relations.some(
        (relation) =>
          relation.ownerIconId === marker.iconId &&
          relation.itemName
            .toLocaleLowerCase("zh-CN")
            .includes(normalizedSearch),
      );
    });
  }, [categoryFilter, classification, markers, normalizedSearch]);

  useEffect(() => {
    if (
      selectedMarker &&
      !visibleMarkers.some((marker) => marker.id === selectedMarker.id)
    ) {
      setSelectedMarker(null);
    }
  }, [selectedMarker, visibleMarkers]);

  const toggleSecondaryCategory = (primary: string, secondary: string) => {
    const selectionKey = `${primary}\u0000${secondary}`;
    setCategoryFilter((current) => {
      const selected = new Set(current?.secondaries ?? []);
      if (selected.has(selectionKey)) {
        selected.delete(selectionKey);
      } else {
        selected.add(selectionKey);
      }
      return selected.size > 0
        ? { secondaries: [...selected] }
        : null;
    });
  };

  const toggleAllSecondaryCategories = () => {
    setCategoryFilter(
      allSecondaryCategoriesSelected
        ? null
        : { secondaries: allSecondaryCategoryKeys },
    );
  };

  const resetFilters = () => {
    setCategoryFilter(null);
    setSearchInput("");
    setSearchQuery("");
  };

  const openMarker = (marker: Marker) => {
    setSelectedMarker(marker);
    setPopupTab(MERCHANT_OFFERS[marker.iconId]?.length ? "offers" : "description");
  };

  return (
    <main
      ref={viewportRef}
      className={`map-viewport${dragging ? " is-dragging" : ""}`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={stopDragging}
      onPointerCancel={stopDragging}
      onWheel={handleWheel}
      aria-label="空洞骑士地图"
    >
      <button
        type="button"
        className={`map-filter-toggle${filterCollapsed ? " is-collapsed" : ""}`}
        aria-label={filterCollapsed ? "展开筛选栏" : "收起筛选栏"}
        aria-expanded={!filterCollapsed}
        onPointerDown={(event) => event.stopPropagation()}
        onClick={() => setFilterCollapsed((current) => !current)}
      >
        <span aria-hidden="true">{filterCollapsed ? "›" : "‹"}</span>
      </button>
      <aside
        className={`map-filter-panel${filterCollapsed ? " is-collapsed" : ""}`}
        aria-label="地图图标筛选"
        onPointerDown={(event) => event.stopPropagation()}
        onWheel={(event) => event.stopPropagation()}
      >
        <div className="map-filter-logo" aria-hidden="true">
          <img src="/assets/hollow-knight-logo.png" alt="" />
        </div>
        <header className="map-filter-header">
          <div>
            <h1>图标筛选</h1>
            <p>当前显示 {visibleMarkers.length}/{markers.length}</p>
          </div>
          <div className="map-filter-header-actions">
            <button
              type="button"
              className="map-filter-select-all"
              aria-pressed={allSecondaryCategoriesSelected}
              onClick={toggleAllSecondaryCategories}
            >
              {allSecondaryCategoriesSelected ? "取消全选" : "全选"}
            </button>
            <button
              type="button"
              className="map-filter-select-all"
              onClick={resetFilters}
            >
              重置
            </button>
          </div>
        </header>
        <div className="map-filter-search">
          <input
            type="search"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="搜索图标名称、描述或物品"
            aria-label="搜索图标名称、描述或弹窗物品"
          />
          <button
            type="button"
            className="map-filter-search-submit"
            aria-label="确认搜索"
            onClick={() => setSearchQuery(searchInput)}
          >
            搜索
          </button>
        </div>
        <div className="map-filter-categories">
          {categoryGroups.map((group) => (
            <section className="map-filter-category-page" key={group.primary}>
              <header>
                <h2>{group.primary}</h2>
              </header>
              <div className="map-filter-secondary-grid">
                {group.secondary.map((secondary) => (
                  <button
                    type="button"
                    key={secondary.name}
                    className={
                      categoryFilter?.secondaries?.includes(
                        `${group.primary}\u0000${secondary.name}`,
                      )
                        ? "is-active"
                        : ""
                    }
                    aria-pressed={Boolean(
                      categoryFilter?.secondaries?.includes(
                        `${group.primary}\u0000${secondary.name}`,
                      ),
                    )}
                    onClick={() =>
                      toggleSecondaryCategory(group.primary, secondary.name)
                    }
                  >
                    <span className="map-filter-secondary-icon">
                      {secondary.iconFile ? (
                        <img
                          src={secondary.iconFile}
                          alt=""
                          draggable={false}
                          style={
                            secondary.iconScale
                              ? { transform: `scale(${secondary.iconScale})` }
                              : undefined
                          }
                        />
                      ) : (
                        <span aria-hidden="true">◇</span>
                      )}
                    </span>
                    <span className="map-filter-secondary-copy">
                      <strong>{secondary.name}</strong>
                      <small>{secondary.count}</small>
                    </span>
                  </button>
                ))}
              </div>
            </section>
          ))}
        </div>
        {(categoryFilter || normalizedSearch) && visibleMarkers.length === 0 && (
          <p className="map-filter-empty">没有找到符合条件的图标</p>
        )}
      </aside>
      <div
        className="map-canvas"
        style={
          {
            transform: `translate3d(${transform.x}px, ${transform.y}px, 0) scale(${transform.scale})`,
            "--region-handle-size": `${10 / transform.scale}px`,
            "--region-handle-border": `${1 / transform.scale}px`,
            "--region-handle-glow": `${5 / transform.scale}px`,
          } as React.CSSProperties
        }
      >
        <img
          className="hallownest-map"
          src="/assets/hallownest-map.png"
          alt="空洞骑士圣巢地图"
          width={MAP_WIDTH}
          height={MAP_HEIGHT}
          draggable={false}
        />
        <div className="map-region-label-layer" aria-label="区域名称层">
          {MAP_REGION_LABELS.map((region) => {
            const labelId = `image:${region.name}`;
            const layout = regionLabelLayouts[labelId];
            return (
              <div
                key={labelId}
                className="map-region-label-editor is-image"
                style={{
                  left: `${layout.x}%`,
                  top: `${layout.y}%`,
                  width: `${layout.size}px`,
                }}
              >
                <img
                  className="map-region-label-image"
                  src={`/assets/region-labels/${region.name}.png`}
                  alt={region.name}
                  draggable={false}
                />
              </div>
            );
          })}
          {MAP_REGION_CHINESE_LABELS.map((region) => {
            const labelId = `text:${region.name}`;
            const layout = regionLabelLayouts[labelId];
            return (
              <div
                key={labelId}
                className="map-region-label-editor is-text"
                style={
                  {
                    left: `${layout.x}%`,
                    top: `${layout.y}%`,
                    fontSize: `${layout.size}px`,
                    "--region-edge-rgb": getRgbChannels(region.edgeGlow),
                    "--region-fog-rgb": getRgbChannels(region.fogGlow),
                    "--region-stroke-width": "1.5px",
                  } as React.CSSProperties
                }
              >
                <span>{region.name}</span>
              </div>
            );
          })}
        </div>
        <div className="marker-layer">
          {visibleMarkers.map((marker) => (
            <button
              key={marker.id}
              type="button"
              className="map-marker-button"
              aria-label={`查看${marker.name}的描述`}
              onPointerDown={(event) => event.stopPropagation()}
              onClick={() => openMarker(marker)}
              style={{
                left: `${marker.x}%`,
                top: `${marker.y}%`,
                width: `${marker.size}px`,
              }}
            >
              <img
                className={`map-marker${marker.category === "BOSS" ? " is-boss" : ""}${marker.category === "技能" || marker.category === "剑技" ? " is-ability" : ""}${marker.category === "地标+npc" ? " is-landmark" : ""}${marker.category === "护符+护符槽图标" ? " is-charm" : ""}`}
                src={decodeURIComponent(marker.iconFile).replace(/^\.\//, "/")}
                alt=""
                draggable={false}
                style={{ filter: getMarkerGlow(marker) }}
              />
            </button>
          ))}
        </div>
      </div>
      {selectedMarker && popupPosition && (
        <section
          className={`marker-popup${popupPosition.showBelow ? " is-below" : ""}`}
          style={{ left: `${popupPosition.left}px`, top: `${popupPosition.top}px` }}
          aria-live="polite"
          onPointerDown={(event) => event.stopPropagation()}
          onWheel={(event) => event.stopPropagation()}
        >
          <header className="marker-popup-header">
            <div className="marker-popup-heading">
              <div className="marker-popup-title-line">
                <h2>{selectedMarker.name}</h2>
                {selectedCategoryLabel && (
                  <span className="marker-popup-category-tag">
                    {selectedCategoryLabel}
                  </span>
                )}
              </div>
            </div>
            <button
              type="button"
              className="marker-popup-close"
              aria-label="关闭描述"
              onClick={() => setSelectedMarker(null)}
            >
              ×
            </button>
          </header>
          {selectedMerchantSections.length > 0 && (
            <nav className="marker-popup-tabs" aria-label="弹窗内容">
              <button
                type="button"
                className={popupTab === "offers" ? "is-active" : ""}
                aria-pressed={popupTab === "offers"}
                onClick={() => setPopupTab("offers")}
              >
                {OFFER_TAB_LABELS[selectedMarker.iconId] ?? "出售商品"}
              </button>
              <button
                type="button"
                className={popupTab === "description" ? "is-active" : ""}
                aria-pressed={popupTab === "description"}
                onClick={() => setPopupTab("description")}
              >
                人物介绍
              </button>
            </nav>
          )}
          <div className="marker-popup-content">
            {(selectedMerchantSections.length === 0 || popupTab === "description") && (
              <div
                className={`marker-description${selectedDescriptionParagraphs.length ? "" : " is-empty"}`}
              >
                {selectedPopupHighlight && (
                  <aside
                    className={`marker-description-highlight${selectedHighlightLeadingIcon ? " has-leading-icon" : ""}${selectedMarker.name === "布蕾塔(Bretta)" ? " has-compact-leading-icon" : ""}`}
                    aria-label="重要描述"
                  >
                    {selectedHighlightLeadingIcon && (
                      <img
                        className={`marker-description-highlight-icon${getPopupItemGlowClass(selectedHighlightLeadingIcon.alt, selectedHighlightLeadingIcon.src)}`}
                        src={selectedHighlightLeadingIcon.src}
                        alt={selectedHighlightLeadingIcon.alt}
                      />
                    )}
                    <p>{selectedPopupHighlight.text}</p>
                    {HIGHLIGHT_ITEM_NOTES[selectedMarker.name] && (
                      <div className="marker-highlight-item-note">
                        <img
                          className={getPopupItemGlowClass(
                            HIGHLIGHT_ITEM_NOTES[selectedMarker.name].alt,
                            HIGHLIGHT_ITEM_NOTES[selectedMarker.name].src,
                          ).trim()}
                          src={HIGHLIGHT_ITEM_NOTES[selectedMarker.name].src}
                          alt={HIGHLIGHT_ITEM_NOTES[selectedMarker.name].alt}
                        />
                        <div>
                          {HIGHLIGHT_ITEM_NOTES[selectedMarker.name].paragraphs.map(
                            (paragraph) => <p key={paragraph}>{paragraph}</p>,
                          )}
                        </div>
                      </div>
                    )}
                  </aside>
                )}
                {selectedDescriptionParagraphs.length ? (
                  selectedDescriptionParagraphs.map((paragraph, index) => (
                    <p key={`${index}-${paragraph.slice(0, 12)}`}>
                      {paragraph.split("[GEO]").map((part, partIndex, parts) => (
                        <span key={`${partIndex}-${part.slice(0, 8)}`}>
                          {part}
                          {partIndex < parts.length - 1 && (
                            <img
                              className="marker-description-geo-icon"
                              src="/assets/geo.png"
                              alt="吉欧"
                            />
                          )}
                        </span>
                      ))}
                    </p>
                  ))
                ) : (
                  <p>暂无描述</p>
                )}
              </div>
            )}
            {selectedMerchantSections.length > 0 && popupTab === "offers" && (
              <section className="merchant-offers" aria-label="出售物品与奖励">
                {selectedMerchantSections.map((section) => (
                    <section className="merchant-offer-section" key={section.title}>
                      {!section.hideHeader && (
                        <>
                          <header className="merchant-section-header">
                            <span className="merchant-section-title">
                              {section.iconFile && (
                                <img src={section.iconFile} alt="" draggable={false} />
                              )}
                              {section.title}
                            </span>
                            {typeof section.unlockPrice === "number" ? (
                              <span
                                className="merchant-section-unlock"
                                aria-label={`解锁需要 ${section.unlockPrice} 吉欧`}
                              >
                                解锁：<strong>{section.unlockPrice}</strong>
                                <img src="/assets/geo.png" alt="吉欧" draggable={false} />
                              </span>
                            ) : (
                              !section.hideCount && <small>{section.offers.length}件</small>
                            )}
                          </header>
                          {section.description && (
                            <p className="merchant-section-description">
                              {section.description}
                            </p>
                          )}
                        </>
                      )}
                      <div className="merchant-offer-list">
                          {section.offers.map((offer) => (
                            <article
                              className={`merchant-offer${offer.geoReward ? " is-reward-row" : ""}`}
                              key={`${section.title}-${offer.name}-${offer.detail ?? offer.price ?? "reward"}`}
                            >
                              {!offer.geoReward && <span className="merchant-offer-icons">
                                {offer.iconFile ? (
                                  <img
                                    className={`merchant-offer-icon${getPopupItemGlowClass(offer.name, offer.iconFile)}`}
                                    src={offer.iconFile}
                                    alt=""
                                    draggable={false}
                                    style={
                                      offer.iconScale || offer.iconRotation
                                        ? {
                                            transform: `${offer.iconRotation ? `rotate(${offer.iconRotation}deg)` : ""} ${offer.iconScale ? `scale(${offer.iconScale})` : ""}`.trim(),
                                          }
                                        : undefined
                                    }
                                  />
                                ) : (
                                  <span
                                    className="merchant-offer-icon-fallback"
                                    aria-hidden="true"
                                  >
                                    灯
                                  </span>
                                )}
                                {offer.secondaryIconFile && (
                                  <img
                                    className={`merchant-offer-icon${getPopupItemGlowClass(offer.name, offer.secondaryIconFile)}`}
                                    src={offer.secondaryIconFile}
                                    alt=""
                                    draggable={false}
                                  />
                                )}
                              </span>}
                              <span className="merchant-offer-name">
                                <strong>{offer.name}</strong>
                                {offer.detail && <small>{offer.detail}</small>}
                              </span>
                              {typeof offer.price === "number" ? (
                                <span
                                  className="merchant-offer-price"
                                  aria-label={
                                    offer.requiredItem
                                      ? `${offer.requiredItem.label}，加 ${offer.price} 吉欧`
                                      : offer.materialCost
                                      ? `${offer.price} 吉欧，加 ${offer.materialCost.amount} 个${offer.materialCost.label}`
                                      : `${offer.price} 吉欧`
                                  }
                                >
                                  {offer.requiredItem && (
                                    <>
                                      <img
                                        className="merchant-offer-required-item"
                                        src={offer.requiredItem.iconFile}
                                        alt={offer.requiredItem.label}
                                        draggable={false}
                                      />
                                      <span aria-hidden="true">+</span>
                                    </>
                                  )}
                                  <strong>{offer.price}</strong>
                                  <img src="/assets/geo.png" alt="吉欧" draggable={false} />
                                  {offer.materialCost && (
                                    <>
                                      <span aria-hidden="true">+</span>
                                      <strong>{offer.materialCost.amount}</strong>
                                      <img
                                        src={offer.materialCost.iconFile}
                                        alt={offer.materialCost.label}
                                        draggable={false}
                                      />
                                    </>
                                  )}
                                </span>
                              ) : offer.geoReward ? (
                                <span
                                  className="merchant-offer-price merchant-offer-reward"
                                  aria-label={`奖励${offer.rewardIconLabel ? ` ${offer.rewardIconLabel}，加` : ""} ${offer.geoReward} 吉欧`}
                                >
                                  <span>奖励：</span>
                                  {offer.rewardIconFile && (
                                    <>
                                      <img
                                        className={`merchant-offer-reward-item${getPopupItemGlowClass(offer.rewardIconLabel ?? offer.name, offer.rewardIconFile)}`}
                                        src={offer.rewardIconFile}
                                        alt={offer.rewardIconLabel ?? "奖励物品"}
                                        draggable={false}
                                      />
                                      <span aria-hidden="true">+</span>
                                    </>
                                  )}
                                  <strong>{offer.geoReward}</strong>
                                  <img src="/assets/geo.png" alt="吉欧" draggable={false} />
                                </span>
                              ) : typeof offer.requirement === "number" &&
                                section.requirementIconFile ? (
                                <span
                                  className="merchant-offer-price merchant-offer-requirement"
                                  aria-label={`需要收集 ${offer.requirement} ${section.requirementUnitLabel ?? "收集物"}`}
                                >
                                  <strong>{offer.requirement}</strong>
                                  <img
                                    src={section.requirementIconFile}
                                    alt=""
                                    draggable={false}
                                  />
                                </span>
                              ) : null}
                            </article>
                          ))}
                      </div>
                    </section>
                ))}
              </section>
            )}
          </div>
          {selectedMarkerSupportsCompletion && (
            <footer className="marker-popup-actions">
              <button
                type="button"
                className={`marker-complete-button${completedMarkerIds.has(selectedMarker.id) ? " is-completed" : ""}`}
                aria-pressed={completedMarkerIds.has(selectedMarker.id)}
                onClick={() => toggleMarkerCompleted(selectedMarker.id)}
              >
                {completedMarkerIds.has(selectedMarker.id) ? "取消完成" : "已完成"}
              </button>
              {selectedClassification?.primary !== "Boss" &&
                selectedSecondaryCompletionGroup.length > 1 && (
                  <span className="marker-completion-count">
                    完成进度 {selectedSecondaryCompletedCount}/
                    {selectedSecondaryCompletionGroup.length}
                  </span>
                )}
            </footer>
          )}
        </section>
      )}
    </main>
  );
}
