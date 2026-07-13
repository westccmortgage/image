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
  | 'heroTitleMobile'
  | 'heroLineMobile'
  | 'onboardingGreetingMobile'
  | 'chipBuyingShort'
  | 'chipRefiShort'
  | 'chipSelfEmployedShort'
  | 'chipInvestmentShort'
  | 'summaryOffer'
  | 'summaryViewCta'
  | 'summaryContinueCta'
  | 'summaryTitle'
  | 'summaryMonthlyPayment'
  | 'summaryPlanningNote'
  | 'summaryEstDate'
  | 'adjustScenario'
  | 'continueChat'
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
  | 'countyNeedsConfirm'
  // --- document review flow ---
  | 'docModalTitle'
  | 'docModalIntro'
  | 'docSafetyNote'
  | 'docCompliance'
  | 'docReviewedBy'
  | 'docContactPrompt'
  | 'docUploadCta'
  | 'docSendForReview'
  | 'docSubmittedStatus'
  | 'docEventTitle'
  | 'docSuccess'
  | 'docFailure'
  | 'docDevMode'
  | 'docTypeLabel'
  | 'docNoteLabel'
  | 'docAddFiles'
  | 'docRemove'
  | 'docExplainSoon'
  | 'docFilesHeading'
  | 'docValidationType'
  | 'docValidationSize'
  | 'docValidationEmpty'
  | 'docValidationNone'
  | 'docValidationMax'
  | 'docTypeMissing'
  | 'catLoanEstimate'
  | 'catBankStatement'
  | 'catPaystub'
  | 'catTaxReturn'
  | 'catPurchaseContract'
  | 'catMortgageStatement'
  | 'catInsuranceQuote'
  | 'catTitleEscrow'
  | 'catOther'
  // --- multilingual UX phase ---
  | 'composerPlaceholder'
  | 'onboardingGreeting'
  | 'onboardingExample'
  | 'chipBuying'
  | 'chipRefi'
  | 'chipSelfEmployed'
  | 'chipInvestment'
  | 'chipCashToClose'
  | 'chipStarterBuying'
  | 'chipStarterRefi'
  | 'chipStarterSelfEmployed'
  | 'chipStarterInvestment'
  | 'chipStarterCashToClose'
  | 'trustLine'
  | 'profileWaiting'
  | 'micStart'
  | 'micStop'
  | 'micListening'
  | 'micDenied'
  | 'micUnsupported'
  | 'attachAria'
  | 'themeLight'
  | 'themeDark'
  | 'profileDetails'
  | 'missingInformation'
  | 'adjustNumbers'
  | 'purchasePriceLabel'
  | 'stateLabel'
  | 'loanTypeLabel'
  | 'showFullBreakdown'
  | 'downPaymentComparison'
  | 'addPriceAndDown'
  | 'nothingCritical'
  | 'loanAmountLabel'
  | 'countyLabel'
  | 'importantDisclosures'
  | 'aiStrategy'
  | 'contactTimePlaceholder'
  | 'perMonth'
  | 'snapshotHeader'
  | 'snapshotReadyPrompt'
  | 'programNote'
  | 'dataVerifiedCurrent'
  | 'dataConfiguredAssumption'
  | 'dataBrokerReview'
  | 'dataMissingPricing'
  | 'languageLabel';

type Dict = Record<UIKey, string>;

