import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AntiFixLogo } from './AntiFixLogo';

interface SplashScreenProps {
  onFinish: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onFinish }) => {
  const [stage, setStage] = useState<'enter' | 'glow' | 'exit'>('enter');

  useEffect(() => {
    const t1 = setTimeout(() => {
      setStage('glow');
    }, 600);

    const t2 = setTimeout(() => {
      setStage('exit');
    }, 1500);

    const t3 = setTimeout(() => {
      onFinish();
    }, 2000);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [onFinish]);

  return (
    <AnimatePresence>
      {stage !== 'exit' ? (
        <motion.div
          key="splash"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.05 }}
          transition={{ duration: 0.5, ease: 'easeInOut' }}
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-950 text-white select-none overflow-hidden"
        >
          {/* Subtle Ambient Radial Glow */}
          <div className="absolute w-[500px] h-[500px] rounded-full bg-blue-600/10 blur-[120px] pointer-events-none" />
          <div className="absolute w-[400px] h-[400px] rounded-full bg-red-600/10 blur-[140px] pointer-events-none -bottom-20 -right-20" />

          <motion.div
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{
              opacity: 1,
              scale: stage === 'glow' ? 1.06 : 1,
            }}
            transition={{
              duration: 0.8,
              ease: [0.16, 1, 0.3, 1],
            }}
            className="relative z-10 flex flex-col items-center"
          >
            <div className="relative">
              <AntiFixLogo size="splash" />
              {stage === 'glow' && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.4 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-blue-500/20 blur-xl rounded-full"
                />
              )}
            </div>

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.6 }}
              className="mt-6 flex flex-col items-center gap-1"
            >
              <h2 className="text-2xl font-bold tracking-tight text-white font-['Space_Grotesk']">
                AntiFix
              </h2>
              <p className="text-xs uppercase tracking-widest text-blue-400 font-mono font-medium">
                Your PDF. Your Control.
              </p>
            </motion.div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
};
