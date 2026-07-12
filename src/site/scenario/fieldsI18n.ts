import { FIELD_BY_KEY, labelForValue } from './fields';
import type { FieldKey, Language, LoanPurpose } from './types';

// ---------------------------------------------------------------------------
// Localized field labels, questions, and choice-option labels. English falls
// back to the canonical FIELD_DEFS; ru/es/zh provide translations so the
// profile card, next-best-question, missing-field badges, and choice chips are
// genuinely localized. Field *keys* and value *codes* never change.
// ---------------------------------------------------------------------------

interface FieldText {
  label: string;
  question: string;
  options?: Record<string, string>;
}

type Overrides = Partial<Record<FieldKey, FieldText>>;

const ru: Overrides = {
  purchasePrice: { label: 'Цена покупки / стоимость', question: 'Какова цена покупки или оценочная стоимость?' },
  downPayment: { label: 'Первоначальный взнос / наличные', question: 'Сколько у вас есть на первоначальный взнос или доступные средства?' },
  occupancy: {
    label: 'Тип проживания',
    question: 'Это будет основное жильё, второй дом или инвестиционная недвижимость?',
    options: { primary: 'Основное жильё', second: 'Второй дом', investment: 'Инвестиционная' },
  },
  employmentType: {
    label: 'Тип занятости',
    question: 'Как вы получаете доход — W-2, работаете на себя, 1099, владелец бизнеса, на пенсии или инвестор?',
    options: { w2: 'W-2', 'self-employed': 'Работаю на себя', '1099': '1099', 'business-owner': 'Владелец бизнеса', retired: 'На пенсии', investor: 'Инвестор', 'foreign-national': 'Иностранный гражданин' },
  },
  incomeDocPath: {
    label: 'Подтверждение дохода',
    question: 'Как вы предпочли бы подтвердить доход — налоговые декларации, банковские выписки, P&L, истощение активов, DSCR или не уверены?',
    options: { 'full-doc': 'Налоговые декларации', 'bank-statements': 'Банковские выписки', 'p-and-l': 'P&L', 'asset-depletion': 'Истощение активов', dscr: 'DSCR', unsure: 'Не уверен(а)' },
  },
  zipOrCounty: { label: 'ZIP / округ', question: 'В каком ZIP-коде или округе находится недвижимость?' },
  borrowerGoal: {
    label: 'Основная цель',
    question: 'Что для вас важнее всего — минимальный платёж, минимальная сумма для закрытия, простое одобрение, лучшая долгосрочная стоимость, быстрое закрытие или сравнить всё?',
    options: { 'lowest-payment': 'Минимальный платёж', 'lowest-cash-to-close': 'Минимальная сумма для закрытия', 'easiest-approval': 'Простое одобрение', 'best-long-term': 'Лучшая долгосрочная стоимость', 'fastest-close': 'Быстрое закрытие', 'compare-all': 'Сравнить всё' },
  },
  state: { label: 'Штат', question: 'В каком штате находится недвижимость?' },
  fico: { label: 'Ориентировочный FICO', question: 'Каков примерно ваш кредитный рейтинг FICO?' },
  reserves: { label: 'Резервы после закрытия', question: 'Сколько примерно у вас останется в резервах после закрытия?' },
};

const es: Overrides = {
  purchasePrice: { label: 'Precio de compra / valor', question: '¿Cuál es el precio de compra o el valor estimado?' },
  downPayment: { label: 'Enganche / efectivo disponible', question: '¿Cuánto tiene para el enganche o efectivo disponible?' },
  occupancy: {
    label: 'Ocupación',
    question: '¿Será una residencia principal, una segunda vivienda o una propiedad de inversión?',
    options: { primary: 'Residencia principal', second: 'Segunda vivienda', investment: 'Inversión' },
  },
  employmentType: {
    label: 'Tipo de empleo',
    question: '¿Cómo obtiene sus ingresos: W-2, por cuenta propia, 1099, dueño de negocio, jubilado o inversionista?',
    options: { w2: 'W-2', 'self-employed': 'Por cuenta propia', '1099': '1099', 'business-owner': 'Dueño de negocio', retired: 'Jubilado', investor: 'Inversionista', 'foreign-national': 'Extranjero' },
  },
  incomeDocPath: {
    label: 'Documentación de ingresos',
    question: '¿Cómo preferiría documentar sus ingresos: declaraciones de impuestos, estados de cuenta bancarios, P&L, agotamiento de activos, DSCR o no está seguro?',
    options: { 'full-doc': 'Declaraciones de impuestos', 'bank-statements': 'Estados de cuenta bancarios', 'p-and-l': 'P&L', 'asset-depletion': 'Agotamiento de activos', dscr: 'DSCR', unsure: 'No estoy seguro' },
  },
  zipOrCounty: { label: 'ZIP / condado', question: '¿En qué código postal o condado está la propiedad?' },
  borrowerGoal: {
    label: 'Objetivo principal',
    question: '¿Qué le importa más: el pago más bajo, el menor efectivo para cerrar, la aprobación más fácil, el mejor costo a largo plazo, el cierre más rápido o comparar todo?',
    options: { 'lowest-payment': 'Pago más bajo', 'lowest-cash-to-close': 'Menor efectivo para cerrar', 'easiest-approval': 'Aprobación más fácil', 'best-long-term': 'Mejor costo a largo plazo', 'fastest-close': 'Cierre más rápido', 'compare-all': 'Comparar todo' },
  },
  state: { label: 'Estado', question: '¿En qué estado está la propiedad?' },
  fico: { label: 'FICO estimado', question: '¿Aproximadamente cuál es su puntaje FICO?' },
  reserves: { label: 'Reservas después del cierre', question: '¿Cuánto tendrá aproximadamente en reservas después del cierre?' },
};

