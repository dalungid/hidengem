const fs = require('fs');
const puppeteer = require('puppeteer');
const bip39 = require('bip39');
require('dotenv').config();

const OUTPUT_FILE = 'blockscan_sites.json';
const BATCH_SIZE = 100;

/**
 * Membaca daftar mnemonic dari file .env
 */
function getMnemonicsFromEnv() {
    try {
        const mnemonicsString = process.env.MNEMONICS_EVM;
        if (!mnemonicsString) throw new Error("MNEMONICS_EVM tidak ditemukan di file .env");

        // Parsing JSON array dari string
        const mnemonics = JSON.parse(mnemonicsString);
        if (!Array.isArray(mnemonics)) throw new Error("Format MNEMONICS_EVM tidak valid");

        return mnemonics.filter(mnemonic => bip39.validateMnemonic(mnemonic));
    } catch (error) {
        console.error("Error membaca mnemonic dari file .env:", error.message);
        return [];
    }
}

/**
 * Membaca konfigurasi explorer dari file balances_output.json
 */
function getExplorersConfig() {
    try {
        if (!fs.existsSync(OUTPUT_FILE)) throw new Error("File balances_output.json tidak ditemukan.");
        const data = JSON.parse(fs.readFileSync(OUTPUT_FILE, 'utf8'));

        // Pastikan data memiliki konfigurasi explorers
        if (!data.explorers || !Array.isArray(data.explorers)) {
            throw new Error("Konfigurasi explorers tidak ditemukan atau tidak valid di balances_output.json.");
        }

        return data.explorers;
    } catch (error) {
        console.error("Error membaca konfigurasi explorers:", error.message);
        return [];
    }
}

/**
 * Mendapatkan saldo dari block explorer menggunakan Puppeteer
 */
async function getBalanceFromExplorer(address, explorerUrl, xpath) {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    try {
        await page.goto(`${explorerUrl}${address}`, { waitUntil: 'load', timeout: 60000 });

        // Tunggu elemen tersedia berdasarkan XPath
        await page.waitForXPath(xpath, { timeout: 5000 });

        // Ambil teks elemen
        const elements = await page.$x(xpath);
        const balance = await page.evaluate(el => el.textContent, elements[0]);

        await browser.close();
        return balance.trim();
    } catch (error) {
        console.error(`Error mengambil saldo dari ${explorerUrl} untuk alamat ${address}:`, error.message);
        await browser.close();
        return null;
    }
}

/**
 * Mendapatkan saldo untuk daftar mnemonic
 */
async function getBalances(mnemonics, explorers) {
    const balances = [];

    for (const mnemonic of mnemonics) {
        try {
            // Konversi mnemonic menjadi address
            const seed = bip39.mnemonicToSeedSync(mnemonic);
            const address = `0x${seed.toString('hex').slice(0, 40)}`; // Simulasi address

            console.log(`Memproses address ${address}...`);

            const explorerBalances = await Promise.all(
                explorers.map(async explorer => {
                    const balance = await getBalanceFromExplorer(address, explorer.url, explorer.xpath);
                    return balance ? { explorer: explorer.name, balance } : null;
                })
            );

            const validBalances = explorerBalances.filter(b => b); // Hanya saldo yang valid
            if (validBalances.length > 0) {
                balances.push({
                    mnemonic,
                    address,
                    balances: validBalances,
                });
            }
        } catch (error) {
            console.error(`Error mendapatkan saldo untuk mnemonic ${mnemonic}:`, error.message);
        }
    }

    return balances;
}

/**
 * Menyimpan hasil ke file output
 */
function saveToOutput(data) {
    try {
        let currentData = [];
        if (fs.existsSync(OUTPUT_FILE)) {
            currentData = JSON.parse(fs.readFileSync(OUTPUT_FILE, 'utf8'));
        }

        // Gabungkan data baru dengan data sebelumnya
        const updatedData = [...currentData, ...data];

        fs.writeFileSync(OUTPUT_FILE, JSON.stringify(updatedData, null, 2), 'utf8');
        console.log("Hasil berhasil disimpan ke file output.");
    } catch (error) {
        console.error("Error menyimpan hasil ke file output:", error.message);
    }
}

/**
 * Memproses semua wallet secara batch
 */
async function checkAllWallets() {
    const mnemonics = getMnemonicsFromEnv();
    const explorers = getExplorersConfig();

    if (mnemonics.length === 0) {
        console.log("Tidak ada mnemonic untuk diperiksa.");
        return;
    }

    if (explorers.length === 0) {
        console.log("Tidak ada konfigurasi explorers untuk diperiksa.");
        return;
    }

    console.log(`Memproses ${mnemonics.length} mnemonic dalam batch ${BATCH_SIZE}.`);

    for (let i = 0; i < mnemonics.length; i += BATCH_SIZE) {
        const batch = mnemonics.slice(i, i + BATCH_SIZE);
        console.log(`Memproses batch ${Math.ceil(i / BATCH_SIZE) + 1}...`);

        try {
            const balances = await getBalances(batch, explorers);
            saveToOutput(balances); // Simpan hasil setiap batch
        } catch (error) {
            console.error(`Error saat memproses batch ${Math.ceil(i / BATCH_SIZE) + 1}:`, error.message);
        }
    }

    console.log("Proses selesai.");
}

// Menjalankan skrip
checkAllWallets();
