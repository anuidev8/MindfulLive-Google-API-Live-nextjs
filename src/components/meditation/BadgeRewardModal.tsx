import React from "react";
import { AnimatePresence, motion } from "framer-motion";

interface BadgeRewardModalProps {
  open: boolean;
  onClose: () => void;
  badge?: React.ReactNode;
  title?: string;
  message?: string;
}

const BadgeRewardModal: React.FC<BadgeRewardModalProps> = ({
  open,
  onClose,
  badge = "🏅",
  title = "Congratulations!",
  message = "You earned a new badge for completing your meditation session.",
}) => (
  <AnimatePresence>
    {open && (
      <motion.div
        key="badge-modal"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.8 }}
        transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
        onClick={onClose}
      >
        <div
          className="bg-white/70 backdrop-blur-xl rounded-3xl shadow-2xl p-12 flex flex-col items-center border-4 border-yellow-200"
          onClick={e => e.stopPropagation()}
        >
          <div className="text-7xl mb-6 drop-shadow-lg animate-bounce-slow">{badge}</div>
          <div className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-pink-400 to-blue-400 mb-3 text-center drop-shadow">{title}</div>
          <div className="text-lg text-gray-800 mb-6 text-center max-w-xs">
            {message}
          </div>
          <button
            className="mt-2 px-6 py-2 rounded-xl bg-gradient-to-br from-yellow-400 to-yellow-500 text-white font-bold shadow border border-white/30 hover:scale-105 transition-all duration-150"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </motion.div>
    )}
  </AnimatePresence>
);

export default BadgeRewardModal;
