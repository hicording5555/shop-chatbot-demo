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
    audience: 'よくある質問を案内したいお店',
    features: ['公開情報に基づくFAQの自動回答', '既存の予約ページへの案内', 'ボットの中では予約を確定しない'],
  },
  {
    id: 'standard',
    name: '標準',
    monthlyTaxIn: 21780,
    monthlyTaxEx: 19800,
    termTotalTaxIn: 261360,
    summary: '選択肢案内＋FAQ管理画面',
    audience: '選択式の案内と編集をしたいお店',
    features: ['ライトの内容', '費用・コース・メニューの案内', 'FAQを店が直せる管理画面'],
  },
  {
    id: 'full',
    name: '充実',
    monthlyTaxIn: 32780,
    monthlyTaxEx: 29800,
    termTotalTaxIn: 393360,
    summary: '標準＋人への引き継ぎ',
    audience: '人への引き継ぎもしたいお店',
    features: ['標準の内容', '答えられない質問を人に引き継ぎ', '予約は既存のページへ案内'],
  },
];

export const DEMO_PLAN_ID: PlanId = 'standard';

/** 表示順は外壁・屋根塗装、学習塾、整体院。slug はテンプレート店と一致させる。 */
export const DEMO_INDUSTRIES: { id: 'painting' | 'juku' | 'seitai'; label: string; slug: string }[] = [
  { id: 'painting', label: '外壁・屋根塗装', slug: 'aoba' },
  { id: 'juku', label: '学習塾', slug: 'midori' },
  { id: 'seitai', label: '自費の整体院', slug: 'nozomi' },
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

export const HERO_EYEBROW = '外壁塗装・学習塾・自費の整体院向け';

export const HERO_TITLE = '電話に出られない時間に、ホームページが先に答えます';

export const HERO_BODY = 'オーナーが電話に出られない時間に、用意した質問へ用意した答えを返します。選択式なので、文面がぶれません。';

export const HERO_NOTES = [
  '返信の目安は通常【〇営業日】以内です。いまは自動返信メールは送りません。',
  '支払いは、将来Webで完結する予定です。',
  'お店への訪問やビデオ通話はありません。',
];

export const FACTS = ['初期費用 0円', '月額 10,780円（税込）〜', '選択式で誤回答なし'];

export const PROBLEMS: { title: string; body: string }[] = [
  { title: '現場に出ると電話に出られない', body: '塗装の「いくらかかる？」は、作業中や夜にも届きます。折り返すころには、ほかの見積りに進んでいることがあります。' },
  { title: '授業中は受話器を取れない', body: '塾は夕方から夜が授業です。講習の前は、授業料や体験の同じ質問が短時間に重なります。' },
  { title: '施術中は手が離せない', body: '整体は施術のあいだ、初めての方の「流れは？」「保険は使える？」にその場で答えられません。' },
];

export const BENEFITS: { title: string; body: string }[] = [
  { title: '営業時間外でも、用意した答えを返せます', body: '夜や定休日でも、公開している質問にはその場で答えます。人が出られる時間を、個別の相談に使えます。' },
  { title: '選択式なので、文面がぶれません', body: '自由に文章を作りません。お店が用意した答えだけを返します。整体では、効能の約束を入れません。' },
  { title: '予約は、いまのページへ案内します', body: 'ボットの中では予約を確定しません。すでにある予約ページか電話へ案内します。' },
];

export const INDUSTRY_CARDS: { href: string; title: string; body: string }[] = [
  { href: '/demo/painting', title: '外壁・屋根塗装', body: '費用の目安から、無料の現地調査の予約まで。工期、塗料、工事中の生活も案内します。' },
  { href: '/demo/juku', title: '学習塾', body: '授業料、体験、学年と回数、振替、テスト対策を案内し、無料体験の予約へ進みます。' },
  { href: '/demo/seitai', title: '自費の整体院', body: '当日の流れ、料金、服装、保険の対象外であることを案内し、予約ページへ進みます。' },
];

export const ONBOARDING: { step: string; title: string; body: string }[] = [
  { step: '01', title: 'ご相談・ヒアリング', body: 'フォームから、業種とホームページのURLを送ります。この送信では決済しません。' },
  { step: '02', title: '自社内容へテンプレート調整', body: '会社名、料金、営業時間、予約URLを、業種テンプレートに合わせて整えます。' },
  { step: '03', title: 'ホームページへ設置・公開', body: 'タグをホームページに置きます。訪問しての設定はしません。' },
];

export const HOME_FAQ: { question: string; answer: string }[] = [
  { question: '初期費用はかかりますか', answer: '初期費用なし（設置・基本設定込み）です。料金は月額だけで、12か月の合計もプランのカードに同じ大きさで書いてあります。' },
  { question: '12か月契約と、途中の解約は？', answer: '契約期間は12か月で、料金は毎月です。期間の途中で解約する場合も、残りの月数の料金をお支払いいただきます。手続きの期限は【未定】です。自動更新は【未定】です。' },
  { question: '用意した答え以外は返しませんか', answer: '選択式です。お店が用意した質問と答えだけを返します。決まっていない質問は、電話・メール、または充実プランでは人への引き継ぎになります。' },
  { question: 'いまのホームページに入れられますか', answer: '入れられます。サイトの作り直しはしません。既存の予約ページへ案内するだけで、ボットの中では予約を確定しません。' },
  { question: 'デモと本番は違いますか', answer: 'このページの店名と料金は架空です。本番は、御社の公開情報に差し替えます。支払いの画面は、いまは未実装です。ご相談には通常【〇営業日】以内にメールで返信します。自動返信メールは送りません。' },
];

export const PRICE_INTRO = '初期費用なし（設置・基本設定込み）。契約期間は12か月で、料金は毎月お支払いいただきます。税込を主に、税別を併記しています（税率10%）。12か月の合計も、月額と同じ大きさで示します。期間の途中で解約する場合も、残りの月数の料金をお支払いいただきます。自動更新は【未定】です。相談フォームの送信では決済しません。';

/** 料金カードの外に置く短い注記。細則は /terms と /legal。 */
export const PRICE_FOOTNOTE = '初期費用なし（設置・基本設定込み）。契約期間は12か月で、料金は毎月お支払いいただきます。期間の途中で解約する場合も、残りの月数の料金をお支払いいただきます。自動更新は【未定】です。相談フォームの送信では決済しません。';

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
