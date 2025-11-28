/**
 * Fast Streaming Generation API - Premium UI Edition
 * 
 * File: src/app/api/generate/stream/route.ts
 * 
 * This endpoint streams generation DIRECTLY to the browser,
 * creating INDUSTRY-GRADE, PROFESSIONAL UI applications.
 */

import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import Anthropic from '@anthropic-ai/sdk';
import { PREMIUM_UI_SYSTEM_PROMPT, buildPremiumUserPrompt } from '@/lib/generation/premium-ui-prompt';

// ============================================================================
// ROUTE HANDLER
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 2. Parse request
    const { prompt, jobId: existingJobId } = await request.json();
    
    if (!prompt || prompt.trim().length < 5) {
      return new Response(JSON.stringify({ error: 'Valid prompt required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 3. Create or use existing job
    let jobId = existingJobId;
    if (!jobId) {
      const job = await prisma.generationJob.create({
        data: {
          userId: session.user.id,
          prompt: prompt.trim(),
          status: 'RUNNING',
          generationStartedAt: new Date(),
        },
      });
      jobId = job.id;
    } else {
      await prisma.generationJob.update({
        where: { id: jobId },
        data: { status: 'RUNNING', generationStartedAt: new Date() },
      });
    }

    // 4. Create Anthropic client
    const client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY!,
    });

    // 5. Create streaming response
    const encoder = new TextEncoder();
    
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Send job ID first
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'job', jobId })}\n\n`));
          
          // Start streaming from Claude with PREMIUM prompts
          const anthropicStream = client.messages.stream({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 16000,
            temperature: 0.7,
            system: PREMIUM_UI_SYSTEM_PROMPT,
            messages: [{
              role: 'user',
              content: buildPremiumUserPrompt(prompt.trim())
            }]
          });

          let fullResponse = '';
          let fileCount = 0;
          const files: Array<{ path: string; content: string }> = [];

          // Stream chunks to client
          for await (const event of anthropicStream) {
            if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
              const chunk = event.delta.text;
              fullResponse += chunk;
              
              // Send raw chunk for live preview
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'chunk', content: chunk })}\n\n`));
              
              // Check for completed files
              const fileStartMatch = fullResponse.match(/<file\s+path="([^"]+)">/g);
              const fileEndMatch = fullResponse.match(/<\/file>/g);
              
              if (fileStartMatch && fileEndMatch && fileEndMatch.length > fileCount) {
                // Extract the last completed file
                const fileRegex = /<file\s+path="([^"]+)">([\s\S]*?)<\/file>/g;
                let match;
                const newFiles: Array<{ path: string; content: string }> = [];
                
                while ((match = fileRegex.exec(fullResponse)) !== null) {
                  newFiles.push({
                    path: match[1].trim(),
                    content: match[2].trim(),
                  });
                }
                
                // Send newly completed files
                for (let i = fileCount; i < newFiles.length; i++) {
                  const file = newFiles[i];
                  files.push(file);
                  
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
                    type: 'file', 
                    path: file.path, 
                    content: file.content,
                    index: i + 1,
                  })}\n\n`));
                  
                  // Save to database immediately
                  try {
                    await prisma.generatedFile.upsert({
                      where: {
                        generationJobId_path: { generationJobId: jobId, path: file.path },
                      },
                      update: {
                        content: file.content,
                        language: getLanguage(file.path),
                        size: file.content.length,
                      },
                      create: {
                        generationJobId: jobId,
                        path: file.path,
                        content: file.content,
                        language: getLanguage(file.path),
                        size: file.content.length,
                      },
                    });
                  } catch (e) {
                    console.error('Failed to save file:', file.path, e);
                  }
                }
                
                fileCount = newFiles.length;
              }
            }
          }

          // Final file extraction (in case last file wasn't caught)
          const finalFileRegex = /<file\s+path="([^"]+)">([\s\S]*?)<\/file>/g;
          let finalMatch;
          const allFiles: Array<{ path: string; content: string; language: string }> = [];
          
          while ((finalMatch = finalFileRegex.exec(fullResponse)) !== null) {
            allFiles.push({
              path: finalMatch[1].trim(),
              content: finalMatch[2].trim(),
              language: getLanguage(finalMatch[1].trim()),
            });
          }

          // Save any remaining files
          for (const file of allFiles) {
            try {
              await prisma.generatedFile.upsert({
                where: {
                  generationJobId_path: { generationJobId: jobId, path: file.path },
                },
                update: {
                  content: file.content,
                  language: file.language,
                  size: file.content.length,
                },
                create: {
                  generationJobId: jobId,
                  path: file.path,
                  content: file.content,
                  language: file.language,
                  size: file.content.length,
                },
              });
            } catch (e) {
              // Already saved
            }
          }

          // Update job status
          await prisma.generationJob.update({
            where: { id: jobId },
            data: {
              status: 'COMPLETED',
              generationCompletedAt: new Date(),
              totalModules: allFiles.length,
              completedModules: allFiles.length,
            },
          });

          // Send completion
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
            type: 'complete', 
            jobId,
            fileCount: allFiles.length,
            files: allFiles.map(f => f.path),
          })}\n\n`));
          
          controller.close();
          
        } catch (error) {
          console.error('Stream error:', error);
          
          // Update job as failed
          await prisma.generationJob.update({
            where: { id: jobId },
            data: { status: 'FAILED', errorLog: String(error) },
          });
          
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
            type: 'error', 
            message: error instanceof Error ? error.message : 'Generation failed' 
          })}\n\n`));
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error) {
    console.error('Generation error:', error);
    return new Response(JSON.stringify({ error: 'Generation failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

function getLanguage(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase() || '';
  const map: Record<string, string> = {
    'ts': 'typescript', 'tsx': 'typescript', 'js': 'javascript',
    'jsx': 'javascript', 'json': 'json', 'css': 'css',
    'mjs': 'javascript', 'md': 'markdown',
  };
  return map[ext] || 'plaintext';
}
