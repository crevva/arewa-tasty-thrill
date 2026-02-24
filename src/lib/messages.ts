export const MESSAGES = {
  common: {
    retry: "Please try again.",
    contactSupport: "If this keeps happening, please contact support.",
    genericError: "We couldn’t complete that request right now.",
    loading: "Please wait...",
    offline: "You appear to be offline. Check your connection and try again.",
    timeout: "This is taking longer than expected. Please try again.",
    unauthorized: "Please sign in to continue.",
    forbidden: "You do not have permission to do that.",
    notFound: "We couldn’t find what you’re looking for."
  },
  checkout: {
    emailHelp: "Enter a valid email so we can send your receipt.",
    phoneHelp: "Enter a valid phone number for delivery updates.",
    addressHelp: "Please add a delivery address in Lagos.",
    zoneRequired: "Select your delivery area to calculate delivery fee.",
    zoneUnsupported: "We currently deliver within Lagos. More locations coming soon.",
    quoteUpdating: "Updating delivery fee and total...",
    quoteFailed: "We couldn’t calculate delivery right now. Try again.",
    emptyCart: "Your cart is empty. Add items before checkout.",
    payButtonDefault: (amountLabel: string) => `Pay ${amountLabel}`,
    payButtonLoading: "Starting payment...",
    payButtonDisabled: "Complete your details to continue",
    initPaymentFailed:
      "We couldn’t start payment. Please try again. If this persists, contact support."
  },
  payment: {
    verifying: "Verifying payment...",
    confirmedTitle: "Payment confirmed",
    confirmedBody: "Your order is being prepared.",
    pendingTitle: "We’re still confirming your payment.",
    pendingBody: "Refresh in a moment or check your email/SMS.",
    failedTitle: "Payment wasn’t completed.",
    failedBody: "No worries — your cart is saved. Try again or choose another method."
  },
  orders: {
    lookupNotFound: "We couldn’t find that order. Check the code and try again.",
    lookupMismatch:
      "Details don’t match this order. Use the email/phone used at checkout.",
    statusDelivered: "Delivered. Thank you for choosing AT Thrill!",
    statusProcessing: "We’re preparing your order."
  },
  auth: {
    optionalPrompt: "Want faster checkout next time? Sign in to save your details.",
    googleFailed: "Google sign-in didn’t complete. Please try again.",
    magicLinkSent: (email: string) =>
      `We sent a sign-in code to ${email}. Check spam if you don’t see it.`,
    registerFailed: "We couldn’t create your account right now. Please try again."
  },
  admin: {
    saveFailed: "Couldn’t save changes. Please try again.",
    productCreated: "Product created.",
    productUpdated: "Product updated.",
    productDeleted: "Product deleted.",
    imageUploaded: "Image uploaded.",
    categoryCreated: "Category created.",
    categoryUpdated: "Category updated.",
    categoryDeleted: "Category deleted.",
    zoneCreated: "Delivery zone created.",
    zoneUpdated: "Delivery zone updated.",
    zoneDeleted: "Delivery zone deleted.",
    orderUpdated: "Order updated.",
    eventUpdated: "Event request updated.",
    pageUpdated: "Page updated."
  }
} as const;

