import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import OpenAI from "openai";
import { authOptions } from "../../auth/[...nextauth]/route";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

interface FileData {
  path: string;
  content: string;
}

interface RequestBody {
  messages: ChatMessage[];
  files: FileData[];
  selectedFile?: string;
  jobId: string;
}

export async function POST(request: Request) {
  try {
    // 1. Check authentication
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Parse request
    const body = await request.json() as RequestBody;
    const { messages, files } = body;

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: "Messages array required" },
        { status: 400 }
      );
    }

    // 3. Build context for AI
    const filesContext = files
      ? files
          .map(
            (f) =>
              `File: ${f.path}\n\`\`\`\n${f.content.slice(0, 2000)}\n\`\`\``
          )
          .join("\n\n")
      : "";

    const systemPrompt = `You are an expert full-stack developer helping a user modify their generated application. 

**Current Files:**
${filesContext}

**Currently Viewing:** ${body.selectedFile || "No file selected"}

**Your Role:**
1. Understand what the user wants to change
2. Explain the changes you'll make
3. Provide the updated code
4. Be concise but helpful

**Instructions:**
- When modifying code, return it in this format:
  \`\`\`update:filename.tsx
  [updated code here]
  \`\`\`
- If adding a new file:
  \`\`\`create:newfile.tsx
  [new code here]
  \`\`\`
- Explain your changes briefly
- Focus on the specific file the user is asking about
- Use TypeScript and modern React patterns
- Include proper imports and exports

Be friendly and conversational!`;

    // 4. Call OpenAI
    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [
        { role: "system", content: systemPrompt },
        ...messages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
      ],
      temperature: 0.7,
      max_tokens: 2000,
    });

    const aiResponse = completion.choices[0].message.content || "";

    // 5. Parse AI response for code updates
    const updatedFiles: Array<{ path: string; content: string }> = [];
    
    // Look for update blocks: ```update:filename.tsx
    const updateRegex = /```update:([^\n]+)\n([\s\S]*?)```/g;
    let match;
    
    while ((match = updateRegex.exec(aiResponse)) !== null) {
      const [, filepath, code] = match;
      updatedFiles.push({
        path: filepath.trim(),
        content: code.trim(),
      });
    }

    // Look for create blocks: ```create:filename.tsx
    const createRegex = /```create:([^\n]+)\n([\s\S]*?)```/g;
    
    while ((match = createRegex.exec(aiResponse)) !== null) {
      const [, filepath, code] = match;
      updatedFiles.push({
        path: filepath.trim(),
        content: code.trim(),
      });
    }

    // 6. Return response
    return NextResponse.json({
      message: aiResponse,
      updatedFiles: updatedFiles.length > 0 ? updatedFiles : undefined,
    });
  } catch (error) {
    console.error("AI Chat Error:", error);
    return NextResponse.json(
      { error: "Failed to process AI request" },
      { status: 500 }
    );
  }
}