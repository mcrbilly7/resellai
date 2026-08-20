// Creates (or updates) the initial admin account so you don't have to sign
// up through the UI first. Sets mustChangePassword so the temporary password
// below is forced to be changed the first time this account logs in.
//
//   npm run seed-admin
//
require("dotenv").config();
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const prisma = new PrismaClient();

const ADMIN_EMAIL = "resellaiallin1@gmail.com";
const TEMP_PASSWORD = "12345678";

async function main() {
  const passwordHash = await bcrypt.hash(TEMP_PASSWORD, 10);

  const user = await prisma.user.upsert({
    where: { email: ADMIN_EMAIL },
    update: { isAdmin: true, mustChangePassword: true, passwordHash },
    create: {
      email: ADMIN_EMAIL,
      name: "Admin",
      passwordHash,
      isAdmin: true,
      promoOptIn: false,
      mustChangePassword: true,
    },
  });

  console.log("Admin account ready:", user.email);
  console.log("Temporary password:", TEMP_PASSWORD);
  console.log("This account will be required to set a new password on first login.");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
