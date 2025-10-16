import { useId } from "react";
import { Select } from "@/components/ui/select";

export interface FileSelectorItem {
  value: string;
  label: string;
}

interface FileSelectorProps {
  items: FileSelectorItem[];
  value: string;
  onChange: (value: string) => void;
  label?: string;
}

export function FileSelector({
  items,
  value,
  onChange,
  label = "Select file to view",
}: FileSelectorProps) {
  const selectId = useId();

  return (
    <div>
      <label htmlFor={selectId} className="sr-only">
        {label}
      </label>
      <Select
        id={selectId}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {items.map((item) => (
          <option key={item.value} value={item.value}>
            {item.label}
          </option>
        ))}
      </Select>
    </div>
  );
}
