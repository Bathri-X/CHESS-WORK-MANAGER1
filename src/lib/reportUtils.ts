import { Batch } from '../types';
import { formatReportDate } from './dateUtils';

/**
 * Generates the WhatsApp-ready daily report for a given date and batch list.
 * CRITICAL REQUIREMENT:
 * DEMO BATCHES MUST NEVER APPEAR IN THIS REPORT.
 * Only GENERAL batches are included!
 */
export function generateDailyReport(dateStr: string, batches: Batch[]): string {
  // Filter out any Demo batches strictly
  const generalBatches = batches.filter(
    (b) => b.work_date === dateStr && b.class_type === 'general'
  );

  const formattedDate = formatReportDate(dateStr);

  if (generalBatches.length === 0) {
    return `♟️ MY CHESS WORK MANAGER\n📅 ${formattedDate}\n\nNo general classes scheduled for this day.`;
  }

  // Sort chronologically by start_time
  const sortedBatches = [...generalBatches].sort((a, b) => {
    return a.start_time.localeCompare(b.start_time);
  });

  const batchBlocks = sortedBatches.map((b) => {
    const lines = [
      `🕐 ${b.start_time} – ${b.end_time}`,
      `👤 ${b.class_name}`,
      `📚 Topic: ${b.topic}`,
    ];
    if (b.homework && b.homework.trim().length > 0) {
      lines.push(`📝 Homework: ${b.homework.trim()}`);
    } else {
      lines.push(`📝 Homework: None`);
    }
    return lines.join('\n');
  });

  return `♟️ MY CHESS WORK MANAGER\n📅 ${formattedDate}\n\n` + batchBlocks.join('\n\n');
}

/**
 * Copies the text to clipboard with fallback for older browsers or iframes
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
    // Fallback using textarea
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    const successful = document.execCommand('copy');
    textArea.remove();
    return successful;
  } catch (err) {
    console.error('Failed to copy to clipboard:', err);
    return false;
  }
}

/**
 * Shares the text via Web Share API if available, or opens WhatsApp web/mobile link
 */
export async function shareToWhatsApp(text: string): Promise<boolean> {
  const encodedText = encodeURIComponent(text);
  const whatsappUrl = `https://api.whatsapp.com/send?text=${encodedText}`;

  // If native share is supported and available on the device
  if (navigator.share) {
    try {
      await navigator.share({
        title: 'Daily Chess Work Report',
        text: text,
      });
      return true;
    } catch (err: any) {
      // If user aborted or canceled share, do not open WhatsApp unnecessarily
      if (err.name === 'AbortError') {
        return false;
      }
      // Otherwise fallback to WhatsApp URL
    }
  }

  // Fallback to WhatsApp URL
  window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
  return true;
}
