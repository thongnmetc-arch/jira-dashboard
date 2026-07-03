import { motion } from 'framer-motion';
import { Check } from 'lucide-react';

const STEPS = [
  { key: 'login', label: 'Đăng nhập' },
  { key: 'connect', label: 'Kết nối' },
  { key: 'project', label: 'Chọn dự án' },
  { key: 'query', label: 'Dashboard' },
];

export default function StepIndicator({ currentStep }) {
  const currentIndex = STEPS.findIndex(s => s.key === currentStep);

  return (
    <div className="flex items-center justify-center gap-0 mb-6">
      {STEPS.map((step, i) => {
        const isCompleted = i < currentIndex;
        const isCurrent = i === currentIndex;
        const isFuture = i > currentIndex;

        return (
          <div key={step.key} className="flex items-center">
            {/* Step circle */}
            <div className="flex flex-col items-center gap-1">
              <motion.div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                  isCompleted
                    ? 'bg-[var(--accent)] text-white'
                    : isCurrent
                      ? 'bg-[var(--accent)] text-white ring-2 ring-[var(--accent)]/30'
                      : 'bg-[var(--border-secondary)] text-[var(--text-tertiary)]'
                }`}
                animate={isCurrent ? { scale: [1, 1.05, 1] } : {}}
                transition={{ repeat: Infinity, duration: 2 }}
              >
                {isCompleted ? <Check className="w-3.5 h-3.5" /> : i + 1}
              </motion.div>
              <span
                className={`text-[10px] ${
                  isCurrent
                    ? 'text-[var(--accent)] font-medium'
                    : 'text-[var(--text-tertiary)]'
                }`}
              >
                {step.label}
              </span>
            </div>
            {/* Connector line */}
            {i < STEPS.length - 1 && (
              <div
                className={`w-8 sm:w-12 h-0.5 mx-1 -mt-4 ${
                  i < currentIndex
                    ? 'bg-[var(--accent)]'
                    : 'bg-[var(--border-secondary)]'
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