const en: Dict = {
  productName: 'AI Mortgage Strategy Advisor',
  heroTitle: 'Describe your mortgage situation.',
  heroSubtitle: 'Explore possible loan paths, estimated payments, and cash needed to close.',
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
  heroTitleMobile: 'AI Mortgage Strategy Advisor',
  heroLineMobile: 'Tell me what you are trying to buy, refinance, or understand.',
  onboardingGreetingMobile: 'Welcome. Tell me what you are trying to accomplish.',
  chipBuyingShort: 'Buying',
  chipRefiShort: 'Refinancing',
  chipSelfEmployedShort: 'Self-employed',
  chipInvestmentShort: 'Investment',
  summaryOffer:
    'Would you like to see your strategy summary with the estimated payment, cash needed to close, and possible loan paths?',
  summaryViewCta: 'View my summary',
  summaryContinueCta: 'Continue discussing',
  summaryTitle: 'Your mortgage strategy summary',
  summaryMonthlyPayment: 'Estimated monthly housing payment',
  summaryPlanningNote:
    'Planning estimate only. Current pricing and program availability require broker review. Not a Loan Estimate or an application.',
  summaryEstDate: 'Estimate prepared',
  adjustScenario: 'Adjust my scenario',
  continueChat: 'Continue chat',
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
  docModalTitle: 'Upload Documents for Broker Review',
  docModalIntro:
    'Upload a loan estimate, lender quote, bank statement, paystub, tax document, purchase contract, or other mortgage-related document for broker review.',
  docSafetyNote:
    'Please avoid uploading documents with full SSN, full bank account numbers, or highly sensitive personal information unless specifically requested by a licensed mortgage professional.',
  docCompliance:
    'This document review is for educational and planning purposes only. It is not a mortgage application, Loan Estimate, loan approval, or commitment to lend.',
  docReviewedBy: 'Documents will be reviewed by a licensed mortgage professional.',
  docContactPrompt:
    'To make sure the broker can follow up after reviewing your documents, please leave the best way to reach you.',
  docUploadCta: 'Upload for Broker Review',
  docSendForReview: 'Send Documents for Review',
  docSubmittedStatus: 'Submitted for broker review',
  docEventTitle: 'Document Review Submitted',
  docSuccess:
    'Documents received. Your documents have been submitted to West Coast Capital Mortgage Inc. for broker review. A licensed mortgage professional will review them and contact you directly. Please make sure your phone number, email, preferred contact time, and preferred language are correct.',
  docFailure:
    'We could not submit your documents yet. Please try again or contact the broker directly.',
  docDevMode: 'Development mode — documents were not actually delivered.',
  docTypeLabel: 'Document type',
  docNoteLabel: 'Note to the broker (optional)',
  docAddFiles: 'Add files',
  docRemove: 'Remove',
  docExplainSoon: 'Explain this document — coming soon',
  docFilesHeading: 'Files to submit',
  docValidationType: 'Unsupported file type. Allowed: PDF, PNG, JPG, JPEG, HEIC.',
  docValidationSize: 'File is too large (max 25MB).',
  docValidationEmpty: 'That file appears to be empty.',
  docValidationNone: 'Add at least one document to submit.',
  docValidationMax: 'You can upload up to 10 files.',
  docTypeMissing: 'Select a document type for each file.',
  catLoanEstimate: 'Loan Estimate / Lender Quote',
  catBankStatement: 'Bank Statement',
  catPaystub: 'Paystub / W-2 / 1099',
  catTaxReturn: 'Tax Return / P&L',
  catPurchaseContract: 'Purchase Contract',
  catMortgageStatement: 'Mortgage Statement',
  catInsuranceQuote: 'Insurance Quote',
  catTitleEscrow: 'Title / Escrow Estimate',
  catOther: 'Other Mortgage Document',
  composerPlaceholder: 'Tell me what you want to buy, refinance, or understand…',
  onboardingGreeting:
    'Welcome. Tell me what you are trying to accomplish. You can describe a purchase, refinance, self-employed income, investment property, or cash-to-close question in your own words.',
  onboardingExample:
    'Example: I want to buy a $2M home in California. I’m self-employed and have $400k down.',
  chipBuying: 'Buying a home',
  chipRefi: 'Refinancing',
  chipSelfEmployed: 'Self-employed',
  chipInvestment: 'Investment property',
  chipCashToClose: 'Cash needed to close',
  chipStarterBuying: 'I want to buy a home and understand which loan options fit me.',
  chipStarterRefi: 'I want to refinance my mortgage and see if it makes sense.',
  chipStarterSelfEmployed: 'I’m self-employed and want to know how I can qualify.',
  chipStarterInvestment: 'I’m looking at an investment property and want to compare loan paths.',
  chipStarterCashToClose: 'I want to understand how much cash I really need to close.',
  trustLine: 'No credit pull. No obligation. No application required.',
  profileWaiting: 'Waiting for your first details…',
  micStart: 'Start voice input',
  micStop: 'Tap to stop listening',
  micListening: 'Listening…',
  micDenied: 'Microphone access was denied.',
  micUnsupported: 'Voice input is not supported in this browser.',
  attachAria: 'Upload documents for broker review',
  themeLight: 'Switch to light mode',
  themeDark: 'Switch to dark mode',
  profileDetails: 'Profile details',
  missingInformation: 'Missing information',
  adjustNumbers: 'Adjust numbers',
  purchasePriceLabel: 'Purchase price',
  stateLabel: 'State',
  loanTypeLabel: 'Loan type',
  showFullBreakdown: 'Show full breakdown',
  downPaymentComparison: 'Down-payment comparison',
  addPriceAndDown: 'Add a purchase price and down payment and I’ll compute your exact cash to close.',
  nothingCritical: 'Nothing critical outstanding.',
  loanAmountLabel: 'Loan amount',
  countyLabel: 'County',
  importantDisclosures: 'Important disclosures',
  aiStrategy: 'AI Strategy',
  contactTimePlaceholder: 'e.g. weekday afternoons',
  perMonth: '/mo',
  languageLabel: 'Language',
  snapshotHeader: 'Loan Strategy Snapshot',
  snapshotReadyPrompt:
    'When you’re ready, I can prepare a personalized strategy summary for a licensed broker to review.',
  programNote:
    '* Estimated at an assumed planning rate for comparison — not a quoted rate. Possible paths only, subject to lender guidelines and broker review.',
  dataVerifiedCurrent: 'Verified current',
  dataConfiguredAssumption: 'Planning assumption',
  dataBrokerReview: 'Needs broker review',
  dataMissingPricing: 'Pricing not available yet',
};

