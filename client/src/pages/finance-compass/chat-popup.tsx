/**
 * Astral Chat Popup Page
 * 
 * Standalone page for the chatbot when popped out to a new window.
 */

import { useEffect, useState } from "react";
import { ChatbotWidget } from "@/components/finance-compass/ChatbotWidget";
import { SEOHead } from "@/components/seo-head";

export default function ChatPopupPage() {
  const [assessmentId, setAssessmentId] = useState<string | undefined>();

  useEffect(() => {
    // Parse assessment ID from URL
    const params = new URLSearchParams(window.location.search);
    const id = params.get('assessmentId');
    if (id) {
      setAssessmentId(id);
    }
  }, []);

  return (
    <>
      <SEOHead
        title="Astral AI Assistant | Constancia"
        description="Astral is the Constancia AI assistant for FinanceCompass."
        noindex={true}
        canonicalUrl="https://constancia.io/finance-compass/chat-popup"
      />
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-lg">
          <ChatbotWidgetPopup assessmentId={assessmentId} />
        </div>
      </div>
    </>
  );
}

/**
 * Standalone chatbot for popup window - always visible, no toggle
 */
function ChatbotWidgetPopup({ assessmentId }: { assessmentId?: string }) {
  const [messages, setMessages] = useState<any[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [processingStage, setProcessingStage] = useState<any>(null);
  const [responseMode, setResponseMode] = useState<'detailed' | 'quick'>('detailed');

  // Initialize session on mount
  useEffect(() => {
    initSession();
  }, [assessmentId]);

  const initSession = async () => {
    try {
      const sessionToken = `popup-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const response = await fetch("/api/finance-compass/public/chatbot/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionToken,
          assessmentId,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setSessionId(data.data.sessionId);
      }
    } catch (error) {
      console.error("[ChatPopup] Failed to init session:", error);
    }
  };

  const sendMessage = async () => {
    if (!inputValue.trim() || !sessionId || isLoading) return;

    const userMessage = {
      id: `msg-${Date.now()}`,
      role: "user",
      content: inputValue.trim(),
      createdAt: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue("");
    setIsLoading(true);
    setProcessingStage({ stage: "researching", message: "Starting...", progress: 0 });

    try {
      const response = await fetch(
        `/api/finance-compass/public/chatbot/sessions/${sessionId}/messages/stream`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            message: userMessage.content,
            responseMode 
          }),
        }
      );

      if (!response.ok) throw new Error("Failed to send message");

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) throw new Error("No response body");

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = decoder.decode(value);
        const lines = text.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") continue;

            try {
              const parsed = JSON.parse(data);

              if (parsed.type === "progress") {
                setProcessingStage({
                  stage: parsed.data.stage,
                  message: parsed.data.message,
                  progress: parsed.data.progress,
                });
              } else if (parsed.type === "response") {
                const assistantMessage = {
                  id: `msg-${Date.now()}`,
                  role: "assistant",
                  content: parsed.data.message,
                  sources: parsed.data.sources,
                  createdAt: new Date(),
                };
                setMessages(prev => [...prev, assistantMessage]);
              }
            } catch (e) {
              // Ignore parse errors
            }
          }
        }
      }
    } catch (error) {
      console.error("[ChatPopup] Error:", error);
      setMessages(prev => [...prev, {
        id: `msg-${Date.now()}`,
        role: "assistant",
        content: "I apologise, but I encountered an issue. Please try again.",
        createdAt: new Date(),
      }]);
    } finally {
      setIsLoading(false);
      setProcessingStage(null);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-32px)] bg-background border-2 border-[#8E4F67]/20 rounded-2xl shadow-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-gradient-to-r from-[#12161D] to-[#8E4F67]">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-white/10 flex items-center justify-center">
            <span className="text-brand-cyan text-lg">✨</span>
          </div>
          <div>
            <h3 className="font-semibold text-white text-sm">Astral</h3>
            <p className="text-xs text-white/60">Powered by Constancia</p>
          </div>
        </div>
        <button
          onClick={() => setResponseMode(responseMode === 'detailed' ? 'quick' : 'detailed')}
          className={`text-xs px-3 py-1 rounded-full transition-all ${
            responseMode === 'detailed' 
              ? "bg-[#7FB8A3]/30 text-brand-cyan"
              : "bg-white/10 text-white/70"
          }`}
        >
          {responseMode === 'detailed' ? '🔍 Detailed' : '⚡ Quick'}
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center py-8">
            <h4 className="font-medium text-foreground mb-2">Welcome to Astral</h4>
            <p className="text-sm text-muted-foreground">
              Ask me about EPM, your assessment results, or implementation guidance.
            </p>
          </div>
        )}
        
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[90%] sm:max-w-[85%] rounded-2xl px-3 sm:px-4 py-3 overflow-hidden ${
                message.role === "user"
                  ? "bg-[#8E4F67]/10 dark:bg-[#8E4F67]/15 text-foreground border border-[#8E4F67]/20 rounded-br-md"
                  : "bg-muted rounded-bl-md"
              }`}
            >
              <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
            </div>
          </div>
        ))}

        {processingStage && (
          <div className="p-4 bg-[#7FB8A3]/5 rounded-xl border border-[#8E4F67]/20">
            <p className="text-sm text-muted-foreground">{processingStage.message}</p>
            <div className="mt-2 h-1 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-[#8E4F67] to-[#7FB8A3] transition-all"
                style={{ width: `${processingStage.progress}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-4 border-t">
        <div className="flex gap-2">
          <input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
            placeholder="Ask about EPM, vendors, or your assessment..."
            className="flex-1 px-4 py-2 rounded-xl border border-[#8E4F67]/20 focus:border-[#7FB8A3] focus:outline-none text-sm"
            disabled={isLoading || !sessionId}
          />
          <button
            onClick={sendMessage}
            disabled={!inputValue.trim() || isLoading || !sessionId}
            className="h-10 w-10 rounded-xl bg-gradient-to-br from-[#12161D] to-[#8E4F67] text-white flex items-center justify-center disabled:opacity-50"
          >
            {isLoading ? "..." : "→"}
          </button>
        </div>
      </div>
    </div>
  );
}
