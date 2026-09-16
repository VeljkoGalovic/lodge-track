// auth.ts
import NextAuth, { CredentialsSignin } from "next-auth"
import { PrismaAdapter } from "@auth/prisma-adapter"
import CredentialsProvider from "next-auth/providers/credentials"
import bcrypt from "bcrypt"
import type { Role } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { decryptSecret } from "@/lib/crypto"
import { verifyCode } from "@/lib/totp"

/**
 * A hash of a throwaway password. When no account matches the submitted email we
 * still run a bcrypt comparison against this, so a missing account takes roughly
 * as long to reject as a wrong password — otherwise the response time alone
 * tells an attacker which addresses are registered.
 */
const TIMING_EQUALISER_HASH = "$2b$10$HMgBz2XiRvdBjsdDaLHEQ.9PxhezQShyAV8e/6llUeRV9CVfor9T."

/**
 * `CredentialsSignin` subclasses carry a `code` that Auth.js puts in the
 * `code` query parameter, which `signIn(..., { redirect: false })` returns as
 * `result.code`. That is how the sign-in page can tell "your password was
 * right and now we need your authenticator code" apart from "wrong password",
 * without a separate endpoint that would answer "does this email exist?".
 *
 * All of these are raised *after* a correct password, so none of them reveals
 * whether an account exists.
 */
class SecondFactorRequired extends CredentialsSignin {
  code = "second_factor_required"
}
class SecondFactorInvalid extends CredentialsSignin {
  code = "second_factor_invalid"
}
/** The stored secret exists but cannot be decrypted — AUTH_SECRET was rotated. */
class SecondFactorUnavailable extends CredentialsSignin {
  code = "second_factor_unavailable"
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" }, // Required when using Credentials provider
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        code: { label: "Authenticator code", type: "text" },
      },
      async authorize(credentials) {
        const email = typeof credentials?.email === "string" ? credentials.email : ""
        const password = typeof credentials?.password === "string" ? credentials.password : ""
        if (!email || !password) return null

        const user = await prisma.user.findUnique({ where: { email } })

        if (!user?.passwordHash) {
          await bcrypt.compare(password, TIMING_EQUALISER_HASH)
          return null
        }

        if (!(await bcrypt.compare(password, user.passwordHash))) return null

        if (user.twoFactorEnabled) {
          const secret = user.twoFactorSecret ? decryptSecret(user.twoFactorSecret) : null

          /**
           * Enabled but unreadable. Falling through would silently drop the
           * second factor, so sign-in fails instead — an owner can clear the
           * factor from the team page once they have verified who they are
           * talking to, which is the recovery path a lost phone needs anyway.
           */
          if (!secret) throw new SecondFactorUnavailable()

          const code = typeof credentials?.code === "string" ? credentials.code.trim() : ""
          if (!code) throw new SecondFactorRequired()
          if (!verifyCode(secret, code)) throw new SecondFactorInvalid()
        }

        return { id: user.id, email: user.email, name: user.name, role: user.role }
      },
    }),
  ],
  callbacks: {
    // Carries the role onto the token so the session can expose it for RBAC.
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as { role: Role }).role
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        ;(session.user as { role?: Role }).role = token.role as Role
      }
      return session
    },
  },
})
