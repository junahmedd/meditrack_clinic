import React, { useState, useEffect } from "react";
import { Wifi, WifiOff } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export const NetworkStatusBanner: React.FC = () => {
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== "undefined" ? navigator.onLine : true
  );
  const [showToast, setShowToast] = useState<boolean>(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 4000);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowToast(true);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return (
    <>
      {/* Floating Offline Toast Notification Banner when network status drops */}
      <AnimatePresence>
        {(!isOnline || showToast) && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-3 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-2xl shadow-xl border text-xs font-black flex items-center gap-2 max-w-sm w-full mx-auto ${
              isOnline
                ? "bg-emerald-900 text-white border-emerald-700"
                : "bg-amber-900 text-amber-100 border-amber-700"
            }`}
          >
            {isOnline ? (
              <>
                <Wifi size={16} className="text-emerald-400 shrink-0" />
                <span>Internet Connection Restored — Syncing live records...</span>
              </>
            ) : (
              <>
                <WifiOff size={16} className="text-amber-400 shrink-0 animate-bounce" />
                <span>Offline — Changes will automatically sync when connected.</span>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
