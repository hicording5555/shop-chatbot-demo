import type { Faq, MenuItem, Shop } from '../types';
import { INDUSTRY_LABEL } from '../types';
import type { NicheId } from '../lib/route';

/**
 * 見込み客ごとのデモは、このオブジェクトを複製して
 * 会社名・色・対応エリア・価格表・電話・営業時間・予約URL を差し替える。
 * 会話の手順は業種テンプレート側にあり、金額の文面は価格表から組み立てる。
 */

export interface PaintPriceRow {
  building: 'house2' | 'house3';
  size: 's25' | 's35' | 's45' | 's46' | 'unknown';
  /** 外壁のみ。税込・円。足場と高圧洗浄を含む。 */
  wallMin: number;
  wallMax: number;
  /** 屋根も塗る場合。税込・円。 */
  bothMin: number;
  bothMax: number;
}

export interface JukuCourse {
  grade: 'elementary' | 'junior' | 'high';
  goal: 'test' | 'exam' | 'weak';
  name: string;
  /** 税込の月額・円 */
  monthlyTaxIn: number;
  times: string;
}

export interface SeitaiMenu {
  area: 'neck' | 'waist' | 'posture';
  name: string;
  minutes: number;
  /** 税込・円 */
  priceTaxIn: number;
}

export interface NicheTemplate {
  id: NicheId;
  label: string;
  shop: Shop;
  painting?: { rows: PaintPriceRow[]; alcExtra: number };
  juku?: { courses: JukuCourse[] };
  seitai?: {
    menus: SeitaiMenu[];
    firstVisit: { name: string; minutes: number; priceTaxIn: number };
  };
}

const PAINTING_ID = '44444444-4444-4444-8444-444444444444';
const JUKU_ID = '55555555-5555-4555-8555-555555555555';
const SEITAI_ID = '66666666-6666-4666-8666-666666666666';

function shop(input: Shop): Shop {
  return input;
}

