import type { PlanId } from '../types';

export const REPLY_WINDOW = '通常【〇営業日】以内';

export interface ServicePlan {
  id: PlanId;
  name: string;
  initialTaxIn: number;
  monthlyTaxIn: number;
  initialTaxEx: number;
  monthlyTaxEx: number;
  summary: string;
  audience: string;
  features: string[];
}

export const SERVICE_PLANS: ServicePlan[] = [
  {
    id: 'light',
    name: 'ライト',
    initialTaxIn: 22000,
    monthlyTaxIn: 5500,
    initialTaxEx: 20000,
    monthlyTaxEx: 5000,
    summary: 'FAQ自動回答',
    audience: '公開しているよくある質問を、チャットで案内したいお店',
    features: ['公開情報に基づくFAQの自動回答', '既存の予約ページへの案内（ボットの中では確定しません）'],
  },
  {
    id: 'standard',
    name: '標準',
    initialTaxIn: 44000,
    monthlyTaxIn: 11000,
    initialTaxEx: 40000,
    monthlyTaxEx: 10000,
    summary: '選択肢案内＋FAQ管理画面',
    audience: 'メニューや営業時間の案内と、FAQの編集もしたいお店',
    features: ['ライトの内容', 'メニュー・営業時間・アクセスなどの選択肢案内', 'FAQを店が直せる管理画面'],
  },
  {
    id: 'full',
    name: '充実',
    initialTaxIn: 88000,
    monthlyTaxIn: 19800,
    initialTaxEx: 80000,
    monthlyTaxEx: 18000,
    summary: '標準＋人への引き継ぎ',
    audience: '答えられない質問を、人へ引き継ぎたいお店',
    features: ['標準の内容', '答えられない質問を人に引き継ぎ'],
  },
];

export const DEMO_PLAN_ID: PlanId = 'standard';

/** 表示順は美容室・サロン、整体院、飲食店。 */
export const DEMO_INDUSTRIES: { id: 'salon' | 'seitai' | 'food'; label: string; slug: string }[] = [
  { id: 'salon', label: '美容室・サロン', slug: 'lumiere' },
  { id: 'seitai', label: '整体院', slug: 'yasuragi' },
  { id: 'food', label: '飲食店', slug: 'komorebi' },
];

export const NOT_INCLUDED = ['LINE連携', '予約の確定', 'サイト制作', '訪問設定', '月2回目以降の変更（見積り）'];

export const MONITOR_NOTE = '実績づくりのためのモニター（店数・期間は【　】）';

export const CAN = [
  '公開情報に基づくFAQ',
  '既存の予約ページへの案内',
  '標準以上は、FAQを店が直せる管理画面',
  '充実は、答えられない質問を人に引き継ぎ',
  '設置後の修正は管理画面のフォームで、月1回まで無料',
];

export const CANNOT = [
  'ボットの中での予約確定',
  'LINE連携（後日）',
  '訪問しての設定',
  'ビデオ通話',
  '効果や売上の保証',
];

export const FAQ_ITEMS: { question: string; answer: string }[] = [
  {
    question: '予約はチャットで取れますか',
    answer: '取れません。既存の予約ページか電話へ案内します。ボットの中では確定しません。',
  },
  {
    question: 'お店に来てもらえますか',
    answer: '訪問、対面、ビデオ通話での説明・設定は行いません。ご相談はフォームで受け、通常【〇営業日】以内にメールで返信します。いまは自動返信メールは送りません。',
  },
  {
    question: 'LINEは使えますか',
    answer: 'いまは対象外で、後日の予定です。',
  },
  {
    question: '途中で内容を変えられますか',
    answer: '設置後は、管理画面のフォームで受け付けます。月1回まで無料で、画面に残り回数を表示します。それを超える場合は見積りです。',
  },
  {
    question: '解約できますか',
    answer: '【解約の期限と方法を記入】。解約後はチャットを停止します。初期費用の返金の有無は【記入】。',
  },
  {
    question: '整骨院でも使えますか',
    answer: '使えますが、患者向けの文言はお店と相談して決めます。診断や効果の約束は入れません。やりとりはメッセージまたはフォームで行います。',
  },
  {
    question: '個人情報は扱いますか',
    answer: '申し込みに必要な連絡先は、案内と契約のためだけに使います。店の顧客情報は、公開情報の範囲で設定します。詳細は個人情報の取り扱いをご覧ください。',
  },
  {
    question: '支払い方法は何ですか',
    answer: '今回のフォームでは決済しません。支払いの画面（Stripe）は後から用意する予定です。料金の表はプランのページをご覧ください。',
  },
];

export const TOP_FAQ = [
  '予約はチャットで取れません',
  '訪問・ビデオ通話はありません',
  '解約はフォームまたはメール（期限は【未定】）',
];

export const LEGAL_ITEMS = [
  '販売業者の氏名（名称）',
  '住所・電話番号（常時表示か、請求時開示かは未定）',
  'メールアドレス',
  '責任者名',
  '役務の対価',
  '対価以外の費用',
  '支払の時期および方法',
  '提供時期',
  '申し込み期間',
  '撤回または解除',
  '継続契約の条件',
  '特別な提供条件',
  '動作環境',
  '契約不適合の場合の責任',
];

export const TERMS_HEADINGS = [
  '契約の成立',
  '提供方法（Web・メール。訪問・ビデオ通話は行わない）',
  '提供内容と除外',
  '料金と継続課金',
  '解約',
  'お店の責任',
  '禁止事項',
  '準拠法',
];

export const HERO_EYEBROW = '美容室・サロン、整体院向け　ホームページ用チャット';

export const HERO_TITLE = 'お店のホームページで、よくある質問に答えます';

export const HERO_BODY = '営業中に繰り返し来る質問を、チャットで案内します。予約は、いま使っている予約ページへ案内し、ボットの中では確定しません。よくある質問や動きは、下のデモ（架空の店です）でお試しください。ご相談はフォームから送れます。通常【〇営業日】以内にメールで返信します。いまは自動返信メールは送りません。支払いは将来Webで完結する予定です。お店への訪問やビデオ通話はありません。';

export const FACTS = [
  '3つのプランから選べる',
  'このページでデモを試せます（架空の店です）',
  '相談はWebで完結（訪問・ビデオ通話なし）',
];

export const PRICE_INTRO = '初期費用は1回、月額は継続です。下の表は税込を主に表示し、税別を併記しています（税率10%）。相談フォームの送信では決済しません。';

export const CONSULT_INTRO = '必要事項を送ってください。この画面では決済しません。いまは自動返信メールは送りません。内容を確認のうえ、通常【〇営業日】以内にメールで返信します。訪問やビデオ通話はありません。';

export const FOOTER_NOTE = 'ご相談はフォームで受け、通常【〇営業日】以内に返信します。訪問やビデオ通話はありません。';

export const FICTIONAL_SHOP = '店名・住所・料金は架空です。実在のお店とは関係ありません。';

export function yen(amount: number): string {
  return `${String(amount).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}円`;
}

export function planChoiceFromSearch(search: string): string | undefined {
  const value = new URLSearchParams(search).get('plan');
  return SERVICE_PLANS.find((plan) => plan.id === value)?.name;
}

export function widgetPath(plan: PlanId, slug: string): string {
  return `/widget/${plan}/${slug}`;
}
