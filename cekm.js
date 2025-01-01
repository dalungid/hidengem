const fs = require('fs');
const bip39 = require('bip39');
require('dotenv').config(); // Untuk membaca file .env

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
 * Proses validasi mnemonic
 */
function validateMnemonics() {
    const mnemonics = getMnemonicsFromEnv();

    if (mnemonics.length === 0) {
        console.log("Tidak ada mnemonic untuk divalidasi.");
        return;
    }

    mnemonics.forEach((mnemonic, index) => {
        const isValid = isValidMnemonic(mnemonic);
        console.log(`Mnemonic ${index + 1} is valid: ${isValid}`);
    });
}

// Menjalankan validasi
validateMnemonics();
