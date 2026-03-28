import * as Print from "expo-print";
import {
  COMMISSION_CONFIG,
  calculateCommission,
} from "@/constants/commissionConfig";
import { getRTLRowDirection, pickRTLValue } from "@/utils/i18n/store";

/**
 * Generate HTML for a professional receipt PDF (black & white)
 * @param {Object} receiptData - Receipt information
 * @param {string} receiptData.id - Receipt ID
 * @param {string} receiptData.description - Receipt description
 * @param {number} receiptData.amount - Base amount (before commission)
 * @param {string} receiptData.currency - Currency (default: SAR)
 * @param {string} receiptData.adTitle - Ad title
 * @param {string} receiptData.adType - Ad type (taqib, tanazul, dhamen)
 * @param {Object} receiptData.sellerSignature - Seller signature metadata
 * @param {Object} receiptData.buyerSignature - Buyer signature metadata (optional)
 * @param {boolean} isRTL - Right-to-left layout
 * @returns {string} HTML string
 */
function generateReceiptHTML(receiptData, isRTL = true) {
  const {
    id,
    description,
    amount,
    currency = "SAR",
    adTitle = "",
    adType = "",
    sellerSignature,
    buyerSignature,
  } = receiptData;

  const date = new Date().toLocaleDateString(
    isRTL ? "ar-SA-u-ca-gregory" : "en-US",
    {
      year: "numeric",
      month: "long",
      day: "numeric",
      calendar: "gregory",
    }
  );

  const dir = isRTL ? "rtl" : "ltr";
  const lang = isRTL ? "ar" : "en";
  const currencyLabel = isRTL ? "ر.س" : currency;

  // Calculate commission
  const commissionConfig = adType ? COMMISSION_CONFIG[adType] : null;
  const { commission, total } = adType
    ? calculateCommission(adType, amount)
    : { commission: 0, total: amount };
  const commissionLabel = commissionConfig?.label?.[isRTL ? "ar" : "en"] || "";
  const commissionDescription =
    commissionConfig?.type === "percentage"
      ? `(${commissionConfig.value}%)`
      : "";

  // Labels
  const labels = isRTL
    ? {
        title: "إيصال دفع",
        subtitle: "منصة وسيط الان",
        receiptNumber: "رقم الإيصال",
        date: "التاريخ",
        adInfo: "تفاصيل الإعلان",
        description: "الوصف",
        financialSummary: "الملخص المالي",
        baseAmount: "المبلغ الأساسي",
        platformFee: commissionLabel || "رسوم المنصة",
        totalAmount: "المبلغ الإجمالي",
        signatures: "التوقيعات",
        sellerSignature: "البائع",
        buyerSignature: "المشتري",
        name: "الاسم",
        userId: "المعرف",
        timestamp: "التاريخ والوقت",
        method: "الطريقة",
        electronicAcceptance: "قبول إلكتروني",
        pending: "في انتظار التوقيع",
        footer:
          "هذا إيصال إلكتروني صادر من منصة وسيط الان وهو صالح بدون ختم أو توقيع يدوي",
      }
    : {
        title: "Payment Receipt",
        subtitle: "Waseet Alan Platform",
        receiptNumber: "Receipt No.",
        date: "Date",
        adInfo: "Ad Details",
        description: "Description",
        financialSummary: "Financial Summary",
        baseAmount: "Base Amount",
        platformFee: commissionLabel || "Platform Fee",
        totalAmount: "Total Amount",
        signatures: "Signatures",
        sellerSignature: "Seller",
        buyerSignature: "Buyer",
        name: "Name",
        userId: "ID",
        timestamp: "Date & Time",
        method: "Method",
        electronicAcceptance: "Electronic Acceptance",
        pending: "Awaiting Signature",
        footer:
          "This is an electronic receipt issued by Waseet Alan Platform and is valid without a stamp or manual signature",
      };

  const formatTimestamp = (ts) => {
    if (!ts) return "N/A";
    return new Date(ts).toLocaleString(
      isRTL ? "ar-SA-u-ca-gregory" : "en-US",
      {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        calendar: "gregory",
      }
    );
  };

  const formatAmount = (val) =>
    Number(val).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  const renderSignature = (sig, label) => {
    if (!sig) {
      return `
        <div class="sig-block">
          <div class="sig-label">${label}</div>
          <div class="sig-pending">${labels.pending}</div>
        </div>`;
    }
    return `
      <div class="sig-block">
        <div class="sig-label">${label}</div>
        <div class="sig-detail"><span class="sig-key">${labels.name}:</span> ${sig.display_name || "N/A"}</div>
        <div class="sig-detail"><span class="sig-key">${labels.userId}:</span> ${sig.user_id?.slice(0, 8) || "N/A"}</div>
        <div class="sig-detail"><span class="sig-key">${labels.timestamp}:</span> ${formatTimestamp(sig.timestamp)}</div>
        <div class="sig-detail"><span class="sig-key">${labels.method}:</span> ${labels.electronicAcceptance}</div>
      </div>`;
  };

  return `
    <!DOCTYPE html>
    <html lang="${lang}" dir="${dir}">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
          padding: 50px 45px;
          background: #fff;
          color: #000;
          direction: ${dir};
          font-size: 13px;
          line-height: 1.5;
        }

        /* Header */
        .header {
          text-align: center;
          padding-bottom: 24px;
          border-bottom: 2px solid #000;
          margin-bottom: 28px;
        }
        .header h1 {
          font-size: 26px;
          font-weight: 700;
          letter-spacing: 1px;
          text-transform: uppercase;
          color: #000;
          margin-bottom: 4px;
        }
        .header .subtitle {
          font-size: 13px;
          color: #000;
          font-weight: 400;
        }

        /* Meta row */
        .meta-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 28px;
          padding-bottom: 16px;
          border-bottom: 1px solid #ddd;
          flex-direction: ${getRTLRowDirection(isRTL)};
        }
        .meta-item {}
        .meta-label {
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: #000;
          margin-bottom: 2px;
        }
        .meta-value {
          font-size: 14px;
          font-weight: 600;
          color: #000;
        }

        /* Sections */
        .section {
          margin-bottom: 24px;
        }
        .section-title {
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.8px;
          color: #000;
          font-weight: 600;
          margin-bottom: 10px;
          padding-bottom: 6px;
          border-bottom: 1px solid #eee;
        }
        .section-value {
          font-size: 14px;
          color: #000;
        }

        /* Financial table */
        .fin-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 24px;
        }
        .fin-table tr {
          border-bottom: 1px solid #eee;
        }
        .fin-table tr.total-row {
          border-top: 2px solid #000;
          border-bottom: 2px solid #000;
        }
        .fin-table td {
          padding: 10px 0;
          font-size: 14px;
          color: #000;
        }
        .fin-table td:first-child {
          text-align: ${isRTL ? "right" : "left"};
        }
        .fin-table td:last-child {
          text-align: ${pickRTLValue(isRTL, "left", "right")};
          font-weight: 600;
          font-variant-numeric: tabular-nums;
        }
        .fin-table .label-note {
          font-size: 11px;
          color: #000;
          font-weight: 400;
        }
        .fin-table tr.total-row td {
          font-size: 16px;
          font-weight: 700;
          padding: 12px 0;
        }

        /* Signatures */
        .signatures {
          display: flex;
          gap: 24px;
          flex-direction: ${getRTLRowDirection(isRTL)};
        }
        .sig-block {
          flex: 1;
          border: 1px solid #ddd;
          padding: 14px;
        }
        .sig-label {
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: #000;
          font-weight: 600;
          margin-bottom: 10px;
          padding-bottom: 6px;
          border-bottom: 1px solid #eee;
        }
        .sig-detail {
          font-size: 12px;
          color: #000;
          margin-bottom: 4px;
        }
        .sig-key {
          color: #000;
        }
        .sig-pending {
          font-size: 12px;
          color: #000;
          font-style: italic;
          padding: 8px 0;
        }

        /* Footer */
        .footer {
          margin-top: 40px;
          text-align: center;
          font-size: 10px;
          color: #000;
          border-top: 1px solid #ddd;
          padding-top: 16px;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>${labels.title}</h1>
        <div class="subtitle">${labels.subtitle}</div>
      </div>

      <div class="meta-row">
        <div class="meta-item">
          <div class="meta-label">${labels.receiptNumber}</div>
          <div class="meta-value">#${id.slice(0, 8).toUpperCase()}</div>
        </div>
        <div class="meta-item">
          <div class="meta-label">${labels.date}</div>
          <div class="meta-value">${date}</div>
        </div>
      </div>

      ${
        adTitle
          ? `
      <div class="section">
        <div class="section-title">${labels.adInfo}</div>
        <div class="section-value">${adTitle}</div>
      </div>`
          : ""
      }

      ${
        description
          ? `
      <div class="section">
        <div class="section-title">${labels.description}</div>
        <div class="section-value">${description}</div>
      </div>`
          : ""
      }

      <div class="section">
        <div class="section-title">${labels.financialSummary}</div>
        <table class="fin-table">
          <tr>
            <td>${labels.baseAmount}</td>
            <td>${formatAmount(amount)} ${currencyLabel}</td>
          </tr>
          ${
            commission > 0
              ? `
          <tr>
            <td>${labels.platformFee} <span class="label-note">${commissionDescription}</span></td>
            <td>${formatAmount(commission)} ${currencyLabel}</td>
          </tr>`
              : ""
          }
          <tr class="total-row">
            <td>${labels.totalAmount}</td>
            <td>${formatAmount(total)} ${currencyLabel}</td>
          </tr>
        </table>
      </div>

      <div class="section">
        <div class="section-title">${labels.signatures}</div>
        <div class="signatures">
          ${renderSignature(sellerSignature, labels.sellerSignature)}
          ${renderSignature(buyerSignature, labels.buyerSignature)}
        </div>
      </div>

      <div class="footer">
        ${labels.footer}
      </div>
    </body>
    </html>
  `;
}

/**
 * Generate and return a PDF URI for a receipt
 * @param {Object} receiptData - Receipt data (see generateReceiptHTML)
 * @param {boolean} isRTL - RTL mode
 * @returns {Promise<string>} PDF file URI
 */
export async function generateReceiptPdf(receiptData, isRTL = true) {
  try {
    const html = generateReceiptHTML(receiptData, isRTL);
    const { uri } = await Print.printToFileAsync({ html });
    return uri;
  } catch (error) {
    console.error("Error generating receipt PDF:", error);
    throw new Error("Failed to generate receipt PDF");
  }
}
