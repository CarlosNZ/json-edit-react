import { useState, useEffect } from 'react'

// Adapted from:
// https://typeofnan.dev/writing-a-custom-react-usedebounce-hook-with-typescript/

export function useDebounce<T>(
  initialValue: T,
  delay: number = 350
): [T, T, React.Dispatch<T>, () => void] {
  const [debounceInput, setDebounceInput] = useState<T>(initialValue)
  const [debounceOutput, setDebounceOutput] = useState<T>(initialValue)

  useEffect(() => {
    const debounce = setTimeout(() => {
      setDebounceOutput(debounceInput)
    }, delay)
    return () => {
      clearTimeout(debounce)
    }
  }, [debounceInput, delay])

  const resetDebounce = () => {
    setDebounceInput(initialValue)
    setDebounceOutput(initialValue)
  }

  return [debounceInput, debounceOutput, setDebounceInput, resetDebounce]
}
