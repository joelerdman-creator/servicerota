
"use client";

import * as React from "react";
import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./button";

interface StepperContextValue extends Omit<StepperProps, "children" | "className" | "ref"> {
  activeStep: number;
  isFirstStep: boolean;
  isLastStep: boolean;
  isOptionalStep?: boolean;
  isDisabledStep: boolean;
  isError: boolean;
  isLoading: boolean;
  isVertical: boolean;
  label?: string;
  description?: string;
  icon?: React.ReactNode;
  nextStep: () => void;
  prevStep: () => void;
  resetSteps: () => void;
  setStep: (step: number) => void;
}

const StepperContext = React.createContext<StepperContextValue | null>(null);

function useStepper() {
  const context = React.useContext(StepperContext);
  if (!context) {
    throw new Error("useStepper must be used within a Stepper");
  }
  return context;
}

interface StepperProps extends React.HTMLAttributes<HTMLDivElement> {
  initialStep?: number;
  activeStep?: number;
  orientation?: "vertical" | "horizontal";
  state?: "loading" | "error";
  responsive?: boolean;
  checkIcon?: React.ElementType;
  errorIcon?: React.ElementType;
  steps: {
    label: string;
    description?: string;
    icon?: React.ReactNode;
    isOptional?: boolean;
    isDisabled?: boolean;
  }[];
  expandVerticalSteps?: boolean;
  onStepClick?: (step: number) => void;
  nextStep?: () => void;
  prevStep?: () => void;
  resetSteps?: () => void;
  setStep?: (step: number) => void;
  isFirstStep?: boolean;
  isLastStep?: boolean;
}

const Stepper = React.forwardRef<HTMLDivElement, StepperProps>((props, ref) => {
  const {
    className,
    children,
    orientation: orientationProp = "horizontal",
    state: stateProp,
    responsive = true,
    checkIcon,
    errorIcon,
    initialStep = 0,
    activeStep: activeStepProp,
    steps,
    expandVerticalSteps = false,
    onStepClick,
    nextStep: nextStepProp,
    prevStep: prevStepProp,
    resetSteps: resetStepsProp,
    setStep: setStepProp,
    isFirstStep: isFirstStepProp,
    isLastStep: isLastStepProp,
    ...rest
  } = props;

  const [activeStepInternal, setActiveStepInternal] = React.useState(initialStep);
  const activeStep = activeStepProp !== undefined ? activeStepProp : activeStepInternal;

  const isVertical = orientationProp === "vertical";
  const isError = stateProp === "error";
  const isLoading = stateProp === "loading";

  const isFirstStep = activeStep === 0;
  const isLastStep = activeStep === steps.length - 1;
  const isOptionalStep = steps[activeStep]?.isOptional;
  const isDisabledStep = steps[activeStep]?.isDisabled;

  const setActiveStep = (step: number | ((prev: number) => number)) => {
     if (activeStepProp !== undefined && setStepProp) {
        const newStep = typeof step === 'function' ? step(activeStep) : step;
        setStepProp(newStep);
     } else {
        setActiveStepInternal(step);
     }
  };

  const nextStep = () => {
    setActiveStep((prev) => (prev < steps.length - 1 ? prev + 1 : prev));
  };

  const prevStep = () => {
    setActiveStep((prev) => (prev > 0 ? prev - 1 : prev));
  };

  const resetSteps = () => {
    setActiveStep(initialStep);
  };

  const setStep = (step: number) => {
    setActiveStep(step);
  };

  const contextValue: StepperContextValue = {
    ...props,
    activeStep,
    isFirstStep,
    isLastStep,
    isOptionalStep,
    isDisabledStep: isDisabledStep ?? false,
    isError,
    isLoading,
    isVertical,
    nextStep,
    prevStep,
    resetSteps,
    setStep,
  };

  const stepChildren = React.Children.toArray(children);

  return (
    <StepperContext.Provider value={contextValue}>
      <div
        ref={ref}
        className={cn(
          "flex w-full flex-wrap justify-between gap-4",
          isVertical ? "flex-col" : "flex-row items-center",
          className,
        )}
        {...rest}
      >
        {stepChildren.map((child, i) => {
          const isCompleted = activeStep > i;
          const isCurrent = activeStep === i;

          return React.cloneElement(child as React.ReactElement, {
            index: i,
            isCompleted,
            isCurrent,
            isLastStep: i === steps.length - 1,
          });
        })}
      </div>
    </StepperContext.Provider>
  );
});
Stepper.displayName = "Stepper";

interface StepperItemProps extends React.HTMLAttributes<HTMLDivElement> {
  index?: number;
  isCompleted?: boolean;
  isCurrent?: boolean;
  isLastStep?: boolean;
  isKeepError?: boolean;
  label?: string;
  description?: string;
  icon?: React.ReactNode;
  checkIcon?: React.ElementType;
  errorIcon?: React.ElementType;
}

