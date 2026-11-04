"use client";

import { useState } from "react";
import { Check, X, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ApprovalActionsProps {
  requestId: string;
  userRole: string;
  onApprove: (requestId: string) => void;
  onReject: (requestId: string, reason: string) => void;
  onOverride: (requestId: string, justification: string) => void;
  isProcessing?: boolean;
}

export function ApprovalActions({
  requestId,
  userRole,
  onApprove,
  onReject,
  onOverride,
  isProcessing,
}: ApprovalActionsProps) {
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [showOverrideForm, setShowOverrideForm] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [overrideJustification, setOverrideJustification] = useState("");
  const [rejectError, setRejectError] = useState("");
  const [overrideError, setOverrideError] = useState("");

  const canOverride = ["Senior_Leader", "Admin"].includes(userRole);

  function handleReject() {
    if (rejectionReason.trim().length < 20) {
      setRejectError("Rejection reason must be at least 20 characters.");
      return;
    }
    setRejectError("");
    onReject(requestId, rejectionReason.trim());
    setShowRejectForm(false);
    setRejectionReason("");
  }

  function handleOverride() {
    if (overrideJustification.trim().length < 20) {
      setOverrideError("Override justification must be at least 20 characters.");
      return;
    }
    setOverrideError("");
    onOverride(requestId, overrideJustification.trim());
    setShowOverrideForm(false);
    setOverrideJustification("");
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Approval Actions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() => onApprove(requestId)}
            disabled={isProcessing}
            className="cursor-pointer"
            size="sm"
          >
            <Check className="mr-1 h-4 w-4" />
            Approve
          </Button>
          <Button
            variant="destructive"
            onClick={() => setShowRejectForm(!showRejectForm)}
            disabled={isProcessing}
            className="cursor-pointer"
            size="sm"
          >
            <X className="mr-1 h-4 w-4" />
            Reject
          </Button>
          {canOverride && (
            <Button
              variant="outline"
              onClick={() => setShowOverrideForm(!showOverrideForm)}
              disabled={isProcessing}
              className="cursor-pointer"
              size="sm"
            >
              <Shield className="mr-1 h-4 w-4" />
              Override
            </Button>
          )}
        </div>

        {/* Rejection Reason Form */}
        {showRejectForm && (
          <div className="space-y-2 border-t pt-3">
            <Label htmlFor="rejection-reason">Rejection Reason (min 20 characters)</Label>
            <Textarea
              id="rejection-reason"
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Explain why this request is being rejected..."
              rows={3}
            />
            <div className="flex items-center justify-between">
              {rejectError && <p className="text-xs text-destructive">{rejectError}</p>}
              <p className="text-xs text-muted-foreground ml-auto">
                {rejectionReason.length} characters
              </p>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="destructive" onClick={handleReject} className="cursor-pointer">
                Confirm Rejection
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowRejectForm(false)}
                className="cursor-pointer"
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Override Justification Form */}
        {showOverrideForm && (
          <div className="space-y-2 border-t pt-3">
            <Label htmlFor="override-justification">Override Justification (min 20 characters)</Label>
            <Textarea
              id="override-justification"
              value={overrideJustification}
              onChange={(e) => setOverrideJustification(e.target.value)}
              placeholder="Explain why this decision is being overridden..."
              rows={3}
            />
            <div className="flex items-center justify-between">
              {overrideError && <p className="text-xs text-destructive">{overrideError}</p>}
              <p className="text-xs text-muted-foreground ml-auto">
                {overrideJustification.length} characters
              </p>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleOverride} className="cursor-pointer">
                Confirm Override
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowOverrideForm(false)}
                className="cursor-pointer"
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
