import { getFirestore, doc, setDoc } from 'firebase/firestore'
import { initializeApp } from 'firebase/app'
import { useDocument } from 'react-firebase-hooks/firestore'
import firebaseConfig from './firebaseConfig.json'
import { useMemo } from 'react'

const firebaseApp = initializeApp(firebaseConfig)

const db = getFirestore(firebaseApp)

interface Message {
  timeStamp?: string
  name?: string
  message?: string
}

export const useDatabase = () => {
  const [value, loading, error] = useDocument(
    doc(getFirestore(firebaseApp), 'json-edit-react', 'live_json_data')
  )

  const liveData = useMemo(() => {
    const { Guestbook, lastEdited, messages } = value?.data() ?? {}

    const messagesTidied = messages
      ? messages.map(({ timeStamp, name, message, ...rest }: Message) => ({
          message,
          name,
          ...rest,
          timeStamp,
        }))
      : []

    return Guestbook
      ? {
          Guestbook,
          lastEdited,
          messages: messagesTidied,
        }
      : null
  }, [value])

  const updateLiveData = async (data: object) => {
    await setDoc(
      doc(db, 'json-edit-react', 'live_json_data'),
      { ...data, lastEdited: new Date().toISOString() },
      { merge: true }
    )
  }

  return {
    liveData,
    loading,
    error,
    updateLiveData,
  }
}
