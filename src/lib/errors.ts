/** Lightweight error type shared by authz + validation without pulling in
 *  Prisma or Next runtime imports (keeps unit tests fast and isolated). */
export class AuthzError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}
