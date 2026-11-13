import type { Faq, MenuItem, Shop } from '../types';
import { FOOD_SHOP_ID, SALON_SHOP_ID, SEITAI_SHOP_ID } from '../types';

const food = FOOD_SHOP_ID;
const salon = SALON_SHOP_ID;
const seitai = SEITAI_SHOP_ID;

export const demoShops: Shop[] = [
  {
    id: food,
    slug: 'komorebi',
    industry: 'food',
    name: 'カフェ・こもれび（架空）',
    plan: 'full',
    published: true,
    phone: '03-0000-1100',
    email: 'komorebi@example.com',
    address: '架空県架空市こもれび町1-2-3',
    hours: '11:00〜20:00（L.O. 19:30）',
    closedDays: '毎週水曜日',
    accessText: '〇〇駅 東口から徒歩5分',
    mapUrl: 'https://www.openstreetmap.org/search?query=%E6%9E%B6%E7%A9%BA%E7%9C%8C%E6%9E%B6%E7%A9%BA%E5%B8%82%E3%81%93%E3%82%82%E3%82%8C%E3%81%B3%E7%94%BA',
    parking: 'お店の前に2台分あります。満車の場合は近くのコインパーキングをご利用ください。',
    reservationUrl: 'https://shop-chatbot-demo-0lf2.onrender.com/reserve/komorebi',
    reservationLabel: 'ネット予約のページを開く',
    handoffBusinessDays: 2,
    extra: {
      seats: '20席（テラス4席）・全席禁煙',
      lunchHours: 'ランチ 11:00〜14:00',
      lastOrder: 'L.O. 19:30',
    },
  },
  {
    id: salon,
    slug: 'lumiere',
    industry: 'salon',
    name: 'ヘアサロン・ルミエール（架空）',
    plan: 'full',
    published: true,
    phone: '03-0000-2200',
    email: 'lumiere@example.com',
    address: '架空県架空市ルミエール町2-3-4',
    hours: '10:00〜19:00',
    closedDays: '毎週火曜日・第3月曜日',
    accessText: '〇〇駅 南口から徒歩3分（2階）',
    mapUrl: 'https://www.openstreetmap.org/search?query=%E6%9E%B6%E7%A9%BA%E7%9C%8C%E6%9E%B6%E7%A9%BA%E5%B8%82%E3%83%AB%E3%83%9F%E3%82%A8%E3%83%BC%E3%83%AB%E7%94%BA',
    parking: '専用駐車場はありません。近くのコインパーキングをご利用ください。',
    reservationUrl: 'https://shop-chatbot-demo-0lf2.onrender.com/reserve/lumiere',
    reservationLabel: 'ネット予約のページを開く',
    handoffBusinessDays: 2,
    extra: {
      seats: 'セット面3席・スタッフ3名',
      lastCut: 'カット最終受付 18:00',
      lastColor: 'カラー最終受付 17:00',
    },
  },
  {
    id: seitai,
    slug: 'yasuragi',
    industry: 'seitai',
    name: 'やすらぎ整体院（架空）',
    plan: 'full',
    published: true,
    phone: '03-0000-3300',
    email: 'yasuragi@example.com',
    address: '架空県架空市やすらぎ町3-4-5',
    hours: '平日 10:00〜20:00／土日 9:00〜17:00',
    closedDays: '毎週木曜日・祝日',
    accessText: '〇〇駅 北口から徒歩7分',
    mapUrl: 'https://www.openstreetmap.org/search?query=%E6%9E%B6%E7%A9%BA%E7%9C%8C%E6%9E%B6%E7%A9%BA%E5%B8%82%E3%82%84%E3%81%99%E3%82%89%E3%81%8E%E7%94%BA',
    parking: '専用駐車場が3台あります。',
    reservationUrl: 'https://shop-chatbot-demo-0lf2.onrender.com/reserve/yasuragi',
    reservationLabel: 'ネット予約のページを開く',
    handoffBusinessDays: 2,
    extra: {
      staff: '施術者2名・完全予約制',
      lastBooking: '最終受付は終了の1時間前です。',
      firstVisit:
        'はじめての方へのご案内です。ご予約はネット予約のページからどうぞ。当日は動きやすい服装でお越しください。お着替えもご用意しています。カウンセリングで、お体の気になるところやご希望を伺います。初回料金はカウンセリング＋整体（60分）6,800円です。',
    },
  },
];

export const demoMenu: MenuItem[] = [
  item(food, 'f1', 'lunch', '日替わりランチ（ドリンク付き）', '1,100円', '11:00〜14:00', 1),
  item(food, 'f2', 'cafe', '自家製ナポリタン', '950円', '', 2),
  item(food, 'f3', 'cafe', '季節のケーキセット', '800円', '', 3),
  item(food, 'f4', 'cafe', 'ブレンドコーヒー', '450円', '', 4),
  item(food, 'f5', 'takeout', 'テイクアウト弁当', '750円', '11:00〜14:00', 5),
  item(salon, 's1', 'cut', 'カット', '4,400円', '約60分', 1),
  item(salon, 's2', 'color', 'カット＋カラー', '9,900円〜', '約2時間', 2),
  item(salon, 's3', 'perm', 'カット＋パーマ', '12,500円〜', '約2時間', 3),
  item(salon, 's4', 'other', 'トリートメント', '3,300円', '約20分', 4),
  item(salon, 's5', 'cut', '前髪カット', '1,100円', '約15分', 5),
  item(salon, 's6', 'cut', '子どもカット（小学生以下）', '2,750円', '約40分', 6),
  item(seitai, 't1', 'course', '初回カウンセリング＋整体（60分）', '6,800円', '60分', 1),
  item(seitai, 't2', 'course', '整体（45分）', '4,950円', '45分', 2),
  item(seitai, 't3', 'course', '骨盤調整（30分）', '3,850円', '30分', 3),
  item(seitai, 't4', 'course', '肩こり集中コース（40分）', '4,400円', '40分', 4),
  item(seitai, 't5', 'course', '回数券（5回）', '24,000円', '5回分', 5),
];

