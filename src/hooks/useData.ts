/**
 * Hook to manage data state using *either* local data state *or* a `setData`
 * method provided by the consumer.
 */

import { useCallback, useEffect, useState } from 'react'

interface UseDataProps<T> {
  setData?: (data: T) => void
  data: T
}

export const useData = <T>({ setData, data }: UseDataProps<T>) => {
  const [localData, setLocalData] = useState<T | undefined>(setData ? undefined : data)

  const setDataMethod = useCallback(
    (data: T) => {
      if (setData) setData(data)
      else setLocalData(data)
    },
    [setData]
  )

  useEffect(() => {
    if (!setData) setLocalData(data)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data])

  return [setData ? data : localData, setDataMethod] as [T, (data: T) => void]
}
