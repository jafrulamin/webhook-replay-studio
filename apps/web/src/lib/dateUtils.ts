import { format, isValid, parseISO } from "date-fns";

export function formatDate(dateString: string | number | undefined | null, formatString: string = "PPpp"): string {
  if (!dateString) {
    return "Invalid date";
  }

  let date: Date;
  
  if (typeof dateString === "number") {
    // If it's a Unix timestamp (in seconds), convert to milliseconds
    if (dateString < 10000000000) {
      date = new Date(dateString * 1000);
    } else {
      date = new Date(dateString);
    }
  } else {
    // Try parsing as ISO string first
    try {
      date = parseISO(dateString);
      if (!isValid(date)) {
        // If parseISO fails, try direct Date constructor
        date = new Date(dateString);
      }
    } catch {
      date = new Date(dateString);
    }
  }

  if (!isValid(date)) {
    return dateString.toString();
  }

  try {
    return format(date, formatString);
  } catch {
    return dateString.toString();
  }
}

