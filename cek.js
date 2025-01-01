const puppeteer = require('puppeteer-core');
const dotenv = require('dotenv');
const pLimit = require('p-limit');
const fs = require('fs');

// Load environment variables
dotenv.config();
const MNEMONICS_EVM = JSON.parse(process.env.MNEMONICS_EVM); // Ambil mnemonic dari .env
const OUTPUT_FILE = 'balances_output.json'; // Output file untuk menyimpan hasil
const EXPLORERS = [
    { name: "blockscan", url: "https://blockscan.com/address/" },
    { name: "polygon", url: "https://polygonscan.com/address/" },
    { name: "bsc", url: "https://bscscan.com/address/" },
    { name: "avax", url: "https://snowtrace.io/address/" },
    { name: "op", url: "https://optimistic.etherscan.io/address/" },
    { name: "vanascan", url: "https://vanascan.io/address/" },
    { name: "lineascan", url: "https://explorer.linea.build/address/" },
    { name: "blastscan", url: "https://blastscan.io/address/" },
    { name: "arb", url: "https://arbiscan.io/address/" },
    { name: "base", url: "https://basescan.org/address/" },
    { name: "zksync", url: "https://explorer.zksync.io/address/" }
];

// Limit parallel requests
const limit = pLimit(5); // Batasi maksimal 5 request secara paralel

async function getBalanceFromExplorer(browser, explorer, walletAddress) {
    try {
        const page = await browser.newPage();
        await page.goto(`${explorer.url}${walletAddress}`);

        let balance;

        // Cek apakah saldo ETH di Blockscan
        if (explorer.name === "blockscan") {
            balance = await page.$eval('.text-muted', el => el.textContent.trim());
        } else if (explorer.name === "polygon") {
            balance = await page.$eval('.d-flex', el => el.textContent.trim());
        } else if (explorer.name === "bsc") {
            balance = await page.$eval('.d-flex', el => el.textContent.trim());
        } else if (explorer.name === "avax") {
            balance = await page.$eval('.grid .col-span-12', el => el.textContent.trim());
        } else if (explorer.name === "op") {
            balance = await page.$eval('.d-flex', el => el.textContent.trim());
        } else if (explorer.name === "vanascan") {
            balance = await page.$eval('.chakra-text', el => el.textContent.trim());
        } else if (explorer.name === "lineascan") {
            balance = await page.$eval('.balance-data-value', el => el.textContent.trim());
        } else if (explorer.name === "blastscan") {
            balance = await page.$eval('.text-muted', el => el.textContent.trim());
        } else if (explorer.name === "arb") {
            balance = await page.$eval('.d-flex', el => el.textContent.trim());
        } else if (explorer.name === "base") {
            balance = await page.$eval('.d-flex', el => el.textContent.trim());
        } else if (explorer.name === "zksync") {
            balance = await page.$eval('.balance-data-value', el => el.textContent.trim());
        }

        await page.close();
        return balance;
    } catch (error) {
        console.error(`Error getting balance from ${explorer.name} for address ${walletAddress}:`, error);
        return null;
    }
}

async function checkAllWallets() {
    const browser = await puppeteer.launch({
        headless: true,
        executablePath: '/usr/bin/google-chrome-stable', // Jika menggunakan Chrome lokal
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu', '--single-process', '--no-zygote']
    });

    const results = [];

    for (const mnemonic of MNEMONICS_EVM) {
        const walletAddress = getAddressFromMnemonic(mnemonic);
        const walletResult = {
            mnemonic,
            balances: {}
        };

        // Cek saldo dari setiap explorer
        for (const explorer of EXPLORERS) {
            await limit(async () => {
                const balance = await getBalanceFromExplorer(browser, explorer, walletAddress);
                if (balance && balance !== '0') {
                    walletResult.balances[explorer.name] = balance;
                }
            });
        }

        if (Object.keys(walletResult.balances).length > 0) {
            results.push(walletResult);
        }
    }

    await browser.close();

    // Simpan hasil ke file JSON
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(results, null, 2), 'utf-8');
    console.log(`Balances saved to ${OUTPUT_FILE}`);
}

function getAddressFromMnemonic(mnemonic) {
    const { Wallet } = require('ethers');
    const wallet = Wallet.fromMnemonic(mnemonic);
    return wallet.address;
}

checkAllWallets().catch(error => {
    console.error('Error checking all wallet balances:', error);
});