const StepperItem = React.forwardRef<HTMLDivElement, StepperItemProps>((props, ref) => {
  const {
    className,
    children,
    index,
    isCompleted,
    isCurrent,
    isLastStep,
    checkIcon: checkIconProp,
    errorIcon: errorIconProp,
    ...rest
  } = props;

  const {
    isError,
    isLoading,
    isVertical,
    checkIcon,
    errorIcon,
    label: stepperLabel,
    description: stepperDescription,
    icon: stepperIcon,
    steps,
    onStepClick,
    orientation,
    expandVerticalSteps,
    initialStep,
    state,
    responsive,
    activeStep,
    ...stepperRest
  } = useStepper();

  const { label, description, icon } = {
    label: props.label ?? steps[index as number]?.label,
    description: props.description ?? steps[index as number]?.description,
    icon: props.icon ?? steps[index as number]?.icon,
    // ...stepperRest, // Safely ignore this as we don't need to spread potential junk
  };

  const hasError = isError && isCurrent;

  const CheckIcon = checkIconProp ?? checkIcon ?? Check;
  const ErrorIcon = errorIconProp ?? errorIcon ?? X;

  const renderIcon = () => {
    if (isCompleted) return <CheckIcon className="h-4 w-4 text-primary-foreground" />;
    if (hasError) return <ErrorIcon className="h-4 w-4" />;
    if (isLoading && isCurrent)
      return (
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      );
    return icon ?? (index !== undefined ? index + 1 : null);
  };

  return (
    <div
      ref={ref}
      className={cn(
        "stepper-item flex-1 relative flex flex-col gap-2",
        isVertical ? "items-start" : "items-center",
        className,
      )}
      {...rest}
    >
      <div className={cn("flex items-center gap-x-4 w-full", isVertical ? "flex-row" : "flex-col")}>
        <div className={cn("relative flex items-center", !isVertical && "flex-col w-full")}>
          <div
            className={cn(
              "flex items-center justify-center rounded-full border-2 w-8 h-8 font-medium transition-colors",
              hasError
                ? "border-destructive text-destructive"
                : isCompleted
                  ? "border-primary bg-primary"
                  : isCurrent
                    ? "border-primary"
                    : "border-muted-foreground",
            )}
          >
            {renderIcon()}
          </div>
          {!isVertical && (
            <div className="absolute top-full w-full pt-2 px-1">
              <div
                className={cn(
                  "text-sm font-medium text-center",
                  hasError
                    ? "text-destructive"
                    : isCurrent
                      ? "text-primary"
                      : "text-muted-foreground",
                )}
              >
                {label}
              </div>
            </div>
          )}
          {isVertical && label && (
            <div
              className={cn(
                "text-sm font-medium",
                hasError
                  ? "text-destructive"
                  : isCurrent
                    ? "text-primary"
                    : "text-muted-foreground",
              )}
            >
              {label}
            </div>
          )}
          {!isLastStep && (
            <div
              className={cn(
                "flex-1 border-t-2 transition-colors",
                isVertical
                  ? "absolute left-4 top-9 h-[calc(100%_-_1rem)] border-l-2 border-t-0"
                  : "w-[calc(100%_-_2rem)] absolute top-1/2 -translate-y-1/2 left-[calc(50%_+_1rem)] right-0",
                isCompleted ? "border-primary" : "border-muted",
              )}
            />
          )}
        </div>
      </div>
      <div className="w-full">{isCurrent && children}</div>
    </div>
  );
});
StepperItem.displayName = "StepperItem";

// HOOKS
type UseStepper = {
  initialStep?: number;
  steps: {
    label: string;
  }[];
};

const useExternalStepper = (props: UseStepper) => {
  const [activeStep, setActiveStep] = React.useState(props.initialStep || 0);

  const nextStep = () => setActiveStep((prev) => (prev < props.steps.length - 1 ? prev + 1 : prev));

  const prevStep = () => setActiveStep((prev) => (prev > 0 ? prev - 1 : prev));

  const resetSteps = () => setActiveStep(props.initialStep || 0);

  const setStep = (step: number) => {
    if (step >= 0 && step < props.steps.length) {
      setActiveStep(step);
    }
  };

  const isLastStep = activeStep === props.steps.length - 1;
  const isFirstStep = activeStep === 0;

  return {
    activeStep,
    nextStep,
    prevStep,
    resetSteps,
    setStep,
    isLastStep,
    isFirstStep,
    steps: props.steps,
  };
};

export type UseStepperReturn = ReturnType<typeof useExternalStepper>;

export { Stepper, StepperItem, useStepper, useExternalStepper };
export type { StepperProps, StepperItemProps };
