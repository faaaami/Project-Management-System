import { createContext, useContext } from 'react'

export const CanvasScale = createContext(1)
export const useCanvasScale = () => useContext(CanvasScale)
