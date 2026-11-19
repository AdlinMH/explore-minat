#!/usr/bin/env node
// Membuat ADMIN_PIN_HASH dari PIN 6 digit tanpa menaruh PIN di argumen,
// riwayat shell, atau log. PIN diketik tersembunyi; hanya hash yang dicetak.
import { randomBytes, scrypt } from "node:crypto";
import { stdin, stdout } from "node:process";

function readHidden(prompt) {
  return new Promise((resolve, reject) => {
    if (!stdin.isTTY) {
      let data = "";
      stdin.setEncoding("utf8");
      stdin.on("data", (c) => (data += c));
      stdin.on("end", () => resolve(data.split(/\r?\n/)[0]));
      stdin.on("error", reject);
      return;
    }
    stdout.write(prompt);
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding("utf8");
    let value = "";
    stdin.on("data", function onData(ch) {
      if (ch === "\u0003") { stdout.write("\n"); process.exit(130); }
      if (ch === "\r" || ch === "\n") {
        stdin.setRawMode(false); stdin.pause(); stdin.off("data", onData); stdout.write("\n"); resolve(value); return;
      }
      if (ch === "\u007f") { value = value.slice(0, -1); return; }
      value += ch;
    });
  });
}

const pin = await readHidden("PIN admin (6 digit, tidak ditampilkan): ");
if (!/^\d{6}$/.test(pin)) { console.error("PIN harus tepat 6 digit angka."); process.exit(1); }
const confirm = stdin.isTTY ? await readHidden("Ulangi PIN: ") : pin;
if (confirm !== pin) { console.error("PIN tidak sama."); process.exit(1); }

const N = 32768, r = 8, p = 1;
const salt = randomBytes(16);
scrypt(pin, salt, 32, { N, r, p, maxmem: 64 * 1024 * 1024 }, (err, key) => {
  if (err) { console.error("Gagal membuat hash."); process.exit(1); }
  stdout.write(["scrypt", N, r, p, salt.toString("base64url"), key.toString("base64url")].join(":") + "\n");
});
