import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  HelpCircle, 
  User, 
  Building2, 
  MessageSquare, 
  Hash, 
  Type,
  CheckCircle2,
  AlertCircle,
  Sliders,
  Sparkles
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { InteractiveSlider } from "./InteractiveSlider";

export interface QuestionOption {
  value: string;
  label: string;
  description?: string;
}

export interface StructuredField {
  id: string;
  label: string;
  type: string;
  placeholder?: string;
  validation?: string;
}

export interface SliderConfig {
  min: number;
  max: number;
  labels: Record<number, string>;
}

export interface Question {
  id: string;
  questionKey?: string;
  questionType: string;
  questionText: string;
  helpText?: string;
  required: boolean;
  options?: QuestionOption[];
  sliderConfig?: SliderConfig;
  structuredFields?: StructuredField[];
  scoringConfig?: { maxSelections?: number; allowOther?: boolean };
  dimension?: string;
  order: number;
}

interface AssessmentQuestionProps {
  question: Question;
  value: any;
  onChange: (value: any) => void;
  isAnimating?: boolean;
  isGenerated?: boolean;
}

const questionIcons: Record<string, typeof User> = {
  text: Type,
  long_text: MessageSquare,
  number: Hash,
  scale: Sliders,
  slider: Sliders,
  single_select: CheckCircle2,
  multi_select: CheckCircle2,
  structured: Building2,
};

export function AssessmentQuestion({ question, value, onChange, isAnimating, isGenerated }: AssessmentQuestionProps) {
  if (!question) return null;

  const Icon = questionIcons[question.questionType] || Type;

  return (
    <div className="space-y-4 sm:space-y-6">
      {isGenerated && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gradient-to-r from-purple-500/10 to-[#7FB8A3]/10 border border-purple-500/20"
          data-testid="badge-ai-generated"
        >
          <Sparkles className="h-4 w-4 text-purple-500 flex-shrink-0" />
          <span className="text-xs sm:text-sm font-medium text-purple-600 dark:text-purple-400">
            AI-enhanced follow-up question
          </span>
        </motion.div>
      )}
      <div className="flex items-start gap-2 sm:gap-3">
        <div className={cn(
          "p-1.5 sm:p-2 rounded-lg flex-shrink-0",
          isGenerated 
            ? "bg-gradient-to-r from-purple-500/10 to-[#7FB8A3]/10 text-purple-500" 
            : "bg-[#7FB8A3]/10 text-[#7FB8A3]"
        )}>
          <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
        </div>
        <div className="flex-1 space-y-1.5 sm:space-y-2 min-w-0">
          <h2 className="text-lg sm:text-xl font-semibold text-foreground leading-snug sm:leading-tight">
            {question.questionText}
            {question.required && <span className="text-[#7FB8A3] ml-1">*</span>}
          </h2>
          {question.helpText && (
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">{question.helpText}</p>
          )}
        </div>
        {question.helpText && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button className="text-muted-foreground hover:text-foreground transition-colors p-1 -m-1 min-h-[44px] min-w-[44px] flex items-center justify-center flex-shrink-0">
                <HelpCircle className="h-5 w-5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="left" className="max-w-xs">
              <p>{question.helpText}</p>
            </TooltipContent>
          </Tooltip>
        )}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
      >
        <QuestionInput 
          question={question} 
          value={value} 
          onChange={onChange}
        />
      </motion.div>
    </div>
  );
}

interface QuestionInputProps {
  question: Question;
  value: any;
  onChange: (value: any) => void;
}

function QuestionInput({ question, value, onChange }: QuestionInputProps) {
  switch (question.questionType) {
    case "text":
      return <TextInput value={value} onChange={onChange} questionId={question.id} />;
    case "long_text":
      return <LongTextInput value={value} onChange={onChange} questionId={question.id} />;
    case "number":
      return <NumberInput value={value} onChange={onChange} questionId={question.id} />;
    case "scale":
    case "slider":
      return <SliderInput value={value} onChange={onChange} question={question} />;
    case "single_select":
      return <SingleSelectInput value={value} onChange={onChange} question={question} />;
    case "multi_select":
      return <MultiSelectInput value={value} onChange={onChange} question={question} />;
    case "structured":
      return <StructuredInput value={value} onChange={onChange} question={question} />;
    default:
      return <TextInput value={value} onChange={onChange} questionId={question.id} />;
  }
}

function TextInput({ value, onChange, questionId }: { value: any; onChange: (v: any) => void; questionId: string }) {
  return (
    <div className="relative">
      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Enter your response..."
        className="pl-10 h-12 sm:h-11 text-base min-h-[48px]"
        data-testid={`input-${questionId}`}
      />
    </div>
  );
}

