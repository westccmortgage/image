import type { Language } from './scenario';

// ---------------------------------------------------------------------------
// Static UI string dictionary. Keep user-facing chrome out of components so the
// advisor can render in EN / RU / ES / 中文. The AI conversation itself replies
// in the selected language via the server route; this covers the fixed UI.
// ---------------------------------------------------------------------------

export const LANGUAGES: { code: Language; label: string }[] = [
  { code: 'en', label: 'EN' },
  { code: 'ru', label: 'RU' },
  { code: 'es', label: 'ES' },
  { code: 'zh', label: '中文' },
];

export type UIKey =
  | 'productName'
  | 'heroTitle'
  | 'heroSubtitle'
  | 'exampleOnly'
  | 'liveYourScenario'
  | 'downPayment'
  | 'cashToClose'
  | 'extraNeeded'
  | 'describePlaceholder'
  | 'send'
  | 'startOver'
  | 'console'
  | 'localMode'
  | 'profileTitle'
  | 'complete'
  | 'viewFullProfile'
  | 'openProfile'
  | 'completed'
  | 'stillNeeded'
  | 'helpful'
  | 'next'
  | 'nothingYet'
  | 'possiblePaths'
  | 'whyFits'
  | 'missingData'
  | 'estPayment'
  | 'estCashToClose'
  | 'docsNeeded'
  | 'mainRisks'
  | 'prepareSummary'
  | 'sendScenario'
  | 'talkBroker'
  | 'reviewTitle'
  | 'reviewIntro'
  | 'name'
  | 'phone'
  | 'email'
  | 'contactTime'
  | 'preferredLanguage'
  | 'sendRequest'
  | 'sending'
  | 'reviewSent'
  | 'close'
  | 'micSoon'
  | 'docSoon'
  | 'complianceShort'
  | 'countyNeedsConfirm';

type Dict = Record<UIKey, string>;

const en: Dict = {
  productName: 'AI Mortgage Strategy Advisor',
  heroTitle: 'Describe your mortgage scenario. The advisor will compare possible loan paths.',
  heroSubtitle:
    'Tell us what you want to buy, how you earn income, and how much cash you have. The advisor will help identify possible financing strategies, estimate real cash needed to close, and prepare the scenario for broker review.',
  exampleOnly: 'Example only — describe your scenario to update.',
  liveYourScenario: 'Live — your scenario',
  downPayment: 'Down payment',
  cashToClose: 'Estimated cash to close',
  extraNeeded: 'Extra needed',
  describePlaceholder: 'Describe your scenario…',
  send: 'Send',
  startOver: 'Start over',
  console: 'AI Strategy Advisor',
  localMode: 'Local advisor mode — connect AI provider for deeper analysis.',
  profileTitle: 'Loan Strategy Profile',
  complete: 'complete',
  viewFullProfile: 'View full profile',
  openProfile: 'Open profile',
  completed: 'Known',
  stillNeeded: 'Critical missing',
  helpful: 'Helpful',
  next: 'Next best question',
  nothingYet: 'Nothing yet — describe your scenario.',
  possiblePaths: 'Possible loan paths',
  whyFits: 'Why it may fit',
  missingData: 'Missing data',
  estPayment: 'Est. payment',
  estCashToClose: 'Est. cash to close',
  docsNeeded: 'Documentation',
  mainRisks: 'Main risks',
  prepareSummary: 'Prepare My Strategy Summary',
  sendScenario: 'Send My Loan Scenario for Review',
  talkBroker: 'Talk to a Mortgage Broker',
  reviewTitle: 'Strategy Review Request',
  reviewIntro:
    'I can prepare a personalized strategy summary and send it to a licensed mortgage broker for review. What is the best way to reach you?',
  name: 'Name',
  phone: 'Phone',
  email: 'Email',
  contactTime: 'Preferred contact time',
  preferredLanguage: 'Preferred language',
  sendRequest: 'Send for broker review',
  sending: 'Sending…',
  reviewSent: 'Sent. A licensed broker will review your scenario and follow up.',
  close: 'Close',
  micSoon: 'Voice input is coming soon.',
  docSoon:
    'Document review is coming soon. Uploaded documents will be sent to a licensed broker for review, not simply attached to the chat.',
  complianceShort:
    'This is for educational and planning purposes only. It is not a mortgage application, Loan Estimate, approval, or commitment to lend.',
  countyNeedsConfirm: 'county needs confirmation',
};

