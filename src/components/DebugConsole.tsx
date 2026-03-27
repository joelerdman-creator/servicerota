"use client";

import { useState, useEffect } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

export function DebugConsole() {
  const [logs, setLogs] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(true);

  useEffect(() => {
    const originalLog = console.log;
    const originalError = console.error;

    console.log = (...args) => {
      const message = args
        .map((arg) => (typeof arg === "object" ? JSON.stringify(arg) : String(arg)))
        .join(" ");
      setLogs((prev) => [`[LOG] ${message}`, ...prev].slice(0, 50));
      originalLog.apply(console, args);
    };

    console.error = (...args) => {
      const message = args
        .map((arg) => (typeof arg === "object" ? JSON.stringify(arg) : String(arg)))
        .join(" ");
      setLogs((prev) => [`[ERR] ${message}`, ...prev].slice(0, 50));
      originalError.apply(console, args);
    };

    return () => {
      console.log = originalLog;
      console.error = originalError;
    };
  }, []);

  const handleCopy = () => {
    const allLogs = logs.join("\n");
    navigator.clipboard
      .writeText(allLogs)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      })
      .catch((err) => {
        console.error("Failed to copy logs:", err);
      });
  };

  if (process.env.NODE_ENV === "production") return null;

  // Hiding the debug console from the screen while keeping logic active
  return <div className="hidden" />;

  /*
  return (
    <div className={cn(
        "fixed bottom-0 left-0 right-0 bg-black/95 text-green-400 font-mono text-xs z-50 border-t border-green-500 pointer-events-auto flex flex-col transition-all duration-300 ease-in-out",
        isCollapsed ? "h-8" : "h-48"
    )}>
      <div className="flex items-center justify-between px-2 py-1 border-b border-green-500 bg-black flex-shrink-0">
        <span className="font-bold">Debug Console</span>
        <div className="flex items-center gap-4">
            {!isCollapsed && (
                 <button 
                    onClick={handleCopy}
                    className="bg-green-700 hover:bg-green-600 text-white px-3 py-1 rounded text-xs transition-colors"
                    >
                    {copied ? 'Copied!' : 'Copy Logs'}
                </button>
            )}
            <button onClick={() => setIsCollapsed(!isCollapsed)} className="text-green-400 hover:text-green-300">
                {isCollapsed ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
            </button>
        </div>
      </div>
      {!isCollapsed && (
        <div className="flex-1 overflow-y-auto p-2">
            {logs.map((log, i) => (
            <div key={i} className="whitespace-pre-wrap mb-1 border-b border-white/10 pb-1">
                {log}
            </div>
            ))}
        </div>
      )}
    </div>
  );
  */
}

export default DebugConsole;
