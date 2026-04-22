export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { category, difficulty, usedQuestions } = req.body;

    const difficultyText =
      difficulty === 1 ? "оңай" :
      difficulty === 2 ? "орташа" : "қиын";

    const usedNote = usedQuestions?.length
      ? `\n\nБұл сұрақтарды қайталама: ${usedQuestions.slice(-5).join(" | ")}`
      : "";

    const SYSTEM_PROMPT = `Сен QBit Quiz платформасының AI-сұрақ генераторысың. Қазақша тест сұрақтары жасайсың.

Форматы — тек JSON:
{
  "question": "Сұрақ мәтіні",
  "options": ["A", "B", "C", "D"],
  "correct": 0,
  "explanation": "Қысқа түсіндірме"
}`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 800,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content: `Категория: ${category}
Күрделілік: ${difficultyText}${usedNote}

Жаңа сұрақ жаса.`
          }
        ]
      })
    });

    const data = await response.json();

    const text = data.content?.[0]?.text || "";
    const clean = text.replace(/```json|```/g, "").trim();

    return res.status(200).json(JSON.parse(clean));

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
}