const ru: Dict = {
  productName: 'ИИ-советник по ипотечной стратегии',
  heroTitle: 'Опишите свою ипотечную ситуацию. Советник сравнит возможные варианты кредита.',
  heroSubtitle:
    'Расскажите, что вы хотите купить, как вы получаете доход и сколько у вас средств. Советник поможет определить возможные стратегии финансирования, оценить реальную сумму для закрытия сделки и подготовить сценарий для проверки брокером.',
  exampleOnly: 'Только пример — опишите свою ситуацию, чтобы обновить.',
  liveYourScenario: 'Актуально — ваш сценарий',
  downPayment: 'Первоначальный взнос',
  cashToClose: 'Оценка суммы для закрытия',
  extraNeeded: 'Нужно дополнительно',
  describePlaceholder: 'Опишите вашу ситуацию…',
  send: 'Отправить',
  startOver: 'Начать заново',
  console: 'ИИ-советник по стратегии',
  localMode: 'Локальный режим советника — подключите ИИ-провайдера для более глубокого анализа.',
  profileTitle: 'Профиль кредитной стратегии',
  complete: 'заполнено',
  viewFullProfile: 'Смотреть весь профиль',
  openProfile: 'Открыть профиль',
  completed: 'Известно',
  stillNeeded: 'Не хватает',
  helpful: 'Полезно',
  next: 'Следующий вопрос',
  nothingYet: 'Пока пусто — опишите вашу ситуацию.',
  possiblePaths: 'Возможные варианты кредита',
  whyFits: 'Почему может подойти',
  missingData: 'Не хватает данных',
  estPayment: 'Оценка платежа',
  estCashToClose: 'Оценка суммы для закрытия',
  docsNeeded: 'Документы',
  mainRisks: 'Основные риски',
  prepareSummary: 'Подготовить мою стратегию',
  sendScenario: 'Отправить сценарий на проверку',
  talkBroker: 'Связаться с ипотечным брокером',
  reviewTitle: 'Запрос на проверку стратегии',
  reviewIntro:
    'Я могу подготовить персональную сводку по стратегии и отправить её лицензированному ипотечному брокеру для проверки. Как с вами лучше связаться?',
  name: 'Имя',
  phone: 'Телефон',
  email: 'Эл. почта',
  contactTime: 'Удобное время для связи',
  preferredLanguage: 'Предпочтительный язык',
  sendRequest: 'Отправить брокеру',
  sending: 'Отправка…',
  reviewSent: 'Отправлено. Лицензированный брокер проверит ваш сценарий и свяжется с вами.',
  close: 'Закрыть',
  micSoon: 'Голосовой ввод скоро появится.',
  docSoon:
    'Проверка документов скоро появится. Загруженные документы будут отправлены лицензированному брокеру для проверки, а не просто прикреплены к чату.',
  complianceShort:
    'Только для образовательных и планировочных целей. Это не заявка на ипотеку, не Loan Estimate, не одобрение и не обязательство кредитовать.',
  countyNeedsConfirm: 'округ требует подтверждения',
};

