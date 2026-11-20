export function getInitials(value) {
  const words = String(value || "").trim().split(/\s+/).filter(Boolean).slice(0, 2);
  return words.map((word) => Array.from(word)[0].toLocaleUpperCase()).join("");
}
