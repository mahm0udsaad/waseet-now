import { create } from 'zustand';

export const usePaymentFlowStore = create((set) => ({
  amount: 0,
  initialPhone: '',
  onPaymentSubmitted: null,
  onCardPayment: null,

  openPaymentFlow: ({ amount = 0, initialPhone = '', onPaymentSubmitted = null, onCardPayment = null }) =>
    set({
      amount,
      initialPhone,
      onPaymentSubmitted,
      onCardPayment,
    }),

  resetPaymentFlow: () =>
    set({
      amount: 0,
      initialPhone: '',
      onPaymentSubmitted: null,
      onCardPayment: null,
    }),
}));
