export interface ParsedMenuItem {
  name: string;
  description: string;
  price: number;
  category: string;
}

/**
 * Sends a menu photo / price board image to Google Gemini Vision API to extract items and prices into structured JSON.
 * 
 * @param base64Data Raw base64 string or data URL of the uploaded image.
 * @param mimeType Image mime type ('image/jpeg', 'image/png', etc.).
 * @param businessCategory Store category ('salon', 'detailing', or 'restaurant').
 * @returns Array of extracted menu/service items with name, description, price, and category.
 */
export async function parseMenuImageWithGemini(
  base64Data: string,
  mimeType = 'image/jpeg',
  businessCategory = 'restaurant'
): Promise<ParsedMenuItem[]> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('Gemini API key is not configured in environment variables (GEMINI_API_KEY).');
  }

  // Clean base64 string if data URL prefix is included
  const cleanBase64 = base64Data.replace(/^data:image\/\w+;base64,/, '');

  const promptText = `
You are an expert OCR and menu parser for a business management platform.
The user has uploaded an image of a ${businessCategory === 'salon' ? 'salon service rate card / spa treatment menu' : businessCategory === 'detailing' ? 'auto detailing service price menu' : 'restaurant food menu'}.

Analyze the image carefully and extract all menu items, services, treatments, descriptions, and prices.

Respond ONLY with a raw, valid JSON array of objects (no markdown wrapping, no code block backticks, no markdown text).
Each object in the array MUST strictly have these exact fields:
- "name": string (Item or Service name)
- "description": string (Brief description or details, or clean summary if missing)
- "price": number (Numerical price in INR/Rupees, e.g. 2499 or 599. Omit currency symbols and commas)
- "category": string (Category name such as "Hair Treatments", "Spa Therapy", "Classic Momos", "Car Wash", etc.)

Example JSON format:
[
  {
    "name": "Keratin Smoothing Therapy",
    "description": "Deep restorative keratin treatment for smooth, frizz-free, ultra-shiny hair.",
    "price": 2499,
    "category": "Hair Treatments"
  },
  {
    "name": "Signature Haircut & Styling",
    "description": "Precision cut, wash, scalp massage, and professional blow-dry styling.",
    "price": 599,
    "category": "Hair Treatments"
  }
]

Do not include any conversational intro, explanation, or markdown syntax. Return ONLY valid JSON array.
`;

  const payload = {
    contents: [
      {
        parts: [
          { text: promptText },
          {
            inline_data: {
              mime_type: mimeType,
              data: cleanBase64,
            },
          },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.1,
      topP: 0.95,
      maxOutputTokens: 2048,
    },
  };

  // Try gemini-3.8-flash first, fallback to 3.5-flash-lite and 3.1-flash-lite
  const models = ['gemini-3.8-flash', 'gemini-3.5-flash-lite', 'gemini-3.1-flash-lite'];
  let lastError: Error | null = null;
  let responseText = '';

  for (const model of models) {
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        const errMsg = errJson?.error?.message || `HTTP ${res.status} ${res.statusText}`;
        console.warn(`[GEMINI_VISION] Model ${model} returned error: ${errMsg}`);
        lastError = new Error(`Gemini API error (${model}): ${errMsg}`);
        continue;
      }

      const data = await res.json();
      const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
      if (rawText.trim()) {
        responseText = rawText;
        break;
      }
    } catch (err) {
      console.warn(`[GEMINI_VISION] Model ${model} failed:`, err);
      lastError = err instanceof Error ? err : new Error(String(err));
    }
  }

  if (!responseText) {
    throw lastError || new Error('Failed to extract menu items from image using Gemini API.');
  }

  // Strip markdown backticks if returned despite instructions
  let jsonString = responseText.trim();
  if (jsonString.startsWith('```json')) {
    jsonString = jsonString.replace(/^```json\s*/, '').replace(/\s*```$/, '');
  } else if (jsonString.startsWith('```')) {
    jsonString = jsonString.replace(/^```\s*/, '').replace(/\s*```$/, '');
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const parsed = JSON.parse(jsonString);
    if (!Array.isArray(parsed)) {
      throw new Error('Gemini response was not a JSON array');
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return parsed.map((item: any) => ({
      name: String(item.name || 'Unnamed Service/Item').trim(),
      description: String(item.description || '').trim(),
      price: Math.max(0, Number(item.price) || 0),
      category: String(item.category || (businessCategory === 'salon' ? 'General Treatments' : 'General Menu')).trim(),
    }));
  } catch (parseErr) {
    console.error('[GEMINI_VISION] Failed to parse JSON response:', jsonString);
    throw new Error('Failed to parse menu items from AI output. Please try a clearer image.');
  }
}
