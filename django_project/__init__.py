import pymysql
pymysql.install_as_MySQLdb()

import subprocess
import threading
import os
from pathlib import Path

def start_chatbot():
    try:
        base_dir = Path(__file__).resolve().parent.parent  # raiz do projeto
        print("🤖 Iniciando chatbot.js com Node.js...")
        subprocess.Popen(["node", "chatbot.js"], cwd=base_dir)
    except Exception as e:
        print(f"❌ Erro ao iniciar chatbot.js: {e}")

threading.Thread(target=start_chatbot, daemon=True).start()
