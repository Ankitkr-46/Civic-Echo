export interface AIPipelineResult {
  category: string;
  priority: string;
  summary: string;
  duplicateDetected: boolean;
  duplicateComplaintId?: string;
  confidence: number;
  detectedLanguage: string;
  translatedTitle?: string;
  translatedDescription?: string;
}

// Map helper to validate category names
function categoryMap(cat: string): string {
  const valid = ['Road Issues', 'Water Supply', 'Electricity', 'Garbage & Sanitation', 'Healthcare', 'Education', 'Public Safety', 'Other'];
  const found = valid.find(v => v.toLowerCase() === cat.toLowerCase().trim());
  return found || 'Other';
}

// Simple distance check (approximate delta for ~500 meters)
function getDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const dLat = Math.abs(lat1 - lat2);
  const dLng = Math.abs(lng1 - lng2);
  return Math.sqrt(dLat * dLat + dLng * dLng); // Angular distance
}

// Local duplicate check
function checkDuplicates(
  category: string,
  latitude: number | null,
  longitude: number | null,
  existingComplaints: any[]
): { detected: boolean; id?: string } {
  if (latitude === null || longitude === null || !existingComplaints.length) {
    return { detected: false };
  }

  for (const comp of existingComplaints) {
    if (comp.category === category && comp.location_lat && comp.location_lng) {
      const dist = getDistance(latitude, longitude, comp.location_lat, comp.location_lng);
      // If within approx 500m (0.005 angular degrees) and not resolved/closed
      if (dist < 0.005 && comp.status !== 'Resolved' && comp.status !== 'Closed') {
        return { detected: true, id: comp.id };
      }
    }
  }

  return { detected: false };
}

// High-fidelity pattern matcher
function runMockAI(
  title: string,
  description: string,
  latitude: number | null,
  longitude: number | null,
  existingComplaints: any[] = []
): AIPipelineResult {
  const combined = (title + ' ' + description).toLowerCase();

  // 1. Language detection
  let detectedLanguage = 'English';
  let translatedTitle = title;
  let translatedDescription = description;

  const hindiKeywords = ['sadak', 'pani', 'bijli', 'kachra', 'gali', 'gaddha', 'paani', 'road kharab', 'light nahi', 'chori', 'safai'];
  const SpanishKeywords = ['agua', 'calle', 'basura', 'electricidad', 'luz', 'seguridad', 'hospital', 'escuela'];

  if (hindiKeywords.some(kw => combined.includes(kw))) {
    detectedLanguage = 'Hindi';
    // Mock translation to English for administrative view
    translatedTitle = title
      .replace(/sadak/gi, 'Road')
      .replace(/pani|paani/gi, 'Water')
      .replace(/bijli/gi, 'Electricity')
      .replace(/kachra/gi, 'Garbage')
      .replace(/gaddha/gi, 'Pothole')
      .replace(/chori/gi, 'Theft');
    
    translatedDescription = `[Translated from Hindi]: ` + description;
  } else if (SpanishKeywords.some(kw => combined.includes(kw))) {
    detectedLanguage = 'Spanish';
    translatedTitle = `[Translated from Spanish]: ` + title;
    translatedDescription = `[Translated from Spanish]: ` + description;
  }

  // 2. Category matching
  let category = 'Other';
  let confidence = 0.85;

  if (combined.includes('water') || combined.includes('leak') || combined.includes('pipeline') || combined.includes('flooding') || combined.includes('drain') || combined.includes('sewage') || combined.includes('paani') || combined.includes('pani')) {
    category = 'Water Supply';
    confidence = 0.95;
  } else if (combined.includes('pothole') || combined.includes('road') || combined.includes('street') || combined.includes('highway') || combined.includes('sadak') || combined.includes('gaddha') || combined.includes('asphalt')) {
    category = 'Road Issues';
    confidence = 0.97;
  } else if (combined.includes('power') || combined.includes('electricity') || combined.includes('outage') || combined.includes('voltage') || combined.includes('wire') || combined.includes('transformer') || combined.includes('trip') || combined.includes('blackout') || combined.includes('bijli') || combined.includes('load shedding')) {
    category = 'Electricity';
    confidence = 0.96;
  } else if (combined.includes('garbage') || combined.includes('sanitation') || combined.includes('trash') || combined.includes('waste') || combined.includes('dump') || combined.includes('litter') || combined.includes('stench') || combined.includes('bin') || combined.includes('kachra') || combined.includes('safai')) {
    category = 'Garbage & Sanitation';
    confidence = 0.94;
  } else if (combined.includes('safety') || combined.includes('security') || combined.includes('crime') || combined.includes('snatch') || combined.includes('robbery') || combined.includes('threat') || combined.includes('streetlights') || combined.includes('light') || combined.includes('unsafe') || combined.includes('chori')) {
    category = 'Public Safety';
    confidence = 0.91;
  } else if (combined.includes('hospital') || combined.includes('clinic') || combined.includes('doctor') || combined.includes('health') || combined.includes('medical') || combined.includes('nurse')) {
    category = 'Healthcare';
    confidence = 0.92;
  } else if (combined.includes('school') || combined.includes('college') || combined.includes('teacher') || combined.includes('education') || combined.includes('student')) {
    category = 'Education';
    confidence = 0.93;
  }

  // 3. Priority prediction
  let priority = 'Medium';
  const highKeywords = ['burst', 'flooding', 'live wire', 'sparking', 'exposed wire', 'snatch', 'robbery', 'dangerous', 'accident', 'emergency', 'unsafe', 'injured', 'high voltage', 'chori'];
  const lowKeywords = ['aesthetic', 'billing', 'delay', 'minor fluctuation', 'paperwork', 'slow'];

  if (highKeywords.some(kw => combined.includes(kw))) {
    priority = 'High';
  } else if (lowKeywords.some(kw => combined.includes(kw))) {
    priority = 'Low';
  }

  // 4. Summarization
  let summary = title;
  if (category === 'Water Supply') {
    summary = `Water leakage/supply issue reported: ${title}`;
  } else if (category === 'Road Issues') {
    summary = `Road or pothole hazard reported: ${title}`;
  } else if (category === 'Electricity') {
    summary = `Electrical or power grid issue reported: ${title}`;
  } else if (category === 'Garbage & Sanitation') {
    summary = `Sanitation and garbage overflow reported: ${title}`;
  } else if (category === 'Public Safety') {
    summary = `Public safety risk or lighting issue reported: ${title}`;
  } else {
    summary = `Civic complaint submitted: ${title}`;
  }

  // 5. Duplicate Check
  const duplicate = checkDuplicates(category, latitude, longitude, existingComplaints);

  return {
    category,
    priority,
    summary,
    duplicateDetected: duplicate.detected,
    duplicateComplaintId: duplicate.id,
    confidence,
    detectedLanguage,
    translatedTitle,
    translatedDescription,
  };
}

