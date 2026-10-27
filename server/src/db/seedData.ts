/**
 * Reference data and DEMONSTRATION records.
 *
 * Demo scheme content below was compiled on 27 Oct 2026 from the official sources
 * named in each record's `verificationSource`. Anything that could not be confirmed
 * from an official source is left empty and flagged "To be confirmed" (tbcFields).
 * All demo records carry isDemo = true and must be re-verified by an administrator
 * before the portal is used in production. Seed data never invents deadlines,
 * amounts or contact details.
 */
import type { SchemeInputRaw } from '@mandal/shared';

export const CATEGORIES = [
  { slug: 'agriculture', name: 'Agriculture', icon: 'sprout', color: 'green', sort: 1 },
  { slug: 'education', name: 'Education', icon: 'graduation-cap', color: 'blue', sort: 2 },
  { slug: 'health', name: 'Health', icon: 'heart-pulse', color: 'red', sort: 3 },
  { slug: 'housing', name: 'Housing', icon: 'home', color: 'orange', sort: 4 },
  { slug: 'pensions', name: 'Pensions', icon: 'hand-coins', color: 'purple', sort: 5 },
  { slug: 'employment', name: 'Employment', icon: 'users', color: 'teal', sort: 6 },
  { slug: 'others', name: 'Others', icon: 'grid', color: 'slate', sort: 7 },
];

export const DEPARTMENTS = [
  { name: 'Ministry of Agriculture & Farmers Welfare', level: 'central' },
  { name: 'Ministry of Health & Family Welfare (National Health Authority)', level: 'central' },
  { name: 'Ministry of Rural Development', level: 'central' },
  { name: 'Ministry of Social Justice & Empowerment', level: 'central' },
];

export const BENEFICIARY_GROUPS = [
  { slug: 'farmers', name: 'Farmers' },
  { slug: 'students', name: 'Students' },
  { slug: 'families', name: 'Families / households' },
  { slug: 'senior-citizens', name: 'Senior citizens (70+)' },
  { slug: 'rural-households', name: 'Rural households' },
  { slug: 'sc-st-obc', name: 'SC / ST / OBC' },
  { slug: 'women', name: 'Women' },
  { slug: 'persons-with-disabilities', name: 'Persons with disabilities' },
  { slug: 'workers', name: 'Workers' },
];

/**
 * Geography: Kurnool revenue division, Kurnool district, Andhra Pradesh.
 * Source used for mandal names: public list of mandals in Kurnool revenue division
 * (post-2022 reorganisation). Confirm with the district administration before production use.
 */
export const GEOGRAPHY = [
  {
    state: { name: 'Andhra Pradesh', code: 'AP' },
    districts: [
      {
        name: 'Kurnool',
        mandals: ['Kurnool Urban', 'Kurnool Rural', 'Kallur', 'Orvakal', 'C. Belagal', 'Gudur', 'Kodumur', 'Veldurthi'],
      },
    ],
  },
];

export const DEFAULT_MANDAL = 'kurnool-urban';

type DemoScheme = SchemeInputRaw & {
  categorySlug: string;
  department: string;
  groups: string[];
  publish: boolean;
};

const REVIEWED_ON = '2026-10-27';
const REVIEW_DUE = '2026-12-31';

