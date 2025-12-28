import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import puppeteer from 'puppeteer';

/**
 * POST /api/screenshots/generate
 *
 * Generate a screenshot for a creation
 *
 * Body: { creationId: string }
 *
 * Process:
 * 1. Fetch creation and verify ownership
 * 2. Launch headless browser
 * 3. Render preview or deployment URL
 * 4. Capture screenshot
 * 5. Convert to base64 data URL (or upload to cloud storage)
 * 6. Update database with screenshot URL
 *
 * Returns: { success: boolean, thumbnailUrl: string }
 */
export async function POST(request: NextRequest) {
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
    const body = await request.json();
    const { creationId } = body;

    if (!creationId) {
      return NextResponse.json(
        { error: 'Creation ID is required' },
        { status: 400 }
      );
    }

    console.log(`[SCREENSHOT] Generating screenshot for creation ${creationId}`);

    // Fetch creation with ownership verification
    const creation = await prisma.generationJob.findFirst({
      where: {
        id: creationId,
        userId,
      },
      include: {
        files: {
          select: {
            path: true,
            content: true,
          },
        },
        managedApp: {
          select: {
            deploymentUrl: true,
          },
        },
        managedProject: {
          select: {
            vercelUrl: true,
          },
        },
        publishedApps: {
          select: {
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

    // Determine URL to screenshot
    let targetUrl = null;

    if (creation.managedApp?.deploymentUrl) {
      targetUrl = creation.managedApp.deploymentUrl;
    } else if (creation.managedProject?.vercelUrl) {
      targetUrl = creation.managedProject.vercelUrl;
    } else if (creation.publishedApps[0]?.deploymentUrl) {
      targetUrl = creation.publishedApps[0].deploymentUrl;
    }

    // If no deployment URL, generate a preview from files
    if (!targetUrl) {
      console.log(`[SCREENSHOT] No deployment URL found, generating preview from files`);
      return await generateStaticPreview(creation, creationId);
    }

    console.log(`[SCREENSHOT] Capturing screenshot of ${targetUrl}`);

    // Launch headless browser
    const browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
      ],
    });

    try {
      const page = await browser.newPage();

      // Set viewport for consistent screenshots
      await page.setViewport({
        width: 1280,
        height: 720,
        deviceScaleFactor: 2, // For retina displays
      });

      // Navigate to the URL
      await page.goto(targetUrl, {
        waitUntil: 'networkidle0',
        timeout: 30000,
      });

      // Wait a bit for any animations to complete
      await page.waitForTimeout(1000);

      // Capture screenshot
      const screenshot = await page.screenshot({
        type: 'png',
        fullPage: false, // Just capture the viewport
      });

      await browser.close();

      // Convert to base64 data URL
      const base64Screenshot = screenshot.toString('base64');
      const dataUrl = `data:image/png;base64,${base64Screenshot}`;

      // Update database with screenshot URL
      await prisma.generationJob.update({
        where: { id: creationId },
        data: {
          thumbnailUrl: dataUrl,
        },
      });

      console.log(`[SCREENSHOT] Successfully generated screenshot for ${creationId}`);

      return NextResponse.json({
        success: true,
        thumbnailUrl: dataUrl,
      });

    } catch (error) {
      await browser.close();
      throw error;
    }

  } catch (error) {
    console.error('[SCREENSHOT] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to generate screenshot',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * Generate a static preview when no deployment URL is available
 * Creates a simple HTML preview of the code and captures it
 */
async function generateStaticPreview(
  creation: any,
  creationId: string
): Promise<NextResponse> {
  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
    ],
  });

  try {
    const page = await browser.newPage();

    await page.setViewport({
      width: 1280,
      height: 720,
      deviceScaleFactor: 2,
    });

    // Generate HTML preview based on prompt and files
    const htmlContent = generatePreviewHTML(creation);

    // Set content
    await page.setContent(htmlContent, {
      waitUntil: 'networkidle0',
    });

    await page.waitForTimeout(500);

    // Capture screenshot
    const screenshot = await page.screenshot({
      type: 'png',
      fullPage: false,
    });

    await browser.close();

    // Convert to base64 data URL
    const base64Screenshot = screenshot.toString('base64');
    const dataUrl = `data:image/png;base64,${base64Screenshot}`;

    // Update database
    await prisma.generationJob.update({
      where: { id: creationId },
      data: {
        thumbnailUrl: dataUrl,
      },
    });

    console.log(`[SCREENSHOT] Generated static preview for ${creationId}`);

    return NextResponse.json({
      success: true,
      thumbnailUrl: dataUrl,
    });

  } catch (error) {
    await browser.close();
    throw error;
  }
}

/**
 * Generate HTML preview from creation files and prompt
 */
function generatePreviewHTML(creation: any): string {
  const prompt = creation.prompt.toLowerCase();

  // Detect app type from prompt
  let gradient = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
  let icon = '🚀';
  let title = 'Application Preview';

  if (prompt.includes('discord') || prompt.includes('bot')) {
    gradient = 'linear-gradient(135deg, #5865f2 0%, #7289da 100%)';
    icon = '🤖';
    title = 'Discord Bot';
  } else if (prompt.includes('trading') || prompt.includes('crypto')) {
    gradient = 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
    icon = '📈';
    title = 'Trading System';
  } else if (prompt.includes('scraper') || prompt.includes('crawler')) {
    gradient = 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)';
    icon = '🕷️';
    title = 'Web Scraper';
  } else if (prompt.includes('dashboard') || prompt.includes('analytics')) {
    gradient = 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)';
    icon = '📊';
    title = 'Dashboard';
  } else if (prompt.includes('api') || prompt.includes('backend')) {
    gradient = 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)';
    icon = '⚡';
    title = 'API Service';
  } else if (prompt.includes('ecommerce') || prompt.includes('shop')) {
    gradient = 'linear-gradient(135deg, #ec4899 0%, #db2777 100%)';
    icon = '🛍️';
    title = 'E-commerce';
  }

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background: #0a0a0b;
      color: white;
      overflow: hidden;
    }

    .container {
      width: 100vw;
      height: 100vh;
      background: ${gradient};
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
      overflow: hidden;
    }

    .content {
      text-align: center;
      z-index: 10;
      padding: 40px;
    }

    .icon {
      font-size: 120px;
      margin-bottom: 30px;
      animation: float 3s ease-in-out infinite;
    }

    .title {
      font-size: 48px;
      font-weight: 700;
      margin-bottom: 20px;
      text-shadow: 0 4px 20px rgba(0,0,0,0.3);
    }

    .subtitle {
      font-size: 20px;
      opacity: 0.9;
      max-width: 600px;
      line-height: 1.6;
    }

    .grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 20px;
      margin-top: 50px;
    }

    .card {
      background: rgba(255, 255, 255, 0.1);
      backdrop-filter: blur(10px);
      padding: 30px;
      border-radius: 16px;
      border: 1px solid rgba(255, 255, 255, 0.2);
    }

    .card-title {
      font-size: 18px;
      font-weight: 600;
      margin-bottom: 10px;
    }

    .card-value {
      font-size: 32px;
      font-weight: 700;
    }

    .background-decoration {
      position: absolute;
      width: 500px;
      height: 500px;
      background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%);
      border-radius: 50%;
      animation: pulse 4s ease-in-out infinite;
    }

    .decoration-1 {
      top: -250px;
      left: -250px;
    }

    .decoration-2 {
      bottom: -250px;
      right: -250px;
      animation-delay: 2s;
    }

    @keyframes float {
      0%, 100% {
        transform: translateY(0px);
      }
      50% {
        transform: translateY(-20px);
      }
    }

    @keyframes pulse {
      0%, 100% {
        transform: scale(1);
        opacity: 0.3;
      }
      50% {
        transform: scale(1.1);
        opacity: 0.5;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="background-decoration decoration-1"></div>
    <div class="background-decoration decoration-2"></div>

    <div class="content">
      <div class="icon">${icon}</div>
      <h1 class="title">${title}</h1>
      <p class="subtitle">${creation.prompt.slice(0, 120)}${creation.prompt.length > 120 ? '...' : ''}</p>

      <div class="grid">
        <div class="card">
          <div class="card-title">Files</div>
          <div class="card-value">${creation.files.length}</div>
        </div>
        <div class="card">
          <div class="card-title">Status</div>
          <div class="card-value">✓</div>
        </div>
        <div class="card">
          <div class="card-title">Ready</div>
          <div class="card-value">100%</div>
        </div>
      </div>
    </div>
  </div>
</body>
</html>
  `;
}
