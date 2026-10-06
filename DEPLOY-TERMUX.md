# Publicar e atualizar pelo Termux

## Primeira publicação
1. Instale o Termux e abra-o.
2. Coloque `beaming-recruit.zip` em Downloads.
3. Execute:

```bash
termux-setup-storage
bash ~/storage/downloads/termux-setup.sh ~/storage/downloads/beaming-recruit.zip beaming-recruit
```

Se o script estiver dentro do ZIP, extraia-o primeiro ou copie-o para Downloads.

## Atualizar depois

```bash
sync-beaming ~/storage/downloads/beaming-recruit-novo.zip
```

O atalho remove os arquivos rastreados antigos da pasta de trabalho, copia o conteúdo do ZIP e envia o resultado para `main`. O diretório `.git` é preservado. Confirme que o ZIP é o projeto correto antes de executar.

## Vercel
Importe o repositório `beaming-recruit` na Vercel. Configure as variáveis `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`, `SESSION_SECRET` e `WEBHOOK_URL` em Project Settings → Environment Variables. No portal de desenvolvedores do Discord, cadastre a URL de callback que o projeto usa e mantenha-a igual à configuração do site. Faça um redeploy após salvar as variáveis. Nunca coloque segredos no `index.html` nem envie-os ao GitHub.
