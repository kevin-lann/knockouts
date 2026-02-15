"use client"

import { useGameStore } from "@/lib/store"
import { motion, AnimatePresence } from "framer-motion"

export default function CountdownOverlay() {
  const { timer } = useGameStore()

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm z-50">
      <AnimatePresence mode="wait">
        <motion.div
          key={timer}
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 1.5, opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="text-9xl font-bold text-white"
        >
          {timer > 0 ? timer : "GO!"}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
