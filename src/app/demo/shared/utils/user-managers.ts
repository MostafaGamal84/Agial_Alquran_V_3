import { LookUpUserDto } from 'src/app/@theme/services/lookup.service';

export function getUserManagers(user: Pick<LookUpUserDto, 'managerName' | 'managerNames'>): string[] {
  if (Array.isArray(user.managerNames) && user.managerNames.length > 0) {
    return user.managerNames
      .map((name) => String(name ?? '').trim())
      .filter((name) => !!name);
  }

  const fallback = String(user.managerName ?? '').trim();
  return fallback ? [fallback] : [];
}

export function belongsToManager(
  user: Pick<LookUpUserDto, 'managerId' | 'managerIds'>,
  managerId: number
): boolean {
  if (Array.isArray(user.managerIds) && user.managerIds.length > 0) {
    return user.managerIds.includes(managerId);
  }

  return user.managerId === managerId;
}
