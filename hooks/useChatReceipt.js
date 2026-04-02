import { useState } from "react";
import { createReceipt } from "@/utils/supabase/receipts";

export function useChatReceipt() {
  const [receiptData, setReceiptData] = useState({
    description: "",
    amount: "",
    date: new Date().toISOString().split("T")[0],
  });
  const [creating, setCreating] = useState(false);

  const updateReceiptData = (updates) => {
    setReceiptData((prev) => ({ ...prev, ...updates }));
  };

  const resetReceiptData = () => {
    setReceiptData({
      description: "",
      amount: "",
      date: new Date().toISOString().split("T")[0],
    });
  };

  /**
   * Create a full receipt with PDF and DB record
   * @param {Object} context - Chat context (conversation_id, ad_id, adTitle, isRTL)
   * @returns {Promise<Object>} Receipt attachment for sending in chat
   */
  const createReceiptWithPdf = async (context) => {
    if (!receiptData.description || !receiptData.amount) {
      throw new Error("Missing required fields");
    }
    if (Number(receiptData.amount) <= 0 || isNaN(Number(receiptData.amount))) {
      throw new Error("Amount must be a positive number");
    }

    setCreating(true);
    try {
      const receipt = await createReceipt(
        {
          conversation_id: context.conversation_id,
          ad_id: context.ad_id,
          amount: Number(receiptData.amount),
          description: receiptData.description,
          currency: "SAR",
          adTitle: context.adTitle || "",
        },
        context.isRTL
      );

      // Return attachment format for chat message
      return {
        type: "receipt",
        receipt_id: receipt.id,
        status: receipt.status,
        amount: receipt.amount,
        ad_id: receipt.ad_id,
        pdf_path: receipt.pdf_path,
        description: receipt.description,
      };
    } finally {
      setCreating(false);
    }
  };

  return {
    receiptData,
    updateReceiptData,
    resetReceiptData,
    createReceiptWithPdf,
    creating,
  };
}
