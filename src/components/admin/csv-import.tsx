"use client";

import { useState, useRef } from "react";
import { Upload, Download, FileText, AlertCircle, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

interface CSVImportProps {
  onImport: (csvContent: string) => Promise<{ imported: number; errors: { row: number; message: string }[]; total: number }>;
  onExport: (teamId?: string) => void;
  teams: { id: string; name: string }[];
}

export function CSVImport({ onImport, onExport, teams }: CSVImportProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<{
    imported: number;
    errors: { row: number; message: string }[];
    total: number;
  } | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [exportTeamId, setExportTeamId] = useState<string>("all");
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    if (!file.name.endsWith(".csv")) {
      setImportError("Please upload a CSV file.");
      return;
    }

    setIsImporting(true);
    setImportResult(null);
    setImportError(null);
    setProgress(30);

    try {
      const content = await file.text();
      setProgress(60);
      const result = await onImport(content);
      setProgress(100);
      setImportResult(result);
    } catch (err) {
      setImportError(err instanceof Error ? err.message : "Import failed.");
    } finally {
      setIsImporting(false);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }

  function handleExport() {
    onExport(exportTeamId === "all" ? undefined : exportTeamId);
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Import Section */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Upload className="h-4 w-4" />
            Import Data
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Drop Zone */}
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
              isDragging
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/50"
            }`}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <FileText className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm font-medium">
              {isDragging ? "Drop CSV file here" : "Drag & drop a CSV file, or click to browse"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Required headers: Associate name, team, Skills, Proficiency_Levels
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={handleFileInput}
            />
          </div>

          {/* Progress */}
          {isImporting && (
            <div className="space-y-2">
              <Progress value={progress} className="h-2" />
              <p className="text-xs text-muted-foreground text-center">Importing...</p>
            </div>
          )}

          {/* Import Error */}
          {importError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{importError}</AlertDescription>
            </Alert>
          )}

          {/* Import Result */}
          {importResult && (
            <div className="space-y-2">
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  Imported {importResult.imported} of {importResult.total} records.
                  {importResult.errors.length > 0 && (
                    <span className="text-destructive">
                      {" "}{importResult.errors.length} error(s).
                    </span>
                  )}
                </AlertDescription>
              </Alert>

              {importResult.errors.length > 0 && (
                <div className="max-h-40 overflow-y-auto rounded border p-2 text-xs space-y-1">
                  {importResult.errors.map((err, i) => (
                    <p key={i} className="text-destructive">
                      Row {err.row}: {err.message}
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Export Section */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Download className="h-4 w-4" />
            Export Data
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Filter by Team (optional)</Label>
            <Select value={exportTeamId} onValueChange={setExportTeamId}>
              <SelectTrigger className="cursor-pointer">
                <SelectValue placeholder="All Teams" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="cursor-pointer">All Teams</SelectItem>
                {teams.map((team) => (
                  <SelectItem key={team.id} value={team.id} className="cursor-pointer">
                    {team.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleExport} className="cursor-pointer w-full">
            <Download className="mr-2 h-4 w-4" />
            Download CSV
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
