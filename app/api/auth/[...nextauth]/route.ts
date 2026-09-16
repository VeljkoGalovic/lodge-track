// app/api/auth/[...nextauth]/route.ts
import { handlers } from "@/auth" // Path to the auth.ts file you created in step 2

export const { GET, POST } = handlers