from mnemonic import Mnemonic

# Fungsi untuk mendapatkan daftar kata mnemonic
def save_wordlist_to_file(language="english"):
    # Membuat objek Mnemonic untuk bahasa yang diinginkan
    mnemo = Mnemonic(language)
    
    # Mengambil daftar kata mnemonic
    wordlist = mnemo.wordlist
    
    # Menyimpan daftar kata ke dalam file
    with open(f"{language}_wordlist.txt", "w") as file:
        for word in wordlist:
            file.write(f"{word}\n")
    
    print(f"Daftar kata mnemonic ({language}) telah disimpan ke file {language}_wordlist.txt")

# Menyimpan daftar kata mnemonic untuk bahasa Inggris
save_wordlist_to_file("english")
