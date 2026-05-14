export interface ChartData {
  type: 'bar' | 'line' | 'pie';
  id: string;
  title: string;
  data: Record<string, unknown>[];
}

export interface FAQItem {
  question: string;
  answer: string;
}

export function parseFAQFromContent(content: string): { faqs: FAQItem[]; contentWithoutFAQ: string } {
  // Match various FAQ section formats including "## FAQs: Common Questions About..."
  const faqSectionRegex = /##\s*(?:Frequently Asked Questions|FAQs?)(?::\s*[^\n]+)?\s*\n([\s\S]*?)(?=\n---\s*$|\n##\s[^#]|$)/i;
  const match = content.match(faqSectionRegex);
  
  if (!match) {
    return { faqs: [], contentWithoutFAQ: content };
  }
  
  const faqSection = match[1];
  const faqs: FAQItem[] = [];
  
  // Try format: ### Question 1:\n\nQuestion text?\n\nAnswer text
  const numberedQuestionBlocks = faqSection.split(/(?=###\s*Question\s*\d+)/i);
  
  for (const block of numberedQuestionBlocks) {
    if (!block.trim()) continue;
    
    // Match "### Question N:\n\nQuestion text?" format
    const numberedMatch = block.match(/^###\s*Question\s*\d+:?\s*\n+([^\n]+\??)\s*\n+([\s\S]*?)$/i);
    if (numberedMatch) {
      const question = numberedMatch[1].trim();
      const answer = numberedMatch[2].trim();
      if (question && answer) {
        faqs.push({ question, answer });
      }
    }
  }
  
  // Try format: ### Question ending with ?
  if (faqs.length === 0) {
    const questionBlocks = faqSection.split(/(?=###\s)/);
    
    for (const block of questionBlocks) {
      if (!block.trim()) continue;
      
      const questionLineMatch = block.match(/^###\s*(.+\?)\s*\n/);
      if (questionLineMatch) {
        const question = questionLineMatch[1].trim();
        const answerText = block.slice(questionLineMatch[0].length).trim();
        
        if (question && answerText) {
          faqs.push({
            question,
            answer: answerText,
          });
        }
      }
    }
  }
  
  if (faqs.length === 0) {
    // Try format with "A:" prefix first
    const qFormatRegex = /\*\*Q:\s*(.*?)\*\*\s*\n+\s*A:\s*([\s\S]*?)(?=\n\*\*Q:|$)/gi;
    let questionMatch;
    while ((questionMatch = qFormatRegex.exec(faqSection)) !== null) {
      faqs.push({
        question: questionMatch[1].trim(),
        answer: questionMatch[2].trim(),
      });
    }
  }
  
  if (faqs.length === 0) {
    // Try format without "A:" prefix (just **Q: Question?** followed by answer)
    const qOnlyFormatRegex = /\*\*Q:\s*(.*?\?)\*\*\s*\n+([\s\S]*?)(?=\n\*\*Q:|$)/gi;
    let questionMatch;
    while ((questionMatch = qOnlyFormatRegex.exec(faqSection)) !== null) {
      faqs.push({
        question: questionMatch[1].trim(),
        answer: questionMatch[2].trim(),
      });
    }
  }
  
  // Find where FAQ section ends - look for next ## heading or end of FAQ content
  // This preserves content that comes after FAQ like Sources, References, or RESOURCE_LINK markers
  const faqEndRegex = /##\s*(?:Frequently Asked Questions|FAQs?)(?::\s*[^\n]+)?\s*\n([\s\S]*?)(?=\n##\s|$)/i;
  const faqEndMatch = content.match(faqEndRegex);
  
  let contentWithoutFAQ: string;
  if (faqEndMatch) {
    // Replace only the FAQ section, not everything after it
    contentWithoutFAQ = content.replace(faqEndMatch[0], '');
  } else {
    contentWithoutFAQ = content;
  }
  
  return { faqs, contentWithoutFAQ };
}

function extractBalancedJson(content: string, startIndex: number): { json: string; endIndex: number } | null {
  let braceCount = 0;
  let inString = false;
  let escapeNext = false;
  let jsonStart = -1;
  
  for (let i = startIndex; i < content.length; i++) {
    const char = content[i];
    
    if (escapeNext) {
      escapeNext = false;
      continue;
    }
    
    if (char === '\\' && inString) {
      escapeNext = true;
      continue;
    }
    
    if (char === '"' && !escapeNext) {
      inString = !inString;
      continue;
    }
    
    if (inString) continue;
    
    if (char === '{') {
      if (jsonStart === -1) jsonStart = i;
      braceCount++;
    } else if (char === '}') {
      braceCount--;
      if (braceCount === 0 && jsonStart !== -1) {
        return {
          json: content.slice(jsonStart, i + 1),
          endIndex: i + 1
        };
      }
    }
  }
  
  return null;
}

export function parseChartsFromContent(content: string): { charts: ChartData[]; contentWithChartMarkers: string } {
  const charts: ChartData[] = [];
  let processedContent = content;
  let chartIndex = 0;
  
  const openTagRegex = /\[CHART:(bar|line|pie):([^\]]+)\]/gi;
  let searchStart = 0;
  
  while (true) {
    openTagRegex.lastIndex = searchStart;
    const match = openTagRegex.exec(processedContent);
    if (!match) break;
    
    const type = match[1].toLowerCase() as 'bar' | 'line' | 'pie';
    const id = match[2].trim();
    const markerStart = match.index;
    const afterOpenTag = match.index + match[0].length;
    
    // Extract balanced JSON after the opening tag
    const jsonResult = extractBalancedJson(processedContent, afterOpenTag);
    if (!jsonResult) {
      searchStart = afterOpenTag;
      continue;
    }
    
    let markerEnd = jsonResult.endIndex;
    
    // Skip whitespace after JSON
    while (markerEnd < processedContent.length && /\s/.test(processedContent[markerEnd])) {
      markerEnd++;
    }
    
    // Check for and consume closing tag like [/CHART:bar:id] or [/CHART]
    const closeTagPattern = /^\[\/CHART(?::[^\]]+)?\]/i;
    const remainingContent = processedContent.slice(markerEnd);
    const closeMatch = remainingContent.match(closeTagPattern);
    if (closeMatch) {
      markerEnd += closeMatch[0].length;
    }
    
    try {
      const jsonData = JSON.parse(jsonResult.json);
      
      // Normalize data format - handle both {data: [{label, value}]} and {labels: [], data: [numbers]} formats
      let chartData: Record<string, unknown>[] = [];
      
      if (Array.isArray(jsonData.data)) {
        if (jsonData.labels && Array.isArray(jsonData.labels)) {
          // Format: {labels: ["A", "B"], data: [10, 20]} - convert to [{name, value}]
          chartData = jsonData.labels.map((label: string, idx: number) => ({
            name: label,
            value: typeof jsonData.data[idx] === 'number' ? jsonData.data[idx] : 0
          }));
        } else if (jsonData.data.length > 0 && typeof jsonData.data[0] === 'object') {
          // Format: {data: [{label, value}, ...]} - keep as is
          chartData = jsonData.data;
        } else if (jsonData.data.length > 0 && typeof jsonData.data[0] === 'number') {
          // Format: {data: [10, 20, 30]} - create generic labels
          chartData = jsonData.data.map((value: number, idx: number) => ({
            name: `Item ${idx + 1}`,
            value
          }));
        }
      }
      
      charts.push({
        type,
        id,
        title: jsonData.title || id,
        data: chartData,
      });
      
      const placeholder = `\n[CHART_PLACEHOLDER_${chartIndex}]\n`;
      processedContent = processedContent.slice(0, markerStart) + placeholder + processedContent.slice(markerEnd);
      searchStart = markerStart + placeholder.length;
      chartIndex++;
    } catch (e) {
      console.warn('Failed to parse chart data:', jsonResult.json, e);
      searchStart = markerEnd;
    }
  }
  
  // Clean up any remaining bare chart markers without JSON
  processedContent = processedContent.replace(/\[CHART:[^\]]+\]\s*(?!\{)/g, '');
  processedContent = processedContent.replace(/\[\/CHART(?::[^\]]+)?\]/gi, '');
  
  return { charts, contentWithChartMarkers: processedContent };
}

export function parseKeyTakeaways(content: string): string[] {
  const takeawayRegex = /\*\*Key Takeaway:\*\*\s*(.*?)(?=\n\n|\n\*\*|$)/gi;
  const takeaways: string[] = [];
  
  let match;
  while ((match = takeawayRegex.exec(content)) !== null) {
    takeaways.push(match[1].trim());
  }
  
  return takeaways;
}

export function parseStats(content: string): { stat: string; label: string; source?: string }[] {
  const statRegex = /\[STAT:\s*(\d+[%+]?|\$[\d,.]+[MBK]?)\s*-\s*(.*?)(?:\s*\|\s*Source:\s*(.*?))?\]/gi;
  const stats: { stat: string; label: string; source?: string }[] = [];
  
  let match;
  while ((match = statRegex.exec(content)) !== null) {
    stats.push({
      stat: match[1],
      label: match[2].trim(),
      source: match[3]?.trim(),
    });
  }
  
  return stats;
}

export interface TimelinePhase {
  id: string;
  title: string;
  timeframe: string;
  objective?: string;
  subPhases?: {
    id: string;
    title: string;
    timeframe: string;
    description?: string;
  }[];
}

export interface HorizonData {
  id: string;
  number: number;
  title: string;
  timeframe: string;
  objective: string;
  phases?: {
    id: string;
    title: string;
    timeframe: string;
  }[];
}

export interface TimelineParseResult {
  timelines: TimelinePhase[];
  horizons: HorizonData[];
  contentWithTimelineMarkers: string;
}

export interface ReferenceItem {
  text: string;
  url?: string;
}

export function parseReferencesFromContent(content: string): { references: ReferenceItem[]; contentWithoutReferences: string } {
  const references: ReferenceItem[] = [];
  let contentWithoutReferences = content;
  
  // Match "## Sources and References", "## References", "## Sources"
  const refSectionRegex = /##\s*(?:Sources?\s*(?:and\s*)?References?|References?\s*(?:and\s*)?Sources?)\s*\n([\s\S]*?)(?=\n##\s[^#]|$)/i;
  const match = content.match(refSectionRegex);
  
  if (match) {
    const refSection = match[1];
    
    // Parse bullet points (- or *)
    const bulletRegex = /^[-*]\s*(.+)$/gm;
    let bulletMatch;
    while ((bulletMatch = bulletRegex.exec(refSection)) !== null) {
      const text = bulletMatch[1].trim();
      
      // Check if it contains a markdown URL [text](url)
      const markdownUrlMatch = text.match(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/);
      if (markdownUrlMatch) {
        references.push({
          text: markdownUrlMatch[1],
          url: markdownUrlMatch[2],
        });
      } 
      // Check for "Title - URL" format (URL at end after " - ")
      else {
        const dashUrlMatch = text.match(/^(.+?)\s+-\s+(https?:\/\/\S+)$/);
        if (dashUrlMatch) {
          references.push({
            text: dashUrlMatch[1].trim(),
            url: dashUrlMatch[2].trim(),
          });
        } else {
          references.push({ text });
        }
      }
    }
    
    // Also parse numbered items (1. Reference text)
    const numberedRegex = /^\d+\.\s*(.+)$/gm;
    let numberedMatch;
    while ((numberedMatch = numberedRegex.exec(refSection)) !== null) {
      const text = numberedMatch[1].trim();
      
      const dashUrlMatch = text.match(/^(.+?)\s+-\s+(https?:\/\/\S+)$/);
      if (dashUrlMatch) {
        references.push({
          text: dashUrlMatch[1].trim(),
          url: dashUrlMatch[2].trim(),
        });
      } else {
        references.push({ text });
      }
    }
    
    // Remove the references section from content
    contentWithoutReferences = content.replace(match[0], '');
  }
  
  return { references, contentWithoutReferences };
}

export function parseTimelinesFromContent(content: string): TimelineParseResult {
  const timelines: TimelinePhase[] = [];
  const horizons: HorizonData[] = [];
  let processedContent = content;
  
  try {
    const horizonRegex = /###?\s*Horizon\s*(\d+):\s*([^\n(]+)\s*\(([^)]+)\)/gi;
    const objectiveRegex = /\*\*Objective\*\*:\s*([^\n]+)/i;
    
    const horizonMatches: { index: number; number: number; title: string; timeframe: string; fullMatch: string }[] = [];
    let match;
    
    while ((match = horizonRegex.exec(content)) !== null) {
      horizonMatches.push({
        index: match.index,
        number: parseInt(match[1]),
        title: match[2].trim(),
        timeframe: match[3].trim(),
        fullMatch: match[0],
      });
    }
    
    if (horizonMatches.length === 0) {
      return { timelines: [], horizons: [], contentWithTimelineMarkers: content };
    }
    
    for (let i = 0; i < horizonMatches.length; i++) {
      const current = horizonMatches[i];
      const nextIndex = i < horizonMatches.length - 1 ? horizonMatches[i + 1].index : content.length;
      const sectionContent = content.slice(current.index + current.fullMatch.length, nextIndex);
      
      const objMatch = sectionContent.match(objectiveRegex);
      const objective = objMatch ? objMatch[1].trim() : '';
      
      const phases: { id: string; title: string; timeframe: string }[] = [];
      const localPhaseRegex = /\*\*Phase\s*(\d+[A-Z]?):\s*([^\n(]+)\s*\(([^)]+)\)\*\*/gi;
      
      while ((match = localPhaseRegex.exec(sectionContent)) !== null) {
        phases.push({
          id: `phase-${current.number}-${match[1]}`,
          title: match[2].trim(),
          timeframe: match[3].trim(),
        });
      }
      
      horizons.push({
        id: `horizon-${current.number}`,
        number: current.number,
        title: current.title,
        timeframe: current.timeframe,
        objective,
        phases: phases.length > 0 ? phases : undefined,
      });
    }
    
    if (horizons.length >= 2) {
      const firstMatch = horizonMatches[0];
      const lastMatch = horizonMatches[horizonMatches.length - 1];
      // Find where the last horizon section ends - look for next heading or end of content
      let lastEndIndex = content.length;
      const remainingContent = content.slice(lastMatch.index + lastMatch.fullMatch.length);
      const nextHeadingMatch = remainingContent.match(/\n(###?\s*[^H]|\n\n\*\*|$)/);
      if (nextHeadingMatch && nextHeadingMatch.index !== undefined) {
        lastEndIndex = lastMatch.index + lastMatch.fullMatch.length + nextHeadingMatch.index;
      }
      
      const beforeContent = processedContent.slice(0, firstMatch.index);
      const afterContent = processedContent.slice(lastEndIndex);
      
      processedContent = beforeContent + `\n[HORIZON_TIMELINE_PLACEHOLDER]\n` + afterContent;
    }
  } catch (error) {
    console.warn('Error parsing timelines:', error);
    return { timelines: [], horizons: [], contentWithTimelineMarkers: content };
  }
  
  return { timelines, horizons, contentWithTimelineMarkers: processedContent };
}
