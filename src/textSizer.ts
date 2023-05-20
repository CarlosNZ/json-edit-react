/**
 * Takes a text input and returns the number of rows and columns it takes up.
 * Only makes sense for monospaced fonts
 */

// Regex to split sentence by space and "-", but keeps the delimiters in the
// output array too
const splitRegEx = /(?=[ -])|(?<=[ -])/g

const getTextDimensions = (text: string, lineLimit: number = Infinity) => {
  const lines = text.split('\n')

  //   const newLines: string[] = []
  let numLines = 0
  let longestLine = 0

  for (const line of lines) {
    const words = line.split(splitRegEx)
    // const brokenLines: string[] = []
    let newLine = ''
    for (const word of words) {
      if (word === ' ') {
        newLine += word
        continue
      }
      if ((newLine + word).length > lineLimit) {
        // brokenLines.push(newLine)
        numLines++
        const lineLength = newLine.trimEnd().length
        if (lineLength > longestLine) longestLine = lineLength
        newLine = word
      } else {
        newLine += word
      }
    }
    // brokenLines.push(newLine)
    const lineLength = newLine.trimEnd().length
    if (lineLength > longestLine) longestLine = lineLength
    numLines++
    // newLines.push(...brokenLines)
  }
  //   console.log(newLines)
  //   console.log('lines', numLines)
  //   console.log('Longest', longestLine)
  return { rows: numLines, columns: longestLine }
}

// getTextDimensions('We want it to break-onthe hyphen')
