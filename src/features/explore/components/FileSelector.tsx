import { ArrowBigLeft, ArrowBigRight } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Command, CommandItem, CommandList } from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export interface FileSelectorItem {
  value: string;
  label: string;
}

interface FileSelectorProps {
  items: FileSelectorItem[];
  selectedIndex: number;
  onChange: (index: number) => void;
  label?: string;
}

export function FileSelector({
  items,
  selectedIndex,
  onChange,
  label = "Select file to view",
}: FileSelectorProps) {
  const [open, setOpen] = useState(false);

  const handlePrevious = () => {
    if (selectedIndex > 0) {
      onChange(selectedIndex - 1);
    }
  };

  const handleNext = () => {
    if (selectedIndex < items.length - 1) {
      onChange(selectedIndex + 1);
    }
  };

  const handleSelect = (index: number) => {
    onChange(index);
    setOpen(false);
  };

  const isFirstItem = selectedIndex === 0;
  const isLastItem = selectedIndex === items.length - 1;

  return (
    <div className="flex gap-1">
      <Button
        type="button"
        variant="outline"
        onClick={handlePrevious}
        disabled={isFirstItem}
        aria-label="Previous item"
      >
        <ArrowBigLeft className="size-4" aria-hidden />
      </Button>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            className="cursor-pointer flex-1"
            aria-label={label}
          >
            {items[selectedIndex]?.label || "Select file"}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start">
          <Command>
            <CommandList>
              {items.map((item, index) => (
                <CommandItem
                  key={item.value}
                  value={item.value}
                  onSelect={() => handleSelect(index)}
                >
                  {item.label}
                </CommandItem>
              ))}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      <Button
        type="button"
        variant="outline"
        onClick={handleNext}
        disabled={isLastItem}
        aria-label="Next item"
      >
        <ArrowBigRight className="size-4" aria-hidden />
      </Button>
    </div>
  );
}
