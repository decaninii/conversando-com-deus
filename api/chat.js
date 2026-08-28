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

Regras de estilo:
- Seja direto e sucinto: no máximo 3-4 frases curtas por resposta, como uma conversa real, não um sermão.
- Use linguagem acolhedora, serena, inspirada nos ensinamentos dos Evangelhos.
- Continue a conversa considerando o histórico enviado, sem repetir saudações já feitas.
- Você não é Jesus e não fala em nome de Deus; seu papel é apoiar a reflexão e o consolo.
- Quando fizer sentido, traga uma referência bíblica relevante, mas NUNCA escreva a referência dentro do texto da resposta — ela vai em um campo separado.

Responda SEMPRE em JSON puro (sem markdown, sem crases, sem texto fora do JSON), no formato exato:
{"text": "sua resposta aqui", "reference": "Livro Capítulo:Versículo"}
Se não houver referência relevante, use "reference": null.`;

    // Monta o histórico de turnos no formato que o Gemini espera
    const contents = [];
    if (Array.isArray(history)) {
      for (const turn of history) {
        if (!turn?.text) continue;
        contents.push({
          role: turn.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: turn.text }]
        });
      }
    }
    contents.push({ role: 'user', parts: [{ text: message }] });

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { role: 'system', parts: [{ text: promptSistema }] },
        contents,
        generationConfig: {
          maxOutputTokens: 400,
          responseMimeType: 'application/json',
          thinkingConfig: { thinkingBudget: 0 }
        }
      })
    });

    const data = await response.json();

    if (!response.ok || data.error) {
      console.error('Erro retornado pela API do Gemini:', JSON.stringify(data));
    }

    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;

    let text = 'Desculpe, não consegui refletir sobre isso neste momento. Tente novamente em breve.';
    let reference = null;

    if (rawText) {
      try {
        const cleaned = rawText.replace(/```json|```/g, '').trim();
        const parsed = JSON.parse(cleaned);
        if (parsed.text) text = parsed.text;
        reference = parsed.reference || null;
      } catch (e) {
        // Se por algum motivo não vier em JSON, usa o texto puro mesmo
        text = rawText;
      }
    }

    return res.status(200).json({ text, reference });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Erro ao comunicar com a inteligência artificial' });
  }
}