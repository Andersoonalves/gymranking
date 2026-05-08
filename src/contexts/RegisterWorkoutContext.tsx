import { createContext, useContext, useCallback, type ReactNode } from "react";

type RegisterWorkoutContextType = {
  open: boolean;
  setOpen: (open: boolean) => void;
  openRegister: () => void;
  openRegisterForDate: (date: Date) => void;
};

const RegisterWorkoutContext = createContext<RegisterWorkoutContextType | null>(null);

export function useRegisterWorkout() {
  const ctx = useContext(RegisterWorkoutContext);
  if (!ctx)
    return {
      open: false,
      setOpen: () => {},
      openRegister: () => {},
      openRegisterForDate: () => {},
    };
  return ctx;
}

export function RegisterWorkoutProvider({
  children,
  open,
  setOpen,
  registerTargetDate,
  setRegisterTargetDate,
}: {
  children: ReactNode;
  open: boolean;
  setOpen: (open: boolean) => void;
  registerTargetDate: Date | null;
  setRegisterTargetDate: (d: Date | null) => void;
}) {
  const openRegister = useCallback(() => {
    setRegisterTargetDate(null);
    setOpen(true);
  }, [setOpen, setRegisterTargetDate]);

  const openRegisterForDate = useCallback(
    (date: Date) => {
      setRegisterTargetDate(date);
      setOpen(true);
    },
    [setOpen, setRegisterTargetDate],
  );

  const value: RegisterWorkoutContextType = {
    open,
    setOpen,
    openRegister,
    openRegisterForDate,
  };
  return (
    <RegisterWorkoutContext.Provider value={value}>
      {children}
    </RegisterWorkoutContext.Provider>
  );
}
