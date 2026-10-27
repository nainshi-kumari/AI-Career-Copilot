export default async function handler(req, res) {
    if (req.method !== "POST") {
      return res.status(405).json({
        error: "Method not allowed"
      });
    }
  
    const apiKey = process.env.GEMINI_API_KEY;
  
    if (!apiKey) {
      return res.status(500).json({
        error: "GEMINI_API_KEY environment variable is missing."
      });
    }
  
    try {
      const { feature, resume, jobDesc } = req.body || {};
  
      if (!resume || !jobDesc) {
        return res.status(400).json({
          error: "Resume and job description are required."
        });
      }
  
      const prompts = {
        analyze: `
  Analyze this resume for the given job description.
  
  Return valid JSON with these fields:
  ats_score (number from 0 to 100),
  summary (string),
  strengths (array of strings),
  missing_keywords (array of strings),
  improvements (array of strings).
  
  Do not invent skills or experience.
  
  RESUME:
  ${resume}
  
  JOB DESCRIPTION:
  ${jobDesc}
  `,
        improve: `
  Improve this resume for the job description.
  Preserve real qualifications, projects, skills, and experience.
  Do not invent achievements, metrics, or skills.
  Return only the improved resume as plain text.
  
  RESUME:
  ${resume}
  
  JOB DESCRIPTION:
  ${jobDesc}
  `,
        coverLetter: `
  Write a professional cover letter of about 250–350 words
  based on the resume and job description.
  Do not invent experience, achievements, or company details.
  Use [Hiring Manager] when a name is unknown.
  Return only the cover letter.
  
  RESUME:
  ${resume}
  
  JOB DESCRIPTION:
  ${jobDesc}
  `,
        interview: `
  Create 12 personalized internship interview questions:
  4 technical, 4 project-based, and 4 HR/behavioral.
  Include a short sample answer outline for each question.
  Use only skills and projects supported by the resume.
  Return clear headings and numbered questions.
  
  RESUME:
  ${resume}
  
  JOB DESCRIPTION:
  ${jobDesc}
  `
      };
  
      const prompt = prompts[feature];
  
      if (!prompt) {
        return res.status(400).json({
          error: "Unknown feature."
        });
      }
  
      const model = "gemini-2.5-flash";
  
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": apiKey
          },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.3,
              maxOutputTokens: 3500
            }
          })
        }
      );
  
      const data = await response.json();
  
      if (!response.ok) {
        console.error("Gemini API error:", data.error?.message);
        return res.status(502).json({
          error: "AI service request failed. Check the server logs."
        });
      }
  
      const result = data.candidates?.[0]?.content?.parts
        ?.map(part => part.text || "")
        .join("\n")
        .trim();
  
      if (!result) {
        return res.status(502).json({
          error: "The AI returned an empty response."
        });
      }
  
      return res.status(200).json({ result });
  
    } catch (error) {
      console.error("Backend error:", error.message);
  
      return res.status(500).json({
        error: "Something went wrong while processing your request."
      });
    }
  }