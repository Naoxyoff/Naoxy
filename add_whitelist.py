import sys

if len(sys.argv) != 3:
    print("Usage: python3 add_whitelist.py <ID> <Nom>")
    sys.exit(1)

server_id = sys.argv[1]
server_name = sys.argv[2]

with open('src/index.js', 'r') as f:
    content = f.read()

if server_id in content:
    print(f"⚠️ Le serveur {server_id} est déjà dans la whitelist !")
    sys.exit(0)

new_line = f'  "{server_id}", // {server_name}'
content = content.replace(
    '];',
    f'{new_line}\n];',
    1
)

with open('src/index.js', 'w') as f:
    f.write(content)

print(f"✅ Serveur '{server_name}' ({server_id}) ajouté à la whitelist !")
