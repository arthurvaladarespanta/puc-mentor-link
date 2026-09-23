import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";

interface Props {
  id: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoComplete?: string;
}

export function CampoSenha({ id, value, onChange, placeholder, autoComplete }: Props) {
  const [visivel, setVisivel] = useState(false);
  return (
    <div className="relative">
      <Input
        id={id}
        type={visivel ? "text" : "password"}
        value={value}
        autoComplete={autoComplete}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="pr-12"
      />
      <button
        type="button"
        onClick={() => setVisivel((v) => !v)}
        aria-label={visivel ? "Esconder senha" : "Mostrar senha"}
        className="absolute right-1 top-1 flex h-9 w-9 items-center justify-center rounded-[4px] text-muted-foreground hover:text-primary"
      >
        {visivel ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  );
}
