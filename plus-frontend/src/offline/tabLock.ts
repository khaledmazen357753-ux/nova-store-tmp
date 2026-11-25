
/**
 * رمز الجهاز — معرّف قصير وفريد لهذا المتصفح.
 *
 * الغرض: منع تضارب أرقام المستندات بين الأجهزة الأوفلاين. كل جهاز يولّد
 * رمزاً من 4 أحرف مرة واحدة ويحفظه، فتصبح أرقامه SINV-A7K2-1001 بدل
 * SINV-1001 المشتركة بين الجميع.
 *
 * لا يُستخدم إطلاقاً في الوضع السحابي، فشكل الأرقام هناك يبقى كما هو.
 */
const DEVICE_TAG_KEY = 'plus_erp_device_tag';
const TAG_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // بلا حروف متشابهة

export function getDeviceTag(): string {
  let tag = localStorage.getItem(DEVICE_TAG_KEY);
  if (tag && /^[A-Z0-9]{4}$/.test(tag)) return tag;

  const bytes = new Uint8Array(4);
  crypto.getRandomValues(bytes);
  tag = Array.from(bytes)
    .map((b) => TAG_ALPHABET[b % TAG_ALPHABET.length])
    .join('');
  localStorage.setItem(DEVICE_TAG_KEY, tag);
  return tag;
}
