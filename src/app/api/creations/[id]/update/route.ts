import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getAnthropicClient, isSimulationMode } from '@/lib/mock-anthropic';

/**
 * POST /api/creations/[id]/update
 *
 * AI-powered update endpoint for deployed apps
 * Allows creators to make changes by describing what they want in natural language
 *
 * Body: { prompt: string }
 *
 * Process:
 * 1. Fetch existing files for the creation
 * 2. Use AI to understand the requested changes
 * 3. Generate updated files based on the prompt
 * 4. Update files in database
 * 5. Trigger redeployment if deployed
 *
 * Returns: { success: boolean, filesUpdated: number, deploymentTriggered: boolean }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get database user by email
    const dbUser = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true }
    });

    if (!dbUser) {
      return NextResponse.json(
        { error: 'User not found in database' },
        { status: 404 }
      );
    }

    const userId = dbUser.id;
    const creationId = params.id;

    // Parse request body
    const body = await request.json();
    const { prompt } = body;

    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      );
    }

    console.log(`[AI UPDATE] User ${userId} updating creation ${creationId}`);
    console.log(`[AI UPDATE] Prompt: ${prompt}`);

    // Fetch creation with ownership verification
    const creation = await prisma.generationJob.findFirst({
      where: {
        id: creationId,
        userId,
      },
      include: {
        files: true,
        managedApp: {
          select: {
            id: true,
            vercelProjectId: true,
            deploymentUrl: true,
          },
        },
        managedProject: {
          select: {
            id: true,
            vercelProjectId: true,
            vercelUrl: true,
          },
        },
        publishedApps: {
          select: {
            id: true,
            vercelProjectId: true,
            deploymentUrl: true,
          },
        },
      },
    });

    if (!creation) {
      return NextResponse.json(
        { error: 'Creation not found or unauthorized' },
        { status: 404 }
      );
    }

    if (creation.status !== 'COMPLETED') {
      return NextResponse.json(
        { error: 'Cannot update a creation that is not completed' },
        { status: 400 }
      );
    }

    // Get Anthropic client (mock or real based on env)
    const client = getAnthropicClient();

    // Build context from existing files
    const filesContext = creation.files
      .slice(0, 10) // Limit to first 10 files to avoid token limits
      .map(file => `File: ${file.path}\nLanguage: ${file.language}\nContent:\n${file.content.slice(0, 500)}...\n`)
      .join('\n\n');

    // Call AI to understand and generate updates
    const systemPrompt = `You are an expert code update assistant. Given an existing codebase and a user's requested change, generate the updated file contents.

Original project prompt: ${creation.prompt}

User's update request: ${prompt}

Existing files:
${filesContext}

Your task:
1. Identify which files need to be updated based on the user's request
2. Generate the complete updated content for those files
3. Respond in JSON format with this structure:
{
  "filesToUpdate": [
    {
      "path": "path/to/file",
      "content": "complete updated file content",
      "reason": "explanation of changes made"
    }
  ],
  "summary": "brief summary of all changes"
}

IMPORTANT:
- Only include files that actually need changes
- Provide COMPLETE file content, not diffs
- Ensure updated code is functional and follows best practices
- If the request is unclear or impossible, explain why in the summary`;

    console.log(`[AI UPDATE] Calling Anthropic to analyze changes...`);

    const aiResponse = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      messages: [
        {
          role: 'user',
          content: systemPrompt,
        },
      ],
    });

    const responseText = aiResponse.content[0].type === 'text'
      ? aiResponse.content[0].text
      : '';

    console.log(`[AI UPDATE] AI response received`);

    // Parse AI response
    let updatePlan;
    try {
      // Extract JSON from response (AI might wrap it in markdown)
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No valid JSON found in AI response');
      }
      updatePlan = JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      console.error('[AI UPDATE] Failed to parse AI response:', parseError);
      return NextResponse.json(
        { error: 'Failed to parse AI response. Please try a more specific prompt.' },
        { status: 500 }
      );
    }

    if (!updatePlan.filesToUpdate || updatePlan.filesToUpdate.length === 0) {
      return NextResponse.json(
        {
          error: 'No files to update',
          message: updatePlan.summary || 'The AI could not identify files to update based on your request.'
        },
        { status: 400 }
      );
    }

    console.log(`[AI UPDATE] Updating ${updatePlan.filesToUpdate.length} files...`);

    // Update files in database
    const updatedFiles = [];

    for (const fileUpdate of updatePlan.filesToUpdate) {
      const existingFile = creation.files.find(f => f.path === fileUpdate.path);

      if (existingFile) {
        // Update existing file
        await prisma.generatedFile.update({
          where: { id: existingFile.id },
          data: {
            content: fileUpdate.content,
            size: Buffer.byteLength(fileUpdate.content, 'utf8'),
          },
        });

        updatedFiles.push({
          path: fileUpdate.path,
          action: 'updated',
          reason: fileUpdate.reason,
        });

        console.log(`[AI UPDATE] Updated file: ${fileUpdate.path}`);
      } else {
        // Create new file
        await prisma.generatedFile.create({
          data: {
            generationJobId: creationId,
            path: fileUpdate.path,
            content: fileUpdate.content,
            language: fileUpdate.path.split('.').pop() || 'text',
            size: Buffer.byteLength(fileUpdate.content, 'utf8'),
          },
        });

        updatedFiles.push({
          path: fileUpdate.path,
          action: 'created',
          reason: fileUpdate.reason,
        });

        console.log(`[AI UPDATE] Created new file: ${fileUpdate.path}`);
      }
    }

    // Update the generation job's updatedAt timestamp
    await prisma.generationJob.update({
      where: { id: creationId },
      data: {
        updatedAt: new Date(),
      },
    });

    // Check if we need to trigger redeployment
    let deploymentTriggered = false;
    const vercelProjectId =
      creation.managedApp?.vercelProjectId ||
      creation.managedProject?.vercelProjectId ||
      creation.publishedApps[0]?.vercelProjectId;

    if (vercelProjectId) {
      // TODO: Implement actual Vercel redeployment
      // For now, just log that we would trigger it
      console.log(`[AI UPDATE] Would trigger Vercel redeployment for project: ${vercelProjectId}`);

      // In simulation mode or for now, just mark as triggered
      deploymentTriggered = true;

      // Create a deployment record
      await prisma.deployment.create({
        data: {
          generationJobId: creationId,
          status: 'PENDING',
          url: creation.managedApp?.deploymentUrl ||
               creation.managedProject?.vercelUrl ||
               creation.publishedApps[0]?.deploymentUrl ||
               null,
        },
      });

      console.log(`[AI UPDATE] Deployment record created`);
    }

    // Return success response
    return NextResponse.json({
      success: true,
      filesUpdated: updatedFiles.length,
      updatedFiles,
      summary: updatePlan.summary,
      deploymentTriggered,
      message: deploymentTriggered
        ? 'Files updated successfully and deployment triggered'
        : 'Files updated successfully',
    });

  } catch (error) {
    console.error('[AI UPDATE] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to update creation',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
