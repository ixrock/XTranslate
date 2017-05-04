
export interface IHistoryItem {
  id: string
  date: number
  vendor: string
  from: string
  to: string
  text: string
  translation: string
  transcription?: string
  dictionary: {
    wordType: string
    translation: string[]
  }[]
}

export interface IHistoryStorageItemOld {
  date: number
  vendor: string
  from: string
  to: string
  text: string
  tr: string
  ts?: string
  dict: {
    w: string
    tr: string[]
  }[]
}

export type IHistoryStorageItem = [
  number, // time
  string, // vendor
  string, // lang from
  string, // lang to
  string, // original text
  string, // translation result
  string, // transcription
  [
    // dictionary
    string, // word type
    string[] // translations
    ][]
  ];