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
  | 'catOther';

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
    'Documents received. Your documents have been submitted to West Coast Capital Mortgage for broker review. A licensed mortgage professional will review them and contact you directly. Please make sure your phone number, email, preferred contact time, and preferred language are correct.',
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
    'Документы получены. Ваши документы отправлены в West Coast Capital Mortgage для ревью лицензированным mortgage broker. С вами свяжутся напрямую. Пожалуйста, проверьте, что телефон, email, удобное время связи и предпочитаемый язык указаны правильно.',
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
    'Documentos recibidos. Sus documentos se enviaron a West Coast Capital Mortgage para revisión del corredor. Un profesional hipotecario con licencia los revisará y lo contactará directamente. Verifique que su teléfono, correo, horario de contacto e idioma preferido sean correctos.',
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
    '文件已收到。您的文件已提交至 West Coast Capital Mortgage 供经纪人审阅。持牌房贷专业人士将审阅并直接与您联系。请确认您的电话、电子邮件、首选联系时间和首选语言正确无误。',
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
};

const DICTS: Record<Language, Dict> = { en, ru, es, zh };

export function t(lang: Language, key: UIKey): string {
  return DICTS[lang][key] ?? DICTS.en[key];
}