const ru: Dict = {
  productName: 'ИИ-советник по ипотечной стратегии',
  heroTitle: 'Опишите свою ипотечную ситуацию.',
  heroSubtitle:
    'Узнайте возможные варианты кредита, ориентировочный платёж и сумму для закрытия сделки.',
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
  heroTitleMobile: 'ИИ-советник по ипотечной стратегии',
  heroLineMobile: 'Расскажите, что вы хотите купить, рефинансировать или понять.',
  onboardingGreetingMobile: 'Добро пожаловать. Расскажите, какую задачу вы хотите решить.',
  chipBuyingShort: 'Покупка',
  chipRefiShort: 'Рефинансирование',
  chipSelfEmployedShort: 'Работаю на себя',
  chipInvestmentShort: 'Инвестиции',
  summaryOffer:
    'Хотите посмотреть итог вашей стратегии с ориентировочным платежом, суммой для закрытия сделки и возможными вариантами кредита?',
  summaryViewCta: 'Показать итог',
  summaryContinueCta: 'Продолжить обсуждение',
  summaryTitle: 'Итог вашей ипотечной стратегии',
  summaryMonthlyPayment: 'Ориентировочный ежемесячный платёж',
  summaryPlanningNote:
    'Только плановая оценка. Текущие ставки и доступность программ требуют проверки брокером. Это не Loan Estimate и не заявка.',
  summaryEstDate: 'Оценка подготовлена',
  adjustScenario: 'Изменить сценарий',
  continueChat: 'Продолжить чат',
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
  docModalTitle: 'Загрузите документы для ревью брокером',
  docModalIntro:
    'Загрузите Loan Estimate, предложение кредитора, банковскую выписку, paystub, налоговый документ, договор купли-продажи или другой документ по ипотеке для ревью брокером.',
  docSafetyNote:
    'Пожалуйста, не загружайте документы с полным SSN, полными номерами банковских счетов или другой особо конфиденциальной информацией, если это специально не запросил лицензированный ипотечный специалист.',
  docCompliance:
    'Ревью документов предназначено только для образовательных и планировочных целей. Это не заявка на ипотеку, не Loan Estimate, не одобрение кредита и не обязательство кредитовать.',
  docReviewedBy: 'Документы будут рассмотрены лицензированным ипотечным специалистом.',
  docContactPrompt:
    'Чтобы брокер мог связаться с вами после ревью документов, пожалуйста, оставьте удобный способ связи.',
  docUploadCta: 'Отправить на ревью брокеру',
  docSendForReview: 'Отправить документы на ревью',
  docSubmittedStatus: 'Отправлено на ревью брокеру',
  docEventTitle: 'Документы отправлены на ревью',
  docSuccess:
    'Документы получены. Ваши документы отправлены в West Coast Capital Mortgage Inc. для ревью лицензированным mortgage broker. С вами свяжутся напрямую. Пожалуйста, проверьте, что телефон, email, удобное время связи и предпочитаемый язык указаны правильно.',
  docFailure:
    'Не удалось отправить ваши документы. Пожалуйста, попробуйте снова или свяжитесь с брокером напрямую.',
  docDevMode: 'Режим разработки — документы фактически не были отправлены.',
  docTypeLabel: 'Тип документа',
  docNoteLabel: 'Примечание для брокера (необязательно)',
  docAddFiles: 'Добавить файлы',
  docRemove: 'Удалить',
  docExplainSoon: 'Объяснить документ — скоро',
  docFilesHeading: 'Файлы для отправки',
  docValidationType: 'Неподдерживаемый тип файла. Разрешено: PDF, PNG, JPG, JPEG, HEIC.',
  docValidationSize: 'Файл слишком большой (макс. 25 МБ).',
  docValidationEmpty: 'Этот файл, похоже, пуст.',
  docValidationNone: 'Добавьте хотя бы один документ для отправки.',
  docValidationMax: 'Можно загрузить до 10 файлов.',
  docTypeMissing: 'Выберите тип документа для каждого файла.',
  catLoanEstimate: 'Loan Estimate / предложение кредитора',
  catBankStatement: 'Банковская выписка',
  catPaystub: 'Paystub / W-2 / 1099',
  catTaxReturn: 'Налоговая декларация / P&L',
  catPurchaseContract: 'Договор купли-продажи',
  catMortgageStatement: 'Выписка по ипотеке',
  catInsuranceQuote: 'Предложение по страхованию',
  catTitleEscrow: 'Оценка Title / Escrow',
  catOther: 'Другой ипотечный документ',
  composerPlaceholder: 'Расскажите, что вы хотите купить, рефинансировать или понять…',
  onboardingGreeting:
    'Добро пожаловать. Расскажите, какую задачу вы хотите решить. Вы можете своими словами описать покупку, рефинансирование, доход от собственного бизнеса, инвестиционную недвижимость или вопрос о сумме, необходимой для закрытия сделки.',
  onboardingExample:
    'Пример: Я хочу купить дом за $2 млн в Калифорнии. Я работаю на себя и могу внести $400 тыс.',
  chipBuying: 'Покупка дома',
  chipRefi: 'Рефинансирование',
  chipSelfEmployed: 'Работаю на себя',
  chipInvestment: 'Инвестиционная недвижимость',
  chipCashToClose: 'Сумма для закрытия сделки',
  chipStarterBuying: 'Я хочу купить дом и понять, какие варианты кредита мне подходят.',
  chipStarterRefi: 'Я хочу рефинансировать ипотеку и понять, есть ли в этом смысл.',
  chipStarterSelfEmployed: 'Я работаю на себя и хочу узнать, как я могу получить одобрение.',
  chipStarterInvestment: 'Я рассматриваю инвестиционную недвижимость и хочу сравнить варианты кредита.',
  chipStarterCashToClose: 'Я хочу понять, сколько денег мне действительно нужно для закрытия сделки.',
  trustLine: 'Без проверки кредитной истории. Без обязательств. Заявка не требуется.',
  profileWaiting: 'Ожидаю первые данные о вашей ситуации…',
  micStart: 'Начать голосовой ввод',
  micStop: 'Нажмите, чтобы остановить',
  micListening: 'Слушаю…',
  micDenied: 'Доступ к микрофону запрещён.',
  micUnsupported: 'Голосовой ввод не поддерживается в этом браузере.',
  attachAria: 'Загрузить документы для проверки брокером',
  themeLight: 'Переключить на светлую тему',
  themeDark: 'Переключить на тёмную тему',
  profileDetails: 'Детали профиля',
  missingInformation: 'Недостающая информация',
  adjustNumbers: 'Изменить цифры',
  purchasePriceLabel: 'Цена покупки',
  stateLabel: 'Штат',
  loanTypeLabel: 'Тип кредита',
  showFullBreakdown: 'Показать полную разбивку',
  downPaymentComparison: 'Сравнение первоначального взноса',
  addPriceAndDown: 'Укажите цену покупки и первоначальный взнос, и я рассчитаю точную сумму для закрытия сделки.',
  nothingCritical: 'Ничего критичного не осталось.',
  loanAmountLabel: 'Сумма кредита',
  countyLabel: 'Округ',
  importantDisclosures: 'Важные оговорки',
  aiStrategy: 'ИИ-стратегия',
  contactTimePlaceholder: 'напр. будни после обеда',
  perMonth: '/мес',
  languageLabel: 'Язык',
  snapshotHeader: 'Обзор кредитной стратегии',
  snapshotReadyPrompt:
    'Когда будете готовы, я подготовлю персональную сводку по стратегии для проверки лицензированным брокером.',
  programNote:
    '* Оценка по условной планировочной ставке для сравнения — не котировка. Только возможные варианты, при условии соблюдения требований кредитора и проверки брокером.',
  dataVerifiedCurrent: 'Проверенные актуальные данные',
  dataConfiguredAssumption: 'Плановое допущение',
  dataBrokerReview: 'Требуется проверка брокером',
  dataMissingPricing: 'Ценообразование пока недоступно',
};

