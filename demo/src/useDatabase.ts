import { getFirestore, doc, setDoc } from 'firebase/firestore'
import { initializeApp } from 'firebase/app'
import { useDocument } from 'react-firebase-hooks/firestore'
import firebaseConfig from './firebaseConfig.json'

const firebaseApp = initializeApp(firebaseConfig)

const db = getFirestore(firebaseApp)

export const useDatabase = () => {
  const [value, loading, error] = useDocument(
    doc(getFirestore(firebaseApp), 'json-edit-react', 'live_json_data')
  )

  const updateLiveData = async (data) => {
    await setDoc(doc(db, 'json-edit-react', 'live_json_data'), data, { merge: true })
  }

  return { liveData: value?.data(), loading, error, updateLiveData }
}
