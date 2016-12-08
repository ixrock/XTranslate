
export interface IFavoritesState {
  [vendor: string]: Favorite[]
}

export interface Favorite {
  from: string
  to: string
}
