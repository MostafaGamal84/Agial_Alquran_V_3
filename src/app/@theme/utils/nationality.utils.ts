import { NationalityDto } from '../services/lookup.service';

const EGYPT_TEL_CODE = 20;
const EGYPT_KEYWORDS = ['egypt', 'مصر'];

export function isEgyptianNationality(
  nationality: Pick<NationalityDto, 'name' | 'telCode'> | null | undefined
): boolean {
  if (!nationality) {
    return false;
  }

  const telCode = Number((nationality as { telCode?: unknown }).telCode);
  if (Number.isFinite(telCode) && telCode === EGYPT_TEL_CODE) {
    return true;
  }

  const name = String((nationality as { name?: unknown }).name ?? '').toLowerCase();
  return EGYPT_KEYWORDS.some((keyword) => name.includes(keyword));
}
