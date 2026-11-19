/**
 * Menetralkan sel yang bisa dibaca sebagai formula oleh spreadsheet
 * (=, +, -, @, tab, carriage return) lalu meng-escape sesuai RFC 4180.
 */
export function csvCell(value: unknown): string {
  let s = value === null || value === undefined ? "" : String(value);
  if (/^[=+\-@\t\r]/.test(s) || /^\s+[=+\-@]/.test(s)) s = `'${s}`;
  if (/[",\n\r]/.test(s)) s = `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function toCsv(rows: unknown[][]): string {
  // BOM agar Excel membaca UTF-8 dengan benar.
  return "﻿" + rows.map((r) => r.map(csvCell).join(",")).join("\r\n") + "\r\n";
}
