/** Hulpfuncties voor het downloaden en lezen van bestanden (CSV-import/export). */

/** Biedt tekstinhoud aan als downloadbaar bestand. */
export function downloadTextFile(filename: string, content: string, mimeType = 'text/csv;charset=utf-8'): void {
  if (typeof document === 'undefined') return
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.append(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

/** Leest een gekozen bestand als tekst (UTF-8). */
export function readFileAsText(file: File): Promise<string> {
  return file.text()
}
