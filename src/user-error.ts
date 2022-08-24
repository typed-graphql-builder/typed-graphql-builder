export class UserFacingError extends Error {
  userFacingError = true

  static is(e: any): e is UserFacingError {
    return e != null && 'userFacingError' in e
  }
}
