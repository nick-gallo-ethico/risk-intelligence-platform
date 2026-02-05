'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { Eye, GitCompare, FileText } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { RichTextDisplay } from '@/components/rich-text/rich-text-display';
import { PolicyVersionDiff } from './policy-version-diff';
import type { PolicyVersion } from '@/types/policy';

interface PolicyVersionHistoryProps {
  policyId: string;
  versions?: PolicyVersion[];
}

/**
 * Policy version history component.
 *
 * Displays a timeline of all published versions with:
 * - Version number/label
 * - Published date and by whom
 * - Change notes (if any)
 * - View button to see full content
 * - Compare button to show diff with previous version
 */
export function PolicyVersionHistory({
  policyId,
  versions,
}: PolicyVersionHistoryProps) {
  const [diffMode, setDiffMode] = useState<'inline' | 'side-by-side'>('inline');
  const [selectedVersion, setSelectedVersion] = useState<PolicyVersion | null>(null);
  const [compareVersions, setCompareVersions] = useState<[string, string] | null>(null);

  // Handle viewing a single version
  const handleView = (version: PolicyVersion) => {
    setSelectedVersion(version);
    setCompareVersions(null);
  };

  // Handle comparing with previous version
  const handleCompare = (currentVersionId: string, previousVersionId: string) => {
    setCompareVersions([previousVersionId, currentVersionId]);
    setSelectedVersion(null);
  };

  // Close dialogs
  const handleClose = () => {
    setSelectedVersion(null);
    setCompareVersions(null);
  };

  // Get version content by ID
  const getVersionContent = (versionId: string): string => {
    return versions?.find((v) => v.id === versionId)?.content || '';
  };

  if (!versions?.length) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <FileText className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium">No Versions Published Yet</h3>
        <p className="text-muted-foreground mt-1">
          Publish this policy to create the first version.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Diff mode toggle */}
      <div className="flex justify-end">
        <ToggleGroup
          type="single"
          value={diffMode}
          onValueChange={(value) => {
            if (value) setDiffMode(value as 'inline' | 'side-by-side');
          }}
        >
          <ToggleGroupItem value="inline" aria-label="Inline diff view">
            Inline
          </ToggleGroupItem>
          <ToggleGroupItem value="side-by-side" aria-label="Side by side diff view">
            Side by Side
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      {/* Version Timeline */}
      <div className="space-y-4">
        {versions.map((version, index) => {
          const previousVersion = versions[index + 1];

          return (
            <div
              key={version.id}
              className="relative flex items-start gap-4 pl-6 before:absolute before:left-0 before:top-0 before:bottom-0 before:w-0.5 before:bg-border"
            >
              {/* Timeline dot */}
              <div className="absolute left-0 top-2 -translate-x-1/2 h-3 w-3 rounded-full border-2 border-primary bg-background" />

              {/* Version Content */}
              <div className="flex-1 pb-6">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant={version.isLatest ? 'default' : 'outline'}>
                    v{version.version}
                  </Badge>
                  {version.versionLabel && (
                    <span className="text-sm font-medium">{version.versionLabel}</span>
                  )}
                  {version.isLatest && (
                    <Badge variant="secondary" className="text-xs">
                      Latest
                    </Badge>
                  )}
                </div>

                <p className="text-sm text-muted-foreground">
                  Published {format(new Date(version.publishedAt), 'MMM d, yyyy h:mm a')}
                  {version.publishedBy && (
                    <>
                      {' '}
                      by {version.publishedBy.firstName} {version.publishedBy.lastName}
                    </>
                  )}
                </p>

                {version.changeNotes && (
                  <p className="text-sm mt-2 text-foreground">{version.changeNotes}</p>
                )}

                {version.summary && (
                  <p className="text-sm mt-1 text-muted-foreground italic">
                    {version.summary}
                  </p>
                )}

                <div className="flex gap-2 mt-3">
                  <Button variant="outline" size="sm" onClick={() => handleView(version)}>
                    <Eye className="h-4 w-4 mr-1" />
                    View
                  </Button>
                  {previousVersion && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCompare(version.id, previousVersion.id)}
                    >
                      <GitCompare className="h-4 w-4 mr-1" />
                      Compare
                    </Button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* View Version Dialog */}
      <Dialog open={!!selectedVersion} onOpenChange={() => handleClose()}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Version {selectedVersion?.version}
              {selectedVersion?.versionLabel && ` - ${selectedVersion.versionLabel}`}
            </DialogTitle>
          </DialogHeader>
          <div className="mt-4">
            <RichTextDisplay content={selectedVersion?.content} />
          </div>
        </DialogContent>
      </Dialog>

      {/* Compare Versions Dialog */}
      <Dialog open={!!compareVersions} onOpenChange={() => handleClose()}>
        <DialogContent className="max-w-5xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Compare Versions
            </DialogTitle>
          </DialogHeader>
          {compareVersions && (
            <div className="mt-4">
              <PolicyVersionDiff
                oldContent={getVersionContent(compareVersions[0])}
                newContent={getVersionContent(compareVersions[1])}
                mode={diffMode}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
