// Promotes an existing account to admin. Run locally (needs DATABASE_URL set,
// e.g. in a .env file loaded by dotenv) after that person has signed up normally:
//
//   npm run make-admin -- you@example.com
//
require("dotenv").config();
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const email = process.argv[2];
  if (!email) {
    console.error("Usage: npm run make-admin -- you@example.com");
    process.exit(1);
  }
  const user = await prisma.user.update({
    where: { email: email.trim().toLowerCase() },
    data: { isAdmin: true },
  });
  console.log("Promoted to admin:", user.email);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
