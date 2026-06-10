// Seeds the Skill taxonomy — reference/lookup data the candidate Skills and
// Project "skills used" pickers read from. Idempotent (upsert by unique name),
// so it's safe to re-run. NOT the Step-10 demo data (jobs / fake candidates).
//
// Run with:  npx prisma db seed   (Prisma loads .env, then runs this file)

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const SKILLS = [
  // Software / IT
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

  // Design / Creative
  { name: "Graphic Design", category: "Design" },
  { name: "UI/UX Design", category: "Design" },
  { name: "Figma", category: "Design" },
  { name: "Video Editing", category: "Design" },
  { name: "Photography", category: "Design" },

  // Marketing / Content
  { name: "Digital Marketing", category: "Marketing" },
  { name: "SEO", category: "Marketing" },
  { name: "Social Media Management", category: "Marketing" },
  { name: "Content Writing", category: "Marketing" },
  { name: "Copywriting", category: "Marketing" },

  // Business / Admin
  { name: "Project Management", category: "Business" },
  { name: "Customer Service", category: "Business" },
  { name: "Sales", category: "Business" },
  { name: "Accounting", category: "Business" },
  { name: "Bookkeeping", category: "Business" },
  { name: "Human Resources", category: "Business" },
  { name: "Data Entry", category: "Admin" },
  { name: "Virtual Assistance", category: "Admin" },

  // Healthcare
  { name: "Nursing", category: "Healthcare" },
  { name: "Caregiving", category: "Healthcare" },
  { name: "Medical Transcription", category: "Healthcare" },

  // Skilled trades
  { name: "Carpentry", category: "Skilled Trade" },
  { name: "Plumbing", category: "Skilled Trade" },
  { name: "Electrical Wiring", category: "Skilled Trade" },
  { name: "Welding", category: "Skilled Trade" },
  { name: "Automotive Repair", category: "Skilled Trade" },

  // Language / general
  { name: "English Communication", category: "Language" },
  { name: "Teaching", category: "Education" },
];

async function main() {
  for (const skill of SKILLS) {
    await prisma.skill.upsert({
      where: { name: skill.name },
      update: { category: skill.category },
      create: skill,
    });
  }
  console.log(`Seeded ${SKILLS.length} skills.`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
