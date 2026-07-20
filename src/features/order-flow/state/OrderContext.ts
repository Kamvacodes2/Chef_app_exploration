"use client";

import { createContext, useContext } from "react";
import type { OrderController } from "../state/useOrderController";

/**
 * Shared order context. A single OrderController instance is provided by
 * <OrderFlow> and consumed by every step component, so step components stay
 * stateless and just read/dispatch. Kept in its own module to avoid a
 * circular import between OrderFlow and the step components.
 */
export const OrderContext = createContext<OrderController | null>(null);

export function useOrder(): OrderController {
  const ctx = useContext(OrderContext);
  if (!ctx) throw new Error("useOrder must be used within <OrderFlow>");
  return ctx;
}
