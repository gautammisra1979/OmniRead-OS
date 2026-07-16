export interface VTTCue {
  start: number; // seconds
  end: number;
  text: string;
}

export function generateSampleVTT(): string {
  const lines = ["WEBVTT", ""];
  const topics = [
    "Welcome to this presentation. We're glad you're here.",
    "Today we'll explore key concepts and insights.",
    "Let's begin with the fundamentals.",
    "Understanding the core principles is essential.",
    "These ideas build on decades of research.",
    "Now let's look at practical applications.",
    "Real-world examples help illustrate these concepts.",
    "Consider how this applies to your own work.",
    "The data shows consistent patterns across studies.",
    "Let's examine the evidence more closely.",
    "This finding has significant implications.",
    "Experts in the field have validated these results.",
    "We can break this down into manageable steps.",
    "First, identify the key variables at play.",
    "Next, analyze the relationships between them.",
    "Then, draw conclusions based on the evidence.",
    "Finally, apply these insights to your situation.",
    "Let's review what we've covered so far.",
    "These principles form a cohesive framework.",
    "Thank you for watching. We hope this was helpful.",
  ];

  for (let i = 0; i < topics.length; i++) {
    const startSec = i * 12;
    const endSec = startSec + 10;
    const fmt = (s: number) => {
      const h = Math.floor(s / 3600);
      const m = Math.floor((s % 3600) / 60);
      const sec = s % 60;
      return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}.000`;
    };
    lines.push(`${fmt(startSec)} --> ${fmt(endSec)}`);
    lines.push(topics[i]);
    lines.push("");
  }

  return lines.join("\n");
}

export function parseVTTToCues(vttText: string): VTTCue[] {
  const cues: VTTCue[] = [];
  const lines = vttText.split(/\r?\n/);

  for (let i = 0; i < lines.length; i++) {
    const timeMatch = lines[i].match(
      /(\d{2}):(\d{2}):(\d{2})\.\d+\s*-->\s*(\d{2}):(\d{2}):(\d{2})\.\d+/
    );
    if (timeMatch) {
      const start =
        parseInt(timeMatch[1]) * 3600 +
        parseInt(timeMatch[2]) * 60 +
        parseInt(timeMatch[3]);
      const end =
        parseInt(timeMatch[4]) * 3600 +
        parseInt(timeMatch[5]) * 60 +
        parseInt(timeMatch[6]);
      // Collect text until next blank line
      const textLines: string[] = [];
      let j = i + 1;
      while (j < lines.length && lines[j].trim() !== "") {
        textLines.push(lines[j].trim());
        j++;
      }
      cues.push({
        start,
        end,
        text: textLines.join(" "),
      });
    }
  }

  return cues;
}

export function generateVTTBlobUrl(): string {
  const vtt = generateSampleVTT();
  const blob = new Blob([vtt], { type: "text/vtt" });
  return URL.createObjectURL(blob);
}