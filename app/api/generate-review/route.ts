import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

interface GenerateReviewRequest {
  businessName: string;
  businessCategory?: string;
  rating: number;
  keywords: string[];
  userExperience?: string;
  language?: 'en' | 'hi' | 'gu';
}

export async function POST(request: NextRequest) {
  try {
    const body: GenerateReviewRequest = await request.json();
    const {
      businessName,
      businessCategory = 'Business',
      rating = 5,
      keywords = [],
      userExperience = '',
      language = 'en',
    } = body;

    if (!businessName) {
      return NextResponse.json({ error: 'businessName is required' }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
      // Fallback draft templates
      return NextResponse.json({
        isAiGenerated: false,
        message: 'Template Mode: Add GEMINI_API_KEY in environment to enable neural drafts.',
        drafts: getFallbackDrafts({
          businessName,
          rating,
          keywords,
          userExperience,
          language,
        }),
      });
    }

    const ai = new GoogleGenAI();
    const langNames: Record<string, string> = {
      en: 'English',
      hi: 'Hindi (हिंदी)',
      gu: 'Gujarati (ગુજરાતી)',
    };

    const prompt = `
You are an authentic, honest customer feedback assistant for "${businessName}" (${businessCategory}).
A real visitor wants to draft a genuine Google Review with a ${rating}-star rating.

Keywords selected by the customer:
${keywords.length > 0 ? keywords.join(', ') : 'None specified'}

Customer's own personal experience notes:
${userExperience && userExperience.trim().length > 0 ? `"${userExperience.trim()}"` : 'None provided'}

Target Language: ${langNames[language] || 'English'}.

REQUIREMENTS:
1. Generate EXACTLY 3 distinct review suggestions:
   - Draft 1 (Concise & Direct): Short, punchy 2-3 sentences.
   - Draft 2 (Detailed & Narrative): 4-5 sentences weaving together the highlights naturally.
   - Draft 3 (Enthusiastic & High Recommendation): Warm, memorable, and recommending this place to others.
2. Tone must strictly match the ${rating}-star rating:
   - 5 stars: Highly satisfied, genuine praise.
   - 4 stars: Very good experience, constructive or happy note.
   - 3 stars or lower: Balanced, polite, specific feedback without hostility.
3. Incorporate the customer's selected keywords naturally if provided. DO NOT keyword-stuff robotically.
4. If customer wrote real experience notes, synthesize them honestly without inventing fake dishes or events not mentioned.
5. Language MUST be written natively in ${langNames[language]}. (Use Devanagari script for Hindi, Gujarati script for Gujarati).

Format your response as a strict JSON array with this exact structure:
[
  { "tone": "Concise & Direct", "text": "..." },
  { "tone": "Detailed & Narrative", "text": "..." },
  { "tone": "Enthusiastic & Recommendation", "text": "..." }
]
Only output the valid JSON array without any markdown backticks or commentary.
`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        temperature: 0.7,
      },
    });

    const responseText = response.text || '';
    const cleanJson = responseText.replace(/```json\n?|```/g, '').trim();
    const parsed = JSON.parse(cleanJson);

    if (Array.isArray(parsed) && parsed.length >= 3) {
      const drafts = parsed.slice(0, 3).map((item, idx) => ({
        id: `ai-${Date.now()}-${idx}`,
        tone: item.tone || `Option ${idx + 1}`,
        text: item.text,
        language,
      }));
      return NextResponse.json({ isAiGenerated: true, drafts });
    }

    return NextResponse.json({
      isAiGenerated: false,
      drafts: getFallbackDrafts({ businessName, rating, keywords, userExperience, language }),
    });
  } catch (error: any) {
    console.error('Gemini API review generation failed:', error);
    return NextResponse.json(
      {
        error: 'Failed to generate review with Gemini',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

function getFallbackDrafts(params: {
  businessName: string;
  rating: number;
  keywords: string[];
  userExperience: string;
  language: string;
}) {
  const { businessName, rating, keywords, userExperience, language } = params;
  const kwList = keywords.length > 0 ? keywords.join(', ') : 'great service';

  if (language === 'hi') {
    return [
      {
        id: 'fb-hi-1',
        tone: 'संक्षिप्त और स्पष्ट (Concise)',
        text: `${businessName} का अनुभव बहुत बढ़िया रहा! ${kwList ? `विशेष रूप से ${kwList} लाजवाब था।` : ''} ${userExperience ? `${userExperience}।` : ''} निश्चित रूप से फिर से आऊंगा।`,
        language: 'hi',
      },
      {
        id: 'fb-hi-2',
        tone: 'विस्तृत अनुभव (Detailed)',
        text: `मैंने हाल ही में ${businessName} का दौरा किया। यहाँ की व्यवस्था और वातावरण शानदार था। ${kwList ? `${kwList} ने मन जीत लिया।` : ''} ${userExperience ? `मेरा अनुभव: ${userExperience}` : ''} सभी को यहाँ आने की सलाह देता हूँ!`,
        language: 'hi',
      },
      {
        id: 'fb-hi-3',
        tone: 'सराहनीय अनुशंसा (Enthusiastic)',
        text: `5 स्टार अनुभव! ${businessName} में सब कुछ उम्मीद से बेहतर रहा। ${kwList ? `${kwList} सबसे खास बात थी।` : ''} पूरे स्टाफ को बधाई!`,
        language: 'hi',
      },
    ];
  }

  if (language === 'gu') {
    return [
      {
        id: 'fb-gu-1',
        tone: 'ટૂંકી અને સ્પષ્ટ (Concise)',
        text: `${businessName} ની મુલાકાત ખૂબ જ સરસ રહી! ${kwList ? `ખાસ કરીને ${kwList} ઉત્તમ હતું.` : ''} ${userExperience ? `${userExperience}।` : ''} ફરી ચોક્કસ આવીશું.`,
        language: 'gu',
      },
      {
        id: 'fb-gu-2',
        tone: 'વિગતવાર સમીક્ષા (Detailed)',
        text: `${businessName} ખાતે અમારો અનુભવ ખૂબ જ આનંદદાયક રહ્યો. ${kwList ? `${kwList} ખરેખર શ્રેષ્ઠ હતું.` : ''} ${userExperience ? `અમારો અનુભવ: ${userExperience}` : ''} બધા મિત્રો અને પરિવારને ખૂબ ભલામણ કરું છું!`,
        language: 'gu',
      },
      {
        id: 'fb-gu-3',
        tone: 'ઉત્સાહી ભલામણ (Enthusiastic)',
        text: `ખૂબ જ સરસ! ${businessName} ની ક્વોલિટી અને સર્વિસ અદ્ભુત છે. ${kwList ? `${kwList} યાદગાર રહ્યું.` : ''} અહીં જરૂર જવું જોઈએ!`,
        language: 'gu',
      },
    ];
  }

  return [
    {
      id: 'fb-en-1',
      tone: 'Concise & Direct',
      text: `Had a wonderful experience at ${businessName}! ${kwList ? `Really impressed by the ${kwList.toLowerCase()}.` : ''} ${userExperience ? userExperience : ''} Highly recommended!`,
      language: 'en',
    },
    {
      id: 'fb-en-2',
      tone: 'Detailed & Narrative',
      text: `Visited ${businessName} recently and came away thoroughly impressed. Everything from the ambience to the execution was top notch. ${kwList ? `Special shoutout for the ${kwList.toLowerCase()}!` : ''} ${userExperience ? `Specifically: ${userExperience}` : ''} Will definitely be coming back.`,
      language: 'en',
    },
    {
      id: 'fb-en-3',
      tone: 'Enthusiastic & Recommendation',
      text: `Easily a 5-star experience at ${businessName}! The team takes immense pride in their work. ${kwList ? `The ${kwList.toLowerCase()} truly stood out.` : ''} If you are looking for quality and great hospitality, this is the place to be!`,
      language: 'en',
    },
  ];
}
