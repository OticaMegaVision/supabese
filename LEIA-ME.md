# ÓticaVision Pro — PWA (Local-First)

## 📁 Estrutura de arquivos

```
oticavision-pwa/
├── index.html          ← App principal
├── manifest.json       ← Configuração PWA
├── sw.js               ← Service Worker (cache + offline)
├── favicon.ico         ← Ícone do navegador
└── icons/
    ├── icon-72x72.png
    ├── icon-96x96.png
    ├── icon-128x128.png
    ├── icon-144x144.png
    ├── icon-152x152.png
    ├── icon-192x192.png  ← Android / Chrome
    ├── icon-384x384.png
    └── icon-512x512.png  ← Splash screen / Play Store
```

---

## 🚀 Como publicar (3 opções)

### Opção 1 — GitHub Pages (gratuito, recomendado)
1. Crie um repositório no GitHub
2. Faça upload de todos esses arquivos na raiz
3. Vá em **Settings → Pages → Branch: main → Save**
4. URL: `https://seuusuario.github.io/nome-do-repo`

### Opção 2 — Netlify Drop (mais fácil)
1. Acesse **https://app.netlify.com/drop**
2. Arraste a pasta inteira `oticavision-pwa/` para a tela
3. Em segundos você terá uma URL `https://algo.netlify.app`
4. Para domínio próprio: configure em **Domain Settings**

### Opção 3 — Servidor próprio / VPS
1. Copie todos os arquivos para `/var/www/html/oticavision/`
2. Configure HTTPS (obrigatório para PWA)
3. No Nginx:
   ```nginx
   location /oticavision {
     root /var/www/html;
     try_files $uri $uri/ /oticavision/index.html;
     add_header Cache-Control "no-cache";
   }
   ```

---

## ⚠️ Requisitos obrigatórios para PWA funcionar

| Requisito | Motivo |
|-----------|--------|
| **HTTPS** | Service Worker só funciona em HTTPS (ou localhost) |
| **Todos os arquivos juntos** | `sw.js` deve estar na raiz, junto com `index.html` |
| **Sem renomear** | Os arquivos `sw.js` e `manifest.json` são referenciados por nome fixo |

---

## 📱 Como instalar no celular (após publicar)

### Android (Chrome)
1. Acesse a URL no Chrome
2. Aparecerá o banner **"Instalar ÓticaVision Pro"** automaticamente
3. Toque em **Instalar** → ícone aparece na tela inicial

### iPhone (Safari)
1. Acesse a URL no Safari
2. Toque no botão **Compartilhar** (ícone de seta para cima)
3. Toque em **Adicionar à Tela de Início**
4. Toque em **Adicionar**

---

## 🔄 Funcionamento offline (Local-First)

O sistema funciona **100% offline** após a primeira carga:

- Todos os dados são salvos localmente no **Dexie/IndexedDB** do navegador
- Quando tiver internet, sincroniza com o Supabase automaticamente em background
- Nenhuma ação manual necessária — salva local, sincroniza na nuvem

---

## 🔁 Atualizar a versão

Quando fizer mudanças no `index.html`:
1. Suba o arquivo novo
2. Atualize a versão no `sw.js`: mude `oticavision-v3` para `oticavision-v4`
3. O app detectará a atualização e mostrará o botão **"Atualizar"** para o usuário

---

*ÓticaVision Pro v3.0 — Local-First PWA*
