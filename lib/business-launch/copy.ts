import type {
  BusinessEntityType,
  BusinessLaunchStage,
  BusinessLaunchTaskCode,
} from "./types";

type Language = "en" | "es";

export const businessLaunchCopy = {
  en: {
    title: "Business Launch",
    subtitle:
      "Organize the steps to establish a U.S. business and open each required official filing site.",
    eyebrow: "Guided formation workspace",
    disclaimer:
      "ALMA provides organizational information and official links—not legal, tax, or accounting advice. ALMA does not form your entity or submit government forms for you.",
    safety:
      "For a structure, ownership, tax election, regulated activity, or multi-state question, pause and consult a qualified attorney or tax professional.",
    newTitle: "Start a launch plan",
    newBody:
      "Tell ALMA the basics. You can choose “Not sure yet” and decide after reviewing official guidance or speaking with a professional.",
    state: "Formation state",
    entity: "Structure",
    name: "Desired business name",
    ownerCount: "Number of owners",
    city: "Primary city",
    industry: "Industry",
    purpose: "Plain-language business activity",
    acknowledge:
      "I understand this is a planning checklist and not a government filing or professional opinion.",
    start: "Create launch plan",
    creating: "Creating...",
    signIn: "Sign in to create a business launch plan.",
    migration:
      "Apply the Business Launch migration before using this workspace.",
    unavailable: "Business Launch is temporarily unavailable.",
    retry: "Retry",
    progress: "Launch progress",
    completed: "completed",
    print: "Print launch packet",
    addAnother: "Start another business",
    details: "Formation record",
    detailsHelp:
      "Record only confirmation details. Never enter an SSN, full EIN, identity document, or payment-card number.",
    legalName: "Approved legal name",
    registeredAgent: "Registered agent",
    filingStatus: "State filing",
    filingNumber: "State confirmation number",
    formationDate: "Formation date",
    einStatus: "EIN",
    einLastFour: "EIN last 4 only",
    bankStatus: "Business bank account",
    accountingStatus: "Accounting setup",
    licensesStatus: "Licenses and permits",
    insuranceStatus: "Insurance",
    launchStatus: "Overall status",
    save: "Save record",
    saving: "Saving...",
    saved: "Saved",
    saveFailed: "ALMA could not save this update.",
    taskStatus: "Status",
    official: "Open official guidance",
    deadlines: "Compliance calendar",
    deadlinesBody:
      "Add dates shown on official notices or confirmed by your professional. ALMA does not invent due dates.",
    deadlineName: "Deadline name",
    deadlineDate: "Due date",
    deadlineCadence: "Repeats",
    deadlineLink: "Official .gov link (optional)",
    deadlineNotes: "Notes",
    addDeadline: "Add deadline",
    noDeadlines: "No confirmed deadlines have been added.",
    markDone: "Mark completed",
    boiTitle: "Current federal BOI notice",
    boiBody:
      "As of July 29, 2026, FinCEN says entities created in the United States and U.S. persons are exempt from BOI reporting. Foreign entities registered in the U.S. may still have obligations. Recheck FinCEN before relying on this status.",
    einNotice:
      "The IRS issues EINs free. Form the legal entity with your state before applying when required, and never pay ALMA merely to obtain the free EIN.",
    notFiled:
      "A checklist or submitted application does not mean your entity exists. Record “Approved” only after the state confirms formation.",
    dataGuard: "Sensitive-data guard",
    dataGuardBody:
      "ALMA stores progress and confirmation references—not SSNs, owner identity documents, full EINs, government passwords, or card details.",
  },
  es: {
    title: "Lanzamiento del negocio",
    subtitle:
      "Organiza los pasos para establecer un negocio en EE. UU. y abre cada sitio oficial requerido.",
    eyebrow: "Espacio guiado de formación",
    disclaimer:
      "ALMA ofrece organización y enlaces oficiales, no asesoría legal, fiscal o contable. ALMA no constituye tu entidad ni presenta formularios gubernamentales.",
    safety:
      "Para decisiones sobre estructura, propietarios, elecciones fiscales, actividades reguladas o varios estados, consulta a un abogado o profesional fiscal calificado.",
    newTitle: "Inicia un plan de lanzamiento",
    newBody:
      "Dale a ALMA los datos básicos. Puedes elegir “Aún no sé” y decidir después de revisar la guía oficial o consultar a un profesional.",
    state: "Estado de formación",
    entity: "Estructura",
    name: "Nombre comercial deseado",
    ownerCount: "Número de propietarios",
    city: "Ciudad principal",
    industry: "Industria",
    purpose: "Actividad del negocio en palabras simples",
    acknowledge:
      "Entiendo que esto es una lista de planificación y no una presentación gubernamental ni una opinión profesional.",
    start: "Crear plan de lanzamiento",
    creating: "Creando...",
    signIn: "Inicia sesión para crear un plan de lanzamiento.",
    migration:
      "Aplica la migración de Lanzamiento del Negocio antes de usar este espacio.",
    unavailable: "Lanzamiento del Negocio no está disponible temporalmente.",
    retry: "Reintentar",
    progress: "Progreso del lanzamiento",
    completed: "completado",
    print: "Imprimir paquete de lanzamiento",
    addAnother: "Iniciar otro negocio",
    details: "Registro de formación",
    detailsHelp:
      "Guarda solo datos de confirmación. Nunca ingreses SSN, EIN completo, documentos de identidad ni tarjetas.",
    legalName: "Nombre legal aprobado",
    registeredAgent: "Agente registrado",
    filingStatus: "Presentación estatal",
    filingNumber: "Número de confirmación estatal",
    formationDate: "Fecha de formación",
    einStatus: "EIN",
    einLastFour: "Solo últimos 4 del EIN",
    bankStatus: "Cuenta bancaria del negocio",
    accountingStatus: "Configuración contable",
    licensesStatus: "Licencias y permisos",
    insuranceStatus: "Seguro",
    launchStatus: "Estado general",
    save: "Guardar registro",
    saving: "Guardando...",
    saved: "Guardado",
    saveFailed: "ALMA no pudo guardar esta actualización.",
    taskStatus: "Estado",
    official: "Abrir guía oficial",
    deadlines: "Calendario de cumplimiento",
    deadlinesBody:
      "Agrega fechas de avisos oficiales o confirmadas por tu profesional. ALMA no inventa fechas límite.",
    deadlineName: "Nombre del plazo",
    deadlineDate: "Fecha límite",
    deadlineCadence: "Se repite",
    deadlineLink: "Enlace oficial .gov (opcional)",
    deadlineNotes: "Notas",
    addDeadline: "Agregar plazo",
    noDeadlines: "No se han agregado fechas confirmadas.",
    markDone: "Marcar completado",
    boiTitle: "Aviso federal actual sobre BOI",
    boiBody:
      "Al 29 de julio de 2026, FinCEN indica que las entidades creadas en Estados Unidos y las personas estadounidenses están exentas del reporte BOI. Entidades extranjeras registradas en EE. UU. aún pueden tener obligaciones. Verifica FinCEN antes de depender de este estado.",
    einNotice:
      "El IRS emite el EIN gratis. Forma primero la entidad legal con el estado cuando corresponda y nunca pagues a ALMA solo por obtener el EIN gratuito.",
    notFiled:
      "Una lista o solicitud enviada no significa que la entidad exista. Marca “Aprobada” solo después de la confirmación estatal.",
    dataGuard: "Protección de datos sensibles",
    dataGuardBody:
      "ALMA guarda progreso y referencias de confirmación, no SSN, identificaciones, EIN completos, contraseñas gubernamentales ni tarjetas.",
  },
} as const;

