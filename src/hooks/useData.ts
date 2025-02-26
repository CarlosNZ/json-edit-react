/**
 * Hook to manage data state using *either* local data state *or* a `setData`
 * method provided by the consumer.
 */

import { useCallback, useEffect, useState } from 'react'

interface UseDataProps<T> {
  setData?: (data: T, shouldUpdateUndo?: boolean) => void
  data: T
}

export const useData = <T>({ setData, data }: UseDataProps<T>) => {
  const [localData, setLocalData] = useState<T | undefined>(setData ? undefined : data)

  const setDataMethod = useCallback(
    (data: T, shouldUpdateUndo?: boolean) => {
      if (setData) setData(data, shouldUpdateUndo)
      else setLocalData(data)
    },
    [setData]
  )

  useEffect(() => {
    if (!setData) setLocalData(data)
  }, [data])

  return [setData ? data : localData, setDataMethod] as [
    T,
    (data: T, shouldUpdateUndo?: boolean) => void
  ]
}