function LongTextInput({ value, onChange, questionId }: { value: any; onChange: (v: any) => void; questionId: string }) {
  const charCount = (value || "").length;
  const maxChars = 2000;

  return (
    <div className="space-y-2">
      <Textarea
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Share your thoughts..."
        rows={4}
        className="resize-none text-base min-h-[120px] sm:min-h-[140px]"
        maxLength={maxChars}
        data-testid={`textarea-${questionId}`}
      />
      <div className="flex justify-between items-center text-xs text-muted-foreground">
        <span className="hidden sm:inline">Be as detailed as you like</span>
        <span className="sm:hidden">Add details</span>
        <span className={cn(charCount > maxChars * 0.9 && "text-amber-500", charCount >= maxChars && "text-destructive")}>
          {charCount}/{maxChars}
        </span>
      </div>
    </div>
  );
}

function NumberInput({ value, onChange, questionId }: { value: any; onChange: (v: any) => void; questionId: string }) {
  return (
    <div className="relative w-full sm:max-w-xs">
      <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input
        type="number"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
        placeholder="Enter a number..."
        className="pl-10 h-12 sm:h-11 text-base min-h-[48px]"
        min={0}
        inputMode="numeric"
        data-testid={`input-number-${questionId}`}
      />
    </div>
  );
}

function SliderInput({ value, onChange, question }: { value: any; onChange: (v: any) => void; question: Question }) {
  const config = question.sliderConfig || { min: 1, max: 5, labels: {} };
  const sliderValue = value || config.min;
  
  return (
    <InteractiveSlider
      value={sliderValue}
      onChange={onChange}
      sliderConfig={config}
      dimension={question.dimension}
      className="w-full"
    />
  );
}

function SingleSelectInput({ value, onChange, question }: { value: any; onChange: (v: any) => void; question: Question }) {
  const options = question.options || [];

  return (
    <RadioGroup
      value={value || ""}
      onValueChange={onChange}
      className="grid gap-2 sm:gap-3"
    >
      {options.map((option, idx) => {
        const isSelected = value === option.value;
        
        return (
          <motion.div
            key={option.value}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.2, delay: idx * 0.05 }}
          >
            <Label
              htmlFor={`${question.id}-${option.value}`}
              className="cursor-pointer block"
            >
              <Card className={cn(
                "p-3 sm:p-4 transition-all border-2 min-h-[52px] active:scale-[0.98]",
                isSelected 
                  ? "border-[#7FB8A3] bg-[#7FB8A3]/5 shadow-md" 
                  : "border-transparent hover:border-[#7FB8A3]/30 hover-elevate active:bg-muted/50"
              )}>
                <div className="flex items-start gap-3">
                  <div className="flex items-center justify-center min-h-[24px] min-w-[24px] mt-0.5">
                    <RadioGroupItem
                      value={option.value}
                      id={`${question.id}-${option.value}`}
                      className="h-5 w-5"
                      data-testid={`radio-${question.id}-${option.value}`}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm sm:text-base text-foreground">{option.label}</div>
                    {option.description && (
                      <div className="text-xs sm:text-sm text-muted-foreground mt-0.5 sm:mt-1 leading-relaxed">
                        {option.description}
                      </div>
                    )}
                  </div>
                  {isSelected && (
                    <CheckCircle2 className="h-5 w-5 text-[#7FB8A3] flex-shrink-0" />
                  )}
                </div>
              </Card>
            </Label>
          </motion.div>
        );
      })}
    </RadioGroup>
  );
}

