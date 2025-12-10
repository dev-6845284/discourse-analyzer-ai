import React from 'react';
import { Check, Loader2, AlertCircle, FileText, Tags, Users, MessageSquare } from 'lucide-react';

export type AnalysisStep = 'transcript' | 'topics' | 'speakers' | 'dialog';
export type StepStatus = 'pending' | 'processing' | 'completed' | 'error';

export interface StepInfo {
  step: AnalysisStep;
  status: StepStatus;
  resultCount?: number;
  label: string;
  icon: React.ReactNode;
}

interface StepProgressBarProps {
  steps: StepInfo[];
  currentStep: AnalysisStep;
  onStepClick: (step: AnalysisStep) => void;
  onStartStep?: (step: AnalysisStep) => void;
}

const getStepIcon = (step: AnalysisStep): React.ReactNode => {
  switch (step) {
    case 'transcript':
      return <FileText size={16} />;
    case 'topics':
      return <Tags size={16} />;
    case 'speakers':
      return <Users size={16} />;
    case 'dialog':
      return <MessageSquare size={16} />;
  }
};

const getStatusIndicator = (status: StepStatus): React.ReactNode => {
  switch (status) {
    case 'completed':
      return <Check size={14} className="text-green-400" />;
    case 'processing':
      return <Loader2 size={14} className="text-yellow-400 animate-spin" />;
    case 'error':
      return <AlertCircle size={14} className="text-red-400" />;
    default:
      return null;
  }
};

const getStepStyles = (
  step: AnalysisStep,
  status: StepStatus,
  isActive: boolean,
  canNavigate: boolean
): string => {
  const baseStyles = 'flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200';
  
  if (isActive) {
    return `${baseStyles} bg-cyan-600 text-white shadow-lg shadow-cyan-600/20`;
  }
  
  if (status === 'completed') {
    return `${baseStyles} bg-green-600/20 text-green-400 border border-green-600/50 hover:bg-green-600/30 cursor-pointer`;
  }
  
  if (status === 'processing') {
    return `${baseStyles} bg-yellow-600/20 text-yellow-400 border border-yellow-600/50`;
  }
  
  if (status === 'error') {
    return `${baseStyles} bg-red-600/20 text-red-400 border border-red-600/50 hover:bg-red-600/30 cursor-pointer`;
  }
  
  // Pending
  if (canNavigate) {
    return `${baseStyles} bg-gray-700 text-gray-300 hover:bg-gray-600 cursor-pointer`;
  }
  
  return `${baseStyles} bg-gray-800 text-gray-500 cursor-not-allowed opacity-50`;
};

export const StepProgressBar: React.FC<StepProgressBarProps> = ({
  steps,
  currentStep,
  onStepClick,
  onStartStep,
}) => {
  const currentStepIndex = steps.findIndex(s => s.step === currentStep);

  const canNavigateToStep = (stepIndex: number, step: StepInfo): boolean => {
    // Can always navigate to transcript
    if (step.step === 'transcript') return true;
    
    // Can navigate if step is completed or has error
    if (step.status === 'completed' || step.status === 'error') return true;
    
    // Can navigate to next step if previous step is completed
    const prevStep = steps[stepIndex - 1];
    if (prevStep && prevStep.status === 'completed') return true;
    
    return false;
  };

  const handleStepClick = (step: StepInfo, stepIndex: number) => {
    const canNavigate = canNavigateToStep(stepIndex, step);
    
    if (step.status === 'processing') return; // Don't allow click during processing
    
    if (step.status === 'pending' && canNavigate && onStartStep) {
      // If clicking a pending step that we can start, trigger the action
      onStartStep(step.step);
    } else if (canNavigate) {
      onStepClick(step.step);
    }
  };

  return (
    <div className="flex items-center gap-1 p-4 border-b border-gray-700 flex-shrink-0 bg-gray-800/50 overflow-x-auto">
      {steps.map((step, index) => {
        const isActive = step.step === currentStep;
        const canNavigate = canNavigateToStep(index, step);
        
        return (
          <React.Fragment key={step.step}>
            {/* Connector line */}
            {index > 0 && (
              <div className="flex items-center px-1">
                <div 
                  className={`h-0.5 w-6 transition-colors ${
                    steps[index - 1].status === 'completed' 
                      ? 'bg-green-500' 
                      : 'bg-gray-600'
                  }`} 
                />
                <div 
                  className={`w-0 h-0 border-t-4 border-b-4 border-l-4 border-transparent ${
                    steps[index - 1].status === 'completed'
                      ? 'border-l-green-500'
                      : 'border-l-gray-600'
                  }`}
                />
              </div>
            )}
            
            {/* Step button */}
            <button
              onClick={() => handleStepClick(step, index)}
              disabled={step.status === 'processing'}
              className={getStepStyles(step.step, step.status, isActive, canNavigate)}
              title={`${step.label}${step.resultCount ? ` (${step.resultCount} items)` : ''}`}
            >
              {/* Step number */}
              <span className="flex items-center justify-center w-5 h-5 rounded-full bg-black/20 text-xs">
                {index + 1}
              </span>
              
              {/* Step icon */}
              {getStepIcon(step.step)}
              
              {/* Step label */}
              <span className="hidden sm:inline">{step.label}</span>
              
              {/* Result count */}
              {step.resultCount !== undefined && step.resultCount > 0 && (
                <span className="text-xs opacity-75">({step.resultCount})</span>
              )}
              
              {/* Status indicator */}
              {getStatusIndicator(step.status)}
            </button>
          </React.Fragment>
        );
      })}
    </div>
  );
};

export default StepProgressBar;
