/**
 * The result shape every form-backed server action returns.
 *
 * In its own module, deliberately, and with no imports at all. `lib/authorization`
 * is server-only — it reaches `auth`, which reaches bcrypt and Prisma — and the
 * submit button of every form needs `EMPTY_ACTION_STATE`. Importing that value
 * from the authorization module would drag the whole server chain into the
 * browser bundle, where a native module like bcrypt cannot resolve.
 *
 * Types are erased at build time and could have lived anywhere; the constant
 * cannot, which is why both are here together rather than split up.
 */
export interface ActionState {
  error?: string
  success?: string
  /** Where to send the browser once the action succeeds. */
  redirect?: string
}

export const EMPTY_ACTION_STATE: ActionState = {}