const es: Dict = {
  productName: 'Asesor de Estrategia Hipotecaria con IA',
  heroTitle: 'Describe tu escenario hipotecario. El asesor comparará posibles opciones de préstamo.',
  heroSubtitle:
    'Cuéntanos qué quieres comprar, cómo generas ingresos y cuánto efectivo tienes. El asesor ayudará a identificar posibles estrategias de financiamiento, estimar el efectivo real para cerrar y preparar el escenario para revisión de un corredor.',
  exampleOnly: 'Solo ejemplo — describe tu escenario para actualizar.',
  liveYourScenario: 'En vivo — tu escenario',
  downPayment: 'Enganche',
  cashToClose: 'Efectivo estimado para cerrar',
  extraNeeded: 'Extra necesario',
  describePlaceholder: 'Describe tu escenario…',
  send: 'Enviar',
  startOver: 'Empezar de nuevo',
  console: 'Asesor de Estrategia con IA',
  localMode: 'Modo asesor local — conecta un proveedor de IA para un análisis más profundo.',
  profileTitle: 'Perfil de Estrategia de Préstamo',
  complete: 'completo',
  viewFullProfile: 'Ver perfil completo',
  openProfile: 'Abrir perfil',
  completed: 'Conocido',
  stillNeeded: 'Falta crítico',
  helpful: 'Útil',
  next: 'Próxima pregunta',
  nothingYet: 'Nada aún — describe tu escenario.',
  possiblePaths: 'Posibles opciones de préstamo',
  whyFits: 'Por qué puede encajar',
  missingData: 'Datos faltantes',
  estPayment: 'Pago est.',
  estCashToClose: 'Efectivo est. para cerrar',
  docsNeeded: 'Documentación',
  mainRisks: 'Riesgos principales',
  prepareSummary: 'Preparar mi resumen de estrategia',
  sendScenario: 'Enviar mi escenario para revisión',
  talkBroker: 'Hablar con un corredor hipotecario',
  reviewTitle: 'Solicitud de Revisión de Estrategia',
  reviewIntro:
    'Puedo preparar un resumen de estrategia personalizado y enviarlo a un corredor hipotecario con licencia para su revisión. ¿Cuál es la mejor forma de contactarte?',
  name: 'Nombre',
  phone: 'Teléfono',
  email: 'Correo electrónico',
  contactTime: 'Horario preferido de contacto',
  preferredLanguage: 'Idioma preferido',
  sendRequest: 'Enviar para revisión',
  sending: 'Enviando…',
  reviewSent: 'Enviado. Un corredor con licencia revisará tu escenario y te contactará.',
  close: 'Cerrar',
  micSoon: 'La entrada de voz estará disponible pronto.',
  docSoon:
    'La revisión de documentos estará disponible pronto. Los documentos subidos se enviarán a un corredor con licencia para su revisión, no simplemente se adjuntan al chat.',
  complianceShort:
    'Solo para fines educativos y de planificación. No es una solicitud de hipoteca, Loan Estimate, aprobación ni compromiso de préstamo.',
  countyNeedsConfirm: 'el condado necesita confirmación',
};

const zh: Dict = {
  productName: 'AI 房贷策略顾问',
  heroTitle: '描述您的房贷情况，顾问将为您比较可能的贷款方案。',
  heroSubtitle:
    '告诉我们您想购买什么、您的收入方式以及您有多少现金。顾问将帮助识别可能的融资策略，估算真正需要的过户现金，并准备好方案供持牌经纪人审阅。',
  exampleOnly: '仅为示例 — 描述您的情况以更新。',
  liveYourScenario: '实时 — 您的方案',
  downPayment: '首付',
  cashToClose: '预计过户现金',
  extraNeeded: '额外需要',
  describePlaceholder: '描述您的情况…',
  send: '发送',
  startOver: '重新开始',
  console: 'AI 策略顾问',
  localMode: '本地顾问模式 — 连接 AI 提供商以获得更深入的分析。',
  profileTitle: '贷款策略档案',
  complete: '完成',
  viewFullProfile: '查看完整档案',
  openProfile: '打开档案',
  completed: '已知',
  stillNeeded: '关键缺失',
  helpful: '有帮助',
  next: '下一个问题',
  nothingYet: '暂无内容 — 请描述您的情况。',
  possiblePaths: '可能的贷款方案',
  whyFits: '为何可能合适',
  missingData: '缺失数据',
  estPayment: '预计月供',
  estCashToClose: '预计过户现金',
  docsNeeded: '所需文件',
  mainRisks: '主要风险',
  prepareSummary: '准备我的策略摘要',
  sendScenario: '提交我的贷款方案以供审阅',
  talkBroker: '联系房贷经纪人',
  reviewTitle: '策略审阅请求',
  reviewIntro:
    '我可以准备一份个性化的策略摘要，并发送给持牌房贷经纪人审阅。请问如何与您联系最方便？',
  name: '姓名',
  phone: '电话',
  email: '电子邮件',
  contactTime: '首选联系时间',
  preferredLanguage: '首选语言',
  sendRequest: '提交经纪人审阅',
  sending: '发送中…',
  reviewSent: '已发送。持牌经纪人将审阅您的方案并跟进。',
  close: '关闭',
  micSoon: '语音输入即将推出。',
  docSoon:
    '文件审阅即将推出。上传的文件将发送给持牌经纪人审阅，而不是简单地附加到聊天中。',
  complianceShort:
    '仅供教育和规划参考。这不是房贷申请、贷款估算、批准或放贷承诺。',
  countyNeedsConfirm: '县需要确认',
};

const DICTS: Record<Language, Dict> = { en, ru, es, zh };

export function t(lang: Language, key: UIKey): string {
  return DICTS[lang][key] ?? DICTS.en[key];
}
