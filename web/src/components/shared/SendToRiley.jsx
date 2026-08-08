import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Sparkles } from 'lucide-react';

/**
 * A reusable "Send to Riley" button.
 * Props:
 *   context: string — the pre-filled message/context to send
 *   label: string — optional button label
 *   variant: Button variant
 *   size: Button size
 */
export default function SendToRiley({ context, label = 'Send to Riley', variant = 'outline', size = 'sm', className = '' }) {
  const navigate = useNavigate();

  const handleClick = (e) => {
    e.stopPropagation();
    const encoded = encodeURIComponent(context);
    navigate(`/riley?context=${encoded}`);
  };

  return (
    <Button variant={variant} size={size} className={`gap-1.5 ${className}`} onClick={handleClick}>
      <Sparkles className="w-3.5 h-3.5" style={{ color: '#C9A84C' }} />
      {label}
    </Button>
  );
}