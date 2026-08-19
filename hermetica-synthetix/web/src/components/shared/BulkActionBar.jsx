import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

export default function BulkActionBar({ selectedCount, onClear, actions }) {
  return (
    <AnimatePresence>
      {selectedCount > 0 && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 max-w-[95vw]"
        >
          <div className="glass-card rounded-xl px-4 py-3 flex items-center gap-2 shadow-2xl">
            <span className="text-sm font-medium text-foreground whitespace-nowrap">
              {selectedCount} selected
            </span>
            <div className="h-6 w-px bg-border mx-1" />
            {actions.map((action, i) => (
              <Button
                key={i}
                variant={action.variant || "secondary"}
                size="sm"
                onClick={action.onClick}
                className="gap-1.5"
              >
                {action.icon && <action.icon className="w-3.5 h-3.5" />}
                {action.label}
              </Button>
            ))}
            <Button variant="ghost" size="sm" onClick={onClear} className="ml-1">
              <X className="w-3.5 h-3.5" />
            </Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}