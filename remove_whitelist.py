import sys
import re

if len(sys.argv) != 2:
    print("Usage: python3 remove_whitelist.py <ID>")
    sys.exit(1)

server_id = sys.argv[1]

with open('src/index.js', 'r') as f:
    content = f.read()

if server_id not in content:
    print(f"⚠️ Le serveur {server_id} n'est pas dans la whitelist !")
    sys.exit(0)

content = re.sub(rf'\n  "{server_id}",.*', '', content)

with open('src/index.js', 'w') as f:
    f.write(content)

print(f"✅ Serveur {server_id} retiré de la whitelist !")
