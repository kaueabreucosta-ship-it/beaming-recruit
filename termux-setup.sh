#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail

# Uso: bash termux-setup.sh /caminho/beaming-recruit.zip NOME_DO_REPO
ZIP_PATH="${1:-}"
REPO_NAME="${2:-beaming-recruit}"
if [[ -z "$ZIP_PATH" || ! -f "$ZIP_PATH" ]]; then
  echo "Uso: bash termux-setup.sh /caminho/beaming-recruit.zip [nome-do-repo]"
  exit 1
fi

pkg install -y git gh unzip
if ! gh auth status >/dev/null 2>&1; then
  echo "Faça login no GitHub:"
  gh auth login
fi

WORK="$HOME/$REPO_NAME"
mkdir -p "$WORK"
TMP="$HOME/.${REPO_NAME}-import"
rm -rf "$TMP" && mkdir -p "$TMP"
unzip -oq "$ZIP_PATH" -d "$TMP"
ROOT="$TMP"
if [[ -d "$TMP/beaming-recruit" ]]; then ROOT="$TMP/beaming-recruit"; fi

# Cria o repositório remoto se ainda não existir.
USER_LOGIN="$(gh api user --jq .login)"
if ! gh repo view "$USER_LOGIN/$REPO_NAME" >/dev/null 2>&1; then
  gh repo create "$REPO_NAME" --public --description "Beaming Recruit" 
fi

# Substitui completamente o conteúdo local pela versão do ZIP, preservando .git.
find "$WORK" -mindepth 1 -maxdepth 1 ! -name .git -exec rm -rf {} +
cp -a "$ROOT"/. "$WORK"/
cd "$WORK"
git init -b main >/dev/null 2>&1 || true
git add -A
git commit -m "Importa projeto Beaming Recruit" || true
git remote remove origin >/dev/null 2>&1 || true
git remote add origin "https://github.com/$USER_LOGIN/$REPO_NAME.git"
git push -u origin main

# Atalho para sincronizar qualquer ZIP novo: sync-beaming /caminho/novo.zip
mkdir -p "$HOME/bin"
cat > "$HOME/bin/sync-beaming" <<'SYNC'
#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail
ZIP_PATH="${1:-}"
WORK="$HOME/beaming-recruit"
if [[ -z "$ZIP_PATH" || ! -f "$ZIP_PATH" ]]; then
  echo "Uso: sync-beaming /caminho/novo-beaming-recruit.zip"; exit 1
fi
TMP="$HOME/.beaming-recruit-sync"
rm -rf "$TMP" && mkdir -p "$TMP"
unzip -oq "$ZIP_PATH" -d "$TMP"
ROOT="$TMP"; [[ -d "$TMP/beaming-recruit" ]] && ROOT="$TMP/beaming-recruit"
cd "$WORK"
find . -mindepth 1 -maxdepth 1 ! -name .git -exec rm -rf {} +
cp -a "$ROOT"/. ./
git add -A
git commit -m "Atualiza projeto pelo ZIP" || echo "Nenhuma alteração para enviar."
git push origin main
SYNC
chmod +x "$HOME/bin/sync-beaming"
if ! grep -q 'export PATH="$HOME/bin:$PATH"' "$HOME/.bashrc" 2>/dev/null; then echo 'export PATH="$HOME/bin:$PATH"' >> "$HOME/.bashrc"; fi
export PATH="$HOME/bin:$PATH"
echo "Concluído. Projeto: $WORK"
echo "Atalho criado: sync-beaming /caminho/novo.zip"
