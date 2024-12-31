const ethers = require("ethers");
const puppeteer = require("puppeteer");
const fs = require("fs");
require("dotenv").config();

// Membaca konfigurasi blockchain dan XPath dari file JSON
const blockscanSites = JSON.parse(fs.readFileSync("blockscan_sites.json", "utf8"));

// Membaca MNEMONICS_EVM dari file .env
const mnemonicsList = JSON.parse(process.env.MNEMONICS_EVM || "[]");

if (!mnemonicsList.length) {
    console.error("Tidak ada mnemonic ditemukan di file .env.");
    process.exit(1);
}

// Fungsi untuk mendapatkan alamat wallet dari mnemonic
const getWalletAddress = (mnemonic, accountIndex = 0) => {
    const path = `m/44'/60'/0'/0/${accountIndex}`; // Path standar untuk EVM
    const wallet = ethers.Wallet.fromMnemonic(mnemonic, path);
    return wallet.address;
};

// Scraping saldo dari halaman Blockscan menggunakan Puppeteer
const getBalanceFromBlockscan = async (url, xpath) => {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();

    try {
        await page.goto(url, { waitUntil: "networkidle2" });
        await page.waitForXPath(xpath, { timeout: 10000 }); // Tunggu elemen muncul
        const [balanceElement] = await page.$x(xpath);
        const balance = await page.evaluate(el => el.textContent.trim(), balanceElement);
        console.log(`Saldo ditemukan: ${balance}`);
        await browser.close();
        return balance;
    } catch (error) {
        console.error(`Error mendapatkan saldo dari ${url}:`, error.message);
        await browser.close();
        return "Gagal mendapatkan saldo";
    }
};

// Fungsi untuk memeriksa saldo menggunakan banyak Blockscan secara paralel
const checkBalance = async (blockchain, address) => {
    const site = blockscanSites[blockchain];
    if (!site) {
        console.error(`Blockchain ${blockchain} tidak didukung.`);
        return null;
    }

    const url = site.url.replace("{address}", address);
    const xpath = site.xpath; // Menggunakan XPath yang diambil dari JSON
    console.log(`Mengambil saldo ${blockchain} untuk ${address} dari ${url}...`);
    return await getBalanceFromBlockscan(url, xpath);
};

// Membaca hasil yang sudah ada di output.json
const loadExistingResults = () => {
    try {
        const data = fs.readFileSync("output.json", "utf8");
        return JSON.parse(data);
    } catch (error) {
        // Jika file tidak ada atau kosong, kembalikan objek kosong
        return {};
    }
};

// Menulis hasil ke file JSON
const saveResultsToFile = (results, filename) => {
    fs.writeFileSync(filename, JSON.stringify(results, null, 4), "utf8");
    console.log(`Hasil disimpan ke file ${filename}`);
};

// Fungsi untuk memeriksa saldo secara paralel untuk banyak mnemonic
const checkBalancesForMultipleMnemonics = async (mnemonicsList) => {
    const results = loadExistingResults(); // Membaca hasil yang sudah ada

    const promises = mnemonicsList.map(async (mnemonic, index) => {
        console.log(`\n[${index + 1}/${mnemonicsList.length}] Memeriksa saldo untuk mnemonic: ${mnemonic.slice(0, 10)}...`);
        const address = getWalletAddress(mnemonic);
        console.log(`Alamat Wallet: ${address}`);

        let walletResults = {};
        let hasBalance = false; // Flag untuk mengecek apakah ada saldo

        // Memeriksa saldo di setiap blockchain secara paralel
        const blockchainPromises = Object.keys(blockscanSites).map(async (blockchain) => {
            const balance = await checkBalance(blockchain, address);
            if (balance !== "Gagal mendapatkan saldo" && balance !== "") {
                walletResults[blockchain] = balance;
                hasBalance = true; // Jika ada saldo, set flag ke true
            }
        });

        // Tunggu semua promise blockchain selesai
        await Promise.all(blockchainPromises);

        // Jika ada saldo valid, simpan ke hasil
        if (hasBalance) {
            results[mnemonic] = walletResults;
        }
    });

    // Tunggu semua pengecekan selesai
    await Promise.all(promises);

    // Simpan hasil ke file hanya jika ada saldo
    saveResultsToFile(results, "output.json");
};

// Menjalankan pemeriksaan saldo
(async () => {
    await checkBalancesForMultipleMnemonics(mnemonicsList);
})();
