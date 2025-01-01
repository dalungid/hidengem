const fs = require('fs');
const bip39 = require('bip39');
require('dotenv').config(); // Untuk membaca file .env

const ENV_FILE = '.env'; // Nama file .env

/**
 * Fungsi untuk memvalidasi mnemonic BIP-39
 * @param {string} mnemonic - Mnemonic yang akan divalidasi
 * @returns {boolean} - True jika valid, false jika tidak valid
 */
function isValidMnemonic(mnemonic) {
    return bip39.validateMnemonic(mnemonic);
}

/**
 * Membaca daftar mnemonic dari file .env
 */
function getMnemonicsFromEnv() {
    try {
        const mnemonicsString = process.env.MNEMONICS_EVM;
        if (!mnemonicsString) throw new Error("MNEMONICS_EVM tidak ditemukan di file .env");

        // Menghapus tanda kutip dan memisahkan ke dalam array
        const mnemonics = JSON.parse(mnemonicsString);
        if (!Array.isArray(mnemonics)) throw new Error("Format MNEMONICS_EVM tidak valid");

        return mnemonics;
    } catch (error) {
        console.error("Error membaca mnemonic dari file .env:", error.message);
        return [];
    }
}

/**
 * Menyimpan daftar mnemonic yang valid ke file .env
 * @param {string[]} validMnemonics - Daftar mnemonic yang valid
 */
function saveValidMnemonicsToEnv(validMnemonics) {
    try {
        const updatedEnv = fs
            .readFileSync(ENV_FILE, 'utf8')
            .replace(/MNEMONICS_EVM=\[.*?\]/s, `MNEMONICS_EVM=${JSON.stringify(validMnemonics)}`);
        fs.writeFileSync(ENV_FILE, updatedEnv, 'utf8');
        console.log("File .env berhasil diperbarui dengan mnemonic yang valid.");
    } catch (error) {
        console.error("Error menyimpan mnemonic ke file .env:", error.message);
    }
}

/**
 * Memvalidasi mnemonic dan menghapus yang tidak valid
 */
function filterValidMnemonics() {
    const mnemonics = getMnemonicsFromEnv();

    if (mnemonics.length === 0) {
        console.log("Tidak ada mnemonic untuk divalidasi.");
        return;
    }

    const validMnemonics = mnemonics.filter(isValidMnemonic);

    console.log(`Mnemonic valid: ${validMnemonics.length}, Mnemonic tidak valid: ${mnemonics.length - validMnemonics.length}`);
    if (validMnemonics.length > 0) {
        saveValidMnemonicsToEnv(validMnemonics);
    } else {
        console.log("Tidak ada mnemonic valid yang ditemukan.");
    }
}

// Menjalankan filter
filterValidMnemonics();