function MultiSelectInput({ value, onChange, question }: { value: any; onChange: (v: any) => void; question: Question }) {
  const options = question.options || [];
  const allowOther = question.scoringConfig?.allowOther;
  const maxSelections = question.scoringConfig?.maxSelections;
  
  // Value can be array of strings (simple) or object with selections and otherText
  // Also handles numeric-keyed objects like {"0":"val1", "1":"val2"} from DB storage
  const normalizeValue = () => {
    if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      // Check if it's a selections object with proper structure
      if ('selections' in value && Array.isArray(value.selections)) {
        return value;
      }
      // Check if it's an object with numeric keys (DB serialization artifact)
      // This happens when arrays are stored/retrieved as JSON objects
      const keys = Object.keys(value);
      if (keys.length > 0 && keys.every(k => !isNaN(Number(k)))) {
        // Convert numeric-keyed object to array
        const asArray = keys.sort((a, b) => Number(a) - Number(b)).map(k => value[k]);
        return { selections: asArray, otherText: "" };
      }
      // Unknown object format - try to extract selections if present
      return { selections: [], otherText: "" };
    }
    return { selections: Array.isArray(value) ? value : [], otherText: "" };
  };
  
  const currentValue = normalizeValue();
  const selectedValues: string[] = currentValue.selections || [];
  const otherText: string = currentValue.otherText || "";
  const countableSelections = selectedValues.filter(v => v !== "other" && v !== "not_applicable");
  const isMaxReached = maxSelections ? countableSelections.length >= maxSelections : false;

  const handleToggle = (optionValue: string, checked: boolean) => {
    let newSelections: string[];
    
    // Special handling for "not_applicable" - clears other selections
    if (optionValue === "not_applicable") {
      if (checked) {
        newSelections = ["not_applicable"];
        onChange({ selections: newSelections, otherText: "" });
        return;
      } else {
        newSelections = [];
        onChange({ selections: newSelections, otherText });
        return;
      }
    }
    
    // If selecting something else, remove "not_applicable"
    if (checked) {
      if (maxSelections && countableSelections.length >= maxSelections && optionValue !== "other") {
        return;
      }
      newSelections = [...selectedValues.filter(v => v !== "not_applicable"), optionValue];
    } else {
      newSelections = selectedValues.filter((v) => v !== optionValue);
    }
    
    onChange({ selections: newSelections, otherText });
  };
  
  const handleOtherTextChange = (text: string) => {
    onChange({ selections: selectedValues, otherText: text });
  };

  // Separate "other" and "not_applicable" options for special rendering
  const regularOptions = options.filter(o => o.value !== "other" && o.value !== "not_applicable");
  const otherOption = options.find(o => o.value === "other");
  const notApplicableOption = options.find(o => o.value === "not_applicable");
  const isNotApplicableSelected = selectedValues.includes("not_applicable");
  const isOtherSelected = selectedValues.includes("other");

  return (
    <div className="space-y-3 sm:space-y-4">
      {maxSelections && (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <Badge variant={isMaxReached ? "default" : "outline"} className={isMaxReached ? "bg-[#7FB8A3]" : ""}>
            {countableSelections.length}/{maxSelections} selected
          </Badge>
          {!isMaxReached && (
            <span className="text-xs sm:text-sm text-muted-foreground">Select up to {maxSelections}</span>
          )}
        </div>
      )}
      
      {/* Regular options - cards serve as full tap target */}
      <div className="grid gap-2 sm:gap-3">
        {regularOptions.map((option, idx) => {
          const isSelected = selectedValues.includes(option.value);
          const isDisabled = isNotApplicableSelected || (!isSelected && isMaxReached);
          
          return (
            <motion.div
              key={option.value}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.2, delay: idx * 0.03 }}
            >
              <Label
                htmlFor={`${question.id}-${option.value}`}
                className={cn("cursor-pointer block", isDisabled && "cursor-not-allowed")}
              >
                <Card className={cn(
                  "p-3 sm:p-4 transition-all border-2 min-h-[52px] active:scale-[0.98]",
                  isSelected 
                    ? "border-[#7FB8A3] bg-[#7FB8A3]/5 shadow-md" 
                    : isDisabled
                      ? "border-transparent opacity-50"
                      : "border-transparent hover:border-[#7FB8A3]/30 hover-elevate active:bg-muted/50"
                )}>
                  <div className="flex items-start gap-3">
                    <div className="flex items-center justify-center min-h-[24px] min-w-[24px] mt-0.5">
                      <Checkbox
                        id={`${question.id}-${option.value}`}
                        checked={isSelected}
                        disabled={isDisabled}
                        onCheckedChange={(checked) => handleToggle(option.value, checked as boolean)}
                        className="h-5 w-5"
                        data-testid={`checkbox-${question.id}-${option.value}`}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className={cn("font-medium text-sm sm:text-base leading-snug", isDisabled ? "text-muted-foreground" : "text-foreground")}>
                        {option.label}
                      </div>
                      {option.description && (
                        <div className="text-xs sm:text-sm text-muted-foreground mt-0.5 sm:mt-1 leading-relaxed">
                          {option.description}
                        </div>
                      )}
                    </div>
                    {isSelected && (
                      <CheckCircle2 className="h-5 w-5 text-[#7FB8A3] flex-shrink-0" />
                    )}
                  </div>
                </Card>
              </Label>
            </motion.div>
          );
        })}
      </div>
      
      {/* Other option with free text */}
      {otherOption && (
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.2, delay: regularOptions.length * 0.03 }}
          className="space-y-2 sm:space-y-3"
        >
          <Label
            htmlFor={`${question.id}-other`}
            className={cn("cursor-pointer block", isNotApplicableSelected && "cursor-not-allowed")}
          >
            <Card className={cn(
              "p-3 sm:p-4 transition-all border-2 min-h-[52px] active:scale-[0.98]",
              isOtherSelected 
                ? "border-[#7FB8A3] bg-[#7FB8A3]/5 shadow-md" 
                : isNotApplicableSelected
                  ? "border-transparent opacity-50"
                  : "border-transparent hover:border-[#7FB8A3]/30 hover-elevate active:bg-muted/50"
            )}>
              <div className="flex items-start gap-3">
                <div className="flex items-center justify-center min-h-[24px] min-w-[24px] mt-0.5">
                  <Checkbox
                    id={`${question.id}-other`}
                    checked={isOtherSelected}
                    disabled={isNotApplicableSelected}
                    onCheckedChange={(checked) => handleToggle("other", checked as boolean)}
                    className="h-5 w-5"
                    data-testid={`checkbox-${question.id}-other`}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className={cn("font-medium text-sm sm:text-base leading-snug", isNotApplicableSelected ? "text-muted-foreground" : "text-foreground")}>
                    {otherOption.label}
                  </div>
                  {otherOption.description && (
                    <div className="text-xs sm:text-sm text-muted-foreground mt-0.5 sm:mt-1 leading-relaxed">
                      {otherOption.description}
                    </div>
                  )}
                </div>
              </div>
            </Card>
          </Label>
          
          <AnimatePresence>
            {isOtherSelected && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="pl-3 sm:pl-8"
              >
                <Textarea
                  value={otherText}
                  onChange={(e) => handleOtherTextChange(e.target.value)}
                  placeholder="Please describe..."
                  rows={3}
                  className="resize-none text-sm sm:text-base min-h-[80px]"
                  data-testid={`textarea-${question.id}-other`}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
      
      {/* Not Applicable option - separated at the bottom */}
      {notApplicableOption && (
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.2, delay: (regularOptions.length + 1) * 0.03 }}
          className="pt-2 sm:pt-3 border-t"
        >
          <Label
            htmlFor={`${question.id}-not_applicable`}
            className="cursor-pointer block"
          >
            <Card className={cn(
              "p-3 sm:p-4 transition-all border-2 min-h-[52px] active:scale-[0.98]",
              isNotApplicableSelected 
                ? "border-amber-500 bg-amber-500/5 shadow-md" 
                : "border-transparent hover:border-amber-500/30 hover-elevate active:bg-muted/50"
            )}>
              <div className="flex items-start gap-3">
                <div className="flex items-center justify-center min-h-[24px] min-w-[24px] mt-0.5">
                  <Checkbox
                    id={`${question.id}-not_applicable`}
                    checked={isNotApplicableSelected}
                    onCheckedChange={(checked) => handleToggle("not_applicable", checked as boolean)}
                    className="h-5 w-5"
                    data-testid={`checkbox-${question.id}-not_applicable`}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm sm:text-base text-foreground leading-snug">
                    {notApplicableOption.label}
                  </div>
                  {notApplicableOption.description && (
                    <div className="text-xs sm:text-sm text-muted-foreground mt-0.5 sm:mt-1 leading-relaxed">
                      {notApplicableOption.description}
                    </div>
                  )}
                </div>
                {isNotApplicableSelected && (
                  <AlertCircle className="h-5 w-5 text-amber-500 flex-shrink-0" />
                )}
              </div>
            </Card>
          </Label>
        </motion.div>
      )}
    </div>
  );
}

