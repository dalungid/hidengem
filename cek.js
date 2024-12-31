const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const axios = require('axios');

// Load environment variables from .env file
dotenv.config();

// Load the wallet mnemonics from environment variables
const MNEMONICS_EVM = JSON.parse(process.env.MNEMONICS_EVM);

// Read blockchain explorer configurations
const explorers = require('./blockscan_sites.json');

// Helper function to check balance using Puppeteer
async function getBalanceFromExplorer(url, xpath) {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    await page.goto(url);
    try {
        const balance = await page.$eval(xpath, el => el.textContent.trim());
        await browser.close();
        return balance;
    } catch (error) {
        console.error(`Error fetching balance from ${url}:`, error);
        await browser.close();
        return null;
    }
}

// Helper function to get balance for each wallet mnemonic
async function getBalances(mnemonic) {
    const balances = {};

    for (const [key, explorer] of Object.entries(explorers)) {
        const address = getAddressFromMnemonic(mnemonic, key); // Implement this to derive address from mnemonic
        const url = explorer.url.replace("{address}", address);
        const balance = await getBalanceFromExplorer(url, explorer.xpath);

        if (balance) {
            balances[key] = balance;
        }
    }

    return balances;
}

// Function to derive address from mnemonic (you need to implement this based on your specific requirements)
function getAddressFromMnemonic(mnemonic, blockchain) {
    // You can use a library like ethers.js or web3.js to derive the address from the mnemonic
    // Example: Use ethers.js to derive an address
    const ethers = require('ethers');
    const wallet = ethers.Wallet.fromMnemonic(mnemonic);
    return wallet.address;
}

// Main function to check balances for all wallets
async function checkAllWallets() {
    const results = {};

    for (const mnemonic of MNEMONICS_EVM) {
        const walletBalances = await getBalances(mnemonic);
        if (Object.keys(walletBalances).length > 0) {
            results[mnemonic] = walletBalances;
        }
    }

    // Write the results to an output JSON file
    fs.writeFileSync(path.join(__dirname, 'output.json'), JSON.stringify(results, null, 2));
    console.log('Balance check complete. Results written to output.json.');
}

// Run the function
checkAllWallets().catch(error => console.error('Error during balance check:', error));