export const NICHE_TEMPLATES: NicheTemplate[] = [
  {
    id: 'painting',
    label: '外壁・屋根塗装',
    shop: shop({
      id: PAINTING_ID,
      slug: 'aoba',
      industry: 'painting',
      plan: 'full',
      name: 'あおば塗装（架空）',
      published: true,
      phone: '03-0000-4100',
      email: 'aoba@example.com',
      address: '架空県架空市あおば町1-2-3',
      hours: '8:00〜18:00',
      closedDays: '日曜・祝日',
      accessText: '架空駅から車で15分',
      mapUrl: 'https://www.openstreetmap.org/search?query=%E6%9E%B6%E7%A9%BA%E5%B8%82',
      parking: '事務所前に来客用が2台あります。',
      reservationUrl: '/reserve/aoba',
      reservationLabel: '無料の現地調査を予約する',
      handoffBusinessDays: 1,
      extra: { area: '架空市とその周辺', brandColor: '#1f4b6e' },
    }),
    painting: {
      alcExtra: 50000,
      rows: [
        { building: 'house2', size: 's25', wallMin: 680000, wallMax: 880000, bothMin: 980000, bothMax: 1280000 },
        { building: 'house2', size: 's35', wallMin: 780000, wallMax: 1080000, bothMin: 1180000, bothMax: 1580000 },
        { building: 'house2', size: 's45', wallMin: 980000, wallMax: 1380000, bothMin: 1480000, bothMax: 1880000 },
        { building: 'house2', size: 's46', wallMin: 1280000, wallMax: 1780000, bothMin: 1780000, bothMax: 2380000 },
        { building: 'house2', size: 'unknown', wallMin: 800000, wallMax: 1500000, bothMin: 1200000, bothMax: 2000000 },
        { building: 'house3', size: 's25', wallMin: 880000, wallMax: 1080000, bothMin: 1180000, bothMax: 1480000 },
        { building: 'house3', size: 's35', wallMin: 980000, wallMax: 1280000, bothMin: 1380000, bothMax: 1780000 },
        { building: 'house3', size: 's45', wallMin: 1180000, wallMax: 1580000, bothMin: 1680000, bothMax: 2080000 },
        { building: 'house3', size: 's46', wallMin: 1480000, wallMax: 1980000, bothMin: 1980000, bothMax: 2580000 },
        { building: 'house3', size: 'unknown', wallMin: 1000000, wallMax: 1700000, bothMin: 1400000, bothMax: 2200000 },
      ],
    },
  },
  {
    id: 'juku',
    label: '学習塾',
    shop: shop({
      id: JUKU_ID,
      slug: 'midori',
      industry: 'juku',
      plan: 'full',
      name: 'みどりゼミ（架空）',
      published: true,
      phone: '03-0000-4200',
      email: 'midori@example.com',
      address: '架空県架空市みどり町4-5-6',
      hours: '平日 15:00〜22:00',
      closedDays: '日曜',
      accessText: '架空駅 北口から徒歩6分',
      mapUrl: 'https://www.openstreetmap.org/search?query=%E6%9E%B6%E7%A9%BA%E5%B8%82',
      parking: '専用駐車場はありません。',
      reservationUrl: '/reserve/midori',
      reservationLabel: '無料体験を予約する',
      handoffBusinessDays: 2,
      extra: { area: '架空市', brandColor: '#1c2430' },
    }),
    juku: {
      courses: [
        { grade: 'elementary', goal: 'test', name: '小学生・定期テストコース', monthlyTaxIn: 12100, times: '週1回' },
        { grade: 'elementary', goal: 'exam', name: '小学生・受験コース', monthlyTaxIn: 22000, times: '週2回' },
        { grade: 'elementary', goal: 'weak', name: '小学生・苦手克服コース', monthlyTaxIn: 13200, times: '週1回' },
        { grade: 'junior', goal: 'test', name: '中学生・定期テストコース', monthlyTaxIn: 16500, times: '週1回' },
        { grade: 'junior', goal: 'exam', name: '中学生・受験コース', monthlyTaxIn: 27500, times: '週2回' },
        { grade: 'junior', goal: 'weak', name: '中学生・苦手克服コース', monthlyTaxIn: 18700, times: '週1回' },
        { grade: 'high', goal: 'test', name: '高校生・定期テストコース', monthlyTaxIn: 19800, times: '週1回' },
        { grade: 'high', goal: 'exam', name: '高校生・受験コース', monthlyTaxIn: 33000, times: '週2回' },
        { grade: 'high', goal: 'weak', name: '高校生・苦手克服コース', monthlyTaxIn: 22000, times: '週1回' },
      ],
    },
  },
  {
    id: 'seitai',
    label: '整体院',
    shop: shop({
      id: SEITAI_ID,
      slug: 'nozomi',
      industry: 'seitai',
      plan: 'full',
      name: 'のぞみ整体（架空）',
      published: true,
      phone: '03-0000-4300',
      email: 'nozomi@example.com',
      address: '架空県架空市のぞみ町7-8-9',
      hours: '平日 10:00〜20:00／土 9:00〜17:00',
      closedDays: '日曜・祝日',
      accessText: '架空駅 南口から徒歩4分',
      mapUrl: 'https://www.openstreetmap.org/search?query=%E6%9E%B6%E7%A9%BA%E5%B8%82',
      parking: '隣に2台分あります。',
      reservationUrl: '/reserve/nozomi',
      reservationLabel: '予約ページを開く',
      handoffBusinessDays: 1,
      extra: {
        area: '架空市',
        brandColor: '#1f4b6e',
        staff: '施術者1名・完全予約制',
        lastBooking: '最終受付は終了の60分前です。',
        firstVisit: '初回はカウンセリングとコースで60分、6,600円（税込）です。動きやすい服装でお越しください。',
      },
    }),
    seitai: {
      firstVisit: { name: '初回カウンセリング＋コース', minutes: 60, priceTaxIn: 6600 },
      menus: [
        { area: 'neck', name: '首・肩まわりのコース', minutes: 40, priceTaxIn: 4400 },
        { area: 'waist', name: '腰まわりのコース', minutes: 40, priceTaxIn: 4400 },
        { area: 'posture', name: '姿勢・疲労ケア', minutes: 50, priceTaxIn: 5500 },
      ],
    },
  },
];

export function nicheTemplates(): NicheTemplate[] {
  return NICHE_TEMPLATES;
}

export function templateBySlug(slug: string | undefined): NicheTemplate | undefined {
  if (!slug) return undefined;
  return NICHE_TEMPLATES.find((item) => item.shop.slug === slug);
}

export function templateByNiche(id: NicheId): NicheTemplate {
  const found = NICHE_TEMPLATES.find((item) => item.id === id);
  if (!found) throw new Error(`missing template ${id}`);
  return found;
}

export function templateCatalog(): { shops: Shop[]; faqs: Faq[]; menu: MenuItem[] } {
  return {
    shops: NICHE_TEMPLATES.map((item) => item.shop),
    faqs: NICHE_TEMPLATES.flatMap((item) => templateFaqs(item)),
    menu: [],
  };
}

export function isTemplateSlug(slug: string | undefined): boolean {
  return Boolean(templateBySlug(slug));
}