export const entityTypeCopy: Record<
  Language,
  Record<BusinessEntityType, string>
> = {
  en: {
    undecided: "Not sure yet",
    sole_proprietorship: "Sole proprietorship",
    llc: "Limited liability company (LLC)",
    corporation: "Corporation",
    partnership: "Partnership",
    nonprofit: "Nonprofit corporation",
  },
  es: {
    undecided: "Aún no sé",
    sole_proprietorship: "Propietario único",
    llc: "Compañía de responsabilidad limitada (LLC)",
    corporation: "Corporación",
    partnership: "Sociedad",
    nonprofit: "Corporación sin fines de lucro",
  },
};

export const stageCopy: Record<
  Language,
  Record<BusinessLaunchStage, string>
> = {
  en: {
    foundation: "1. Foundation",
    registration: "2. State registration",
    tax: "3. Tax IDs",
    operations: "4. Open for business",
    compliance: "5. Ongoing compliance",
  },
  es: {
    foundation: "1. Fundamentos",
    registration: "2. Registro estatal",
    tax: "3. Identificación fiscal",
    operations: "4. Abrir el negocio",
    compliance: "5. Cumplimiento continuo",
  },
};

export const taskCopy: Record<
  Language,
  Record<BusinessLaunchTaskCode, { title: string; body: string }>