export async function processComplaintAI(
  title: string,
  description: string,
  latitude: number | null,
  longitude: number | null,
  existingComplaints: any[] = []
): Promise<AIPipelineResult> {
  const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || '';
  const textToAnalyze = `Title: ${title}\nDescription: ${description}`;

  if (apiKey) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: `You are an AI civic assistant routing complaints for the CivicEcho Smart Portal.
Analyze the following citizen complaint and return a valid JSON object matching the schema below.
Categories must be strictly one of: "Road Issues", "Water Supply", "Electricity", "Garbage & Sanitation", "Healthcare", "Education", "Public Safety", "Other".
Priorities must be strictly one of: "Low", "Medium", "High".
Detect the language of submission ("English", "Hindi", "Spanish", etc.)
Provide a 1-sentence English summary of the core issue.
Translate the Title and Description into English if submitted in another language, otherwise repeat them.

Complaint details:
${textToAnalyze}

JSON schema response:
{
  "category": "Road Issues",
  "priority": "Medium",
  "summary": "Concise 1-sentence summary.",
  "confidence": 0.95,
  "detectedLanguage": "English",
  "translatedTitle": "English Title",
  "translatedDescription": "English Description"
}
Ensure you return ONLY a raw JSON string without markdown blocks or explanation.`,
                  },
                ],
              },
            ],
            generationConfig: {
              responseMimeType: 'application/json',
            },
          })
        }
      );

      if (response.ok) {
        const data = await response.json();
        const jsonText = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (jsonText) {
          const parsed = JSON.parse(jsonText.trim());
          const mappedCat = categoryMap(parsed.category);
          const duplicate = checkDuplicates(mappedCat, latitude, longitude, existingComplaints);

          return {
            category: mappedCat,
            priority: parsed.priority || 'Medium',
            summary: parsed.summary || title,
            confidence: parsed.confidence || 0.9,
            detectedLanguage: parsed.detectedLanguage || 'English',
            translatedTitle: parsed.translatedTitle || title,
            translatedDescription: parsed.translatedDescription || description,
            duplicateDetected: duplicate.detected,
            duplicateComplaintId: duplicate.id,
          };
        }
      }
    } catch (error) {
      console.error('Gemini API request failed, falling back to local analysis:', error);
    }
  }

  // Fallback to high-fidelity pattern matching
  return runMockAI(title, description, latitude, longitude, existingComplaints);
}