const es: Dict = {
  productName: 'Asesor de Estrategia Hipotecaria con IA',
  heroTitle: 'Describa su situación hipotecaria.',
  heroSubtitle:
    'Explore posibles opciones de préstamo, pagos estimados y el efectivo necesario para el cierre.',
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
  heroTitleMobile: 'Asesor de Estrategia Hipotecaria con IA',
  heroLineMobile: 'Cuénteme qué quiere comprar, refinanciar o entender.',
  onboardingGreetingMobile: 'Bienvenido. Cuénteme qué quiere lograr.',
  chipBuyingShort: 'Comprar',
  chipRefiShort: 'Refinanciar',
  chipSelfEmployedShort: 'Trabajo independiente',
  chipInvestmentShort: 'Inversión',
  summaryOffer:
    '¿Quiere ver el resumen final de su estrategia con el pago estimado, el efectivo necesario para el cierre y las posibles opciones de préstamo?',
  summaryViewCta: 'Ver mi resumen',
  summaryContinueCta: 'Seguir conversando',
  summaryTitle: 'Resumen de su estrategia hipotecaria',
  summaryMonthlyPayment: 'Pago mensual estimado de la vivienda',
  summaryPlanningNote:
    'Solo estimación de planificación. Los precios y la disponibilidad de programas actuales requieren revisión del corredor. No es un Loan Estimate ni una solicitud.',
  summaryEstDate: 'Estimación preparada',
  adjustScenario: 'Ajustar mi escenario',
  continueChat: 'Continuar el chat',
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
  docModalTitle: 'Suba documentos para revisión del corredor',
  docModalIntro:
    'Suba un Loan Estimate, cotización del prestamista, estado de cuenta bancario, talón de pago, documento fiscal, contrato de compra u otro documento hipotecario para revisión del corredor.',
  docSafetyNote:
    'Evite subir documentos con el SSN completo, números de cuenta bancaria completos u otra información altamente sensible, a menos que lo solicite específicamente un profesional hipotecario con licencia.',
  docCompliance:
    'Esta revisión de documentos es solo para fines educativos y de planificación. No es una solicitud de hipoteca, Loan Estimate, aprobación ni compromiso de préstamo.',
  docReviewedBy: 'Los documentos serán revisados por un profesional hipotecario con licencia.',
  docContactPrompt:
    'Para que el corredor pueda dar seguimiento tras revisar sus documentos, deje la mejor forma de contactarlo.',
  docUploadCta: 'Enviar para revisión del corredor',
  docSendForReview: 'Enviar documentos para revisión',
  docSubmittedStatus: 'Enviado para revisión del corredor',
  docEventTitle: 'Documentos enviados para revisión',
  docSuccess:
    'Documentos recibidos. Sus documentos se enviaron a West Coast Capital Mortgage Inc. para revisión del corredor. Un profesional hipotecario con licencia los revisará y lo contactará directamente. Verifique que su teléfono, correo, horario de contacto e idioma preferido sean correctos.',
  docFailure:
    'No pudimos enviar sus documentos todavía. Inténtelo de nuevo o contacte al corredor directamente.',
  docDevMode: 'Modo de desarrollo — los documentos no se enviaron realmente.',
  docTypeLabel: 'Tipo de documento',
  docNoteLabel: 'Nota para el corredor (opcional)',
  docAddFiles: 'Agregar archivos',
  docRemove: 'Quitar',
  docExplainSoon: 'Explicar este documento — próximamente',
  docFilesHeading: 'Archivos para enviar',
  docValidationType: 'Tipo de archivo no admitido. Permitidos: PDF, PNG, JPG, JPEG, HEIC.',
  docValidationSize: 'El archivo es demasiado grande (máx. 25 MB).',
  docValidationEmpty: 'Ese archivo parece estar vacío.',
  docValidationNone: 'Agregue al menos un documento para enviar.',
  docValidationMax: 'Puede subir hasta 10 archivos.',
  docTypeMissing: 'Seleccione un tipo de documento para cada archivo.',
  catLoanEstimate: 'Loan Estimate / cotización del prestamista',
  catBankStatement: 'Estado de cuenta bancario',
  catPaystub: 'Talón de pago / W-2 / 1099',
  catTaxReturn: 'Declaración de impuestos / P&L',
  catPurchaseContract: 'Contrato de compra',
  catMortgageStatement: 'Estado de cuenta hipotecario',
  catInsuranceQuote: 'Cotización de seguro',
  catTitleEscrow: 'Estimación de Title / Escrow',
  catOther: 'Otro documento hipotecario',
  composerPlaceholder: 'Cuénteme qué quiere comprar, refinanciar o entender…',
  onboardingGreeting:
    'Bienvenido. Cuénteme qué quiere lograr. Puede describir con sus propias palabras una compra, refinanciamiento, ingresos por trabajo independiente, una propiedad de inversión o una pregunta sobre el dinero necesario para el cierre.',
  onboardingExample:
    'Ejemplo: Quiero comprar una casa de $2 millones en California. Trabajo por cuenta propia y tengo $400 mil para el enganche.',
  chipBuying: 'Comprar una vivienda',
  chipRefi: 'Refinanciar',
  chipSelfEmployed: 'Trabajo por cuenta propia',
  chipInvestment: 'Propiedad de inversión',
  chipCashToClose: 'Dinero necesario para el cierre',
  chipStarterBuying: 'Quiero comprar una vivienda y entender qué opciones de préstamo me convienen.',
  chipStarterRefi: 'Quiero refinanciar mi hipoteca y ver si me conviene.',
  chipStarterSelfEmployed: 'Trabajo por cuenta propia y quiero saber cómo puedo calificar.',
  chipStarterInvestment: 'Estoy considerando una propiedad de inversión y quiero comparar opciones de préstamo.',
  chipStarterCashToClose: 'Quiero entender cuánto dinero necesito realmente para el cierre.',
  trustLine: 'Sin consulta de crédito. Sin obligación. No se requiere una solicitud.',
  profileWaiting: 'Esperando los primeros detalles…',
  micStart: 'Iniciar entrada de voz',
  micStop: 'Toque para dejar de escuchar',
  micListening: 'Escuchando…',
  micDenied: 'Se denegó el acceso al micrófono.',
  micUnsupported: 'La entrada de voz no es compatible con este navegador.',
  attachAria: 'Subir documentos para revisión del corredor',
  themeLight: 'Cambiar a modo claro',
  themeDark: 'Cambiar a modo oscuro',
  profileDetails: 'Detalles del perfil',
  missingInformation: 'Información faltante',
  adjustNumbers: 'Ajustar cifras',
  purchasePriceLabel: 'Precio de compra',
  stateLabel: 'Estado',
  loanTypeLabel: 'Tipo de préstamo',
  showFullBreakdown: 'Ver desglose completo',
  downPaymentComparison: 'Comparación de enganche',
  addPriceAndDown: 'Indique el precio de compra y el enganche y calcularé el efectivo exacto para cerrar.',
  nothingCritical: 'No falta nada crítico.',
  loanAmountLabel: 'Monto del préstamo',
  countyLabel: 'Condado',
  importantDisclosures: 'Divulgaciones importantes',
  aiStrategy: 'Estrategia con IA',
  contactTimePlaceholder: 'p. ej. tardes entre semana',
  perMonth: '/mes',
  languageLabel: 'Idioma',
  snapshotHeader: 'Resumen de estrategia de préstamo',
  snapshotReadyPrompt:
    'Cuando esté listo, puedo preparar un resumen de estrategia personalizado para que lo revise un corredor con licencia.',
  programNote:
    '* Estimado a una tasa de planificación supuesta para comparar — no es una tasa cotizada. Solo opciones posibles, sujetas a las pautas del prestamista y a revisión del corredor.',
  dataVerifiedCurrent: 'Datos actuales verificados',
  dataConfiguredAssumption: 'Supuesto de planificación',
  dataBrokerReview: 'Requiere revisión del corredor',
  dataMissingPricing: 'Precios aún no disponibles',
};

