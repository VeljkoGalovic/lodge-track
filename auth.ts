// auth.ts
import NextAuth from "next-auth"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { PrismaClient } from "@prisma/client"
import CredentialsProvider from "next-auth/providers/credentials"
import bcrypt from "bcrypt"

const prisma = new PrismaClient()

type UserRole = "OWNER" | "ADMIN" | "MEMBER" | "VIEWER"

interface UserWithRole {
  id: string
  email: string
  name: string | null
  role: UserRole
  passwordHash: string | null
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" }, // Required when using Credentials provider
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        // Find user in your PostgreSQL database
        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string }
        });

        if (!user || !user.passwordHash) return null;

        // Check if passwords match
        const isPasswordValid = await bcrypt.compare(
          credentials.password as string,
          user.passwordHash
        );

        if (!isPasswordValid) return null;

        return user as UserWithRole; // Successful login
      }
    })
  ],
  callbacks: {
    // This passes the user role to the session so you can use it for RBAC later
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as UserWithRole).role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as { role?: UserRole }).role = token.role as UserRole;
      }
      return session;
    }
  }
})