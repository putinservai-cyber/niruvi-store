// Razorpay Client SDK loader & checkout helper

declare global {
  interface Window {
    Razorpay: any;
  }
}

export interface RazorpayOptions {
  key?: string;
  amount: number; // in paise (e.g. 49900 for ₹499)
  currency?: string;
  name: string;
  description?: string;
  image?: string;
  orderId?: string;
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };
  notes?: Record<string, string>;
  theme?: {
    color?: string;
  };
  handler?: (response: {
    razorpay_payment_id: string;
    razorpay_order_id?: string;
    razorpay_signature?: string;
  }) => void;
  modal?: {
    ondismiss?: () => void;
  };
}

export function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export async function processRazorpayCheckout(
  options: RazorpayOptions
): Promise<{
  success: boolean;
  paymentId?: string;
  orderId?: string;
  signature?: string;
  error?: string;
}> {
  const isLoaded = await loadRazorpayScript();

  if (!isLoaded || !window.Razorpay) {
    // If external script is blocked in preview/sandbox iframe, provide seamless fallback
    console.warn('Razorpay SDK blocked or offline, using fallback verification handler');
    return {
      success: false,
      error: 'Razorpay SDK could not be loaded. Please check your network connection or use UPI directly.',
    };
  }

  return new Promise((resolve) => {
    try {
      const razorpayInstance = new window.Razorpay({
        key: options.key || 'rzp_test_niruvi_demo',
        amount: options.amount,
        currency: options.currency || 'INR',
        name: options.name,
        description: options.description || 'Niruvi Store Digital License',
        image: options.image || 'https://raw.githubusercontent.com/putinservai-cyber/niruvi/main/public/icon.png',
        order_id: options.orderId,
        prefill: options.prefill || {
          name: 'Niruvi Linux User',
          email: 'user@niruvi.store',
        },
        theme: {
          color: options.theme?.color || '#000000',
        },
        notes: options.notes,
        handler: (response: any) => {
          resolve({
            success: true,
            paymentId: response.razorpay_payment_id,
            orderId: response.razorpay_order_id,
            signature: response.razorpay_signature,
          });
        },
        modal: {
          ondismiss: () => {
            resolve({
              success: false,
              error: 'Payment cancelled by user',
            });
          },
        },
      });

      razorpayInstance.open();
    } catch (err: any) {
      resolve({
        success: false,
        error: err?.message || 'Error opening payment gateway',
      });
    }
  });
}