export const DEMO_SCHEMES: DemoScheme[] = [
  {
    name: 'PM-KISAN Samman Nidhi',
    keywords: 'pm kisan, pmkisan, kisan samman, farmer income support',
    categorySlug: 'agriculture',
    department: 'Ministry of Agriculture & Farmers Welfare',
    groups: ['farmers'],
    shortDescription: 'Income support of ₹6,000 per year to eligible landholding farmer families, paid directly to their bank accounts.',
    overview:
      'PM-KISAN is a Central Sector scheme that provides income support to landholding farmer families. The benefit is paid in three equal instalments directly into Aadhaar-seeded bank accounts of eligible beneficiaries.',
    targetGroup: 'Landholding farmer families',
    eligibilitySummary: 'Landholding farmer families with cultivable land in their names (exclusions apply).',
    benefitsSummary: '₹6,000 per year in 3 instalments',
    eligibility: [
      "All landholding farmers' families who have cultivable land holdings in their names, subject to the exclusion criteria below.",
      'Land details must be recorded on the PM-KISAN portal, the bank account must be Aadhaar-linked, and eKYC must be completed.',
      'Not eligible: institutional landholders.',
      'Not eligible: families with a member who is a former or present holder of a constitutional post, a minister, or a member of Parliament or a State Legislature, or a former/present mayor or district panchayat chairperson.',
      'Not eligible: serving or retired employees of Central/State governments, PSUs, autonomous bodies and local bodies (Multi Tasking Staff / Class IV / Group D employees are not excluded).',
      'Not eligible: pensioners drawing a monthly pension of ₹10,000 or more (Multi Tasking Staff / Class IV / Group D excepted).',
      'Not eligible: persons who paid income tax in the last assessment year.',
      'Not eligible: practising professionals registered with professional bodies, such as doctors, engineers, lawyers, chartered accountants and architects.',
    ],
    benefits: [
      '₹6,000 per year per eligible farmer family.',
      'Paid in three equal instalments of ₹2,000 each.',
      'Direct Benefit Transfer (DBT) into Aadhaar-seeded bank accounts.',
    ],
    requiredDocuments: [
      'Aadhaar number of the farmer',
      'Bank account number and IFSC/MICR code',
      'Land ownership details (as recorded in State/UT land records)',
      'Mobile number',
    ],
    applicationSteps: [
      'Self-register on the official PM-KISAN portal or mobile app, or visit a Common Service Centre (CSC) for assistance.',
      'Enter your name, date of birth, Aadhaar number, bank account details, mobile number and land details.',
      'Your details are verified by the State/UT government.',
      'Complete eKYC (OTP-based on the portal, biometric at a CSC, or face authentication). eKYC is mandatory.',
      'Check your status using "Know Your Status" on the official portal.',
    ],
    applicationStatus: 'year_round',
    officialUrl: 'https://pmkisan.gov.in/',
    applicationUrl: 'https://pmkisan.gov.in/',
    guidelinesUrl: 'https://pmkisan.gov.in/Documents/RevisedPM-KISANOperationalGuidelines(English).pdf',
    helpNotes:
      'Raise grievances on the official PM-KISAN portal or through CPGRAMS. The Kisan-eMitra chatbot on the portal answers common questions.',
    tbcFields: [],
    availableAllMandals: true,
    verificationSource: 'PIB backgrounder on the 21st instalment of PM-KISAN (Nov 2025); PM-KISAN FAQs; pmkisan.gov.in',
    verificationSourceUrl: 'https://static.pib.gov.in/WriteReadData/specificdocs/documents/2025/nov/doc20251120700401.pdf',
    lastVerifiedOn: REVIEWED_ON,
    reviewDueOn: REVIEW_DUE,
    isFeatured: true,
    isDemo: true,
    publish: true,
    notes: 'Helpline phone number not confirmed from an official page during seeding — left blank on purpose.',
  },
  {
    name: 'Ayushman Bharat – Pradhan Mantri Jan Arogya Yojana (AB PM-JAY)',
    keywords: 'ayushman bharat, pmjay, pm jay, ayushman card, health insurance, vay vandana',
    categorySlug: 'health',
    department: 'Ministry of Health & Family Welfare (National Health Authority)',
    groups: ['families', 'senior-citizens'],
    shortDescription: 'Health cover of up to ₹5 lakh per family per year for secondary and tertiary hospitalisation in empanelled hospitals.',
    overview:
      'AB PM-JAY provides cashless health cover for hospitalisation in empanelled public and private hospitals across India. In September 2024 the scheme was extended to all senior citizens aged 70 and above, irrespective of income.',
    targetGroup: 'Eligible families; all citizens aged 70+',
    eligibilitySummary: 'Families identified as eligible under AB PM-JAY, and all senior citizens aged 70 and above.',
    benefitsSummary: 'Up to ₹5 lakh per family per year',
    eligibility: [
      'Families identified as eligible beneficiaries under AB PM-JAY. Check your eligibility on the official portal or at the nearest Common Service Centre.',
      'All senior citizens aged 70 years and above, irrespective of income (expansion approved in September 2024).',
    ],
    benefits: [
      'Health cover of up to ₹5 lakh per family per year for secondary and tertiary care hospitalisation in empanelled hospitals.',
      'Treatment of pre-existing illnesses is covered.',
      'Free medicines, drugs, implants and food during treatment.',
      'Up to 3 days of pre-hospitalisation and up to 15 days of post-hospitalisation expenses.',
      'Senior citizens aged 70+ in families already covered get an additional top-up of up to ₹5 lakh per year for themselves.',
    ],
    requiredDocuments: [],
    applicationSteps: [
      'Check whether you are eligible on the official PM-JAY website or at the nearest Common Service Centre.',
      'If eligible, obtain your Ayushman card as guided on the official website.',
      'Visit an empanelled hospital for treatment; the hospital helps beneficiaries avail cashless treatment.',
    ],
    applicationStatus: 'year_round',
    officialUrl: 'https://pmjay.gov.in/',
    applicationUrl: null,
    helpPhone: '14555',
    helpNotes: 'National toll-free helpline 14555. Register complaints on the official PM-JAY grievance portal.',
    tbcFields: ['required_documents', 'application_link'],
    availableAllMandals: true,
    verificationSource: 'NHA press release on AB PM-JAY expansion (11 Sep 2024); NHA beneficiary entitlement letter (Adhikar Patra)',
    verificationSourceUrl: 'https://nha.gov.in/img/resources/Press_Release.pdf',
    lastVerifiedOn: REVIEWED_ON,
    reviewDueOn: REVIEW_DUE,
    isFeatured: true,
    isDemo: true,
    publish: true,
    notes: 'Required documents and the current card-enrolment URL were not confirmed from an official source during seeding.',
  },
  {
    name: 'Pradhan Mantri Awaas Yojana – Gramin (PMAY-G)',
    keywords: 'pmay g, pmayg, awas yojana, awaas, rural housing, pucca house',
    categorySlug: 'housing',
    department: 'Ministry of Rural Development',
    groups: ['rural-households', 'families'],
    shortDescription: 'Financial assistance to eligible rural households to build a pucca house with basic amenities.',
    overview:
      'PMAY-G supports eligible rural households to construct a pucca house. Beneficiaries are identified through the SECC 2011 and Awaas+ surveys and verified by the Gram Sabha. Assistance can be combined with MGNREGA wage employment and Swachh Bharat Mission (Gramin) toilet support.',
    targetGroup: 'Eligible rural households',
    eligibilitySummary: 'Rural households identified through SECC 2011 / Awaas+ surveys and verified by the Gram Sabha.',
    benefitsSummary: '₹1.20 lakh per house in plain areas',
    eligibility: [
      'Rural households identified as eligible through the Socio Economic and Caste Census (SECC) 2011 and Awaas+ (2018) surveys.',
      'Beneficiary lists are verified by the Gram Sabha.',
    ],
    benefits: [
      'Unit assistance of ₹1.20 lakh in plain areas.',
      'Unit assistance of ₹1.30 lakh in North Eastern Region States and Hill States/UTs.',
      'Up to 95 days of unskilled wage employment under MGNREGA for house construction.',
      'Up to ₹12,000 for toilet construction through Swachh Bharat Mission (Gramin).',
    ],
    requiredDocuments: [],
    applicationSteps: [
      'Eligible households are identified through official surveys and Gram Sabha verification.',
      'Contact your Gram Panchayat or mandal office to check whether your household is on the beneficiary list.',
    ],
    applicationStatus: 'tbc',
    officialUrl: 'https://pmayg.nic.in/',
    applicationUrl: null,
    helpNotes: '',
    tbcFields: ['required_documents', 'deadline', 'help_contact', 'application_link', 'eligibility'],
    availableAllMandals: true,
    verificationSource: 'PIB backgrounder on PMAY-G (Nov 2024), Ministry of Rural Development',
    verificationSourceUrl: 'https://static.pib.gov.in/WriteReadData/specificdocs/documents/2024/nov/doc20241119437801.pdf',
    lastVerifiedOn: REVIEWED_ON,
    reviewDueOn: REVIEW_DUE,
    isFeatured: true,
    isDemo: true,
    publish: true,
    notes: 'Survey/registration window for the current phase not confirmed — application status left "To be confirmed".',
  },
  {
    name: 'Post Matric Scholarship for Scheduled Caste Students',
    keywords: 'post matric scholarship, pms sc, scholarship, sc students, freeship',
    categorySlug: 'education',
    department: 'Ministry of Social Justice & Empowerment',
    groups: ['students', 'sc-st-obc'],
    shortDescription: 'Financial support to Scheduled Caste students for post-matriculation and post-secondary studies.',
    overview:
      'The scheme supports Scheduled Caste students studying in recognised post-matric courses by covering compulsory non-refundable fees and providing an academic allowance. The published guidelines cover 2020-21 to 2025-26; arrangements for later years are to be confirmed.',
    targetGroup: 'SC students in post-matric courses',
    eligibilitySummary: 'SC students who have passed matriculation and study a recognised post-matric course.',
    benefitsSummary: 'Fees covered + academic allowance',
    eligibility: [
      'Indian nationals belonging to a Scheduled Caste notified for their State/UT of residence.',
      'Must have passed matriculation (Class 10) or a higher examination and be enrolled in a recognised post-matric or post-secondary course.',
      "Parents'/guardians' income from all sources not exceeding ₹2,50,000 in the last financial year (as per 2020-21 to 2025-26 guidelines; any revision is to be confirmed).",
      'Seats obtained through non-transparent routes such as management quota are not eligible.',
    ],
    benefits: [
      'Compulsory non-refundable fees, including tuition fees, for the full course duration.',
      'An academic allowance at rates prescribed in the guidelines (rates to be confirmed for the current year).',
      'Students with disabilities receive an additional 10% allowance.',
    ],
    requiredDocuments: [],
    applicationSteps: [
      'Register on the scholarship portal used by your State (National Scholarship Portal or the State portal).',
      'Apply for the scholarship at the time of admission; your institution verifies the application.',
      'Renewal in later years depends on promotion and attendance.',
    ],
    applicationStatus: 'tbc',
    officialUrl: 'https://scholarships.gov.in/',
    applicationUrl: null,
    tbcFields: ['eligibility', 'required_documents', 'deadline', 'help_contact', 'application_link'],
    availableAllMandals: true,
    verificationSource: 'Guidelines for Post Matric Scholarship for SC students, 2020-21 to 2025-26 (MoSJE)',
    verificationSourceUrl: null,
    lastVerifiedOn: REVIEWED_ON,
    reviewDueOn: REVIEW_DUE,
    isFeatured: false,
    isDemo: true,
    publish: true,
    notes: 'Guidelines validity ended with 2025-26. Confirm continuation, revised income ceiling and the portal used in Andhra Pradesh before relying on this record.',
  },
  {
    name: 'Rural Employment Guarantee (draft — awaiting verification)',
    keywords: 'mgnrega, nrega, rural employment, job card',
    categorySlug: 'employment',
    department: 'Ministry of Rural Development',
    groups: ['workers', 'rural-households'],
    shortDescription: 'Draft placeholder. The current statutory rural employment programme and its entitlements must be confirmed from official sources.',
    applicationStatus: 'tbc',
    tbcFields: ['eligibility', 'benefits', 'required_documents', 'application_steps', 'deadline', 'official_link', 'help_contact'],
    availableAllMandals: true,
    isDemo: true,
    publish: false,
    notes: 'Kept as a draft deliberately: programme details may have changed and were not verified during seeding.',
  },
];