const zh: Dict = {
  productName: 'AI 房贷策略顾问',
  heroTitle: '描述您的房贷情况。',
  heroSubtitle: '了解可能的贷款方案、预计月供和成交所需现金。',
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
  heroTitleMobile: 'AI 抵押贷款策略顾问',
  heroLineMobile: '请告诉我您想购买、再融资或了解什么。',
  onboardingGreetingMobile: '欢迎。请告诉我您希望解决什么问题。',
  chipBuyingShort: '购房',
  chipRefiShort: '再融资',
  chipSelfEmployedShort: '自雇',
  chipInvestmentShort: '投资',
  summaryOffer: '您想查看最终策略摘要吗？其中包括预计月供、成交所需现金和可能的贷款方案。',
  summaryViewCta: '查看摘要',
  summaryContinueCta: '继续讨论',
  summaryTitle: '您的抵押贷款策略摘要',
  summaryMonthlyPayment: '预计每月住房支出',
  summaryPlanningNote: '仅为规划估算。当前定价和方案可用性需经经纪人审阅。这不是贷款估算书，也不是贷款申请。',
  summaryEstDate: '估算生成时间',
  adjustScenario: '调整我的方案',
  continueChat: '继续聊天',
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
  docModalTitle: '上传文件供经纪人审阅',
  docModalIntro:
    '上传贷款估算、贷方报价、银行对账单、工资单、税务文件、购房合同或其他与房贷相关的文件，供经纪人审阅。',
  docSafetyNote:
    '除非持牌房贷专业人士特别要求，请勿上传包含完整 SSN、完整银行账号或其他高度敏感个人信息的文件。',
  docCompliance:
    '本文件审阅仅供教育和规划参考。这不是房贷申请、贷款估算、贷款批准或放贷承诺。',
  docReviewedBy: '文件将由持牌房贷专业人士审阅。',
  docContactPrompt: '为便于经纪人在审阅文件后与您联系，请留下最方便的联系方式。',
  docUploadCta: '提交经纪人审阅',
  docSendForReview: '提交文件以供审阅',
  docSubmittedStatus: '已提交经纪人审阅',
  docEventTitle: '文件已提交审阅',
  docSuccess:
    '文件已收到。您的文件已提交至 West Coast Capital Mortgage Inc. 供经纪人审阅。持牌房贷专业人士将审阅并直接与您联系。请确认您的电话、电子邮件、首选联系时间和首选语言正确无误。',
  docFailure: '暂时无法提交您的文件。请重试或直接联系经纪人。',
  docDevMode: '开发模式 — 文件实际上尚未发送。',
  docTypeLabel: '文件类型',
  docNoteLabel: '给经纪人的备注（可选）',
  docAddFiles: '添加文件',
  docRemove: '移除',
  docExplainSoon: '解释此文件 — 即将推出',
  docFilesHeading: '待提交文件',
  docValidationType: '不支持的文件类型。允许：PDF、PNG、JPG、JPEG、HEIC。',
  docValidationSize: '文件过大（最大 25MB）。',
  docValidationEmpty: '该文件似乎是空的。',
  docValidationNone: '请至少添加一个文件以提交。',
  docValidationMax: '最多可上传 10 个文件。',
  docTypeMissing: '请为每个文件选择文件类型。',
  catLoanEstimate: '贷款估算 / 贷方报价',
  catBankStatement: '银行对账单',
  catPaystub: '工资单 / W-2 / 1099',
  catTaxReturn: '纳税申报表 / P&L',
  catPurchaseContract: '购房合同',
  catMortgageStatement: '房贷对账单',
  catInsuranceQuote: '保险报价',
  catTitleEscrow: '产权 / 托管估算',
  catOther: '其他房贷文件',
  composerPlaceholder: '请告诉我您想购买、再融资或了解什么……',
  onboardingGreeting:
    '欢迎。请告诉我您希望解决什么问题。您可以用自己的话描述购房、再融资、自雇收入、投资房产，或成交所需现金方面的问题。',
  onboardingExample: '示例：我想在加州购买一套价值 200 万美元的房产。我是自雇人士，可支付 40 万美元首付。',
  chipBuying: '购买房屋',
  chipRefi: '再融资',
  chipSelfEmployed: '自雇人士',
  chipInvestment: '投资房产',
  chipCashToClose: '成交所需现金',
  chipStarterBuying: '我想购买房屋，并了解哪些贷款方案可能适合我。',
  chipStarterRefi: '我想为我的房贷再融资，看看是否划算。',
  chipStarterSelfEmployed: '我是自雇人士，想了解我如何才能获得贷款资格。',
  chipStarterInvestment: '我在考虑投资房产，想比较可能的贷款方案。',
  chipStarterCashToClose: '我想了解成交实际需要多少现金。',
  trustLine: '无需查询信用。无任何义务。无需提交贷款申请。',
  profileWaiting: '等待您提供初步信息……',
  micStart: '开始语音输入',
  micStop: '点击停止聆听',
  micListening: '正在聆听……',
  micDenied: '麦克风访问被拒绝。',
  micUnsupported: '此浏览器不支持语音输入。',
  attachAria: '上传文件供经纪人审阅',
  themeLight: '切换到浅色模式',
  themeDark: '切换到深色模式',
  profileDetails: '档案详情',
  missingInformation: '缺失信息',
  adjustNumbers: '调整数字',
  purchasePriceLabel: '购买价格',
  stateLabel: '州',
  loanTypeLabel: '贷款类型',
  showFullBreakdown: '显示完整明细',
  downPaymentComparison: '首付比较',
  addPriceAndDown: '请填写购买价格和首付，我将计算出您确切的过户现金。',
  nothingCritical: '没有关键的缺失项。',
  loanAmountLabel: '贷款金额',
  countyLabel: '县',
  importantDisclosures: '重要披露',
  aiStrategy: 'AI 策略',
  contactTimePlaceholder: '例如工作日下午',
  perMonth: '/月',
  languageLabel: '语言',
  snapshotHeader: '贷款策略概览',
  snapshotReadyPrompt: '当您准备好后，我可以准备一份个性化的策略摘要，供持牌经纪人审阅。',
  programNote: '* 按假定的规划利率估算以供比较 — 并非报价利率。仅为可能的方案，需符合贷方指南并经经纪人审阅。',
  dataVerifiedCurrent: '已核实的当前数据',
  dataConfiguredAssumption: '规划假设',
  dataBrokerReview: '需要经纪人审阅',
  dataMissingPricing: '暂无定价数据',
};

