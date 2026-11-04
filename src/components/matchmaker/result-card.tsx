"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { User } from "lucide-react";

export interface MatchResult {
  id: string;
  name: string;
  email?: string;
  team: string;
  bandwidth: number;
  matchScore: number;
  skills: { name: string; proficiency: string }[];
  supervisorName?: string;
}

interface ResultCardProps {
  result: MatchResult;
  isSelected: boolean;
  onSelect: (id: string) => void;
}

const proficiencyColors: Record<string, string> = {
  Expert: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  Proficient: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  Trained: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  Not_Trained: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
};

export function ResultCard({ result, isSelected, onSelect }: ResultCardProps) {
  return (
    <Card
      className={`transition-colors cursor-pointer ${
        isSelected ? "ring-2 ring-primary border-primary" : ""
      }`}
      onClick={() => onSelect(result.id)}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <Checkbox
            checked={isSelected}
            onCheckedChange={() => onSelect(result.id)}
            aria-label={`Select ${result.name}`}
            className="mt-1 cursor-pointer"
            onClick={(e) => e.stopPropagation()}
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h3 className="font-semibold text-sm truncate">
                  {result.email ? result.email.replace(/@.*$/, "") : result.name}
                </h3>
                <p className="text-xs text-muted-foreground">{result.team}</p>
                {result.supervisorName && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                    <User className="h-3 w-3" />
                    Reports to: {result.supervisorName}
                  </p>
                )}
              </div>
              <div className="text-right shrink-0">
                <div className="text-xs text-muted-foreground">Match Score</div>
                <div className="font-bold text-sm text-primary">{result.matchScore}%</div>
              </div>
            </div>

            <div className="mt-3 space-y-2">
              {/* Match Score Progress Bar */}
              <Progress value={result.matchScore} className="h-2" />

              {/* Bandwidth */}
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Available Hours</span>
                <span className="font-medium">{result.bandwidth.toFixed(1)} hrs/day</span>
              </div>

              {/* Skills */}
              <div className="flex flex-wrap gap-1">
                {result.skills.map((skill) => (
                  <Badge
                    key={skill.name}
                    variant="outline"
                    className={`text-xs ${proficiencyColors[skill.proficiency] ?? ""}`}
                  >
                    {skill.name} · {skill.proficiency.replace("_", " ")}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function NoResults() {
  return (
    <div className="rounded-lg border border-dashed border-border bg-card p-8 text-center">
      <p className="text-muted-foreground font-medium">No matching associates found</p>
      <p className="text-sm text-muted-foreground mt-1">
        Try relaxing your criteria — reduce the minimum proficiency level, lower the
        available hours requirement, or select fewer skills.
      </p>
    </div>
  );
}
