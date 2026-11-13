import type { PlanId } from '../types';

export const REPLY_WINDOW = '通常【〇営業日】以内';
export const DELIVERY_DAYS = '【　】';
export const UNDECIDED = '【未定】';
export const CONTRACT_MONTHS = 12;

export interface ServicePlan {
  id: PlanId;
  name: string;
  monthlyTaxIn: number;
  monthlyTaxEx: number;
  termTotalTaxIn: number;
  summary: string;
  audience: string;
  features: string[];
}

export const SERVICE_PLANS: ServicePlan[] = [
  {
    id: 'light',
    name: 'ライト',
    monthlyTaxIn: 10780,
    monthlyTaxEx: 9800,
    termTotalTaxIn: 129360,
    summary: 'FAQ自動回答',
    audience: '公開しているよくある質問を、チャットで案内したいお店',
    features: ['公開情報に基づくFAQの自動回答', '既存の予約ページへの案内（ボットの中では確定しません）'],
  },
  {
    id: 'standard',
    name: '標準',
    monthlyTaxIn: 21780,
    monthlyTaxEx: 19800,
    termTotalTaxIn: 261360,
    summary: '選択肢案内＋FAQ管理画面',
    audience: 'メニューや営業時間の案内と、FAQの編集もしたいお店',
    features: ['ライトの内容', 'メニュー・営業時間・アクセスなどの選択肢案内', 'FAQを店が直せる管理画面'],
  },
  {
    id: 'full',
    name: '充実',
    monthlyTaxIn: 32780,
    monthlyTaxEx: 29800,
    termTotalTaxIn: 393360,
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

export const NOT_INCLUDED = ['LINE連携', '予約の確定', 'サイト制作', '訪問設定'];

export const INITIAL_FEE_NOTE = '初期費用なし（設置・基本設定込み）';

export const CONTRACT_NOTE = '契約期間は12か月です。料金は毎月お支払いいただきます。期間の途中で解約する場合も、残りの月数の料金をお支払いいただきます。自動更新は【未定】です。';

export const FUTURE_CHANGES = '今後の予定です（いまは未実装です）。設置後の修正を、管理画面のフォームで受け付けることを予定しています。月1回まで無料にすることや、残り回数を画面に出すことは、まだ決めていません。それまでは、相談・申し込みフォームまたはメールでご連絡ください。';

export const CAN = [
  '公開情報に基づくFAQ',
  '既存の予約ページへの案内',
  '標準以上は、FAQを店が直せる管理画面',
  '充実は、答えられない質問を人に引き継ぎ',
  'AIによる自由な文章は作りません。用意した答えを返します',
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
    answer: FUTURE_CHANGES,
  },
  {
    question: '解約できますか',
    answer: '契約期間は12か月です。期間の途中で解約する場合も、残りの月数の料金をお支払いいただきます。解約の手続きの期限と方法は【未定】です。自動更新は【未定】です。解約後はチャットを停止します。',
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
    answer: '今回のフォームでは決済しません。契約期間は12か月で、料金は毎月です。初期費用なし（設置・基本設定込み）。税込の月額と、12か月の合計は、プランのページに同じ大きさで書いてあります。支払いの画面は後から用意する予定です。自動更新は【未定】です。',
  },
];

export const TOP_FAQ = [
  '予約はチャットで取れません',
  '訪問・ビデオ通話はありません',
  '解約はフォームまたはメール（期限は【未定】）',
];

export const LEGAL_ITEMS: { label: string; value: string }[] = [
  { label: '販売業者の氏名（名称）', value: UNDECIDED },
  { label: '住所・電話番号', value: UNDECIDED },
  { label: 'メールアドレス', value: UNDECIDED },
  { label: '責任者名', value: UNDECIDED },
  { label: '役務の対価', value: '' },
  { label: '対価以外の費用', value: UNDECIDED },
  { label: '支払の時期および方法', value: '契約期間は12か月で、料金は毎月お支払いいただきます。このサイトの相談フォームでは決済しません。支払いの画面は未実装です。' },
  { label: '提供時期', value: UNDECIDED },
  { label: '申し込み期間', value: UNDECIDED },
  { label: '撤回または解除', value: '期間の途中で解約する場合も、残りの月数の料金をお支払いいただきます。手続きの期限と方法は【未定】です。' },
  { label: '継続契約の条件', value: CONTRACT_NOTE },
  { label: '特別な提供条件', value: UNDECIDED },
  { label: '動作環境', value: UNDECIDED },
  { label: '契約不適合の場合の責任', value: UNDECIDED },
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

export const HERO_BODY = '営業中に繰り返し来る質問を、チャットで案内します。予約は、いま使っている予約ページへ案内し、ボットの中では確定しません。';

export const HERO_NOTES = [
  '返信の目安は通常【〇営業日】以内です。いまは自動返信メールは送りません。',
  '支払いは、将来Webで完結する予定です。',
  'お店への訪問やビデオ通話はありません。',
];

export const FACTS = [
  'プランは3種類です（ライト・標準・充実）',
  '下のチャットは、架空の店です',
  '相談はフォームだけです（訪問・ビデオ通話なし）',
];

export const PRICE_INTRO = '初期費用なし（設置・基本設定込み）。契約期間は12か月で、料金は毎月お支払いいただきます。税込を主に、税別を併記しています（税率10%）。12か月の合計も、月額と同じ大きさで示します。期間の途中で解約する場合も、残りの月数の料金をお支払いいただきます。自動更新は【未定】です。相談フォームの送信では決済しません。';

export function priceListText(): string {
  return SERVICE_PLANS.map((plan) => `${plan.name}は月額${yen(plan.monthlyTaxIn)}（税込、税別${yen(plan.monthlyTaxEx)}）、12か月の合計${yen(plan.termTotalTaxIn)}（税込）`).join('。') + '。' + INITIAL_FEE_NOTE + '。';
}

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