function templateFaqs(template: NicheTemplate): Faq[] {
  const shopId = template.shop.id;
  if (template.id === 'painting') {
    return [
      faq(shopId, 1, '現地調査は無料ですか', '無料です。調査のあと、金額は見積書でお出しします。', ['現地調査', '無料', '見積']),
      faq(shopId, 2, '工事は何日くらいかかりますか', '戸建ての塗り替えは、天候によりおおむね10〜14日が目安です。日数は現地調査のあとにお伝えします。', ['期間', '日数', '工期']),
      faq(shopId, 3, '支払いの時期はいつですか', '着工前と完工後の2回が基本です。詳しい時期は現地調査のときにご説明します。', ['支払い', '料金', 'いつ']),
    ];
  }
  if (template.id === 'juku') {
    return [
      faq(shopId, 1, '体験は有料ですか', '体験は無料です。予約ページから申し込めます。', ['体験', '無料', '予約']),
      faq(shopId, 2, '授業の曜日は選べますか', '希望の曜日と時間は、予約ページで選べます。', ['曜日', '時間', '授業']),
      faq(shopId, 3, '保護者の同席はできますか', '体験の説明は、保護者の方と一緒に聞けます。', ['保護者', '同席']),
    ];
  }
  return [
    faq(shopId, 1, '保険は使えますか', '整体は保険の対象外で、全額自費になります。', ['保険', '自費']),
    faq(shopId, 2, '予約は必要ですか', '完全予約制です。予約ページからお申し込みください。', ['予約', '完全予約']),
    faq(shopId, 3, '服装に指定はありますか', '動きやすい服装でお越しください。お着替えもあります。', ['服装', '持ち物', '初めて']),
  ];
}

function faq(shopId: string, n: number, question: string, answer: string, keywords: string[]): Faq {
  return {
    id: `${shopId.slice(0, 24)}${'0'.repeat(11)}${n}`,
    shopId,
    question,
    answer,
    keywords,
    published: true,
    sortOrder: n,
  };
}

export function formatYen(amount: number): string {
  return `${String(amount).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}円`;
}

export function formatManRange(min: number, max: number): string {
  return `${man(min)}万〜${man(max)}万円`;
}

function man(amount: number): string {
  const value = amount / 10000;
  return Number.isInteger(value) ? String(value) : value.toFixed(1).replace(/\.0$/, '');
}

export interface PaintEstimate {
  kind: 'range' | 'survey';
  text: string;
}

export function estimatePainting(template: NicheTemplate, answers: Record<string, string>): PaintEstimate {
  const table = template.painting;
  if (!table) return { kind: 'survey', text: '目安は現地調査でお伝えします。' };
  if (answers.building === 'other') {
    return {
      kind: 'survey',
      text: 'アパート・その他の建物は、戸建ての公開価格表には入りません。正確な金額は無料の現地調査でお伝えします。',
    };
  }
  const row = table.rows.find((item) => item.building === answers.building && item.size === answers.size);
  if (!row) return { kind: 'survey', text: '目安は現地調査でお伝えします。' };
  const extra = answers.wall === 'alc' ? table.alcExtra : 0;
  const wall = formatManRange(row.wallMin + extra, row.wallMax + extra);
  const both = formatManRange(row.bothMin + extra, row.bothMax + extra);
  const alc = extra > 0 ? 'ALCのため、公開価格表の金額に5万円を加えています。' : '';
  if (answers.roof === 'ask') {
    return {
      kind: 'range',
      text: `${template.shop.name}の公開価格表にもとづく概算です。外壁だけなら${wall}、屋根も合わせると${both}（税込・足場と高圧洗浄を含みます）。${alc}正確な金額は無料の現地調査で確定します。`,
    };
  }
  const picked = answers.roof === 'both' ? both : wall;
  const scope = answers.roof === 'both' ? '外壁と屋根' : '外壁';
  return {
    kind: 'range',
    text: `${template.shop.name}の公開価格表にもとづく概算です。${scope}の目安は${picked}（税込・足場と高圧洗浄を含みます）。${alc}正確な金額は無料の現地調査で確定します。`,
  };
}

export function paintingWideRange(template: NicheTemplate): string {
  const rows = template.painting?.rows.filter((row) => row.size !== 'unknown') ?? [];
  if (!rows.length) return '';
  const min = Math.min(...rows.map((row) => row.wallMin));
  const max = Math.max(...rows.map((row) => row.wallMax));
  return formatManRange(min, max);
}

export function jukuCourse(template: NicheTemplate, grade: string, goal: string): JukuCourse | undefined {
  return template.juku?.courses.find((course) => course.grade === grade && course.goal === goal);
}

export function jukuGradeSpan(template: NicheTemplate, grade: string): { min: number; max: number } | undefined {
  const rows = template.juku?.courses.filter((course) => course.grade === grade) ?? [];
  if (!rows.length) return undefined;
  return {
    min: Math.min(...rows.map((row) => row.monthlyTaxIn)),
    max: Math.max(...rows.map((row) => row.monthlyTaxIn)),
  };
}

export const GRADE_LABEL: Record<string, string> = {
  elementary: '小学生',
  junior: '中学生',
  high: '高校生',
};

export const GOAL_LABEL: Record<string, string> = {
  test: '定期テスト対策',
  exam: '受験対策',
  weak: '苦手克服',
};

export function nicheLabel(id: NicheId): string {
  return INDUSTRY_LABEL[id];
}
