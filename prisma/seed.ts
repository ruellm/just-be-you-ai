// Canonical seed: Skill taxonomy (reference data the pickers/filters need) plus
// a set of demo companies + jobs to build the candidate browsing UI against.
// Idempotent: skills/users/companies upsert; demo jobs for the seeded companies
// are cleared and recreated each run.
//
// Run with:  npm run db:seed   (→ prisma db seed → npx tsx prisma/seed.ts)
//
// NOTE: the schema makes Company.userId unique (one company per business user),
// so each demo company gets its own placeholder business user (fixed UUIDs).

import { PrismaClient, type Level, type WorkMode } from "@prisma/client";

const prisma = new PrismaClient();

// ── Skill taxonomy (~54 IT + non-IT skills) ──────────────────────────────────
const SKILLS: { name: string; category: string }[] = [
  { name: "JavaScript", category: "IT" },
  { name: "TypeScript", category: "IT" },
  { name: "React", category: "IT" },
  { name: "Next.js", category: "IT" },
  { name: "Node.js", category: "IT" },
  { name: "Python", category: "IT" },
  { name: "Java", category: "IT" },
  { name: "C#", category: "IT" },
  { name: "Go", category: "IT" },
  { name: "PHP", category: "IT" },
  { name: "SQL", category: "IT" },
  { name: "PostgreSQL", category: "IT" },
  { name: "MongoDB", category: "IT" },
  { name: "HTML & CSS", category: "IT" },
  { name: "REST APIs", category: "IT" },
  { name: "GraphQL", category: "IT" },
  { name: "Git", category: "IT" },
  { name: "Docker", category: "IT" },
  { name: "Kubernetes", category: "IT" },
  { name: "AWS", category: "IT" },
  { name: "Linux Administration", category: "IT" },
  { name: "DevOps", category: "IT" },
  { name: "Cybersecurity", category: "IT" },
  { name: "Network Administration", category: "IT" },
  { name: "Machine Learning", category: "IT" },
  { name: "Data Analysis", category: "IT" },
  { name: "Graphic Design", category: "Design" },
  { name: "UI/UX Design", category: "Design" },
  { name: "Figma", category: "Design" },
  { name: "Video Editing", category: "Design" },
  { name: "Photography", category: "Design" },
  { name: "Digital Marketing", category: "Marketing" },
  { name: "SEO", category: "Marketing" },
  { name: "Social Media Management", category: "Marketing" },
  { name: "Content Writing", category: "Marketing" },
  { name: "Copywriting", category: "Marketing" },
  { name: "Project Management", category: "Business" },
  { name: "Customer Service", category: "Business" },
  { name: "Sales", category: "Business" },
  { name: "Accounting", category: "Business" },
  { name: "Bookkeeping", category: "Business" },
  { name: "Human Resources", category: "Business" },
  { name: "Data Entry", category: "Admin" },
  { name: "Virtual Assistance", category: "Admin" },
  { name: "Nursing", category: "Healthcare" },
  { name: "Caregiving", category: "Healthcare" },
  { name: "Medical Transcription", category: "Healthcare" },
  { name: "Carpentry", category: "Skilled Trade" },
  { name: "Plumbing", category: "Skilled Trade" },
  { name: "Electrical Wiring", category: "Skilled Trade" },
  { name: "Welding", category: "Skilled Trade" },
  { name: "Automotive Repair", category: "Skilled Trade" },
  { name: "English Communication", category: "Language" },
  { name: "Teaching", category: "Education" },
];

