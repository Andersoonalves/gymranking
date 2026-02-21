import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

type RegisterWorkoutContextType = {
  open: boolean;
  setOpen: (open: boolean) => void;
  openRegister: () => void;
};

const RegisterWorkoutContext = createContext<RegisterWorkoutContextType | null>(null);

export function useRegisterWorkout() {
  const ctx = useContext(RegisterWorkoutContext);
  if (!ctx) return { open: false, setOpen: () => {}, openRegister: () => {} };
  return ctx;
}

export function RegisterWorkoutProvider({
  children,
  open,
  setOpen,
}: {
  children: ReactNode;
  open: boolean;
  setOpen: (open: boolean) => void;
}) {
  const openRegister = useCallback(() => setOpen(true), [setOpen]);
  const value: RegisterWorkoutContextType = { open, setOpen, openRegister };
  return (
    <RegisterWorkoutContext.Provider value={value}>
      {children}
    </RegisterWorkoutContext.Provider>
  );
}
