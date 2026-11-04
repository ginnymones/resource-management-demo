"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export interface Skill {
  id: string;
  name: string;
}

export interface SearchFormCriteria {
  requiredSkills: { skillId: string; minProficiency: string }[];
  minBandwidth: number;
}

interface SearchFormProps {
  skills: Skill[];
  onSearch: (criteria: SearchFormCriteria) => void;
  isLoading?: boolean;
}

export function SearchForm({ skills, onSearch, isLoading }: SearchFormProps) {
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [minProficiency, setMinProficiency] = useState<string>("Trained");
  const [minBandwidth, setMinBandwidth] = useState<string>("1");
  const [skillsOpen, setSkillsOpen] = useState(false);

  function handleSkillToggle(skillId: string) {
    setSelectedSkills((prev) =>
      prev.includes(skillId)
        ? prev.filter((id) => id !== skillId)
        : [...prev, skillId]
    );
  }

  function removeSkill(skillId: string) {
    setSelectedSkills((prev) => prev.filter((id) => id !== skillId));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSearch({
      requiredSkills: selectedSkills.map((skillId) => ({
        skillId,
        minProficiency,
      })),
      minBandwidth: parseFloat(minBandwidth) || 0,
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Search Criteria</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Skills Multi-Select */}
          <div className="space-y-2">
            <Label htmlFor="skills-select">Required Skills</Label>
            <Popover open={skillsOpen} onOpenChange={setSkillsOpen}>
              <PopoverTrigger asChild>
                <Button
                  id="skills-select"
                  variant="outline"
                  role="combobox"
                  aria-expanded={skillsOpen}
                  className="w-full justify-between font-normal cursor-pointer"
                >
                  {selectedSkills.length > 0
                    ? `${selectedSkills.length} skill(s) selected`
                    : "Select skills..."}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0" align="start">
                <Command>
                  <CommandInput placeholder="Search skills..." />
                  <CommandList>
                    <CommandEmpty>No skills found.</CommandEmpty>
                    <CommandGroup>
                      {skills.map((skill) => (
                        <CommandItem
                          key={skill.id}
                          onSelect={() => handleSkillToggle(skill.id)}
                          className="cursor-pointer"
                        >
                          <Checkbox
                            checked={selectedSkills.includes(skill.id)}
                            className="mr-2"
                          />
                          {skill.name}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            {selectedSkills.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {selectedSkills.map((skillId) => {
                  const skill = skills.find((s) => s.id === skillId);
                  return (
                    <Badge
                      key={skillId}
                      variant="secondary"
                      className="cursor-pointer"
                      onClick={() => removeSkill(skillId)}
                    >
                      {skill?.name ?? skillId}
                      <span className="ml-1 text-xs">×</span>
                    </Badge>
                  );
                })}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Minimum Proficiency */}
            <div className="space-y-2">
              <Label htmlFor="proficiency-select">Min Proficiency</Label>
              <Select value={minProficiency} onValueChange={setMinProficiency}>
                <SelectTrigger id="proficiency-select" className="cursor-pointer">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Expert" className="cursor-pointer">Expert</SelectItem>
                  <SelectItem value="Proficient" className="cursor-pointer">Proficient</SelectItem>
                  <SelectItem value="Trained" className="cursor-pointer">Trained</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Minimum Available Hours */}
            <div className="space-y-2">
              <Label htmlFor="bandwidth-input">Min Available Hours (per day)</Label>
              <Input
                id="bandwidth-input"
                type="number"
                min="0"
                max="7.5"
                step="0.5"
                value={minBandwidth}
                onChange={(e) => setMinBandwidth(e.target.value)}
              />
            </div>
          </div>

          <Button
            type="submit"
            disabled={isLoading || selectedSkills.length === 0}
            className="cursor-pointer"
          >
            <Search className="mr-2 h-4 w-4" />
            {isLoading ? "Searching..." : "Search Associates"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