// ── Demo businesses (one placeholder user per company; fixed UUIDs) ───────────
const BUSINESSES = [
  {
    userId: "00000000-0000-0000-0000-000000000001",
    email: "demo+techflow@justbeyou.test",
    name: "TechFlow Inc.",
    description:
      "A Manila-based software studio building web and mobile products for clients across Southeast Asia.",
    website: "https://techflow.example.com",
  },
  {
    userId: "00000000-0000-0000-0000-000000000002",
    email: "demo+phcare@justbeyou.test",
    name: "PHCare Medical",
    description:
      "A network of clinics and home-care services delivering quality healthcare across Metro Manila.",
    website: "https://phcare.example.com",
  },
  {
    userId: "00000000-0000-0000-0000-000000000003",
    email: "demo+brightcall@justbeyou.test",
    name: "BrightCall BPO",
    description:
      "A growing business process outsourcing company serving global clients from Cebu and Manila.",
    website: "https://brightcall.example.com",
  },
  {
    userId: "00000000-0000-0000-0000-000000000004",
    email: "demo+northwind@justbeyou.test",
    name: "Northwind Logistics",
    description:
      "Nationwide logistics and warehousing operator keeping supply chains moving across the Philippines.",
    website: "https://northwind.example.com",
  },
];

type SeedJob = {
  company: string; // company name
  title: string;
  level: Level;
  workMode: WorkMode;
  location: string;
  salaryMin: number | null;
  salaryMax: number | null;
  status?: "open" | "closed";
  daysAgo: number;
  description: string;
  roleOverview: string;
  requirements: string;
  dayToDay: string;
  skills: string[];
};

