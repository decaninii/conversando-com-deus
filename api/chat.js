export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  const { message, history } = req.body;
  if (!message) {
    return res.status(400).json({ error: 'Mensagem não fornecida' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Chave de API não configurada no servidor' });
  }

  try {
    const promptSistema = `Você é um assistente digital em um aplicativo de reflexão cristã chamado "Conversando com Jesus".

Seu papel é manter uma conversa de verdade, não dar um sermão isolado a cada mensagem. Sempre que fizer sentido, aprofunde o assunto com uma pergunta curta e genuína que ajude a pessoa a se abrir mais — como um bom ouvinte guiado pela fé.

Mas preste atenção ao tom da última mensagem da pessoa: se ela sinalizar que quer encerrar aquele assunto (respostas curtas como "entendi", "obrigado", "valeu", "ok", "amém" sozinho, despedidas, ou qualquer sinal de que não quer continuar aprofundando), NÃO faça outra pergunta — feche com acolhimento, sem forçar a conversa a continuar.

Regras de estilo:
- Seja direto e sucinto: no máximo 3-4 frases curtas por resposta.
- Use linguagem acolhedora, serena, inspirada nos ensinamentos dos Evangelhos.
- Continue a conversa considerando o histórico enviado, sem repetir saudações já feitas.
- Você não é Jesus e não fala em nome de Deus; seu papel é apoiar a reflexão e o consolo.
- Quando fizer sentido, traga uma referência bíblica relevante, mas NUNCA escreva a referência dentro do texto da resposta — ela vai em um campo separado.

Responda SEMPRE em JSON puro (sem markdown, sem crases, sem texto fora do JSON), no formato exato:
{"text": "sua resposta aqui", "reference": "Livro Capítulo:Versículo"}
Se não houver referência relevante, use "reference": null.`;

    // Monta o histórico de turnos no formato que o Gemini espera
    // (limitado às últimas mensagens para economizar tokens e evitar payloads muito grandes)
    const historicoLimitado = Array.isArray(history) ? history.slice(-12) : [];
    const contents = [];
    for (const turn of historicoLimitado) {
      if (!turn?.text) continue;
      contents.push({
        role: turn.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: turn.text }]
      });
    }
    contents.push({ role: 'user', parts: [{ text: message }] });

    const requestBody = {
      systemInstruction: { role: 'system', parts: [{ text: promptSistema }] },
      contents,
      generationConfig: {
        maxOutputTokens: 512,
        responseMimeType: 'application/json',
        thinkingConfig: { thinkingBudget: 0 }
      }
    };

    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

    async function chamarGemini(model) {
      const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });
      const json = await resp.json();
      const temTexto = !!json?.candidates?.[0]?.content?.parts?.[0]?.text;
      return { ok: resp.ok && !json.error && temTexto, data: json };
    }

    // Tenta várias vezes e com um modelo alternativo antes de desistir —
    // cobre tanto sobrecarga (503) quanto respostas vazias/instáveis.
    const modelosParaTentar = ['gemini-flash-latest', 'gemini-flash-latest', 'gemini-flash-lite-latest', 'gemini-flash-lite-latest'];
    let resultado;
    for (let i = 0; i < modelosParaTentar.length; i++) {
      resultado = await chamarGemini(modelosParaTentar[i]);
      if (resultado.ok) break;
      if (i < modelosParaTentar.length - 1) await sleep(500);
    }

    const { ok: sucesso, data } = resultado;

    if (!sucesso) {
      console.error('Erro/resposta vazia da API do Gemini:', JSON.stringify(data));
    }

    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;

    let text = 'Desculpe, não consegui refletir sobre isso agora. Pode tentar reformular ou enviar de novo em instantes?';
    let reference = null;

    if (rawText) {
      try {
        const cleaned = rawText.replace(/```json|```/g, '').trim();
        const parsed = JSON.parse(cleaned);
        if (parsed.text) text = parsed.text;
        reference = parsed.reference || null;
      } catch (e) {
        // JSON veio incompleto/malformado: tenta extrair o campo "text" na mão antes de desistir
        const match = rawText.match(/"text"\s*:\s*"([\s\S]*?)"\s*(,\s*"reference"|})/);
        if (match) {
          text = match[1].replace(/\\n/g, ' ').replace(/\\"/g, '"');
        } else if (!rawText.trim().startsWith('{')) {
          text = rawText;
        }
      }
    }

    return res.status(200).json({ text, reference });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Erro ao comunicar com a inteligência artificial' });
  }
}