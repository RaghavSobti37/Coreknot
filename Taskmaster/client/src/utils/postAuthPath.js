/**
 * Resolve where to send the user after CoreKnot session is established.
 * Prefers org create when they have no memberships.
 */
import { resolveLoginReturnPath } from './loginReturnPath';

export function resolvePostAuthPath(user, { stateFrom, search = '', storedReturnPath = null } = {}) {
  if (user?.needsOrgCreate || (Array.isArray(user?.memberships) && user.memberships.length === 0)) {
    return '/org/create';
  }
  if (user?.needsTenantSelection) {
    return '/org/pick';
  }
  return resolveLoginReturnPath({ stateFrom, search, storedReturnPath });
}