const JOBS: SeedJob[] = [
  {
    company: "TechFlow Inc.",
    title: "Senior Frontend Developer",
    level: "advanced",
    workMode: "remote",
    location: "Makati, Metro Manila",
    salaryMin: 80000,
    salaryMax: 120000,
    daysAgo: 2,
    description:
      "We're looking for a senior frontend developer to lead the UI of our flagship SaaS product. You'll own the component library and mentor a small team of engineers.",
    roleOverview:
      "As a Senior Frontend Developer you set the standard for our web front end — architecture, performance, and accessibility. You partner closely with design and backend to ship polished features fast.",
    requirements:
      "5+ years building production React applications. Deep knowledge of TypeScript, modern CSS, and state management. Experience with Next.js and a strong eye for UX.",
    dayToDay:
      "Build and review feature work in React/Next.js, pair with designers on new flows, and keep the component library healthy. You'll also help shape sprint priorities and unblock teammates.",
    skills: ["JavaScript", "TypeScript", "React", "Next.js", "HTML & CSS"],
  },
  {
    company: "TechFlow Inc.",
    title: "Backend Developer (Node.js)",
    level: "novice",
    workMode: "hybrid",
    location: "Makati, Metro Manila",
    salaryMin: 55000,
    salaryMax: 85000,
    daysAgo: 5,
    description:
      "Join our backend team building APIs and services that power products used by thousands of users daily.",
    roleOverview:
      "You'll design and implement REST APIs, model data in PostgreSQL, and keep our services reliable and well-tested.",
    requirements:
      "2+ years with Node.js and relational databases. Comfortable with Git workflows and writing clean, documented code. Bonus: Docker experience.",
    dayToDay:
      "Implement API endpoints, write migrations, review pull requests, and collaborate with frontend engineers on contracts. Some on-call rotation for production support.",
    skills: ["Node.js", "PostgreSQL", "REST APIs", "Git", "Docker"],
  },
  {
    company: "TechFlow Inc.",
    title: "Product Designer (UI/UX)",
    level: "novice",
    workMode: "remote",
    location: "Remote (Philippines)",
    salaryMin: 45000,
    salaryMax: 70000,
    daysAgo: 9,
    description:
      "We need a product designer who can take features from rough idea to polished, shippable design.",
    roleOverview:
      "You'll own end-to-end design — research, wireframes, prototypes, and high-fidelity UI in Figma — for our web and mobile apps.",
    requirements:
      "A strong portfolio of shipped product work. Fluency in Figma and modern design systems. Able to communicate design decisions clearly.",
    dayToDay:
      "Run discovery with PMs, sketch flows, build prototypes in Figma, and hand off polished specs to engineering. You'll maintain and grow the design system.",
    skills: ["UI/UX Design", "Figma", "Graphic Design"],
  },
  {
    company: "TechFlow Inc.",
    title: "DevOps Engineer",
    level: "expert",
    workMode: "remote",
    location: "Remote (Philippines)",
    salaryMin: 100000,
    salaryMax: 150000,
    daysAgo: 1,
    description:
      "Own our cloud infrastructure and deployment pipelines as we scale to new markets.",
    roleOverview:
      "You'll design resilient infrastructure on AWS, manage Kubernetes clusters, and build the CI/CD that lets engineers ship safely many times a day.",
    requirements:
      "Expert with AWS, Docker, and Kubernetes. Strong Linux administration. Experience designing CI/CD pipelines and observability for production systems.",
    dayToDay:
      "Improve deploy pipelines, tune cluster reliability and cost, respond to incidents, and partner with developers to make the platform self-serve.",
    skills: ["AWS", "Docker", "Kubernetes", "Linux Administration", "DevOps"],
  },
  {
    company: "TechFlow Inc.",
    title: "Digital Marketing Specialist",
    level: "novice",
    workMode: "hybrid",
    location: "Makati, Metro Manila",
    salaryMin: 40000,
    salaryMax: 60000,
    daysAgo: 12,
    description:
      "Drive growth for our products through content, SEO, and social campaigns.",
    roleOverview:
      "You'll plan and run multi-channel marketing campaigns, measure what works, and grow our organic and paid reach.",
    requirements:
      "2+ years in digital marketing. Hands-on with SEO, social media, and content. Comfortable reading analytics and iterating.",
    dayToDay:
      "Write and schedule content, optimize landing pages for SEO, manage social channels, and report on campaign performance.",
    skills: ["Digital Marketing", "SEO", "Social Media Management", "Copywriting"],
  },
  {
    company: "BrightCall BPO",
    title: "Customer Support Representative",
    level: "entry",
    workMode: "onsite",
    location: "Cebu City, Cebu",
    salaryMin: 25000,
    salaryMax: 32000,
    daysAgo: 3,
    description:
      "Be the friendly voice that helps customers of our international clients resolve their issues.",
    roleOverview:
      "You'll handle inbound calls, chats, and emails, resolving customer concerns with empathy and accuracy.",
    requirements:
      "Excellent English communication. Willing to work shifting schedules. Customer-first attitude. No prior experience required — we train you.",
    dayToDay:
      "Take customer interactions across phone and chat, log cases accurately, and escalate complex issues. Hit quality and satisfaction targets.",
    skills: ["Customer Service", "English Communication", "Data Entry"],
  },
  {
    company: "BrightCall BPO",
    title: "Call Center Team Lead",
    level: "advanced",
    workMode: "onsite",
    location: "Cebu City, Cebu",
    salaryMin: 40000,
    salaryMax: 55000,
    daysAgo: 7,
    description:
      "Lead a team of support agents and own your team's performance and growth.",
    roleOverview:
      "You'll coach a team of 12–15 agents, monitor quality, and drive your team's KPIs while keeping morale high.",
    requirements:
      "3+ years in a BPO with at least 1 year leading a team. Strong coaching and English communication skills. Comfortable with performance metrics.",
    dayToDay:
      "Run team huddles, review call quality, coach agents one-on-one, and report metrics to operations. Handle escalations and shift planning.",
    skills: ["Customer Service", "English Communication", "Sales"],
  },
  {
    company: "PHCare Medical",
    title: "Registered Nurse",
    level: "advanced",
    workMode: "onsite",
    location: "Quezon City, Metro Manila",
    salaryMin: 35000,
    salaryMax: 50000,
    daysAgo: 4,
    description:
      "Provide compassionate, high-quality nursing care to patients across our clinic network.",
    roleOverview:
      "You'll assess patients, administer treatments, and coordinate care plans alongside our physicians.",
    requirements:
      "Licensed Registered Nurse (PRC). 2+ years clinical experience. Strong patient communication and attention to detail.",
    dayToDay:
      "Conduct patient assessments, administer medications, update charts, and educate patients and families on care plans.",
    skills: ["Nursing", "Caregiving", "English Communication"],
  },
  {
    company: "PHCare Medical",
    title: "Medical Assistant",
    level: "entry",
    workMode: "onsite",
    location: "Quezon City, Metro Manila",
    salaryMin: 22000,
    salaryMax: 30000,
    status: "closed",
    daysAgo: 20,
    description:
      "Support our clinical team with patient intake, records, and day-to-day clinic operations.",
    roleOverview:
      "You'll be the first point of contact for patients — handling intake, scheduling, and basic records management.",
    requirements:
      "Healthcare-related background preferred. Organized, detail-oriented, and comfortable with patient records. Good bedside manner.",
    dayToDay:
      "Greet and check in patients, maintain records, transcribe notes, and assist nurses and doctors with clinic flow.",
    skills: ["Caregiving", "Medical Transcription", "Data Entry"],
  },
  {
    company: "Northwind Logistics",
    title: "Licensed Electrician",
    level: "novice",
    workMode: "onsite",
    location: "Calamba, Laguna",
    salaryMin: 28000,
    salaryMax: null, // single-sided salary → listing hides the range
    daysAgo: 6,
    description:
      "Keep our warehouses and facilities safe and powered as a licensed electrician.",
    roleOverview:
      "You'll install, maintain, and repair electrical systems across our logistics facilities.",
    requirements:
      "TESDA-certified electrician with wiring experience. Knowledge of safety standards. Able to work onsite across facility locations.",
    dayToDay:
      "Inspect and maintain electrical systems, troubleshoot faults, and complete installation and repair work orders safely.",
    skills: ["Electrical Wiring", "Welding"],
  },
];

