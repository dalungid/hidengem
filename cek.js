require('dotenv').config();
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const OUTPUT_FILE = 'balances_output.json'; // Lokasi file output
const EXPLORERS_CONFIG = 'blockscan_sites.json'; // Lokasi file konfigurasi explorer

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Membaca konfigurasi explorer dari file JSON
async function loadExplorersConfig() {
    const data = fs.readFileSync(EXPLORERS_CONFIG);
    return JSON.parse(data);
}

// Mengambil alamat dari mnemonic
function getAddressFromMnemonic(mnemonic) {
    const { Wallet } = require('ethers');
    const wallet = Wallet.fromMnemonic(mnemonic);
    return wallet.address;
}

// Mendapatkan saldo dari setiap explorer
async function getBalanceFromExplorer(browser, explorer, walletAddress) {
    let balance = null;

    try {
        const page = await browser.newPage();
        await page.goto(explorer.url.replace('ADDRESS', walletAddress), { waitUntil: 'networkidle2' });

        // Menyesuaikan selector berdasarkan explorer
        const balanceSelector = explorer.balanceSelector;
        balance = await page.$eval(balanceSelector, (element) => {
            return element.textContent.trim();
        });

        console.log(`${explorer.name}: ${balance}`);
    } catch (error) {
        console.error(`Error getting balance from ${explorer.name}: ${error.message}`);
    }

    return balance;
}

// Mendapatkan saldo untuk seluruh mnemonic
async function getBalances(mnemonic) {
    const balances = {};
    const walletAddress = getAddressFromMnemonic(mnemonic);
    const explorers = await loadExplorersConfig();

    const browser = await puppeteer.launch({
        headless: true, // Gunakan mode non-headless jika perlu
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    for (const explorer of explorers) {
        const balance = await getBalanceFromExplorer(browser, explorer, walletAddress);
        if (balance) {
            balances[explorer.name] = balance;
        }
        // Delay 500 ms setelah setiap pengecekan saldo
        await delay(500);
    }

    await browser.close();
    return balances;
}

// Memeriksa seluruh mnemonic
async function checkAllWallets() {
    const mnemonics = JSON.parse(process.env.MNEMONICS_EVM); // Mengambil mnemonic dari .env
    const allBalances = {};

    for (const mnemonic of mnemonics) {
        console.log(`Checking balance for mnemonic: ${mnemonic}`);
        const balances = await getBalances(mnemonic);
        if (Object.keys(balances).length > 0) {
            allBalances[mnemonic] = balances;
        }
    }

    // Simpan hasil ke dalam file output
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(allBalances, null, 2));
    console.log('All balances have been checked and saved.');
}

checkAllWallets().catch((error) => {
    console.error('Error checking all wallet balances:', error);
});