function StructuredInput({ value, onChange, question }: { value: any; onChange: (v: any) => void; question: Question }) {
  const fields = question.structuredFields || [];
  const currentValue: Record<string, any> = typeof value === "object" && value !== null ? value : {};

  const handleFieldChange = (fieldId: string, fieldValue: any) => {
    onChange({
      ...currentValue,
      [fieldId]: fieldValue,
    });
  };

  return (
    <div className="grid gap-3 sm:gap-4 sm:grid-cols-2">
      {fields.map((field, idx) => (
        <motion.div
          key={field.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, delay: idx * 0.05 }}
          className="space-y-1.5 sm:space-y-2"
        >
          <Label htmlFor={`${question.id}-${field.id}`} className="text-sm font-medium">
            {field.label}
          </Label>
          {field.type === "number" ? (
            <div className="relative">
              <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id={`${question.id}-${field.id}`}
                type="number"
                value={currentValue[field.id] ?? ""}
                onChange={(e) => handleFieldChange(field.id, e.target.value ? Number(e.target.value) : null)}
                placeholder={field.placeholder || "Enter value..."}
                className="pl-10 min-h-[48px] h-12 sm:h-11 text-base"
                min={0}
                inputMode="numeric"
                data-testid={`input-structured-${question.id}-${field.id}`}
              />
            </div>
          ) : (
            <Input
              id={`${question.id}-${field.id}`}
              type="text"
              value={currentValue[field.id] || ""}
              onChange={(e) => handleFieldChange(field.id, e.target.value)}
              placeholder={field.placeholder || "Enter value..."}
              className="min-h-[48px] h-12 sm:h-11 text-base"
              data-testid={`input-structured-${question.id}-${field.id}`}
            />
          )}
        </motion.div>
      ))}
    </div>
  );
}

export default AssessmentQuestion;
