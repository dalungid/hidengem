import random

# Membaca file wordlist.txt
with open('english_wordlist.txt', 'r') as file:
    word_list = file.read().splitlines()  # Membaca setiap baris dan menghapus karakter newline

# Menentukan jumlah kata per grup dan jumlah grup
words_per_group = 12
num_groups = 100000

# Membuat grup dengan kata-kata yang sama tetapi dalam urutan yang diacak
groups = []
for _ in range(num_groups):
    shuffled_words = random.sample(word_list, len(word_list))  # Mengacak seluruh wordlist
    groups.append(' '.join(shuffled_words[:words_per_group]))  # Ambil sejumlah kata untuk grup

# Menyusun hasil dalam format ENV
groups_as_string = ', '.join(f'"{group}"' for group in groups)  # Format menjadi string ENV
env_content = f'MNEMONICS_EVM=[{groups_as_string}]'

# Menyimpan hasil ke dalam file .env
output_filename = 'output_2048.env'
with open(output_filename, 'w') as output_file:
    output_file.write(env_content)

print(f"Hasil telah disimpan ke file {output_filename}")