export const DEMO_NOTICES = [
  {
    title: 'PM-KISAN: eKYC is mandatory for registered farmers',
    summary:
      'Registered PM-KISAN farmers must complete eKYC — OTP-based on the official portal, or biometric at the nearest CSC — to keep receiving instalments.',
    publishedOn: '2026-10-27',
    schemeName: 'PM-KISAN Samman Nidhi',
    officialUrl: 'https://pmkisan.gov.in/',
    publish: true,
  },
  {
    title: 'AB PM-JAY now covers all senior citizens aged 70 and above',
    summary: 'The Union Cabinet approved health cover for all citizens aged 70+ irrespective of income, with a top-up of up to ₹5 lakh per year.',
    publishedOn: '2024-09-11',
    schemeName: 'Ayushman Bharat – Pradhan Mantri Jan Arogya Yojana (AB PM-JAY)',
    officialUrl: 'https://nha.gov.in/img/resources/Press_Release.pdf',
    publish: true,
  },
  {
    title: 'Post Matric Scholarship (SC): details for the current year to be confirmed',
    summary:
      'The published guidelines cover academic years up to 2025-26. Check the official scholarship portal for the current application window before applying.',
    publishedOn: '2026-10-27',
    schemeName: 'Post Matric Scholarship for Scheduled Caste Students',
    officialUrl: 'https://scholarships.gov.in/',
    publish: true,
  },
];
