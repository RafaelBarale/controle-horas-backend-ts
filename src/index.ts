/*
import { prisma } from "./database/prisma";
import bcrypt from "bcryptjs";

async function main() {
  // Create a new user
  
  const user = await prisma.user.create({
    data: {
      email: "rafael@teste.com.br",
      name: "Rafael Barale",
      password: await bcrypt.hash("admin123", 10),
      role: "ADMIN",
      status: "ATIVO",
    },
  });
  
  console.log("Created user:", user);

  // Fetch all users
  const allUsers = await prisma.user.findMany();
  console.log("All users:", JSON.stringify(allUsers, null, 2));
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });

  */
import "dotenv/config";
import app from "./app";

const port = parseInt(process.env.PORT || "3000");

app.listen(port, () => {
  console.log(`Servidor rodando na porta ${port}`);
});