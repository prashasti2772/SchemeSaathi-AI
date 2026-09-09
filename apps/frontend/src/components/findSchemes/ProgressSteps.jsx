import React, { useState } from "react";
import AIHelpModal from "./AIHelpModal";

const steps = [
  { number: 1, label: "Personal Info" },
  { number: 2, label: "Business Details" },
  { number: 3, label: "Other Details" },
  { number: 4, label: "Review" },
  { number: 5, label: "Results" },
];

export default function ProgressSteps({ currentStep = 1 }) {
  const [isAiHelpOpen, setIsAiHelpOpen] = useState(false);

  const openAIAssistant = () => {
    setIsAiHelpOpen(true);
  };

  return (
    <div className="mx-auto w-full max-w-212.5 px-4 pt-5 sm:px-8">

      {/* ================= PROGRESS STEPS ================= */}

      <div className="relative">

        {/* Connecting line */}

        <div
          className="
            absolute
            left-[9%]
            right-[9%]
            top-4.5
            h-0.5
            bg-slate-200
          "
        />

        <div className="relative grid grid-cols-5">

          {steps.map((step) => {

            const active =
              step.number <= currentStep;

            return (
              <div
                key={step.number}
                className="flex flex-col items-center text-center"
              >

                <div
                  className={`
                    relative
                    z-10
                    flex
                    h-9
                    w-9
                    items-center
                    justify-center
                    rounded-full
                    border
                    text-[13px]
                    font-medium
                    ${
                      active
                        ? "border-[#d7aa2d] bg-[#e4b32e] text-white"
                        : "border-[#d7aa2d] bg-white text-slate-600"
                    }
                  `}
                >
                  {step.number}
                </div>

                <span
                  className={`
                    mt-2
                    text-[11px]
                    ${
                      active
                        ? "font-medium text-slate-700"
                        : "text-slate-500"
                    }
                  `}
                >
                  {step.label}
                </span>

              </div>
            );
          })}

        </div>

      </div>


      {/* ================= AI HELP ================= */}

      <div className="mt-5 flex justify-center">

        <button
          type="button"
          onClick={openAIAssistant}
          title="Open AI Scheme Assistant"
          className="
             rounded-lg
              border
            border-[#d7aa2d]
            bg-white
              px-5
              py-2
              text-[12px]
              font-semibold
            text-[#0d2b55]
              shadow-sm
              transition-all
              duration-200
            hover:bg-[#0d2b55]
            hover:text-white
            hover:shadow-md
            active:scale-95
          "
        >
          AI Help
        </button>

      </div>

      <AIHelpModal
        isOpen={isAiHelpOpen}
        onClose={() => setIsAiHelpOpen(false)}
        currentStep={currentStep}
      />

    </div>
  );
}