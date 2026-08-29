"use client";

import { AnimatePresence, motion } from 'motion/react';

/** Error text that slides/fades in when it appears and collapses away
 * when cleared, instead of popping in and leaving a layout jump behind.
 * Purely presentational -- the message itself still comes from the
 * page's own real error state (a thrown Supabase/API error), never
 * invented here. */
export default function FormError({ message }: { message: string | null }) {
  return (
    <AnimatePresence mode="wait">
      {message && (
        <motion.p
          key={message}
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="overflow-hidden text-sm text-danger-400"
        >
          {message}
        </motion.p>
      )}
    </AnimatePresence>
  );
}
