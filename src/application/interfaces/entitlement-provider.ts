import { Entitlement } from '../../domain/types';

/** Provider seam for DigiStore or another commercial source of truth. */
export interface EntitlementProvider {
  getEntitlement(accountId: string, productKey: string): Promise<Entitlement | null>;
}
