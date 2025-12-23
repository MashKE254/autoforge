/**
 * Quick Publish Card
 *
 * Shows on generation completion - allows immediate publishing
 * without needing to open preview first
 */

'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Rocket, Zap, Check } from 'lucide-react';
import PublishToManagedModal from './PublishToManagedModal';

interface QuickPublishCardProps {
  generationJobId: string;
  projectName: string;
}

export default function QuickPublishCard({
  generationJobId,
  projectName,
}: QuickPublishCardProps) {
  const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);

  return (
    <>
      <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-purple-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-900">
            <Rocket className="w-5 h-5" />
            Ready to Go Live?
          </CardTitle>
          <CardDescription>
            Deploy your app to production in 30 seconds - no configuration needed!
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2 text-sm">
            <div className="flex items-center gap-2 text-gray-700">
              <Check className="w-4 h-4 text-green-600" />
              <span>Multi-tenant database (isolated schema)</span>
            </div>
            <div className="flex items-center gap-2 text-gray-700">
              <Check className="w-4 h-4 text-green-600" />
              <span>AI API proxy (no API keys needed)</span>
            </div>
            <div className="flex items-center gap-2 text-gray-700">
              <Check className="w-4 h-4 text-green-600" />
              <span>Custom subdomain (*.autoforge.app)</span>
            </div>
            <div className="flex items-center gap-2 text-gray-700">
              <Check className="w-4 h-4 text-green-600" />
              <span>Automatic SSL & deployment</span>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              onClick={() => setIsPublishModalOpen(true)}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Rocket className="w-4 h-4 mr-2" />
              Publish to AutoForge
            </Button>
          </div>

          <div className="flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <Zap className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-yellow-800">
              <strong>No setup required!</strong> Your app will be live with a working database and AI features in under a minute.
            </p>
          </div>
        </CardContent>
      </Card>

      <PublishToManagedModal
        isOpen={isPublishModalOpen}
        onClose={() => setIsPublishModalOpen(false)}
        generationJobId={generationJobId}
        projectName={projectName}
      />
    </>
  );
}
