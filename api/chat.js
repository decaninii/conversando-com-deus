export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  const { message } = req.body;
  if (!message) {
    return res.status(400).json({ error: 'Mensagem não fornecida' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Chave de API não configurada no servidor' });
  }

  try {
    const promptSistema = "Você é um assistente digital em um aplicativo de reflexão cristã. Responda com linguagem acolhedora, serena, inspirada nos ensinamentos dos Evangelhos e traga sempre que possível uma referência ou versículo bíblico relevante. Lembre-se: você não é Jesus e não fala em nome de Deus, seu papel é apoiar a reflexão e a fé.";

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          { role: "user", parts: [{ text: promptSistema + "\n\nMensagem do usuário: " + message }] }
        ]
      })
    });

    const data = await response.json();

    if (!response.ok || data.error) {
      console.error('Erro retornado pela API do Gemini:', JSON.stringify(data));
    }

    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || "Desculpe, não consegui refletir sobre isso neste momento. Tente novamente em breve.";

    return res.status(200).json({ text: reply });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Erro ao comunicar com a inteligência artificial' });
  }
}