async function main() {
  // 1) Skill taxonomy
  for (const skill of SKILLS) {
    await prisma.skill.upsert({
      where: { name: skill.name },
      update: { category: skill.category },
      create: skill,
    });
  }

  // Safety: ensure every skill referenced by a job exists.
  const jobSkillNames = [...new Set(JOBS.flatMap((j) => j.skills))];
  for (const name of jobSkillNames) {
    await prisma.skill.upsert({
      where: { name },
      update: {},
      create: { name, category: "Other" },
    });
  }

  // 2) Demo businesses (user + company)
  const companyIdByName = new Map<string, string>();
  for (const b of BUSINESSES) {
    await prisma.user.upsert({
      where: { id: b.userId },
      update: { email: b.email },
      create: { id: b.userId, email: b.email, role: "business" },
    });
    const company = await prisma.company.upsert({
      where: { userId: b.userId },
      update: { name: b.name, description: b.description, website: b.website },
      create: {
        userId: b.userId,
        name: b.name,
        description: b.description,
        website: b.website,
      },
    });
    companyIdByName.set(b.name, company.id);
  }

  // 3) Jobs — clear the demo companies' existing jobs, then recreate.
  const demoCompanyIds = [...companyIdByName.values()];
  await prisma.job.deleteMany({ where: { companyId: { in: demoCompanyIds } } });

  const now = Date.now();
  for (const job of JOBS) {
    const companyId = companyIdByName.get(job.company);
    if (!companyId) continue;
    await prisma.job.create({
      data: {
        companyId,
        title: job.title,
        description: job.description,
        roleOverview: job.roleOverview,
        requirements: job.requirements,
        dayToDay: job.dayToDay,
        level: job.level,
        location: job.location,
        workMode: job.workMode,
        salaryMin: job.salaryMin,
        salaryMax: job.salaryMax,
        status: job.status ?? "open",
        createdAt: new Date(now - job.daysAgo * 24 * 60 * 60 * 1000),
        skills: {
          create: job.skills.map((name) => ({
            skill: { connect: { name } },
          })),
        },
      },
    });
  }

  console.log(
    `Seeded ${SKILLS.length} skills, ${BUSINESSES.length} companies, ${JOBS.length} jobs.`
  );
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
