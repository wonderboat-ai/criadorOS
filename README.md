# Wonder Boat — Criador de OS

> Gerador de Relatórios Técnicos Navais auditáveis, para uso em campo.
> Aplicativo web autocontido, offline-first, sem backend.

![Versão](https://img.shields.io/badge/vers%C3%A3o-v1.8.1-148695)
![Status](https://img.shields.io/badge/status-produ%C3%A7%C3%A3o-1f8a4c)
![Licença](https://img.shields.io/badge/uso-interno%20Wonder%20Boat-C9A227)

---

## 🌊 Acesso

**Produção:** [https://wonderboat-ai.github.io/criadorOS/](https://wonderboat-ai.github.io/criadorOS/)

Basta abrir no navegador. Após a primeira visita, o app fica disponível
offline — pode ser usado a bordo, em marinas sem sinal, no oceano.

> 📍 Este diretório é uma **cópia de trabalho**. A pasta ligada ao
> repositório git / GitHub Pages é `G:\Meu Drive\WonderBOAT.AI\Criador de OS`.
> As duas não sincronizam automaticamente — ver `MEMORIA_PROJETO.md` para
> detalhes antes de editar.

---

## 📖 O que o app faz

Ferramenta de campo para a equipe técnica da Wonder Boat documentar
intervenções em embarcações de alta performance, produzindo relatórios
institucionais auditáveis em PDF conforme as normas **NMEA 0400**, **NMEA 2000**,
**ABYC** e **CIRM**.

- **Coleta:** identificação da OS, itens de serviço com sintoma/causa/ação,
  fotos com legenda, peças aplicadas, checklist de conformidade, observações
  finais e assinatura digital do cliente.
- **Relatório:** geração automática do documento final em HTML editável,
  com capa institucional, resumo executivo, seções técnicas e atesto.
- **Exportação:** PDF em formato A4 pronto para envio, JSON de backup,
  compartilhamento direto via WhatsApp com anexo.

---

## ✨ Recursos

- 📱 **PWA offline-first** — funciona sem internet após primeira visita
- 🎤 **Ditado por voz** em português (Web Speech API)
- 📸 **Edição de fotos** — upload, câmera direta, rotação, recorte
- ✍️ **Assinatura digital** em canvas com bloqueio pós-salvamento
- 📍 **Geolocalização** com captura de coordenadas GPS
- 📄 **PDF profissional** com slicing inteligente (fotos e linhas de tabela
  nunca cortam entre páginas)
- 💾 **Auto-backup local** opcional (a cada 15min/30min/1h/2h)
- 🔒 **LGPD compliant** — dados armazenados apenas localmente no dispositivo
- 🌓 **Tema claro/escuro** persistido, com contraste auditado (WCAG AA) em ambos
- 🔄 **Importação/exportação JSON** para migração entre dispositivos

---

## 🏗️ Arquitetura

Aplicativo **single-file** (`index.html`, ~7000 linhas, ~1 MB) sem dependências
externas em runtime — todas as bibliotecas (jsPDF, html2canvas) são embutidas
inline. Zero backend, zero build step, zero deploy pipeline.

```
criadorOS/
├── index.html                    # SPA completa
├── service-worker.js             # Cache PWA versionado
├── manifest.json                 # Manifest PWA
├── .nojekyll                     # Desativa Jekyll no GitHub Pages
├── README.md                     # Este arquivo
├── MEMORIA_PROJETO.md            # Contexto técnico completo
├── .claude/launch.json           # Config do preview local (Python http.server :8731)
└── .github/workflows/
    └── deploy-pages.yml          # Deploy estático via GitHub Actions
```

### Stack

- **Frontend:** HTML5 + CSS + JavaScript vanilla (sem framework)
- **PDF:** [jsPDF](https://github.com/parallax/jsPDF) 2.5.1 + [html2canvas](https://html2canvas.hertzen.com/) (embutidos)
- **Persistência:** `localStorage` (state) + `IndexedDB` (fotos, para
  contornar o limite de 5 MB do localStorage)
- **PWA:** Service Worker com estratégia cache-first + stale-while-revalidate
- **Voz:** Web Speech API (`SpeechRecognition`)
- **Deploy:** GitHub Pages via workflow próprio (sem Jekyll)

---

## 🚀 Rodar localmente

O app funciona ao abrir `index.html` diretamente no navegador, mas para
usar **microfone** e **Service Worker** é necessário HTTPS (ou `localhost`):

```bash
# Python 3
python -m http.server 8000

# Node
npx serve .
```

Depois acesse `http://localhost:8000`.

> ⚠️ Não abra o `index.html` via `file://` no celular — o microfone e o
> Service Worker são bloqueados nesse contexto.

---

## 🚢 Deploy

O deploy é automático via GitHub Actions ao fazer push na branch `main`:

```bash
git add .
git commit -m "feat: descrição da mudança"
git push
```

O workflow em `.github/workflows/deploy-pages.yml` publica o site em
~30 segundos. Nenhum build, nenhum bundler, nenhum processamento de Jekyll.

---

## 📱 Instalação como app

Em Android/iOS/desktop, ao abrir a URL de produção, o navegador oferece
"Adicionar à tela inicial" ou "Instalar aplicativo". Uma vez instalado,
o app abre em janela própria, sem barra de navegador, e funciona offline
automaticamente.

---

## 🗂️ Formato de dados

Cada Ordem de Serviço é serializada como JSON:

```json
{
  "id": "os_1746300000_abc123",
  "criadoEm": "2026-05-03T10:30:00.000Z",
  "meta": {
    "numero": "4657",
    "embarcacao": "Squish",
    "estaleiroModelo": "Prestige 550",
    "anoEmbarcacao": "2017",
    "proprietario": "Tony Costa",
    "coordenadas": "26°59'615 S · 48°38'157 W",
    "observacoes": "...",
    "observacoesFotos": [...],
    "assinaturaCliente": { "nome": "...", "documento": "...", "dataUrl": "..." },
    "relatorioFinalizado": true
  },
  "itens": [
    {
      "sistema": "MFD Raymarine",
      "sintoma": "...", "testes": "...", "causaRaiz": "...", "acao": "...",
      "status": "Resolvido",
      "fotos": [...], "pecas": [...]
    }
  ],
  "checklist": [...]
}
```

A exportação JSON hidrata as fotos (dataUrl base64) para ser
auto-suficiente — pode ser importada em qualquer dispositivo.

---

## 🎨 Identidade visual

A interface (sidebar, abas, cards, botões, campos, badges) segue o mesmo
design system da ferramenta irmã **WonderLab** (`criadorOS-LAB`) — sidebar em
gradiente navy, cards com selo numérico quadrado, botões arredondados,
badges em formato pill. **O documento do relatório/PDF exportado tem
identidade visual própria e independente**, calibrada separadamente (capa
centralizada, tipografia maior para impressão, quebra de página inteligente)
— não é afetado por mudanças no chrome do app.

| Cor | Uso |
|---|---|
| ![#101c2d](https://placehold.co/12x12/101c2d/101c2d.png) `#101c2d` — Azul-marinho | Primário, títulos, navy |
| ![#148695](https://placehold.co/12x12/148695/148695.png) `#148695` — Turquesa | Accent, links, badges |
| ![#C9A227](https://placehold.co/12x12/C9A227/C9A227.png) `#C9A227` — Dourado | Numeração, destaques institucionais |

Tipografia: **Playfair Display** (serif · títulos e capa) +
**Source Sans 3** / **Inter** (sans · corpo e formulários).

> ⚠️ **Nota para dev:** as variáveis `--azul-marinho`/`--dourado`/`--turquesa`
> são redefinidas dentro de `[data-theme="dark"]` para convergirem no mesmo
> tom de turquesa (`#44c5d0`). Qualquer regra de tema escuro que use essas
> variáveis esperando "navy escuro" ou "texto legível sobre destaque" está
> incorreta — use hex literal ou `var(--azul-marinho-profundo)` (`#000000`,
> não redefinido). Ver `MEMORIA_PROJETO.md` para o histórico completo desse
> bug (já corrigido 4× em componentes diferentes).

---

## 📜 LGPD

Todos os dados coletados permanecem armazenados **localmente no navegador**
do dispositivo (`localStorage` + `IndexedDB`). A Wonder Boat não recebe,
não acessa remotamente e não mantém cópia em servidores próprios.
Nenhuma sincronização automática com nuvem ocorre sem ação explícita
do operador.

No primeiro acesso, o operador aceita formalmente os termos de tratamento
de dados conforme a Lei nº 13.709/2018.

Canal para direitos do titular: **oi@wonderboat.com.br**

---

## 🤝 Contato

**Wonder Boat — Alta Tecnologia e Máxima Performance**

- 🌐 [www.wonderboat.com.br](https://www.wonderboat.com.br)
- ✉️ oi@wonderboat.com.br
- 📞 +55 47 3021-4888

---

## 📚 Documentação técnica

Ver [`MEMORIA_PROJETO.md`](./MEMORIA_PROJETO.md) para contexto completo
de arquitetura, decisões de produto, bugs corrigidos e roadmap.
