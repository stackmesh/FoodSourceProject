"use client";

import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function SourceMenu({
  label,
  sources,
}: {
  label: string;
  sources: { id: string; url: string; title: string | null }[];
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="outline" size="sm" disabled={sources.length === 0}>
          {label}
          <ChevronDown />
        </Button>
      </DropdownMenuTrigger>
      {sources.length ? (
        <DropdownMenuContent align="end" className="max-w-sm">
          {sources.map((source) => (
            <DropdownMenuItem key={source.id} asChild>
              <a href={source.url} target="_blank" rel="noreferrer">
                {source.title ?? source.url}
              </a>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      ) : null}
    </DropdownMenu>
  );
}