> = {
  en: {
    structure_review: {
      title: "Review the business structure",
      body: "Compare liability, ownership, administration, and tax treatment. Use a professional when the choice is not straightforward.",
    },
    name_check: {
      title: "Check and protect the name",
      body: "Search the state registry and review DBA, domain, and trademark needs. A search does not reserve or approve the name.",
    },
    registered_agent: {
      title: "Choose a registered agent",
      body: "Confirm the state’s eligibility, address, availability, privacy, and consent requirements before filing.",
    },
    state_filing: {
      title: "File with the state",
      body: "Use the official state portal reached through the SBA directory. Pay government fees directly and keep the receipt.",
    },
    formation_documents: {
      title: "Save the state approval",
      body: "After approval, store the filed formation document and confirmation in ALMA Documents. Do not mark this complete on submission alone.",
    },
    ein: {
      title: "Apply for the free IRS EIN",
      body: "Apply directly with the IRS after state formation when required. Store only the last four digits in this checklist.",
    },
    state_tax: {
      title: "Review state and local tax registrations",
      body: "Check sales tax, employer withholding, franchise tax, and local registration based on actual activity and location.",
    },
    licenses: {
      title: "Check licenses and permits",
      body: "Review federal, state, county, city, industry, and professional requirements. Requirements vary by activity and location.",
    },
    bank: {
      title: "Open a business bank account",
      body: "Use the approved formation documents, EIN when applicable, and ownership records requested by the bank.",
    },
    insurance: {
      title: "Review business insurance",
      body: "Confirm coverage appropriate to the business, property, vehicles, employees, contracts, and professional risk.",
    },
    accounting: {
      title: "Configure bookkeeping",
      body: "Set the fiscal year, categories, invoice settings, payment account, receipt workflow, and QuickBooks connection or export.",
    },
    operating_documents: {
      title: "Prepare internal governance documents",
      body: "Determine whether an operating agreement, bylaws, resolutions, ownership records, or professional review is appropriate.",
    },
    compliance_calendar: {
      title: "Record confirmed deadlines",
      body: "Add annual reports, renewals, tax accounts, licenses, and other dates from official notices. Do not rely on generic deadlines.",
    },
    boi_check: {
      title: "Verify current BOI applicability",
      body: "Domestic U.S.-created entities are currently exempt under FinCEN’s March 2025 rule. Foreign entities registered in the U.S. may still need to report.",
    },
  },
  es: {
    structure_review: {
      title: "Revisa la estructura del negocio",
      body: "Compara responsabilidad, propiedad, administración y tratamiento fiscal. Consulta a un profesional cuando la decisión no sea sencilla.",
    },
    name_check: {
      title: "Verifica y protege el nombre",
      body: "Busca en el registro estatal y revisa DBA, dominio y marca. Una búsqueda no reserva ni aprueba el nombre.",
    },
    registered_agent: {
      title: "Elige un agente registrado",
      body: "Confirma elegibilidad, dirección, disponibilidad, privacidad y consentimiento exigidos por el estado antes de presentar.",
    },
    state_filing: {
      title: "Presenta ante el estado",
      body: "Usa el portal oficial del estado desde el directorio de la SBA. Paga tarifas gubernamentales directamente y guarda el recibo.",
    },
    formation_documents: {
      title: "Guarda la aprobación estatal",
      body: "Después de la aprobación, guarda el documento presentado y la confirmación en Documentos. Enviar no significa aprobar.",
    },
    ein: {
      title: "Solicita el EIN gratuito del IRS",
      body: "Solicítalo directamente al IRS después de la formación estatal cuando corresponda. Guarda aquí solo los últimos cuatro dígitos.",
    },
    state_tax: {
      title: "Revisa registros fiscales estatales y locales",
      body: "Verifica impuestos de venta, retenciones, franquicia y registros locales según la actividad y ubicación reales.",
    },
    licenses: {
      title: "Revisa licencias y permisos",
      body: "Revisa requisitos federales, estatales, del condado, ciudad, industria y profesión. Varían por actividad y ubicación.",
    },
    bank: {
      title: "Abre una cuenta bancaria empresarial",
      body: "Usa los documentos aprobados, EIN cuando corresponda y registros de propietarios que solicite el banco.",
    },
    insurance: {
      title: "Revisa el seguro empresarial",
      body: "Confirma cobertura adecuada para negocio, propiedad, vehículos, empleados, contratos y riesgo profesional.",
    },
    accounting: {
      title: "Configura la contabilidad",
      body: "Configura año fiscal, categorías, facturas, cuenta de pagos, recibos y conexión o exportación a QuickBooks.",
    },
    operating_documents: {
      title: "Prepara documentos internos de gobierno",
      body: "Determina si corresponde un acuerdo operativo, estatutos, resoluciones, registros de propiedad o revisión profesional.",
    },
    compliance_calendar: {
      title: "Registra fechas confirmadas",
      body: "Agrega reportes anuales, renovaciones, impuestos y licencias desde avisos oficiales. No dependas de fechas genéricas.",
    },
    boi_check: {
      title: "Verifica la aplicación actual de BOI",
      body: "Entidades creadas en EE. UU. están actualmente exentas bajo la regla de FinCEN de marzo de 2025. Entidades extranjeras registradas podrían tener que reportar.",
    },
  },
};
