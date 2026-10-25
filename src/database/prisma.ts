import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, $Enums } from "../../generated/prisma/client";

const connectionString = `${process.env.DATABASE_URL}`;

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

export { prisma, $Enums };

export type * from "../../generated/prisma/client";