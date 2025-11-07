import bcrypt from "bcrypt";
import dotenv from "dotenv";

dotenv.config();

const username = "admin";
const plainPassword = "password123";
const hashedPassword = await bcrypt.hash(plainPassword, 10);

console.log(hashedPassword);