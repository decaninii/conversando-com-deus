# Conversando com Deus

App de reflexão cristã com chat guiado por IA (Gemini), pensado para deploy na Vercel.

## Estrutura

```
/
├── index.html      # front-end (app inteiro em uma página)
├── api/
│   └── chat.js     # função serverless que fala com a API do Gemini
├── package.json
└── .gitignore
```

O `index.html` NUNCA fala diretamente com a API do Gemini — ele chama `/api/chat`,
que roda no servidor da Vercel e é o único lugar que conhece a chave de API.
Isso evita expor a chave no navegador.

## 1. Subir no GitHub

```bash
cd conversando-com-deus
git init
git add .
git commit -m "Primeira versão do app"
git branch -M main
git remote add origin https://github.com/SEU_USUARIO/conversando-com-deus.git
git push -u origin main
```

(Crie o repositório vazio no GitHub antes, sem README/gitignore automáticos,
para não conflitar com o `git push`.)

## 2. Deploy na Vercel

1. Acesse vercel.com → "Add New Project" → importe o repositório do GitHub.
2. Em **Environment Variables**, adicione:
   - `GEMINI_API_KEY` = sua chave da API do Gemini (console.cloud.google.com ou aistudio.google.com/apikey)
3. Deploy. A Vercel detecta `api/chat.js` automaticamente como uma Serverless Function.
4. Teste o chat no domínio gerado (algo como `conversando-com-deus.vercel.app`).

Se a chave mudar depois, é só atualizar em Project Settings → Environment Variables
e fazer um novo deploy (ou "Redeploy").

## 3. Sobre fine-tuning (próximo passo)

Para esse tipo de app, existem dois caminhos, do mais simples ao mais avançado:

- **Prompt engineering + poucos exemplos (few-shot)**: ajustar o `promptSistema`
  em `api/chat.js` com exemplos de tom/estilo desejados. Rápido, grátis, já dá
  90% do resultado que fine-tuning traria para esse caso de uso.
- **Fine-tuning de verdade (Vertex AI)**: o Gemini não tem fine-tuning "de
  consumidor" como a OpenAI; o caminho oficial é o **Vertex AI Tuning** do
  Google Cloud, que exige: projeto no GCP, um dataset de pares
  pergunta/resposta no formato JSONL, e cobra pelo processo de tuning e depois
  pelo uso do modelo ajustado (mais caro que o Gemini padrão via API key).

Recomendo validar bem o prompt do sistema primeiro (passo simples) antes de
investir em fine-tuning — para chatbots de tom/estilo, geralmente o prompt bem
escrito resolve.
