// VietQR (Napas, EMVCo merchant-presented QR) payload for a static bank-account transfer.
// Built at build time so the page needs no third-party QR service.

const field = (id: string, value: string) => `${id}${String(value.length).padStart(2, "0")}${value}`;

/** CRC-16/CCITT-FALSE (poly 0x1021, init 0xFFFF), as the EMVCo spec requires for tag 63. */
function crc16(text: string): string {
  let crc = 0xffff;
  for (const byte of new TextEncoder().encode(text)) {
    crc ^= byte << 8;
    for (let i = 0; i < 8; i++) crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

/** Longest transfer note accepted; banking apps cut longer ones. */
const NOTE_MAX = 25;

/**
 * EMVCo field lengths count bytes, and field() counts UTF-16 units: a note with diacritics
 * ("Mời bạn") would give a wrong length and a QR banking apps reject. Fail the build instead.
 */
function checkNote(note: string): void {
  if (!/^[\x20-\x7e]*$/.test(note)) throw new Error(`VietQR note must be printable ASCII (no diacritics): ${JSON.stringify(note)}`);
  if (note.length > NOTE_MAX) throw new Error(`VietQR note is ${note.length} characters; at most ${NOTE_MAX}: ${JSON.stringify(note)}`);
}

export function vietQrPayload({ bin, account, note }: { bin: string; account: string; note?: string }): string {
  if (note) checkNote(note);
  const beneficiary = field("00", bin) + field("01", account);
  const merchant = field("00", "A000000727") + field("01", beneficiary) + field("02", "QRIBFTTA");
  const body =
    field("00", "01") +
    field("01", "11") +
    field("38", merchant) +
    field("53", "704") +
    field("58", "VN") +
    (note ? field("62", field("08", note)) : "") +
    "6304";
  return body + crc16(body);
}