export const demoFaqs: Faq[] = [
  faq(food, 1, '予約はできますか？', 'はい、ご予約いただけます。下のボタンからネット予約のページへお進みください。', ['予約', 'よやく', 'reserve']),
  faq(food, 2, '駐車場はありますか？', 'お店の前に2台分あります。満車の場合は近くのコインパーキングをご利用ください。', ['駐車場', 'ちゅうしゃじょう', 'パーキング', 'parking']),
  faq(food, 3, 'テイクアウトはできますか？', 'できます。日替わり弁当（750円）を11:00〜14:00に販売しています。', ['テイクアウト', '弁当', '持ち帰り']),
  faq(food, 4, '子ども連れでも利用できますか？', 'はい、ご利用いただけます。子ども用の椅子と取り分け皿をご用意しています。', ['子ども', '子供', '子連れ', 'こども']),
  faq(food, 5, 'アレルギーへの対応はありますか？', '主な原材料はお伝えできます。詳しくはスタッフにご確認ください。', ['アレルギー', 'アレルゲン']),
  faq(food, 6, '支払い方法を教えてください', '現金、クレジットカード、主なQRコード決済が使えます。', ['支払い', 'カード', '現金', 'QR']),
  faq(food, 7, '貸切はできますか？', '15名以上で可能です。日時をご相談ください。', ['貸切', '宴会']),
  faq(salon, 1, '当日予約はできますか？', '空きがあれば可能です。予約ページで空き状況をご確認ください。', ['当日', '予約', '空き']),
  faq(salon, 2, 'カットの所要時間はどれくらいですか？', '約60分です。カラー付きは約2時間が目安です。', ['時間', 'どれくらい', '所要']),
  faq(salon, 3, 'スタッフの指名はできますか？', 'できます。予約ページで担当者を選べます。', ['指名', '担当']),
  faq(salon, 4, 'キャンセルの連絡は？', '前日までに予約ページからお願いします。当日は電話でご連絡ください。', ['キャンセル', '取消']),
  faq(salon, 5, '子どもカットはありますか？', '小学生以下は2,750円です。', ['子ども', '子供', '小学生']),
  faq(salon, 6, '支払い方法を教えてください', '現金、クレジットカード、QRコード決済が使えます。', ['支払い', 'カード', '現金', 'QR']),
  faq(salon, 7, '駐車場はありますか？', '専用駐車場はありません。近くのコインパーキングをご利用ください。', ['駐車場', 'パーキング', 'parking']),
  faq(seitai, 1, '初めてですが、何を持っていけばいいですか？', '動きやすい服装でお越しください。着替えの貸し出しもあります。', ['初めて', '持ち物', '服装']),
  faq(seitai, 2, '保険は使えますか？', '整体は保険の対象外で、全額自費になります。', ['保険', '自費']),
  faq(seitai, 3, 'どれくらいの間隔で通えばいいですか？', '通う間隔は、お一人おひとりのご希望やご都合に合わせて、カウンセリングで施術者とご相談のうえ決めていただけます。', ['頻度', '間隔', '通院']),
  faq(seitai, 4, '施術は痛いですか？', 'ボキボキしない、やさしい施術が中心です。強さは調整できます。', ['痛い', 'ボキボキ']),
  faq(seitai, 5, '予約は必要ですか？', '当院は完全予約制です。下のボタンからご予約ください。お電話でも承ります。', ['予約', '完全予約']),
  faq(seitai, 6, '支払い方法を教えてください', '現金、クレジットカード、QRコード決済が使えます。', ['支払い', 'カード', '現金', 'QR']),
  faq(seitai, 7, 'キャンセル料はかかりますか？', '前日までのご連絡なら無料です。', ['キャンセル', 'キャンセル料']),
];

function scopedId(shopId: string, series: '0' | '1', n: number): string {
  const tail = `${series}${'0'.repeat(10)}${n}`;
  if (tail.length !== 12) {
    throw new Error(`bad id tail ${tail}`);
  }
  return `${shopId.slice(0, 24)}${tail}`;
}

function item(
  shopId: string,
  key: string,
  category: string,
  name: string,
  priceText: string,
  detail: string,
  sortOrder: number,
): MenuItem {
  return {
    id: scopedId(shopId, '1', Number(key.slice(1))),
    shopId,
    category,
    name,
    priceText,
    detail,
    sortOrder,
  };
}

function faq(shopId: string, n: number, question: string, answer: string, keywords: string[]): Faq {
  return {
    id: scopedId(shopId, '0', n),
    shopId,
    question,
    answer,
    keywords,
    published: true,
    sortOrder: n,
  };
}