const zh: Overrides = {
  purchasePrice: { label: '购买价格 / 价值', question: '购买价格或估计价值是多少？' },
  downPayment: { label: '首付 / 可用现金', question: '您有多少可用于首付或可用现金？' },
  occupancy: {
    label: '房产用途',
    question: '这将是主要住所、第二套住房还是投资房产？',
    options: { primary: '主要住所', second: '第二套住房', investment: '投资房产' },
  },
  employmentType: {
    label: '就业类型',
    question: '您的收入方式是——W-2、自雇、1099、企业主、退休还是投资者？',
    options: { w2: 'W-2', 'self-employed': '自雇', '1099': '1099', 'business-owner': '企业主', retired: '退休', investor: '投资者', 'foreign-national': '外国国民' },
  },
  incomeDocPath: {
    label: '收入证明方式',
    question: '您希望如何证明收入——纳税申报表、银行对账单、P&L、资产折算、DSCR，还是不确定？',
    options: { 'full-doc': '纳税申报表', 'bank-statements': '银行对账单', 'p-and-l': 'P&L', 'asset-depletion': '资产折算', dscr: 'DSCR', unsure: '不确定' },
  },
  zipOrCounty: { label: '邮编 / 县', question: '房产位于哪个邮编或县？' },
  borrowerGoal: {
    label: '主要目标',
    question: '您最看重什么——最低月供、最低过户现金、最容易获批、最佳长期成本、最快成交，还是比较全部？',
    options: { 'lowest-payment': '最低月供', 'lowest-cash-to-close': '最低过户现金', 'easiest-approval': '最容易获批', 'best-long-term': '最佳长期成本', 'fastest-close': '最快成交', 'compare-all': '比较全部' },
  },
  state: { label: '州', question: '房产位于哪个州？' },
  fico: { label: '预估 FICO', question: '您的 FICO 信用评分大约是多少？' },
  reserves: { label: '成交后储备金', question: '成交后您大约还有多少储备金？' },
};

const OVERRIDES: Record<Language, Overrides> = { en: {}, ru, es, zh };

// Refinance framing: there is no "purchase price" — it's the home's estimated
// value — and no down payment at all. These override the purchase-oriented text
// when loanPurpose is 'refinance'.
const REFI: Record<Language, Overrides> = {
  en: {
    purchasePrice: { label: 'Estimated home value', question: "What's your home's estimated value?" },
  },
  ru: {
    purchasePrice: { label: 'Оценочная стоимость жилья', question: 'Какова оценочная стоимость вашего жилья?' },
  },
  es: {
    purchasePrice: { label: 'Valor estimado de la vivienda', question: '¿Cuál es el valor estimado de su vivienda?' },
  },
  zh: {
    purchasePrice: { label: '房屋估计价值', question: '您房屋的估计价值是多少？' },
  },
};

function textFor(lang: Language, key: FieldKey, purpose?: LoanPurpose): FieldText | undefined {
  if (purpose === 'refinance' && REFI[lang][key]) return REFI[lang][key];
  return OVERRIDES[lang][key];
}

export function fieldLabel(lang: Language, key: FieldKey, purpose?: LoanPurpose): string {
  return textFor(lang, key, purpose)?.label ?? FIELD_BY_KEY[key]?.label ?? String(key);
}
export function fieldQuestion(lang: Language, key: FieldKey, purpose?: LoanPurpose): string {
  return textFor(lang, key, purpose)?.question ?? FIELD_BY_KEY[key]?.question ?? '';
}
export function fieldOptionLabel(lang: Language, key: FieldKey, value: string): string {
  return OVERRIDES[lang][key]?.options?.[value] ?? labelForValue(key, value);
}