const DICTS: Record<Language, Dict> = { en, ru, es, zh };

export function t(lang: Language, key: UIKey): string {
  return DICTS[lang][key] ?? DICTS.en[key];
}

// ---------------------------------------------------------------------------
// Language initialization. Priority: explicit user selection (persisted UI
// pref) → supported URL ?lang= → browser language → English. The preference is
// a NON-SENSITIVE UI setting stored separately from any borrower scenario
// (which is never persisted).
// ---------------------------------------------------------------------------
export const LANG_STORAGE_KEY = 'ww-lang';
const CODES: Language[] = ['en', 'ru', 'es', 'zh'];

/** Map a BCP-47 locale (e.g. "ru-RU", "zh-Hans") to a supported language. */
export function normalizeLocale(loc: string | null | undefined): Language | null {
  if (!loc) return null;
  const l = loc.toLowerCase();
  if (l.startsWith('ru')) return 'ru';
  if (l.startsWith('es')) return 'es';
  if (l.startsWith('zh')) return 'zh';
  if (l.startsWith('en')) return 'en';
  return null;
}

export function detectInitialLanguage(opts: {
  stored?: string | null;
  url?: string | null;
  navigator?: string | null;
}): Language {
  const storedExact = opts.stored && (CODES as string[]).includes(opts.stored) ? (opts.stored as Language) : null;
  return storedExact ?? normalizeLocale(opts.stored) ?? normalizeLocale(opts.url) ?? normalizeLocale(opts.navigator) ?? 'en';
}

/** Resolve the initial language from storage / URL / browser at load time. */
export function readInitialLanguage(): Language {
  if (typeof window === 'undefined') return 'en';
  let stored: string | null = null;
  try {
    stored = window.localStorage.getItem(LANG_STORAGE_KEY);
  } catch {
    /* ignore */
  }
  let url: string | null = null;
  try {
    url = new URLSearchParams(window.location.search).get('lang');
  } catch {
    /* ignore */
  }
  const nav = typeof navigator !== 'undefined' && navigator.language ? navigator.language : null;
  return detectInitialLanguage({ stored, url, navigator: nav });
}

/** Remember the explicit language choice (non-sensitive UI preference). */
export function persistLanguage(lang: Language): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(LANG_STORAGE_KEY, lang);
  } catch {
    /* ignore */
  }
}

/** Web Speech API recognition locale for a language. */
export function recognitionLangFor(lang: Language): string {
  return { en: 'en-US', ru: 'ru-RU', es: 'es-US', zh: 'zh-CN' }[lang];
}
