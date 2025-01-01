require('dotenv').config();
const puppeteer = require('puppeteer');
const fs = require('fs').promises;

// Memuat file blockscan_sites.json
const loadExplorersConfig = async () => {
    try {
        const data = await fs.readFile('blockscan_sites.json', 'utf-8');
        const config = JSON.parse(data);
        return config.explorers || [];
    } catch (error) {
        console.error('Error membaca konfigurasi explorers: ', error.message);
        return [];
    }
};

// Lokasi balances_output.json
const OUTPUT_FILE = 'balances_output.json';

// Fungsi untuk membaca saldo dari explorer
async function getBalanceFromExplorer(browser, explorer, address) {
    const page = await browser.newPage();
    await page.goto(explorer.url + address, { waitUntil: 'domcontentloaded' });

    try {
        const balance = await page.$eval(
            explorer.balanceXPath,
            (el) => el.textContent.trim()
        );
        await page.close();
        return balance;
    } catch (error) {
        console.error(`Gagal membaca saldo dari ${explorer.name} untuk ${address}: ${error.message}`);
        await page.close();
        return null;
    }
}

// Fungsi untuk membaca saldo dari semua explorers
async function getBalances(mnemonic) {
    const balances = {};
    const walletAddress = getAddressFromMnemonic(mnemonic);
    const explorers = await loadExplorersConfig();

    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    for (const explorer of explorers) {
        const balance = await getBalanceFromExplorer(browser, explorer, walletAddress);
        if (balance) {
            balances[explorer.name] = balance;
        }
    }

    await browser.close();
    return balances;
}

// Fungsi untuk mendapatkan address dari mnemonic
function getAddressFromMnemonic(mnemonic) {
    const { Wallet } = require('ethers');
    const wallet = Wallet.fromMnemonic(mnemonic);
    return wallet.address;
}

// Fungsi utama untuk memeriksa saldo dari semua MNEMONICS
async function checkAllWallets() {
    let output = {};

    try {
        const data = await fs.readFile(OUTPUT_FILE, 'utf-8');
        output = JSON.parse(data);
    } catch {
        console.log('balances_output.json tidak ditemukan, membuat baru...');
    }

    const MNEMONICS = JSON.parse(process.env.MNEMONICS_EVM);

    for (const mnemonic of MNEMONICS) {
        try {
            console.log(`Memeriksa saldo untuk mnemonic: ${mnemonic}`);
            const balances = await getBalances(mnemonic);

            if (Object.keys(balances).length > 0) {
                output[mnemonic] = balances;
            }
        } catch (error) {
            console.error(`Error mendapatkan saldo untuk mnemonic: ${mnemonic} - ${error.message}`);
        }
    }

    await fs.writeFile(OUTPUT_FILE, JSON.stringify(output, null, 2));
    console.log('Pemeriksaan saldo selesai. Hasil disimpan di balances_output.json');
}

// Jalankan skrip
checkAllWallets().catch((error) => {
    console.error(`Terjadi kesalahan: ${error.message}`);
});
