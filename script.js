const fs = require('fs');
const pLimit = require('p-limit');
const puppeteer = require('puppeteer');
const ethers = require('ethers');

// Batasi proses paralel
const limit = pLimit(5);

// Fungsi untuk memvalidasi dan memproses saldo
async function checkBalanceForMnemonic(mnemonic) {
    try {
        if (!ethers.utils.isValidMnemonic(mnemonic)) {
            console.error(`Invalid mnemonic: ${mnemonic}`);
            return;
        }

        const wallet = ethers.Wallet.fromMnemonic(mnemonic);
        const address = wallet.address;

        const explorers = JSON.parse(fs.readFileSync('balances_output.json')).explorers;

        for (const explorer of explorers) {
            const url = `${explorer.url}${address}`;
            const browser = await puppeteer.launch({ headless: true });
            const page = await browser.newPage();
            await page.goto(url, { waitUntil: 'load' });

            const balance = await page.$eval(explorer.xpath, (el) => el.textContent.trim());
            console.log(`${explorer.name} Balance for ${address}: ${balance}`);

            await browser.close();
        }
    } catch (error) {
        console.error(`Error checking balance for mnemonic: ${mnemonic}`, error.message);
    }
}

// Fungsi untuk memecah array ke batch
function chunkArray(array, chunkSize) {
    const chunks = [];
    for (let i = 0; i < array.length; i += chunkSize) {
        chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
}

// Jalankan proses
async function main() {
    const mnemonics = JSON.parse(fs.readFileSync('mnemonics.json'));
    const chunks = chunkArray(mnemonics, 50); // Proses per batch

    for (const batch of chunks) {
        const tasks = batch.map((mnemonic) => limit(() => checkBalanceForMnemonic(mnemonic)));
        await Promise.all(tasks);
    }
}

// Eksekusi
main().catch((err) => console.error("Error:", err));
